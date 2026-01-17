import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { authMiddleware } from "../middlewares/auth";

export const getLanguages = query({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    return await ctx.db
      .query("languages")
      .withIndex("by_project_status", (q) => q.eq("projectId", args.projectId).gt("status", -1))
      .order("desc")
      .collect();
  },
});

export const createLanguage = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    languageCode: v.string(),
    isPrimary: v.optional(v.boolean()),
    rules: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const currentPrimaryId = project.primaryLanguageId;

    const languageId = await ctx.db.insert("languages", {
      projectId: project._id,
      languageCode: args.languageCode,
      status: currentPrimaryId ? 2 : 1,
      rules: args.rules,
    });

    if (currentPrimaryId) {
      await ctx.scheduler.runAfter(0, internal.languages.startBackfill, {
        projectId: project._id,
        sourceLanguageId: currentPrimaryId,
        targetLanguageId: languageId,
      });
    }

    if (args.isPrimary) {
      await ctx.db.patch(project._id, {
        primaryLanguageId: languageId,
      });
    }

    // Track analytics event
    await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
      workspaceId: args.workspaceId as unknown as string,
      projectId: args.projectId as unknown as string,
      projectName: project.name,
      event: "language.created",
      languageCode: args.languageCode,
    });
  },
});

export const startBackfill = internalMutation({
  args: {
    projectId: v.id("projects"),
    sourceLanguageId: v.id("languages"),
    targetLanguageId: v.id("languages"),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const keysPage = await ctx.db
      .query("translationKeys")
      .withIndex("by_project_namespace_key", (q) => q.eq("projectId", args.projectId))
      .paginate({ cursor: args.cursor ?? null, numItems: 30 });

    if (keysPage.page.length === 0) {
      await ctx.db.patch(args.targetLanguageId, {
        status: 1,
      });
      return;
    }

    const keyIds = keysPage.page.filter((k) => k.status !== -1).map((k) => k._id);

    if (keyIds.length > 0) {
      for (const id of keyIds) {
        await ctx.db.patch(id, { status: 2 });
      }

      await ctx.scheduler.runAfter(0, internal.translationKeys.translateBatchAction, {
        projectId: args.projectId,
        keyIds: keyIds,
        targetLanguageIds: [args.targetLanguageId],
        overrideSourceLanguageId: args.sourceLanguageId,
      });
    }

    if (!keysPage.isDone) {
      await ctx.scheduler.runAfter(0, internal.languages.startBackfill, {
        projectId: args.projectId,
        sourceLanguageId: args.sourceLanguageId,
        targetLanguageId: args.targetLanguageId,
        cursor: keysPage.continueCursor,
      });
    } else {
      await ctx.db.patch(args.targetLanguageId, {
        status: 1,
      });
    }
  },
});

export const updateLanguage = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    languageId: v.id("languages"),
    isPrimary: v.optional(v.boolean()),
    rules: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const language = await ctx.db.get(args.languageId);
    if (!language || language.projectId !== project._id) {
      throw new Error("Language not found or access denied");
    }

    if (args.isPrimary && language._id !== project.primaryLanguageId) {
      await ctx.db.patch(project._id, {
        primaryLanguageId: language._id,
      });
    }

    if (args.rules !== undefined) {
      await ctx.db.patch(language._id, {
        rules: args.rules,
      });
    }

    // Track analytics event
    await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
      workspaceId: args.workspaceId as unknown as string,
      projectId: args.projectId as unknown as string,
      projectName: project.name,
      event: "language.update",
      languageCode: language.languageCode,
    });
  },
});

