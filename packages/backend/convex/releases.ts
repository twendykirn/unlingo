import { paginationOptsValidator } from "convex/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { authMiddleware } from "../middlewares/auth";

const buildInput = v.object({
  buildId: v.id("builds"),
  selectionChance: v.number(),
});

export const getReleases = query({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
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
        .query("releases")
        .withSearchIndex("search", (q) => q.search("tag", args.search!).eq("projectId", args.projectId))
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("releases")
      .withIndex("by_project_tag", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getReleaseConnections = query({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const release = await ctx.db.get(args.releaseId);
    if (!release || release.projectId !== args.projectId) {
      throw new Error("Release not found or access denied");
    }

    const connections = await ctx.db
      .query("releaseBuildConnections")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .collect();

    const result = await Promise.all(
      connections.map(async (conn) => {
        const build = await ctx.db.get(conn.buildId);
        return {
          ...conn,
          build,
        };
      })
    );

    return result.filter((r) => r.build !== null && r.build.status !== -1);
  },
});

export const createRelease = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    tag: v.string(),
    builds: v.array(buildInput),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    if (!args.tag.trim()) {
      throw new Error("Release tag cannot be empty");
    }

    if (args.tag.length > 50) {
      throw new Error("Release tag cannot exceed 50 characters");
    }

    const existing = await ctx.db
      .query("releases")
      .withIndex("by_project_tag", (q) => q.eq("projectId", args.projectId).eq("tag", args.tag))
      .first();

    if (existing) {
      throw new Error(`Release tag "${args.tag}" already exists.`);
    }

    await validateBuildsConfiguration(ctx, args.projectId, args.builds);

    const releaseId = await ctx.db.insert("releases", {
      projectId: args.projectId,
      tag: args.tag,
    });

    for (const build of args.builds) {
      await ctx.db.insert("releaseBuildConnections", {
        releaseId,
        buildId: build.buildId,
        selectionChance: build.selectionChance,
      });
    }

    return releaseId;
  },
});

export const updateRelease = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    releaseId: v.id("releases"),
    tag: v.optional(v.string()),
    builds: v.optional(v.array(buildInput)),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const release = await ctx.db.get(args.releaseId);
    if (!release) {
      throw new Error("Release not found or access denied");
    }

    const updates: any = {};

    if (args.tag?.trim() && args.tag.trim() !== release.tag) {
      if (args.tag.length > 50) {
        throw new Error("Release tag cannot exceed 50 characters");
      }

      const existing = await ctx.db
        .query("releases")
        .withIndex("by_project_tag", (q) => q.eq("projectId", release.projectId).eq("tag", args.tag!))
        .first();

      if (existing && existing._id !== args.releaseId) {
        throw new Error(`Release tag "${args.tag}" is already taken.`);
      }

      updates.tag = args.tag;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.releaseId, updates);
    }

    if (args.builds) {
      await validateBuildsConfiguration(ctx, release.projectId, args.builds);

      const existingConnections = await ctx.db
        .query("releaseBuildConnections")
        .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
        .collect();

      for (const conn of existingConnections) {
        await ctx.db.delete(conn._id);
      }

      for (const build of args.builds) {
        await ctx.db.insert("releaseBuildConnections", {
          releaseId: args.releaseId,
          buildId: build.buildId,
          selectionChance: build.selectionChance,
        });
      }
    }
  },
});

export const addBuildToRelease = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    releaseId: v.id("releases"),
    buildId: v.id("builds"),
    selectionChance: v.number(),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const release = await ctx.db.get(args.releaseId);
    if (!release || release.projectId !== args.projectId) {
      throw new Error("Release not found or access denied");
    }

    const build = await ctx.db.get(args.buildId);
    if (!build || build.projectId !== args.projectId) {
      throw new Error("Build not found or access denied");
    }

    if (build.status !== 1) {
      throw new Error(`Build ${build.tag} is not active.`);
    }

    const existingConnection = await ctx.db
      .query("releaseBuildConnections")
      .withIndex("by_release_build", (q) => q.eq("releaseId", args.releaseId).eq("buildId", args.buildId))
      .first();

    if (existingConnection) {
      throw new Error("Build is already connected to this release.");
    }

    await ctx.db.insert("releaseBuildConnections", {
      releaseId: args.releaseId,
      buildId: args.buildId,
      selectionChance: args.selectionChance,
    });

    await recalculateConnectionPercentages(ctx, args.releaseId, build.namespace);
  },
});

export const removeBuildFromRelease = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    releaseId: v.id("releases"),
    connectionId: v.id("releaseBuildConnections"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const release = await ctx.db.get(args.releaseId);
    if (!release || release.projectId !== args.projectId) {
      throw new Error("Release not found or access denied");
    }

    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.releaseId !== args.releaseId) {
      throw new Error("Connection not found or access denied");
    }

    const build = await ctx.db.get(connection.buildId);
    const namespace = build?.namespace;

    await ctx.db.delete(args.connectionId);

    if (namespace) {
      await recalculateConnectionPercentages(ctx, args.releaseId, namespace);
    }
  },
});

export const updateConnectionChance = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    releaseId: v.id("releases"),
    connectionId: v.id("releaseBuildConnections"),
    selectionChance: v.number(),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const release = await ctx.db.get(args.releaseId);
    if (!release || release.projectId !== args.projectId) {
      throw new Error("Release not found or access denied");
    }

    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.releaseId !== args.releaseId) {
      throw new Error("Connection not found or access denied");
    }

    await ctx.db.patch(args.connectionId, {
      selectionChance: args.selectionChance,
    });
  },
});

