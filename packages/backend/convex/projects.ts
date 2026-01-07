import { paginationOptsValidator } from "convex/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { deleteFile } from "./files";
import { authMiddleware } from "../middlewares/auth";

export const getProjects = query({
  args: {
    workspaceId: v.id("workspaces"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    return await ctx.db
      .query("projects")
      .withIndex("by_workspace_status", (q) => q.eq("workspaceId", args.workspaceId).gt("status", -1))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getProject = query({
  args: {
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);

    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    return project;
  },
});

export const createProject = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const workspace = await authMiddleware(ctx, args.workspaceId);

    const existingProject = await ctx.db
      .query("projects")
      .withIndex("by_workspace_name", (q) => q.eq("workspaceId", args.workspaceId).eq("name", args.name))
      .first();

    if (existingProject && existingProject.status !== -1) {
      throw new Error("A project with this name already exists");
    }

    const projectId = await ctx.db.insert("projects", {
      workspaceId: args.workspaceId,
      name: args.name,
      status: 1,
      currentUsage: {
        translationKeys: 0,
      },
    });

    await ctx.scheduler.runAfter(0, internal.keys.createUnkeyIdentity, {
      projectId,
      workspaceId: workspace._id,
    });

    return projectId;
  },
});

export const updateProject = mutation({
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

    const { name } = args;

    if (name && name !== project.name) {
      const existingProject = await ctx.db
        .query("projects")
        .withIndex("by_workspace_name", (q) => q.eq("workspaceId", args.workspaceId).eq("name", name))
        .first();

      if (existingProject && existingProject.status !== -1) {
        throw new Error("A project with this name already exists");
      }
    }

    await ctx.db.patch(args.projectId, {
      name,
    });

    return args.projectId;
  },
});

export const updatePrimaryLanguage = mutation({
  args: {
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
    languageId: v.id("languages"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);

    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const { languageId } = args;

    await ctx.db.patch(args.projectId, {
      primaryLanguageId: languageId,
    });

    return args.projectId;
  },
});

export const deleteProject = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const workspace = await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);

    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    await ctx.db.patch(project._id, { status: -1 });
    await ctx.db.patch(workspace._id, {
      currentUsage: {
        ...workspace.currentUsage,
        translationKeys: workspace.currentUsage.translationKeys - project.currentUsage.translationKeys,
      },
    });

    await ctx.scheduler.runAfter(0, internal.keys.deleteUnkeyIdentity, {
      projectId: project._id,
      workspaceId: workspace._id,
    });

    await ctx.scheduler.runAfter(0, internal.projects.deleteProjectContents, {
      projectId: args.projectId,
      table: "translationValues",
      cursor: null,
    });
  },
});

