import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { ingestApiRequest, ApiRequestEventType, fetchEvents } from "../lib/openpanel";
import { authMiddlewareAction } from "../middlewares/auth";

export const getEvents = action({
  args: {
    start: v.string(),
    end: v.string(),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await authMiddlewareAction(ctx, args.workspaceId);

    try {
      const result = await fetchEvents({
        profileId: args.workspaceId,
        event: [
          // API events
          "api/v1/translations",
          "getLanguageContent",
          "getJsonSchema",
          // Project events
          "project.created",
          "project.deleted",
          // Language events
          "language.created",
          "language.deleted",
          // Namespace events
          "namespace.created",
          "namespace.deleted",
          // Translation key events
          "translationKey.created",
          "translationKey.bulkCreated",
          "translationKey.deleted",
          "translationKey.batchTranslation",
          // Release events
          "release.created",
          "release.deleted",
          // Build events
          "build.created",
          "build.deleted",
          // Glossary events
          "glossary.termCreated",
          "glossary.termDeleted",
          // Screenshot events
          "screenshot.created",
          "screenshot.deleted",
          "screenshot.textDetection",
        ],
        start: args.start,
        end: args.end,
        page: args.page || 1,
        limit: args.limit || 50,
        includes: "properties",
      });

      return result;
    } catch (error) {
      console.error("Openpanel query failed:", error);
      throw new Error(`Analytics query failed: ${error}`);
    }
  },
});

export const ingestEvent = internalAction({
  args: {
    workspaceId: v.string(),
    projectId: v.string(),
    event: v.string(),
    projectName: v.optional(v.string()),
    deniedReason: v.optional(v.string()),
    languageCode: v.optional(v.string()),
    namespaceId: v.optional(v.string()),
    namespaceName: v.optional(v.string()),
    responseSize: v.optional(v.number()),
    // Additional properties for user-facing events
    count: v.optional(v.number()),
    releaseTag: v.optional(v.string()),
    buildTag: v.optional(v.string()),
    term: v.optional(v.string()),
    screenshotName: v.optional(v.string()),
  },
  handler: async (_, args) => {
    try {
      const params: ApiRequestEventType = {
        workspaceId: args.workspaceId,
        projectId: args.projectId,
        projectName: args.projectName,
        event: args.event,
        time: Date.now(),
        deniedReason: args.deniedReason,
        languageCode: args.languageCode,
        namespaceId: args.namespaceId,
        namespaceName: args.namespaceName,
        responseSize: args.responseSize,
        count: args.count,
        releaseTag: args.releaseTag,
        buildTag: args.buildTag,
        term: args.term,
        screenshotName: args.screenshotName,
      };

      await ingestApiRequest(params);
    } catch (e) {
      console.warn("Failed to ingest Openpanel event", e);
    }
  },
});