export const deleteRelease = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const release = await ctx.db.get(args.releaseId);
    if (!release || release.projectId !== args.projectId) {
      throw new Error("Release not found or access denied");
    }

    const connections = await ctx.db
      .query("releaseBuildConnections")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .collect();

    for (const conn of connections) {
      await ctx.db.delete(conn._id);
    }

    await ctx.db.delete(args.releaseId);
  },
});

export const getConfiguration = query({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    releaseId: v.id("releases"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const release = await ctx.db.get(args.releaseId);
    if (!release || release.projectId !== args.projectId) {
      throw new Error("Release not found or access denied");
    }

    const connections = await ctx.db
      .query("releaseBuildConnections")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .collect();

    const groups: Record<string, { id: Id<"builds">; connectionId: Id<"releaseBuildConnections">; chance: number; tag: string }[]> = {};
    let isDirty = false;
    let validBuildCount = 0;

    for (const conn of connections) {
      const build = await ctx.db.get(conn.buildId);

      if (build && build.status !== -1) {
        if (!groups[build.namespace]) {
          groups[build.namespace] = [];
        }
        groups[build.namespace].push({
          id: build._id,
          connectionId: conn._id,
          chance: conn.selectionChance,
          tag: build.tag,
        });
        validBuildCount++;
      } else {
        isDirty = true;
      }
    }

    const cleanBuildsForDB: { buildId: Id<"builds">; selectionChance: number }[] = [];
    const uiGroups: Array<{
      namespace: string;
      builds: Array<{ buildId: Id<"builds">; connectionId: Id<"releaseBuildConnections">; buildTag: string; selectionChance: number }>;
    }> = [];

    for (const [namespaceName, builds] of Object.entries(groups)) {
      let currentSum = builds.reduce((s, b) => s + b.chance, 0);

      if (Math.abs(currentSum - 100) > 0.1) {
        isDirty = true;
        if (currentSum === 0 || builds.length === 0) {
          const split = 100 / (builds.length || 1);
          builds.forEach((b) => (b.chance = split));
        } else {
          builds.forEach((b) => (b.chance = (b.chance / currentSum) * 100));
        }
      }

      builds.forEach((b) => {
        cleanBuildsForDB.push({ buildId: b.id, selectionChance: b.chance });
      });

      uiGroups.push({
        namespace: namespaceName,
        builds: builds.map((b) => ({
          buildId: b.id,
          connectionId: b.connectionId,
          buildTag: b.tag,
          selectionChance: b.chance,
        })),
      });
    }

    if (validBuildCount !== connections.length) {
      isDirty = true;
    }

    return {
      release,
      config: uiGroups,
      cleanBuilds: cleanBuildsForDB,
      isDirty,
    };
  },
});

export const repairConfiguration = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    releaseId: v.id("releases"),
    cleanBuilds: v.array(
      v.object({
        buildId: v.id("builds"),
        selectionChance: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const release = await ctx.db.get(args.releaseId);
    if (!release || release.projectId !== args.projectId) {
      throw new Error("Release not found or access denied");
    }

    const existingConnections = await ctx.db
      .query("releaseBuildConnections")
      .withIndex("by_release", (q) => q.eq("releaseId", args.releaseId))
      .collect();

    for (const conn of existingConnections) {
      await ctx.db.delete(conn._id);
    }

    for (const build of args.cleanBuilds) {
      await ctx.db.insert("releaseBuildConnections", {
        releaseId: args.releaseId,
        buildId: build.buildId,
        selectionChance: build.selectionChance,
      });
    }
  },
});

export const handleBuildDeleted = internalMutation({
  args: {
    buildId: v.id("builds"),
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("releaseBuildConnections")
      .withIndex("by_build", (q) => q.eq("buildId", args.buildId))
      .collect();

    const releaseIds = new Set<Id<"releases">>();
    for (const conn of connections) {
      releaseIds.add(conn.releaseId);
      await ctx.db.delete(conn._id);
    }

    for (const releaseId of releaseIds) {
      await recalculateConnectionPercentages(ctx, releaseId, args.namespace);
    }
  },
});

const recalculateConnectionPercentages = async (
  ctx: any,
  releaseId: Id<"releases">,
  namespace: string,
) => {
  const connections = await ctx.db
    .query("releaseBuildConnections")
    .withIndex("by_release", (q: any) => q.eq("releaseId", releaseId))
    .collect();

  const namespaceConnections: { conn: any; build: any }[] = [];

  for (const conn of connections) {
    const build = await ctx.db.get(conn.buildId);
    if (build && build.namespace === namespace && build.status !== -1) {
      namespaceConnections.push({ conn, build });
    }
  }

  if (namespaceConnections.length === 0) return;

  const evenChance = 100 / namespaceConnections.length;

  for (const { conn } of namespaceConnections) {
    await ctx.db.patch(conn._id, { selectionChance: evenChance });
  }
};

const validateBuildsConfiguration = async (
  ctx: any,
  projectId: string,
  buildsInput: { buildId: string; selectionChance: number }[],
) => {
  const chanceMap: Record<string, number> = {};

  for (const item of buildsInput) {
    const build = await ctx.db.get(item.buildId);

    if (!build) {
      throw new Error(`Build ${item.buildId} not found.`);
    }

    if (build.projectId !== projectId) {
      throw new Error(`Build ${build.tag} is in a different project.`);
    }

    if (build.status !== 1) {
      throw new Error(`Build ${build.tag} is not active.`);
    }

    const ns = build.namespace;
    chanceMap[ns] = (chanceMap[ns] || 0) + item.selectionChance;
  }

  for (const [ns, total] of Object.entries(chanceMap)) {
    if (Math.abs(total - 100) > 0.1) {
      throw new Error(`Selection chances for namespace "${ns}" must sum to 100%. Current: ${total}%`);
    }
  }
};
