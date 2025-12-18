import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, mutation, MutationCtx, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { generateTranslation } from "../lib/gemini";

export const getTranslationKeys = query({
  args: {
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
    namespaceId: v.id("namespaces"),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || identity.org !== workspace.clerkId) {
      throw new Error("Workspace not found or access denied");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    if (args.search) {
      return await ctx.db
        .query("translationKeys")
        .withSearchIndex("search", (q) =>
          q.search("key", args.search!).eq("projectId", args.projectId).eq("namespaceId", args.namespaceId),
        )
        .filter((q) => q.gt(q.field("status"), -1))
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("translationKeys")
      .withIndex("by_project_namespace_key", (q) =>
        q.eq("projectId", args.projectId).eq("namespaceId", args.namespaceId),
      )
      .filter((q) => q.gt(q.field("status"), -1))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getTranslationKeysGlobalSearch = query({
  args: {
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
    search: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || identity.org !== workspace.clerkId) {
      throw new Error("Workspace not found or access denied");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    if (!args.search) return [];

    const results = await ctx.db
      .query("translationKeys")
      .withSearchIndex("search", (q) => q.search("key", args.search).eq("projectId", args.projectId))
      .filter((q) => q.gt(q.field("status"), -1))
      .take(50);

    if (results.length === 0) return [];

    const namespaceIds = new Set<Id<"namespaces">>();
    results.forEach((k) => namespaceIds.add(k.namespaceId));

    const namespaces = await Promise.all([...namespaceIds].map((id) => ctx.db.get(id)));

    const nsMap = new Map<Id<"namespaces">, string>();
    namespaces.forEach((ns) => {
      if (ns) {
        nsMap.set(ns._id, ns.name);
      }
    });

    return results.map((key) => ({
      _id: key._id,
      key: key.key,
      status: key.status,
      namespaceName: nsMap.get(key.namespaceId) || "Unknown Namespace",
      namespaceId: key.namespaceId,
    }));
  },
});

async function upsertTranslationValue(
  ctx: MutationCtx,
  args: {
    projectId: Id<"projects">;
    namespaceId: Id<"namespaces">;
    languageId: Id<"languages">;
    translationKeyId: Id<"translationKeys">;
    key: string;
    value: string;
  },
) {
  const existing = await ctx.db
    .query("translationValues")
    .withIndex("by_project_namespace_language_key", (q) =>
      q
        .eq("projectId", args.projectId)
        .eq("namespaceId", args.namespaceId)
        .eq("languageId", args.languageId)
        .eq("translationKeyId", args.translationKeyId),
    )
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      values: args.value,
      key: args.key,
    });
  } else {
    await ctx.db.insert("translationValues", {
      projectId: args.projectId,
      namespaceId: args.namespaceId,
      languageId: args.languageId,
      translationKeyId: args.translationKeyId,
      key: args.key,
      values: args.value,
    });
  }
}

export const createTranslationKey = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    namespaceId: v.id("namespaces"),
    key: v.string(),
    primaryValue: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || identity.org !== workspace.clerkId) {
      throw new Error("Workspace not found or access denied");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== workspace._id || !project.primaryLanguageId) {
      throw new Error("Project not found or access denied");
    }

    const namespace = await ctx.db.get(args.namespaceId);
    if (!namespace || namespace.projectId !== project._id || namespace.status !== 1) {
      throw new Error("Namespace not found or access denied");
    }

    const language = await ctx.db.get(project.primaryLanguageId);
    if (!language) {
      throw new Error("Language not found or access denied");
    }

    if (workspace.currentUsage.translationKeys >= workspace.limits.translationKeys) {
      throw new Error("You have reached the maximum number of translation keys");
    }

    const existing = await ctx.db
      .query("translationKeys")
      .withIndex("by_project_namespace_key", (q) =>
        q.eq("projectId", args.projectId).eq("namespaceId", args.namespaceId).eq("key", args.key),
      )
      .first();

    if (existing && existing.status !== -1) {
      throw new Error("Key already exists");
    }

    const keyId = await ctx.db.insert("translationKeys", {
      projectId: args.projectId,
      namespaceId: args.namespaceId,
      key: args.key,
      status: 2,
      values: {
        [project.primaryLanguageId]: args.primaryValue,
      },
      statuses: {
        [project.primaryLanguageId]: 1,
      },
    });

    if (keyId) {
      await ctx.db.patch(namespace._id, {
        currentUsage: {
          ...namespace.currentUsage,
          translationKeys: namespace.currentUsage.translationKeys + 1,
        },
      });
      await ctx.db.patch(project._id, {
        currentUsage: {
          ...project.currentUsage,
          translationKeys: project.currentUsage.translationKeys + 1,
        },
      });
      await ctx.db.patch(workspace._id, {
        currentUsage: {
          ...workspace.currentUsage,
          translationKeys: workspace.currentUsage.translationKeys + 1,
        },
      });
    }

    await upsertTranslationValue(ctx, {
      projectId: args.projectId,
      namespaceId: args.namespaceId,
      languageId: project.primaryLanguageId,
      translationKeyId: keyId,
      key: args.key,
      value: args.primaryValue,
    });

    await ctx.scheduler.runAfter(0, internal.translationKeys.translateBatchAction, {
      projectId: args.projectId,
      keyIds: [keyId],
      targetLanguageIds: null,
    });

    return keyId;
  },
});

