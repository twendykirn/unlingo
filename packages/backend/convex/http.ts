import { createClerkClient, type WebhookEvent } from "@clerk/backend";
import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { WebhookVerificationError, validateEvent } from "@polar-sh/sdk/webhooks";
import type { WebhookSubscriptionCreatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptioncreatedpayload.js";
import type { WebhookSubscriptionUpdatedPayload } from "@polar-sh/sdk/models/components/webhooksubscriptionupdatedpayload.js";
import type { WebhookProductCreatedPayload } from "@polar-sh/sdk/models/components/webhookproductcreatedpayload.js";
import type { WebhookProductUpdatedPayload } from "@polar-sh/sdk/models/components/webhookproductupdatedpayload.js";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { emailWorkpool } from "./resend";
import {
  getPolarConfig,
  convertToDatabaseProduct,
  convertWebhookSubscription,
  getTierFromProductId,
} from "./polarUtils";
import "../lib/polyfill";
import { getFileUrl } from "./files";

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  try {
    return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook event", error);
    return null;
  }
}

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const evt = await validateRequest(request);
    const svixId = request.headers.get("svix-id");

    if (!evt || !evt.type || !evt.data || !evt.data.id || !svixId) {
      console.error("HTTP Action: Webhook payload missing required fields (type, data.id).", event);
      return new Response("Invalid payload structure", { status: 400 });
    }

    console.log(`HTTP Action: Received Clerk event: ${evt.type} (ID: ${svixId})`);

    try {
      let primaryEmail;
      switch (evt.type) {
        case "user.created":
          primaryEmail = evt.data.email_addresses.find((e) => e.id === evt.data.primary_email_address_id);

          if (primaryEmail) {
            await emailWorkpool.enqueueAction(ctx, internal.resend.addEmailToContacts, {
              email: primaryEmail.email_address,
            });
            await emailWorkpool.enqueueAction(ctx, internal.resend.sendWelcomeEmail, {
              name: evt.data.username || evt.data.first_name || "there",
              email: primaryEmail.email_address,
            });
          } else {
            console.log("Not found primary email address for user: ", evt.data.id);
          }
          break;
        case "organizationMembership.deleted":
          if (evt.data.organization.members_count === 0) {
            const clerk = createClerkClient({
              secretKey: process.env.CLERK_SECRET_KEY!,
            });
            await clerk.organizations.deleteOrganization(evt.data.organization.id);
          }
          break;
        case "organization.deleted":
          await ctx.runMutation(internal.workspaces.deleteOrganizationWorkspace, {
            clerkOrgId: evt.data.id,
          });
          break;
        default:
          console.log("Ignored Clerk webhook event", evt.type);
      }

      return new Response(null, { status: 200 });
    } catch (error: any) {
      console.error(`Error processing Clerk event ${svixId} (${evt.type}):`, error);
      // Avoid recording event ID on failure here to allow potential retries from Clerk
      return new Response(`Webhook handler error: ${error.message || "Unknown error"}`, { status: 500 });
    }
  }),
});

http.route({
  path: "/v1/health",
  method: "GET",
  handler: httpAction(async (_, request) => {
    if (request.headers.get("x-api-key") !== process.env.OPEN_STATUS_API_KEY!) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
      });
    }

    return new Response(null, { status: 200 });
  }),
});

