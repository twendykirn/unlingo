import { paginationOptsValidator } from "convex/server";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { authMiddleware } from "../middlewares/auth";

export const getNamespaces = query({
  args: {
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    if (args.search) {
      return await ctx.db
        .query("namespaces")
        .withSearchIndex("search", (q) => q.search("name", args.search!).eq("projectId", args.projectId))
        .filter((q) => q.gt(q.field("status"), -1))
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("namespaces")
      .withIndex("by_project_status", (q) => q.eq("projectId", args.projectId).gt("status", -1))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getNamespace = query({
  args: {
    namespaceId: v.id("namespaces"),
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const namespace = await ctx.db.get(args.namespaceId);

    if (!namespace || namespace.projectId !== args.projectId || namespace.status === -1) {
      throw new Error("Namespace not found or access denied");
    }

    return namespace;
  },
});

export const createNamespace = mutation({
  args: {
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    if (!args.name.trim()) {
      throw new Error("Namespace name cannot be empty");
    }

    if (args.name.length > 100) {
      throw new Error("Namespace name cannot exceed 100 characters");
    }

    // Validate namespace name format (allow alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(args.name)) {
      throw new Error("Namespace name can only contain letters, numbers, hyphens, and underscores");
    }

    const existingNamespace = await ctx.db
      .query("namespaces")
      .withIndex("by_project_name", (q) => q.eq("projectId", args.projectId).eq("name", args.name.trim()))
      .first();

    if (existingNamespace) {
      throw new Error("A namespace with this name already exists in this project");
    }

    const namespaceId = await ctx.db.insert("namespaces", {
      projectId: args.projectId,
      name: args.name.trim(),
      status: 1,
      currentUsage: {
        translationKeys: 0,
      },
    });

    return namespaceId;
  },
});

export const updateNamespace = mutation({
  args: {
    namespaceId: v.id("namespaces"),
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const namespace = await ctx.db.get(args.namespaceId);

    if (!namespace || namespace.projectId !== args.projectId) {
      throw new Error("Namespace not found");
    }

    if (!args.name.trim()) {
      throw new Error("Namespace name cannot be empty");
    }

    if (args.name.length > 100) {
      throw new Error("Namespace name cannot exceed 100 characters");
    }

    // Validate namespace name format (allow alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(args.name)) {
      throw new Error("Namespace name can only contain letters, numbers, hyphens, and underscores");
    }

    if (args.name.trim() !== namespace.name) {
      const existingNamespace = await ctx.db
        .query("namespaces")
        .withIndex("by_project_name", (q) => q.eq("projectId", args.projectId).eq("name", args.name.trim()))
        .filter((q) => q.eq(q.field("name"), args.name.trim()))
        .first();

      if (existingNamespace) {
        throw new Error("A namespace with this name already exists in this project");
      }

      await ctx.db.patch(args.namespaceId, {
        name: args.name.trim(),
      });
    }

    return args.namespaceId;
  },
});

export const deleteNamespace = mutation({
  args: {
    namespaceId: v.id("namespaces"),
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const workspace = await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const namespace = await ctx.db.get(args.namespaceId);

    if (!namespace || namespace.projectId !== args.projectId) {
      throw new Error("Namespace not found or access denied");
    }

    await ctx.db.patch(args.namespaceId, { status: -1 });
    await ctx.db.patch(project._id, {
      currentUsage: {
        ...project.currentUsage,
        translationKeys: project.currentUsage.translationKeys - namespace.currentUsage.translationKeys,
      },
    });
    await ctx.db.patch(workspace._id, {
      currentUsage: {
        ...workspace.currentUsage,
        translationKeys: workspace.currentUsage.translationKeys - namespace.currentUsage.translationKeys,
      },
    });

    await ctx.scheduler.runAfter(0, internal.namespaces.deleteNamespaceContents, {
      namespaceId: args.namespaceId,
      projectId: args.projectId,
      stage: "values",
      cursor: null,
    });
  },
});

export const deleteNamespaceContents = internalMutation({
  args: {
    namespaceId: v.id("namespaces"),
    projectId: v.id("projects"),
    stage: v.union(
      v.literal("values"),
      v.literal("keys"),
      v.literal("builds"),
      v.literal("mappings"),
      v.literal("releases"),
      v.literal("final"),
    ),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const LIMIT = 200;

    if (args.stage === "values") {
      const result = await ctx.db
        .query("translationValues")
        .withIndex("by_project_namespace_language_key", (q) =>
          q.eq("projectId", args.projectId).eq("namespaceId", args.namespaceId),
        )
        .paginate({ cursor: args.cursor, numItems: LIMIT });

      for (const doc of result.page) {
        await ctx.db.delete(doc._id);
      }

      if (!result.isDone) {
        await ctx.scheduler.runAfter(0, internal.namespaces.deleteNamespaceContents, {
          ...args,
          cursor: result.continueCursor,
        });
      } else {
        await ctx.scheduler.runAfter(0, internal.namespaces.deleteNamespaceContents, {
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
        .withIndex("by_project_namespace_key", (q) =>
          q.eq("projectId", args.projectId).eq("namespaceId", args.namespaceId),
        )
        .paginate({ cursor: args.cursor, numItems: LIMIT });

      for (const doc of result.page) {
        await ctx.db.delete(doc._id);
      }

      if (!result.isDone) {
        await ctx.scheduler.runAfter(0, internal.namespaces.deleteNamespaceContents, {
          ...args,
          cursor: result.continueCursor,
        });
      } else {
        await ctx.scheduler.runAfter(0, internal.namespaces.deleteNamespaceContents, {
          ...args,
          stage: "mappings",
          cursor: null,
        });
      }
      return;
    }

    if (args.stage === "mappings") {
      const result = await ctx.db
        .query("screenshotKeyMappings")
        .withIndex("by_namespace_translation_key", (q) => q.eq("namespaceId", args.namespaceId))
        .paginate({ cursor: args.cursor, numItems: LIMIT });

      for (const doc of result.page) {
        await ctx.db.delete(doc._id);
      }

      if (!result.isDone) {
        await ctx.scheduler.runAfter(0, internal.namespaces.deleteNamespaceContents, {
          ...args,
          cursor: result.continueCursor,
        });
      } else {
        await ctx.scheduler.runAfter(0, internal.namespaces.deleteNamespaceContents, {
          ...args,
          stage: "final",
          cursor: null,
        });
      }
      return;
    }

    if (args.stage === "final") {
      await ctx.db.delete(args.namespaceId);
    }
  },
});

export const getNamespaceInternal = internalQuery({
  args: {
    namespaceId: v.id("namespaces"),
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const namespace = await ctx.db.get(args.namespaceId);

    if (!namespace || namespace.projectId !== args.projectId) {
      throw new Error("Namespace not found or access denied");
    }

    return namespace;
  },
});
