import { v } from "convex/values";
import { mutation, internalMutation, internalQuery, internalAction, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { unflattenJson } from "./utils/jsonFlatten";
import { r2 } from "./files";
import { paginationOptsValidator, PaginationResult } from "convex/server";
import { Id } from "./_generated/dataModel";

export const getBuilds = query({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
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
        .query("builds")
        .withSearchIndex("search", (q) => q.search("tag", args.search!).eq("projectId", args.projectId))
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("builds")
      .withIndex("by_project_tag", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const createBuild = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    namespaceId: v.id("namespaces"),
    tag: v.string(),
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

    const namespace = await ctx.db.get(args.namespaceId);
    if (!namespace || namespace.projectId !== project._id) {
      throw new Error("Namespace not found or access denied");
    }

    const existing = await ctx.db
      .query("builds")
      .withIndex("by_project_tag", (q) => q.eq("projectId", args.projectId).eq("tag", args.tag))
      .first();

    if (existing) {
      throw new Error(`Build tag "${args.tag}" already exists in this project.`);
    }

    const buildId = await ctx.db.insert("builds", {
      projectId: args.projectId,
      namespace: namespace.name,
      tag: args.tag,
      status: 2,
      languageFiles: {},
      statusDescription: "Initializing...",
    });

    const languages = await ctx.db
      .query("languages")
      .withIndex("by_project_status", (q) => q.eq("projectId", args.projectId).gt("status", -1))
      .collect();

    const languagesData = languages.map((l) => ({
      id: l._id,
      code: l.languageCode,
    }));

    await ctx.scheduler.runAfter(0, internal.builds.generateLanguageAction, {
      buildId,
      projectId: args.projectId,
      namespaceId: args.namespaceId,
      queue: languagesData,
    });

    return buildId;
  },
});

export const updateBuild = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    buildId: v.id("builds"),
    tag: v.string(),
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

    const build = await ctx.db.get(args.buildId);
    if (!build) {
      throw new Error("Build not found or access denied");
    }

    const project = await ctx.db.get(build.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    if (build.tag === args.tag) {
      return;
    }

    const existing = await ctx.db
      .query("builds")
      .withIndex("by_project_tag", (q) => q.eq("projectId", build.projectId).eq("tag", args.tag))
      .first();

    if (existing && existing._id !== args.buildId) {
      throw new Error(`Tag "${args.tag}" is already taken.`);
    }

    await ctx.db.patch(args.buildId, { tag: args.tag });
  },
});

export const deleteBuild = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    buildId: v.id("builds"),
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

    const build = await ctx.db.get(args.buildId);
    if (!build) {
      throw new Error("Build not found or access denied");
    }

    const project = await ctx.db.get(build.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    await ctx.db.delete(args.buildId);

    if (Object.keys(build.languageFiles).length > 0) {
      for (const file of Object.values(build.languageFiles)) {
        await r2.deleteObject(ctx, file.fileId);
      }
    }
  },
});

export const fetchValuesPage = internalQuery({
  args: {
    projectId: v.id("projects"),
    namespaceId: v.id("namespaces"),
    languageId: v.id("languages"),
    cursor: v.union(v.string(), v.null()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("translationValues")
      .withIndex("by_project_namespace_language_key", (q) =>
        q.eq("projectId", args.projectId).eq("namespaceId", args.namespaceId).eq("languageId", args.languageId),
      )
      .paginate({ cursor: args.cursor, numItems: args.limit });
  },
});

export const generateLanguageAction = internalAction({
  args: {
    buildId: v.id("builds"),
    projectId: v.id("projects"),
    namespaceId: v.id("namespaces"),
    queue: v.array(v.object({ id: v.id("languages"), code: v.string() })),
  },
  handler: async (ctx, args) => {
    const currentLanguage = args.queue[0];

    try {
      const flatMap: Record<string, string> = {};
      let isDone = false;
      let cursor = null;

      while (!isDone) {
        const result: PaginationResult<{
          _id: Id<"translationValues">;
          _creationTime: number;
          projectId: Id<"projects">;
          namespaceId: Id<"namespaces">;
          key: string;
          values: string;
          languageId: Id<"languages">;
          translationKeyId: Id<"translationKeys">;
        }> = await ctx.runQuery(internal.builds.fetchValuesPage, {
          projectId: args.projectId,
          namespaceId: args.namespaceId,
          languageId: currentLanguage.id,
          cursor,
          limit: 2000,
        });

        for (const item of result.page) {
          flatMap[item.key] = item.values;
        }
        cursor = result.continueCursor;
        isDone = result.isDone;
      }

      const nestedJson = unflattenJson(flatMap);
      const blob = new Blob([JSON.stringify(nestedJson, null, 2)], { type: "application/json" });
      const fileId = await r2.store(ctx, blob);

      await ctx.runMutation(internal.builds.saveLanguageResult, {
        buildId: args.buildId,
        namespaceId: args.namespaceId,
        languageCode: currentLanguage.code,
        fileId,
        fileSize: blob.size,
        remainingQueue: args.queue.slice(1),
      });
    } catch (error) {
      console.error(`Build failed`, error);
      await ctx.runMutation(internal.builds.handleBuildFailure, { buildId: args.buildId });
    }
  },
});

export const saveLanguageResult = internalMutation({
  args: {
    buildId: v.id("builds"),
    namespaceId: v.id("namespaces"),
    languageCode: v.string(),
    fileId: v.string(),
    fileSize: v.number(),
    remainingQueue: v.array(v.object({ id: v.id("languages"), code: v.string() })),
  },
  handler: async (ctx, args) => {
    const build = await ctx.db.get(args.buildId);

    if (!build) {
      await r2.deleteObject(ctx, args.fileId);
      return;
    }

    const newLanguageFiles = {
      ...build.languageFiles,
      [args.languageCode]: {
        fileId: args.fileId,
        fileSize: args.fileSize,
      },
    };

    if (args.remainingQueue.length === 0) {
      await ctx.db.patch(args.buildId, {
        languageFiles: newLanguageFiles,
        status: 1,
        statusDescription: undefined,
      });
    } else {
      await ctx.db.patch(args.buildId, {
        languageFiles: newLanguageFiles,
        statusDescription: `Processing... (${args.remainingQueue.length} languages remaining)`,
      });

      await ctx.scheduler.runAfter(0, internal.builds.generateLanguageAction, {
        buildId: args.buildId,
        projectId: build.projectId,
        namespaceId: args.namespaceId,
        queue: args.remainingQueue,
      });
    }
  },
});

export const handleBuildFailure = internalMutation({
  args: { buildId: v.id("builds") },
  handler: async (ctx, args) => {
    const build = await ctx.db.get(args.buildId);
    if (!build) return;

    await ctx.db.delete(args.buildId);

    if (Object.keys(build.languageFiles).length > 0) {
      for (const file of Object.values(build.languageFiles)) {
        await r2.deleteObject(ctx, file.fileId);
      }
    }
  },
});