http.route({
  path: "/v1/translations",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(request.url);
    const releaseTag = url.searchParams.get("release");
    const namespace = url.searchParams.get("namespace");
    const lang = url.searchParams.get("lang");

    if (!releaseTag || !namespace || !lang) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters: release, namespace, and lang are required",
          example: "/v1/translations?release=1.0.0&namespace=common&lang=en",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    try {
      const verifyResponse = await ctx.runAction(internal.keys.verifyUnkeyKey, {
        key: apiKey,
      });

      if (!verifyResponse.valid || !verifyResponse.permissions.includes("translations.read")) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { externalId } = verifyResponse.identity;
      const workspaceId = externalId.split("_")[0];
      const projectId = externalId.split("_")[1];

      if (!workspaceId || !projectId) {
        return new Response(JSON.stringify({ error: "Invalid API key metadata" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const limitCheck = await ctx.runMutation(internal.internalWorkspaces.checkAndUpdateRequestUsage, {
        workspaceId,
        projectId,
      });

      if (limitCheck.nearLimit) {
        await emailWorkpool.enqueueAction(ctx, internal.resend.sendLimitsEmail, {
          email: limitCheck.workspace.contactEmail,
          currentUsage: 80,
        });
      }

      if (limitCheck.exceedsHardLimit && limitCheck.shouldSendHardLimitEmail) {
        await emailWorkpool.enqueueAction(ctx, internal.resend.sendLimitsEmail, {
          email: limitCheck.workspace.contactEmail,
          currentUsage: 130,
        });
      }

      if (limitCheck.exceedsLimit) {
        await emailWorkpool.enqueueAction(ctx, internal.resend.sendLimitsEmail, {
          email: limitCheck.workspace.contactEmail,
          currentUsage: 100,
        });
      }

      const ingestBase = {
        workspaceId,
        projectId,
        projectName: limitCheck.project.name,
        event: "api.v1.translations.get",
        languageCode: lang,
        namespaceName: namespace,
      };

      if (!limitCheck.isRequestAllowed) {
        await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
          ...ingestBase,
          deniedReason: "limit_exceeded",
        });
        return new Response(
          JSON.stringify({
            error: "Request limit exceeded. Please upgrade your plan or wait for the monthly reset.",
            currentUsage: limitCheck.currentRequests,
            limit: limitCheck.limit,
            resetPeriod: "monthly",
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const resolution = await ctx.runQuery(internal.serving.resolveTranslationFile, {
        projectId,
        releaseTag,
        namespaceName: namespace,
        languageCode: lang,
      });

      if (resolution.error) {
        const errorMap: Record<string, string> = {
          release_not_found: `Release tag '${releaseTag}' not found`,
          namespace_not_found: `Namespace '${namespace}' not found in release '${releaseTag}'`,
          language_not_found: `Language '${lang}' not found for namespace '${namespace}'`,
        };

        await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
          ...ingestBase,
          deniedReason: resolution.error,
        });

        return new Response(JSON.stringify({ error: errorMap[resolution.error] || "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const fileContent = await ctx.runAction(internal.files.getFileContent, {
        fileId: resolution.fileId!,
      });

      if (!fileContent) {
        await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
          ...ingestBase,
          deniedReason: "storage_blob_missing",
        });
        return new Response(JSON.stringify({ error: "Failed to retrieve language file" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      let parsedContent;
      try {
        parsedContent = JSON.parse(fileContent);
      } catch {
        parsedContent = fileContent;
      }

      const responseBody = JSON.stringify({
        translations: parsedContent,
        release: {
          tag: resolution.release!.tag,
        },
        build: {
          tag: resolution.build!.tag,
          namespace: resolution.build!.namespace,
        },
      });

      await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
        ...ingestBase,
        responseSize: new TextEncoder().encode(responseBody).length,
      });

      return new Response(responseBody, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("API Error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }),
});

http.route({
  path: "/v1/keys",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(request.url);
    const namespace = url.searchParams.get("namespace");
    const key = url.searchParams.get("key");
    const lang = url.searchParams.get("lang");

    if (!namespace || !key || !lang) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters: namespace, key, and lang are required",
          example: "/v1/keys?namespace=common&key=greeting.hello&lang=en",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    try {
      const verifyResponse = await ctx.runAction(internal.keys.verifyUnkeyKey, {
        key: apiKey,
      });

      if (!verifyResponse.valid || !verifyResponse.permissions.includes("translations.read")) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { externalId } = verifyResponse.identity;
      const workspaceId = externalId.split("_")[0];
      const projectId = externalId.split("_")[1];

      if (!workspaceId || !projectId) {
        return new Response(JSON.stringify({ error: "Invalid API key metadata" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const limitCheck = await ctx.runMutation(internal.internalWorkspaces.checkAndUpdateRequestUsage, {
        workspaceId,
        projectId,
      });

      if (limitCheck.nearLimit) {
        await emailWorkpool.enqueueAction(ctx, internal.resend.sendLimitsEmail, {
          email: limitCheck.workspace.contactEmail,
          currentUsage: 80,
        });
      }

      if (limitCheck.exceedsHardLimit && limitCheck.shouldSendHardLimitEmail) {
        await emailWorkpool.enqueueAction(ctx, internal.resend.sendLimitsEmail, {
          email: limitCheck.workspace.contactEmail,
          currentUsage: 130,
        });
      }

      if (limitCheck.exceedsLimit) {
        await emailWorkpool.enqueueAction(ctx, internal.resend.sendLimitsEmail, {
          email: limitCheck.workspace.contactEmail,
          currentUsage: 100,
        });
      }

      const ingestBase = {
        workspaceId,
        projectId,
        projectName: limitCheck.project.name,
        event: "api.v1.keys.get",
        languageCode: lang,
        namespaceName: namespace,
      };

      if (!limitCheck.isRequestAllowed) {
        await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
          ...ingestBase,
          deniedReason: "limit_exceeded",
        });
        return new Response(
          JSON.stringify({
            error: "Request limit exceeded. Please upgrade your plan or wait for the monthly reset.",
            currentUsage: limitCheck.currentRequests,
            limit: limitCheck.limit,
            resetPeriod: "monthly",
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const resolution = await ctx.runQuery(internal.serving.resolveSingleKey, {
        projectId,
        keyTag: key,
        namespaceName: namespace,
        languageCode: lang,
      });

      if (resolution.error) {
        const errorMap: Record<string, string> = {
          namespace_not_found: `Namespace '${namespace}' not found`,
          language_not_found: `Language '${lang}' not found`,
          key_not_found: `Key '${key}' not found in namespace '${namespace}'`,
          value_not_found: `Value not found for key '${key}' in language '${lang}'`,
        };

        await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
          ...ingestBase,
          deniedReason: resolution.error,
        });

        return new Response(JSON.stringify({ error: errorMap[resolution.error] || "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const responseBody = JSON.stringify({
        key: resolution.key,
        value: resolution.value,
        namespace: resolution.namespace,
        language: resolution.language,
      });

      await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
        ...ingestBase,
        responseSize: new TextEncoder().encode(responseBody).length,
      });

      return new Response(responseBody, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("API Error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }),
});

http.route({
  path: "/v1/builds",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(request.url);
    const buildTag = url.searchParams.get("build");
    const lang = url.searchParams.get("lang"); // Optional - if not provided, returns all languages

    if (!buildTag) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameter: build is required",
          example: "/v1/builds?build=v1.0.0 or /v1/builds?build=v1.0.0&lang=en",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    try {
      const verifyResponse = await ctx.runAction(internal.keys.verifyUnkeyKey, {
        key: apiKey,
      });

      if (!verifyResponse.valid || !verifyResponse.permissions.includes("translations.load")) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { externalId } = verifyResponse.identity;
      const workspaceId = externalId.split("_")[0];
      const projectId = externalId.split("_")[1];

      if (!workspaceId || !projectId) {
        return new Response(JSON.stringify({ error: "Invalid API key metadata" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const limitCheck = await ctx.runMutation(internal.internalWorkspaces.checkAndUpdateRequestUsage, {
        workspaceId,
        projectId,
      });

      if (limitCheck.nearLimit) {
        await emailWorkpool.enqueueAction(ctx, internal.resend.sendLimitsEmail, {
          email: limitCheck.workspace.contactEmail,
          currentUsage: 80,
        });
      }

      if (limitCheck.exceedsHardLimit && limitCheck.shouldSendHardLimitEmail) {
        await emailWorkpool.enqueueAction(ctx, internal.resend.sendLimitsEmail, {
          email: limitCheck.workspace.contactEmail,
          currentUsage: 130,
        });
      }

      if (limitCheck.exceedsLimit) {
        await emailWorkpool.enqueueAction(ctx, internal.resend.sendLimitsEmail, {
          email: limitCheck.workspace.contactEmail,
          currentUsage: 100,
        });
      }

      const ingestBase = {
        workspaceId,
        projectId,
        projectName: limitCheck.project.name,
        event: "api.v1.builds.get",
        languageCode: lang || undefined,
      };

      if (!limitCheck.isRequestAllowed) {
        await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
          ...ingestBase,
          deniedReason: "limit_exceeded",
        });
        return new Response(
          JSON.stringify({
            error: "Request limit exceeded. Please upgrade your plan or wait for the monthly reset.",
            currentUsage: limitCheck.currentRequests,
            limit: limitCheck.limit,
            resetPeriod: "monthly",
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // If lang is provided, get single language file
      if (lang) {
        const resolution = await ctx.runQuery(internal.serving.resolveBuildSingleLanguage, {
          projectId,
          buildTag,
          languageCode: lang,
        });

        if (resolution.error) {
          const errorMap: Record<string, string> = {
            build_not_found: `Build '${buildTag}' not found`,
            build_not_ready: `Build '${buildTag}' is not ready yet${resolution.statusDescription ? `: ${resolution.statusDescription}` : ""}`,
            language_not_found: `Language '${lang}' not found in build '${buildTag}'`,
          };

          await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
            ...ingestBase,
            deniedReason: resolution.error,
          });

          return new Response(JSON.stringify({ error: errorMap[resolution.error] || "Not found" }), {
            status: resolution.error === "build_not_ready" ? 202 : 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Generate signed URL with 10 minute expiry
        const signedUrl = await getFileUrl(resolution.fileId!, 600);

        const responseBody = JSON.stringify({
          build: resolution.tag,
          namespace: resolution.namespace,
          language: lang,
          url: signedUrl,
          expiresIn: 600,
        });

        await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
          ...ingestBase,
          responseSize: new TextEncoder().encode(responseBody).length,
        });

        return new Response(responseBody, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Return all languages
      const resolution = await ctx.runQuery(internal.serving.resolveBuildAllLanguages, {
        projectId,
        buildTag,
      });

      if (resolution.error) {
        const errorMap: Record<string, string> = {
          build_not_found: `Build '${buildTag}' not found`,
          build_not_ready: `Build '${buildTag}' is not ready yet${resolution.statusDescription ? `: ${resolution.statusDescription}` : ""}`,
        };

        await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
          ...ingestBase,
          deniedReason: resolution.error,
        });

        return new Response(JSON.stringify({ error: errorMap[resolution.error] || "Not found" }), {
          status: resolution.error === "build_not_ready" ? 202 : 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Generate signed URLs for all language files
      const languageUrls: Record<string, { url: string; fileSize?: number }> = {};
      for (const [langCode, fileInfo] of Object.entries(resolution.languageFiles!)) {
        const signedUrl = await getFileUrl(fileInfo.fileId, 600);
        languageUrls[langCode] = {
          url: signedUrl,
          fileSize: fileInfo.fileSize,
        };
      }

      const responseBody = JSON.stringify({
        build: resolution.tag,
        namespace: resolution.namespace,
        languages: languageUrls,
        expiresIn: 600,
      });

      await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
        ...ingestBase,
        responseSize: new TextEncoder().encode(responseBody).length,
      });

      return new Response(responseBody, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("API Error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }),
});

http.route({
  path: "/v1/builds",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const apiKey = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: { namespace?: string; build?: string };
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON body",
          example: '{ "namespace": "common", "build": "v1.0.0" }',
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { namespace, build: buildTag } = body;

    if (!namespace || !buildTag) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: namespace and build are required",
          example: '{ "namespace": "common", "build": "v1.0.0" }',
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    try {
      const verifyResponse = await ctx.runAction(internal.keys.verifyUnkeyKey, {
        key: apiKey,
      });

      if (!verifyResponse.valid || !verifyResponse.permissions.includes("translations.write")) {
        return new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const { externalId } = verifyResponse.identity;
      const workspaceId = externalId.split("_")[0];
      const projectId = externalId.split("_")[1];

      if (!workspaceId || !projectId) {
        return new Response(JSON.stringify({ error: "Invalid API key metadata" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const limitCheck = await ctx.runMutation(internal.internalWorkspaces.checkAndUpdateRequestUsage, {
        workspaceId,
        projectId,
      });

      if (limitCheck.nearLimit) {
        await emailWorkpool.enqueueAction(ctx, internal.resend.sendLimitsEmail, {
          email: limitCheck.workspace.contactEmail,
          currentUsage: 80,
        });
      }

      if (limitCheck.exceedsHardLimit && limitCheck.shouldSendHardLimitEmail) {
        await emailWorkpool.enqueueAction(ctx, internal.resend.sendLimitsEmail, {
          email: limitCheck.workspace.contactEmail,
          currentUsage: 130,
        });
      }

      if (limitCheck.exceedsLimit) {
        await emailWorkpool.enqueueAction(ctx, internal.resend.sendLimitsEmail, {
          email: limitCheck.workspace.contactEmail,
          currentUsage: 100,
        });
      }

      const ingestBase = {
        workspaceId,
        projectId,
        projectName: limitCheck.project.name,
        event: "api.v1.builds.post",
        namespaceName: namespace,
      };

      if (!limitCheck.isRequestAllowed) {
        await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
          ...ingestBase,
          deniedReason: "limit_exceeded",
        });
        return new Response(
          JSON.stringify({
            error: "Request limit exceeded. Please upgrade your plan or wait for the monthly reset.",
            currentUsage: limitCheck.currentRequests,
            limit: limitCheck.limit,
            resetPeriod: "monthly",
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const result = await ctx.runMutation(internal.serving.createBuildViaApi, {
        projectId,
        namespaceName: namespace,
        buildTag,
      });

      if (result.error) {
        const errorMap: Record<string, string> = {
          namespace_not_found: `Namespace '${namespace}' not found`,
          build_tag_exists: `Build tag '${buildTag}' already exists`,
        };

        await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
          ...ingestBase,
          deniedReason: result.error,
        });

        return new Response(JSON.stringify({ error: errorMap[result.error] || "Build creation failed" }), {
          status: result.error === "build_tag_exists" ? 409 : 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Schedule the build generation
      await ctx.scheduler.runAfter(0, internal.builds.generateLanguageAction, {
        buildId: result.buildId!,
        projectId,
        namespaceId: result.namespaceId!,
        queue: result.languagesData!,
      });

      const responseBody = JSON.stringify({
        success: true,
        buildId: result.buildId,
        build: buildTag,
        namespace,
        status: "building",
        message: "Build creation started. Use GET /v1/builds?build=" + buildTag + " to check status.",
      });

      await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
        ...ingestBase,
        responseSize: new TextEncoder().encode(responseBody).length,
      });

      return new Response(responseBody, {
        status: 202,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("API Error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          message: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }),
});

// Polar webhook handler
http.route({
  path: "/polar/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!request.body) {
      return new Response("No body", { status: 400 });
    }

    const body = await request.text();
    let newHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => (newHeaders[key] = value));

    const { webhookSecret } = getPolarConfig();

    try {
      const event = validateEvent(body, newHeaders, webhookSecret);

      switch (event.type) {
        case "subscription.created": {
          const subscriptionEvent = event as WebhookSubscriptionCreatedPayload;
          const subscriptionData = convertWebhookSubscription(subscriptionEvent.data);

          // Create subscription in our database
          await ctx.runMutation(internal.polarDb.createSubscription, {
            polarId: subscriptionData.polarId,
            polarCustomerId: subscriptionData.polarCustomerId,
            productId: subscriptionData.productId,
            checkoutId: subscriptionData.checkoutId,
            createdAt: subscriptionData.createdAt,
            modifiedAt: subscriptionData.modifiedAt,
            amount: subscriptionData.amount,
            currency: subscriptionData.currency,
            recurringInterval: subscriptionData.recurringInterval,
            status: subscriptionData.status,
            currentPeriodStart: subscriptionData.currentPeriodStart,
            currentPeriodEnd: subscriptionData.currentPeriodEnd,
            cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
            startedAt: subscriptionData.startedAt,
            endedAt: subscriptionData.endedAt,
            metadata: subscriptionData.metadata,
            customerCancellationReason: subscriptionData.customerCancellationReason,
            customerCancellationComment: subscriptionData.customerCancellationComment,
          });

          // Get workspace ID from customer's externalId (which is the workspace ID)
          const workspaceId = subscriptionEvent.data.customer.externalId;
          if (workspaceId) {
            const tierInfo = getTierFromProductId(subscriptionEvent.data.product?.id);
            await ctx.runMutation(internal.workspaces.updateWorkspaceLimits, {
              workspaceId: workspaceId as Id<"workspaces">,
              tier: tierInfo.tier,
              requestLimit: tierInfo.requests,
              translationKeysLimit: tierInfo.translationKeys,
            });
          }
          break;
        }

        case "subscription.updated": {
          const subscriptionEvent = event as WebhookSubscriptionUpdatedPayload;
          const subscriptionData = convertWebhookSubscription(subscriptionEvent.data);

          // Update subscription in our database
          await ctx.runMutation(internal.polarDb.updateSubscription, {
            polarId: subscriptionData.polarId,
            productId: subscriptionData.productId,
            modifiedAt: subscriptionData.modifiedAt,
            amount: subscriptionData.amount,
            currency: subscriptionData.currency,
            recurringInterval: subscriptionData.recurringInterval,
            status: subscriptionData.status,
            currentPeriodStart: subscriptionData.currentPeriodStart,
            currentPeriodEnd: subscriptionData.currentPeriodEnd,
            cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
            startedAt: subscriptionData.startedAt,
            endedAt: subscriptionData.endedAt,
            metadata: subscriptionData.metadata,
            customerCancellationReason: subscriptionData.customerCancellationReason,
            customerCancellationComment: subscriptionData.customerCancellationComment,
          });

          // Get workspace ID from customer's externalId
          const workspaceId = subscriptionEvent.data.customer.externalId;
          if (workspaceId) {
            const isActive =
              (subscriptionEvent.data.status === "active" || subscriptionEvent.data.status === "trialing") &&
              !subscriptionEvent.data.customerCancellationReason;
            const tierInfo = getTierFromProductId(subscriptionEvent.data.product?.id);

            await ctx.runMutation(internal.workspaces.updateWorkspaceLimits, {
              workspaceId: workspaceId as Id<"workspaces">,
              tier: tierInfo.tier,
              requestLimit: isActive ? tierInfo.requests : undefined,
              translationKeysLimit: isActive ? tierInfo.translationKeys : undefined,
            });
          }
          break;
        }

        case "product.created": {
          const productEvent = event as WebhookProductCreatedPayload;
          const productData = convertToDatabaseProduct(productEvent.data);

          await ctx.runMutation(internal.polarDb.createProduct, {
            polarId: productData.polarId,
            organizationId: productData.organizationId,
            name: productData.name,
            description: productData.description,
            isRecurring: productData.isRecurring,
            isArchived: productData.isArchived,
            createdAt: productData.createdAt,
            modifiedAt: productData.modifiedAt,
            recurringInterval: productData.recurringInterval,
            metadata: productData.metadata,
            prices: productData.prices,
            medias: productData.medias,
          });
          break;
        }

        case "product.updated": {
          const productEvent = event as WebhookProductUpdatedPayload;
          const productData = convertToDatabaseProduct(productEvent.data);

          await ctx.runMutation(internal.polarDb.updateProduct, {
            polarId: productData.polarId,
            organizationId: productData.organizationId,
            name: productData.name,
            description: productData.description,
            isRecurring: productData.isRecurring,
            isArchived: productData.isArchived,
            createdAt: productData.createdAt,
            modifiedAt: productData.modifiedAt,
            recurringInterval: productData.recurringInterval,
            metadata: productData.metadata,
            prices: productData.prices,
            medias: productData.medias,
          });
          break;
        }

        default:
          console.log(`Unhandled Polar webhook event: ${event.type}`);
      }

      return new Response("Accepted", { status: 202 });
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        console.error("Polar webhook verification failed:", error);
        return new Response("Forbidden", { status: 403 });
      }
      console.error("Polar webhook error:", error);
      throw error;
    }
  }),
});

export default http;
