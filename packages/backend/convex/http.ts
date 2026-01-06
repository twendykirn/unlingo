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
import { getPolarConfig, convertToDatabaseProduct, convertWebhookSubscription, getTierFromProductId } from "./polarUtils";

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
        event: "api/v1/translations",
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

      const responseBody = JSON.stringify(parsedContent);

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

// Polar webhook handler
http.route({
  path: "/polar/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!request.body) {
      return new Response("No body", { status: 400 });
    }

    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    const { webhookSecret } = getPolarConfig();

    try {
      const event = validateEvent(body, headers, webhookSecret);

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
            const isActive = subscriptionEvent.data.status === "active" && !subscriptionEvent.data.customerCancellationReason;
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
