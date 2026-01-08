import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const resolveTranslationFile = internalQuery({
  args: {
    projectId: v.id("projects"),
    releaseTag: v.string(),
    namespaceName: v.string(),
    languageCode: v.string(),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db
      .query("releases")
      .withIndex("by_project_tag", (q) => q.eq("projectId", args.projectId).eq("tag", args.releaseTag))
      .first();

    if (!release) {
      return { error: "release_not_found" };
    }

    const connections = await ctx.db
      .query("releaseBuildConnections")
      .withIndex("by_release_build", (q) => q.eq("releaseId", release._id))
      .collect();

    const buildPromises = connections.map(async (conn) => {
      const doc = await ctx.db.get(conn.buildId);
      return {
        buildId: conn.buildId,
        selectionChance: conn.selectionChance,
        doc,
      };
    });

    const allBuilds = await Promise.all(buildPromises);

    const candidates = allBuilds.filter((b) => b.doc && b.doc.status === 1 && b.doc.namespace === args.namespaceName);

    if (candidates.length === 0) {
      return { error: "namespace_not_found" };
    }

    let selectedBuild = candidates[0].doc!;

    if (candidates.length > 1) {
      const rnd = Math.random() * 100;
      let currentSum = 0;

      for (const candidate of candidates) {
        currentSum += candidate.selectionChance;
        if (rnd <= currentSum) {
          selectedBuild = candidate.doc!;
          break;
        }
      }
    }

    const fileInfo = selectedBuild.languageFiles[args.languageCode];

    if (!fileInfo) {
      return { error: "language_not_found" };
    }

    return { fileId: fileInfo.fileId };
  },
});

/**
 * Resolves a single translation key value for a specific language.
 * Used by /v1/keys API endpoint.
 */
export const resolveSingleKey = internalQuery({
  args: {
    projectId: v.id("projects"),
    keyTag: v.string(),
    namespaceName: v.string(),
    languageCode: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the namespace
    const namespace = await ctx.db
      .query("namespaces")
      .withIndex("by_project_name", (q) => q.eq("projectId", args.projectId).eq("name", args.namespaceName))
      .first();

    if (!namespace || namespace.status !== 1) {
      return { error: "namespace_not_found" as const };
    }

    // Find the language
    const language = await ctx.db
      .query("languages")
      .withIndex("by_project_language", (q) => q.eq("projectId", args.projectId).eq("languageCode", args.languageCode))
      .first();

    if (!language || language.status !== 1) {
      return { error: "language_not_found" as const };
    }

    // Find the translation key
    const translationKey = await ctx.db
      .query("translationKeys")
      .withIndex("by_project_namespace_key", (q) =>
        q.eq("projectId", args.projectId).eq("namespaceId", namespace._id).eq("key", args.keyTag),
      )
      .first();

    if (!translationKey || translationKey.status !== 1) {
      return { error: "key_not_found" as const };
    }

    // Get the value for the specific language
    const value = translationKey.values[language._id];

    if (value === undefined) {
      return { error: "value_not_found" as const };
    }

    return {
      key: translationKey.key,
      value,
      namespace: args.namespaceName,
      language: args.languageCode,
    };
  },
});

/**
 * Resolves a build by tag and returns all language files.
 * Used by /v1/builds API endpoint (all languages).
 */
export const resolveBuildAllLanguages = internalQuery({
  args: {
    projectId: v.id("projects"),
    buildTag: v.string(),
  },
  handler: async (ctx, args) => {
    const build = await ctx.db
      .query("builds")
      .withIndex("by_project_tag", (q) => q.eq("projectId", args.projectId).eq("tag", args.buildTag))
      .first();

    if (!build) {
      return { error: "build_not_found" as const };
    }

    if (build.status !== 1) {
      return { error: "build_not_ready" as const, statusDescription: build.statusDescription };
    }

    return {
      tag: build.tag,
      namespace: build.namespace,
      languageFiles: build.languageFiles,
    };
  },
});

/**
 * Resolves a build by tag and returns a specific language file.
 * Used by /v1/builds API endpoint (single language).
 */
export const resolveBuildSingleLanguage = internalQuery({
  args: {
    projectId: v.id("projects"),
    buildTag: v.string(),
    languageCode: v.string(),
  },
  handler: async (ctx, args) => {
    const build = await ctx.db
      .query("builds")
      .withIndex("by_project_tag", (q) => q.eq("projectId", args.projectId).eq("tag", args.buildTag))
      .first();

    if (!build) {
      return { error: "build_not_found" as const };
    }

    if (build.status !== 1) {
      return { error: "build_not_ready" as const, statusDescription: build.statusDescription };
    }

    const fileInfo = build.languageFiles[args.languageCode];

    if (!fileInfo) {
      return { error: "language_not_found" as const };
    }

    return {
      tag: build.tag,
      namespace: build.namespace,
      fileId: fileInfo.fileId,
      fileSize: fileInfo.fileSize,
    };
  },
});

/**
 * Creates a new build via API.
 * Used by /v1/builds POST endpoint.
 */
export const createBuildViaApi = internalMutation({
  args: {
    projectId: v.id("projects"),
    namespaceName: v.string(),
    buildTag: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the namespace
    const namespace = await ctx.db
      .query("namespaces")
      .withIndex("by_project_name", (q) => q.eq("projectId", args.projectId).eq("name", args.namespaceName))
      .first();

    if (!namespace || namespace.status !== 1) {
      return { error: "namespace_not_found" as const };
    }

    // Check if build tag already exists
    const existing = await ctx.db
      .query("builds")
      .withIndex("by_project_tag", (q) => q.eq("projectId", args.projectId).eq("tag", args.buildTag))
      .first();

    if (existing) {
      return { error: "build_tag_exists" as const };
    }

    // Create the build
    const buildId = await ctx.db.insert("builds", {
      projectId: args.projectId,
      namespace: namespace.name,
      tag: args.buildTag,
      status: 2,
      languageFiles: {},
      statusDescription: "Initializing...",
    });

    // Get all active languages for this project
    const languages = await ctx.db
      .query("languages")
      .withIndex("by_project_status", (q) => q.eq("projectId", args.projectId).gt("status", -1))
      .collect();

    const languagesData = languages.map((l) => ({
      id: l._id,
      code: l.languageCode,
    }));

    return {
      buildId,
      namespaceId: namespace._id,
      languagesData,
    };
  },
});
