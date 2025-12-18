import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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

export const createRelease = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    tag: v.string(),
    builds: v.array(buildInput),
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
      builds: args.builds,
    });

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

    if (args.builds) {
      await validateBuildsConfiguration(ctx, release.projectId, args.builds);
      updates.builds = args.builds;
    }

    await ctx.db.patch(args.releaseId, updates);
  },
});

export const deleteRelease = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    releaseId: v.id("releases"),
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

    const release = await ctx.db.get(args.releaseId);
    if (!release || release.projectId !== args.projectId) {
      throw new Error("Release not found or access denied");
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

    const release = await ctx.db.get(args.releaseId);
    if (!release || release.projectId !== args.projectId) {
      throw new Error("Release not found or access denied");
    }

    const groups: Record<string, { id: Id<"builds">; chance: number; tag: string }[]> = {};
    let isDirty = false;
    let validBuildCount = 0;

    for (const item of release.builds) {
      const build = await ctx.db.get(item.buildId);

      if (build && build.status !== -1) {
        if (!groups[build.namespace]) {
          groups[build.namespace] = [];
        }
        groups[build.namespace].push({
          id: build._id,
          chance: item.selectionChance,
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
      builds: Array<{ buildId: Id<"builds">; buildTag: string; selectionChance: number }>;
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
          buildTag: b.tag,
          selectionChance: b.chance,
        })),
      });
    }

    if (validBuildCount !== release.builds.length) {
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

    const release = await ctx.db.get(args.releaseId);
    if (!release || release.projectId !== args.projectId) {
      throw new Error("Release not found or access denied");
    }

    await ctx.db.patch(args.releaseId, {
      builds: args.cleanBuilds,
    });
  },
});

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
