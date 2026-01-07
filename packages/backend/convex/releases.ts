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
      .withIndex("by_release_build", (q) => q.eq("releaseId", args.releaseId))
      .collect();

    const result = await Promise.all(
      connections.map(async (conn) => {
        const build = await ctx.db.get(conn.buildId);
        return {
          ...conn,
          build,
        };
      }),
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

    const validatedBuilds = await validateBuildsConfiguration(ctx, args.projectId, args.builds);

    const releaseId = await ctx.db.insert("releases", {
      projectId: args.projectId,
      tag: args.tag,
    });

    for (const build of validatedBuilds) {
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

      await ctx.db.patch(args.releaseId, {
        tag: args.tag,
      });
    }

    if (args.builds) {
      const validatedBuilds = await validateBuildsConfiguration(ctx, release.projectId, args.builds);

      const existingConnections = await ctx.db
        .query("releaseBuildConnections")
        .withIndex("by_release_build", (q) => q.eq("releaseId", args.releaseId))
        .collect();

      const existingMap = new Map(existingConnections.map((conn) => [conn.buildId, conn]));
      const newBuildIds = new Set(validatedBuilds.map((b) => b.buildId));

      for (const conn of existingConnections) {
        if (!newBuildIds.has(conn.buildId)) {
          await ctx.db.delete(conn._id);
        }
      }

      for (const build of validatedBuilds) {
        const existingConn = existingMap.get(build.buildId);
        if (existingConn) {
          if (existingConn.selectionChance !== build.selectionChance) {
            await ctx.db.patch(existingConn._id, {
              selectionChance: build.selectionChance,
            });
          }
        } else {
          await ctx.db.insert("releaseBuildConnections", {
            releaseId: args.releaseId,
            buildId: build.buildId,
            selectionChance: build.selectionChance,
          });
        }
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
      .withIndex("by_release_build", (q) => q.eq("releaseId", args.releaseId))
      .collect();

    for (const conn of connections) {
      await ctx.db.delete(conn._id);
    }

    await ctx.db.delete(args.releaseId);
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

const recalculateConnectionPercentages = async (ctx: any, releaseId: Id<"releases">, namespace: string) => {
  const connections = await ctx.db
    .query("releaseBuildConnections")
    .withIndex("by_release_build", (q: any) => q.eq("releaseId", releaseId))
    .collect();

  const namespaceConnections: { conn: any; build: any }[] = [];

  for (const conn of connections) {
    const build = await ctx.db.get(conn.buildId);
    if (build && build.namespace === namespace && build.status !== -1) {
      namespaceConnections.push({ conn, build });
    }
  }

  if (namespaceConnections.length === 0) return;

  const totalChance = namespaceConnections.reduce((sum, { conn }) => sum + conn.selectionChance, 0);

  if (totalChance === 0) {
    const evenChance = 100 / namespaceConnections.length;
    for (const { conn } of namespaceConnections) {
      await ctx.db.patch(conn._id, { selectionChance: evenChance });
    }
  } else {
    const scaleFactor = 100 / totalChance;
    for (const { conn } of namespaceConnections) {
      const newChance = conn.selectionChance * scaleFactor;
      await ctx.db.patch(conn._id, { selectionChance: newChance });
    }
  }
};

const validateBuildsConfiguration = async (
  ctx: any,
  projectId: string,
  buildsInput: { buildId: string; selectionChance: number }[],
): Promise<{ buildId: Id<"builds">; selectionChance: number }[]> => {
  const buildDataMap: Map<string, { buildId: Id<"builds">; namespace: string; selectionChance: number }> = new Map();

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

    buildDataMap.set(item.buildId, {
      buildId: item.buildId as Id<"builds">,
      namespace: build.namespace,
      selectionChance: item.selectionChance,
    });
  }

  const namespaceGroups: Record<string, { buildId: Id<"builds">; selectionChance: number }[]> = {};
  for (const data of buildDataMap.values()) {
    if (!namespaceGroups[data.namespace]) {
      namespaceGroups[data.namespace] = [];
    }
    namespaceGroups[data.namespace].push({
      buildId: data.buildId,
      selectionChance: data.selectionChance,
    });
  }

  const result: { buildId: Id<"builds">; selectionChance: number }[] = [];

  for (const [, builds] of Object.entries(namespaceGroups)) {
    const total = builds.reduce((sum, b) => sum + b.selectionChance, 0);

    if (Math.abs(total - 100) > 0.1) {
      if (total === 0) {
        const evenChance = 100 / builds.length;
        for (const b of builds) {
          result.push({ buildId: b.buildId, selectionChance: evenChance });
        }
      } else {
        const scaleFactor = 100 / total;
        for (const b of builds) {
          result.push({ buildId: b.buildId, selectionChance: b.selectionChance * scaleFactor });
        }
      }
    } else {
      for (const b of builds) {
        result.push({ buildId: b.buildId, selectionChance: b.selectionChance });
      }
    }
  }

  return result;
};