export const updateTranslationKey = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    namespaceId: v.id("namespaces"),
    keyId: v.id("translationKeys"),
    languageId: v.id("languages"),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || identity.org !== workspace.clerkId) {
      throw new Error("Workspace not found or access denied");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId || !project.primaryLanguageId) {
      throw new Error("Project not found or access denied");
    }

    const namespace = await ctx.db.get(args.namespaceId);
    if (!namespace || namespace.projectId !== project._id || namespace.status !== 1) {
      throw new Error("Namespace not found or access denied");
    }

    const language = await ctx.db.get(args.languageId);
    if (!language || language.projectId !== project._id) {
      throw new Error("Language not found or access denied");
    }

    const keyDoc = await ctx.db.get(args.keyId);
    if (!keyDoc || keyDoc.projectId !== project._id || keyDoc.namespaceId !== namespace._id) {
      throw new Error("Translation key not found");
    }

    if (keyDoc.status === 2) {
      throw new Error("Key is currently being processed. Please wait.");
    }

    const isPrimary = project.primaryLanguageId === args.languageId;
    const newStatus = isPrimary ? 2 : 1;

    const newValues = { ...keyDoc.values, [args.languageId]: args.value };
    const newStatuses = { ...keyDoc.statuses, [args.languageId]: 1 };

    await ctx.db.patch(args.keyId, {
      values: newValues,
      statuses: newStatuses,
      status: newStatus,
    });

    await upsertTranslationValue(ctx, {
      projectId: keyDoc.projectId,
      namespaceId: keyDoc.namespaceId,
      languageId: args.languageId,
      translationKeyId: args.keyId,
      key: keyDoc.key,
      value: args.value,
    });

    if (isPrimary) {
      await ctx.scheduler.runAfter(0, internal.translationKeys.translateBatchAction, {
        projectId: keyDoc.projectId,
        keyIds: [args.keyId],
        targetLanguageIds: null,
      });
    }
  },
});