export const deleteProjectContents = internalMutation({
  args: {
    projectId: v.id("projects"),
    table: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const STANDARD_LIMIT = 200;
    const SCREENSHOT_LIMIT = 10;

    const next = async (currentIsDone: boolean, nextCursor: string | null, nextTable: string) => {
      if (!currentIsDone) {
        await ctx.scheduler.runAfter(0, internal.projects.deleteProjectContents, {
          projectId: args.projectId,
          table: args.table,
          cursor: nextCursor,
        });
      } else {
        await ctx.scheduler.runAfter(0, internal.projects.deleteProjectContents, {
          projectId: args.projectId,
          table: nextTable,
          cursor: null,
        });
      }
    };

    if (args.table === "translationValues") {
      const res = await ctx.db
        .query("translationValues")
        .withIndex("by_project_namespace_language_key", (q) => q.eq("projectId", args.projectId))
        .paginate({ cursor: args.cursor, numItems: STANDARD_LIMIT });

      for (const d of res.page) {
        await ctx.db.delete(d._id);
      }

      await next(res.isDone, res.continueCursor, "translationKeys");
      return;
    }

    if (args.table === "translationKeys") {
      const res = await ctx.db
        .query("translationKeys")
        .withIndex("by_project_namespace_key", (q) => q.eq("projectId", args.projectId))
        .paginate({ cursor: args.cursor, numItems: STANDARD_LIMIT });

      for (const d of res.page) {
        await ctx.db.delete(d._id);
      }

      await next(res.isDone, res.continueCursor, "builds");
      return;
    }

    if (args.table === "builds") {
      const res = await ctx.db
        .query("builds")
        .withIndex("by_project_tag", (q) => q.eq("projectId", args.projectId))
        .paginate({ cursor: args.cursor, numItems: STANDARD_LIMIT });

      for (const d of res.page) {
        for (const file of Object.values(d.languageFiles)) {
          await deleteFile(ctx, file.fileId);
        }
        await ctx.db.delete(d._id);
      }

      await next(res.isDone, res.continueCursor, "glossaryTerms");
      return;
    }

    if (args.table === "glossaryTerms") {
      const res = await ctx.db
        .query("glossaryTerms")
        .withIndex("by_project_term", (q) => q.eq("projectId", args.projectId))
        .paginate({ cursor: args.cursor, numItems: STANDARD_LIMIT });

      for (const d of res.page) {
        await ctx.db.delete(d._id);
      }

      await next(res.isDone, res.continueCursor, "languages");
      return;
    }

    if (args.table === "languages") {
      const res = await ctx.db
        .query("languages")
        .withIndex("by_project_language", (q) => q.eq("projectId", args.projectId))
        .paginate({ cursor: args.cursor, numItems: STANDARD_LIMIT });

      for (const d of res.page) {
        await ctx.db.delete(d._id);
      }

      await next(res.isDone, res.continueCursor, "namespaces");
      return;
    }

    if (args.table === "namespaces") {
      const res = await ctx.db
        .query("namespaces")
        .withIndex("by_project_status", (q) => q.eq("projectId", args.projectId))
        .paginate({ cursor: args.cursor, numItems: STANDARD_LIMIT });

      for (const d of res.page) {
        await ctx.db.delete(d._id);
      }

      await next(res.isDone, res.continueCursor, "releases");
      return;
    }

    if (args.table === "releases") {
      const res = await ctx.db
        .query("releases")
        .withIndex("by_project_tag", (q) => q.eq("projectId", args.projectId))
        .paginate({ cursor: args.cursor, numItems: STANDARD_LIMIT });

      for (const release of res.page) {
        // Delete all connections for this release
        const connections = await ctx.db
          .query("releaseBuildConnections")
          .withIndex("by_release_build", (q) => q.eq("releaseId", release._id))
          .collect();

        for (const conn of connections) {
          await ctx.db.delete(conn._id);
        }

        // Delete the release itself
        await ctx.db.delete(release._id);
      }

      await next(res.isDone, res.continueCursor, "screenshots");
      return;
    }

    if (args.table === "screenshots") {
      const results = await ctx.db
        .query("screenshots")
        .withIndex("by_project_name", (q) => q.eq("projectId", args.projectId))
        .paginate({ cursor: args.cursor, numItems: SCREENSHOT_LIMIT });

      for (const screenshot of results.page) {
        if (screenshot.imageFileId) {
          try {
            await deleteFile(ctx, screenshot.imageFileId);
          } catch (error) {
            console.error(`Failed to delete storage file ${screenshot.imageFileId}:`, error);
          }
        }

        const containers = await ctx.db
          .query("screenshotContainers")
          .withIndex("by_screenshot", (q) => q.eq("screenshotId", screenshot._id))
          .collect();

        for (const container of containers) {
          await ctx.db.delete(container._id);
        }

        await ctx.db.delete(screenshot._id);
      }

      await next(results.isDone, results.continueCursor, "final");
      return;
    }

    if (args.table === "final") {
      await ctx.db.delete(args.projectId);
    }
  },
});