export const deleteLanguage = mutation({
  args: {
    languageId: v.id("languages"),
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const language = await ctx.db.get(args.languageId);
    if (!language || language.projectId !== project._id) {
      throw new Error("Language not found or access denied");
    }

    if (project.primaryLanguageId === language._id) {
      const languages = await ctx.db
        .query("languages")
        .withIndex("by_project_status", (q) => q.eq("projectId", project._id).gt("status", -1))
        .paginate({ cursor: null, numItems: 2 });

      if (languages.page.length > 1) {
        throw new Error("Cannot delete primary language - there are other languages in the project");
      }

      await ctx.db.patch(project._id, {
        primaryLanguageId: undefined,
      });
    }

    await ctx.db.patch(args.languageId, { status: -1 });

    await ctx.scheduler.runAfter(0, internal.languages.deleteLanguageContents, {
      languageId: args.languageId,
      projectId: args.projectId,
      stage: "values",
      cursor: null,
    });

    // Track analytics event
    await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
      workspaceId: args.workspaceId as unknown as string,
      projectId: args.projectId as unknown as string,
      projectName: project.name,
      event: "language.deleted",
      languageCode: language.languageCode,
    });
  },
});

export const deleteLanguageContents = internalMutation({
  args: {
    languageId: v.id("languages"),
    projectId: v.id("projects"),
    stage: v.union(v.literal("values"), v.literal("keys"), v.literal("glossaryTerms"), v.literal("final")),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const LIMIT = 100;

    if (args.stage === "values") {
      const result = await ctx.db
        .query("translationValues")
        .withIndex("by_project_language", (q) => q.eq("projectId", args.projectId).eq("languageId", args.languageId))
        .paginate({ cursor: args.cursor, numItems: LIMIT });

      for (const doc of result.page) {
        await ctx.db.delete(doc._id);
      }

      if (!result.isDone) {
        await ctx.scheduler.runAfter(0, internal.languages.deleteLanguageContents, {
          ...args,
          cursor: result.continueCursor,
        });
      } else {
        await ctx.scheduler.runAfter(0, internal.languages.deleteLanguageContents, {
          ...args,
          stage: "keys",
          cursor: null,
        });
      }
      return;
    }

    if (args.stage === "keys") {
      const result = await ctx.db
        .query("translationKeys")
        .withIndex("by_project_namespace_key", (q) => q.eq("projectId", args.projectId))
        .paginate({ cursor: args.cursor, numItems: LIMIT });

      for (const doc of result.page) {
        let needsUpdate = false;

        const newValues = { ...doc.values };
        if (newValues[args.languageId] !== undefined) {
          delete newValues[args.languageId];
          needsUpdate = true;
        }

        if (needsUpdate) {
          if (Object.keys(newValues).length === 0) {
            await ctx.db.delete(doc._id);
          } else {
            await ctx.db.patch(doc._id, {
              values: newValues,
            });
          }
        }
      }

      if (!result.isDone) {
        await ctx.scheduler.runAfter(0, internal.languages.deleteLanguageContents, {
          ...args,
          cursor: result.continueCursor,
        });
      } else {
        await ctx.scheduler.runAfter(0, internal.languages.deleteLanguageContents, {
          ...args,
          stage: "glossaryTerms",
          cursor: null,
        });
      }
      return;
    }

    if (args.stage === "glossaryTerms") {
      const result = await ctx.db
        .query("glossaryTerms")
        .withIndex("by_project_term", (q) => q.eq("projectId", args.projectId))
        .paginate({ cursor: args.cursor, numItems: LIMIT });

      for (const doc of result.page) {
        let needsUpdate = false;

        const newValues = { ...doc.translations };
        if (newValues[args.languageId] !== undefined) {
          delete newValues[args.languageId];
          needsUpdate = true;
        }

        if (needsUpdate) {
          await ctx.db.patch(doc._id, {
            translations: newValues,
          });
        }
      }

      if (!result.isDone) {
        await ctx.scheduler.runAfter(0, internal.languages.deleteLanguageContents, {
          ...args,
          cursor: result.continueCursor,
        });
      } else {
        await ctx.scheduler.runAfter(0, internal.languages.deleteLanguageContents, {
          ...args,
          stage: "final",
          cursor: null,
        });
      }
      return;
    }

    if (args.stage === "final") {
      await ctx.db.delete(args.languageId);
    }
  },
});