export const triggerBatchTranslation = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    namespaceId: v.id("namespaces"),
    keyIds: v.array(v.id("translationKeys")),
    targetLanguageIds: v.union(v.array(v.id("languages")), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || identity.org !== workspace.clerkId) {
      throw new Error("Workspace not found or access denied");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== workspace._id || !project.primaryLanguageId) {
      throw new Error("Project not found or access denied");
    }

    const namespace = await ctx.db.get(args.namespaceId);
    if (!namespace || namespace.projectId !== project._id || namespace.status !== 1) {
      throw new Error("Namespace not found or access denied");
    }

    for (const keyId of args.keyIds) {
      const key = await ctx.db.get(keyId);

      if (key && key.status !== -1) {
        await ctx.db.patch(keyId, { status: 2 });
      }
    }

    const CHUNK_SIZE = 20;
    for (let i = 0; i < args.keyIds.length; i += CHUNK_SIZE) {
      const chunk = args.keyIds.slice(i, i + CHUNK_SIZE);

      await ctx.scheduler.runAfter(0, internal.translationKeys.translateBatchAction, {
        projectId: args.projectId,
        keyIds: chunk,
        targetLanguageIds: args.targetLanguageIds,
      });
    }
  },
});

export const getBatchTranslationData = internalQuery({
  args: {
    projectId: v.id("projects"),
    keyIds: v.array(v.id("translationKeys")),
    targetLanguageIds: v.union(v.array(v.id("languages")), v.null()),
    overrideSourceLanguageId: v.optional(v.id("languages")),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project?.primaryLanguageId) {
      throw new Error("Primary language missing");
    }

    const sourceLanguageId = args.overrideSourceLanguageId ?? project.primaryLanguageId;
    if (!sourceLanguageId) {
      return { sourceData: {}, targetLanguages: [] };
    }

    let targetLanguages;

    if (args.targetLanguageIds) {
      targetLanguages = await Promise.all(args.targetLanguageIds.map((id) => ctx.db.get(id)));
    } else {
      const allLangs = await ctx.db
        .query("languages")
        .withIndex("by_project_status", (q) => q.eq("projectId", args.projectId).gt("status", -1))
        .collect();

      targetLanguages = allLangs.filter((l) => l._id !== sourceLanguageId);
    }

    const validTargetLanguages = targetLanguages.filter((l): l is NonNullable<typeof l> => !!l);

    const sourceData: Record<string, string> = {};
    for (const keyId of args.keyIds) {
      const keyDoc = await ctx.db.get(keyId);

      if (keyDoc && keyDoc.status !== -1) {
        const sourceVal = keyDoc.values[sourceLanguageId];

        if (sourceVal) {
          sourceData[keyDoc._id] = sourceVal;
        }
      }
    }

    return {
      sourceData,
      targetLanguages: validTargetLanguages.map((l) => ({ _id: l._id, code: l.languageCode, rules: l.rules })),
    };
  },
});

export const translateBatchAction = internalAction({
  args: {
    projectId: v.id("projects"),
    keyIds: v.array(v.id("translationKeys")),
    targetLanguageIds: v.nullable(v.array(v.id("languages"))),
    overrideSourceLanguageId: v.optional(v.id("languages")),
  },
  handler: async (ctx, args) => {
    const { sourceData, targetLanguages } = await ctx.runQuery(internal.translationKeys.getBatchTranslationData, args);

    if (Object.keys(sourceData).length === 0 || targetLanguages.length === 0) {
      if (args.keyIds.length > 0) {
        await ctx.runMutation(internal.translationKeys.unlockKeys, { keyIds: args.keyIds });
      }
      return;
    }

    const resultsByLanguage: Record<string, Record<string, string>> = {};

    for (const lang of targetLanguages) {
      const glossaryRules = await ctx.runQuery(internal.glossary.getGlossaryContext, {
        projectId: args.projectId,
        languageId: lang._id,
      });

      try {
        const translatedMap = await generateTranslation(sourceData, lang.code, glossaryRules, lang.rules);
        resultsByLanguage[lang._id] = translatedMap;
      } catch (err) {
        console.error(`Translation failed for ${lang.code}`, err);
      }
    }

    await ctx.runMutation(internal.translationKeys.saveTranslationBatch, {
      resultsByLanguage,
      processedKeyIds: args.keyIds,
    });
  },
});

export const unlockKeys = internalMutation({
  args: { keyIds: v.array(v.id("translationKeys")) },
  handler: async (ctx, args) => {
    for (const id of args.keyIds) {
      const key = await ctx.db.get(id);
      if (key && key.status === 2) {
        await ctx.db.patch(id, { status: 1 });
      }
    }
  },
});

export const saveTranslationBatch = internalMutation({
  args: {
    resultsByLanguage: v.record(v.id("languages"), v.record(v.string(), v.string())),
    processedKeyIds: v.array(v.id("translationKeys")),
  },
  handler: async (ctx, args) => {
    const { resultsByLanguage, processedKeyIds } = args;

    for (const keyId of processedKeyIds) {
      const keyDoc = await ctx.db.get(keyId);
      if (!keyDoc || keyDoc.status === -1) continue;

      const newValues = { ...keyDoc.values };
      const newStatuses = { ...keyDoc.statuses };

      for (const [langId, translations] of Object.entries(resultsByLanguage)) {
        const translatedValue = translations[keyId];

        if (translatedValue) {
          newValues[langId as Id<"languages">] = translatedValue;
          newStatuses[langId as Id<"languages">] = 1;

          await upsertTranslationValue(ctx, {
            projectId: keyDoc.projectId,
            namespaceId: keyDoc.namespaceId,
            languageId: langId as Id<"languages">,
            translationKeyId: keyId,
            key: keyDoc.key,
            value: translatedValue,
          });
        }
      }

      await ctx.db.patch(keyId, {
        values: newValues,
        statuses: newStatuses,
        status: 1,
      });
    }
  },
});

export const deleteTranslationKeys = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    namespaceId: v.id("namespaces"),
    keyIds: v.array(v.id("translationKeys")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || identity.org !== workspace.clerkId) {
      throw new Error("Workspace not found or access denied");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== workspace._id || !project.primaryLanguageId) {
      throw new Error("Project not found or access denied");
    }

    const namespace = await ctx.db.get(args.namespaceId);
    if (!namespace || namespace.projectId !== project._id || namespace.status !== 1) {
      throw new Error("Namespace not found or access denied");
    }

    let count = 0;

    for (const keyId of args.keyIds) {
      const key = await ctx.db.get(keyId);
      if (!key) {
        continue;
      }

      count++;

      await ctx.db.patch(key._id, { status: -1 });

      const languageIds = Object.keys(key.values);

      for (const langId of languageIds) {
        const valueRow = await ctx.db
          .query("translationValues")
          .withIndex("by_project_namespace_language_key", (q) =>
            q
              .eq("projectId", key.projectId)
              .eq("namespaceId", key.namespaceId)
              .eq("languageId", langId as Id<"languages">)
              .eq("translationKeyId", key._id),
          )
          .first();

        if (valueRow) {
          await ctx.db.delete(valueRow._id);
        }
      }

      const mappings = await ctx.db
        .query("screenshotKeyMappings")
        .withIndex("by_namespace_translation_key", (q) =>
          q.eq("namespaceId", key.namespaceId).eq("translationKeyId", key._id),
        )
        .collect();

      for (const mapping of mappings) {
        await ctx.db.delete(mapping._id);
      }

      await ctx.db.delete(key._id);
    }

    await ctx.db.patch(namespace._id, {
      currentUsage: {
        ...namespace.currentUsage,
        translationKeys: namespace.currentUsage.translationKeys - count,
      },
    });

    await ctx.db.patch(project._id, {
      currentUsage: {
        ...project.currentUsage,
        translationKeys: project.currentUsage.translationKeys - count,
      },
    });

    await ctx.db.patch(workspace._id, {
      currentUsage: {
        ...workspace.currentUsage,
        translationKeys: workspace.currentUsage.translationKeys - count,
      },
    });
  },
});
