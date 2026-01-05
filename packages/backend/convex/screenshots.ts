import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { deleteFile, getFileUrl } from "./files";
import { authMiddleware } from "../middlewares/auth";
import { Id } from "./_generated/dataModel";

export const getScreenshotsForProject = query({
  args: {
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const result = await ctx.db
      .query("screenshots")
      .withIndex("by_project_name", (q) => q.eq("projectId", args.projectId))
      .paginate(args.paginationOpts);

    const screenshotsWithUrls = await Promise.all(
      result.page.map(async (screenshot) => {
        const imageUrl = await getFileUrl(screenshot.imageFileId, 60 * 60 * 24);
        return {
          ...screenshot,
          imageUrl,
        };
      }),
    );

    return {
      ...result,
      page: screenshotsWithUrls,
    };
  },
});

export const createScreenshot = mutation({
  args: {
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
    name: v.string(),
    imageFileId: v.string(),
    imageSize: v.number(),
    imageMimeType: v.string(),
    dimensions: v.object({
      width: v.number(),
      height: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId, async () => {
      await deleteFile(ctx, args.imageFileId);
    });

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      await deleteFile(ctx, args.imageFileId);
      return { screenshotId: null, error: "Project not found or access denied" };
    }

    const existingScreenshot = await ctx.db
      .query("screenshots")
      .withIndex("by_project_name", (q) => q.eq("projectId", args.projectId).eq("name", args.name))
      .first();

    if (existingScreenshot) {
      await deleteFile(ctx, args.imageFileId);
      return { screenshotId: null, error: "A screenshot with this name already exists in this project" };
    }

    // Check file size limit (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (args.imageSize > MAX_FILE_SIZE) {
      await deleteFile(ctx, args.imageFileId);
      console.error("Image file size exceeds limit:", args.imageSize);
      return {
        screenshotId: null,
        error: "Image file size cannot exceed 10MB. Please compress your image and try again",
      };
    }

    const screenshotId = await ctx.db.insert("screenshots", {
      projectId: args.projectId,
      name: args.name,
      imageFileId: args.imageFileId,
      imageSize: args.imageSize,
      imageMimeType: args.imageMimeType,
      dimensions: args.dimensions,
    });

    return { screenshotId, error: null };
  },
});

export const deleteScreenshot = mutation({
  args: {
    screenshotId: v.id("screenshots"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const screenshot = await ctx.db.get(args.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found");
    }

    const project = await ctx.db.get(screenshot.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    // Delete all containers for this screenshot
    const containers = await ctx.db
      .query("screenshotContainers")
      .withIndex("by_screenshot", (q) => q.eq("screenshotId", args.screenshotId))
      .collect();

    for (const container of containers) {
      await ctx.db.delete(container._id);
    }

    await deleteFile(ctx, screenshot.imageFileId);

    await ctx.db.delete(args.screenshotId);

    return { success: true };
  },
});

export const createContainer = mutation({
  args: {
    screenshotId: v.id("screenshots"),
    translationKeyId: v.id("translationKeys"),
    position: v.object({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
    }),
    backgroundColor: v.optional(v.string()),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const screenshot = await ctx.db.get(args.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found or access denied");
    }

    const project = await ctx.db.get(screenshot.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const translationKey = await ctx.db.get(args.translationKeyId);
    if (!translationKey || translationKey.projectId !== project._id || translationKey.status === -1) {
      throw new Error("Translation key not found or access denied");
    }

    const containerId = await ctx.db.insert("screenshotContainers", {
      screenshotId: args.screenshotId,
      translationKeyId: args.translationKeyId,
      position: args.position,
      backgroundColor: args.backgroundColor,
    });

    return containerId;
  },
});

export const updateContainer = mutation({
  args: {
    containerId: v.id("screenshotContainers"),
    position: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
        width: v.number(),
        height: v.number(),
      }),
    ),
    backgroundColor: v.optional(v.string()),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const container = await ctx.db.get(args.containerId);
    if (!container) {
      throw new Error("Container not found or access denied");
    }

    const screenshot = await ctx.db.get(container.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found or access denied");
    }

    const project = await ctx.db.get(screenshot.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const updates: any = {};
    if (args.position) updates.position = args.position;
    if (args.backgroundColor !== undefined) updates.backgroundColor = args.backgroundColor;

    await ctx.db.patch(args.containerId, updates);
    return { success: true };
  },
});

export const deleteContainer = mutation({
  args: {
    containerId: v.id("screenshotContainers"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const container = await ctx.db.get(args.containerId);
    if (!container) {
      throw new Error("Container not found or access denied");
    }

    const screenshot = await ctx.db.get(container.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found or access denied");
    }

    const project = await ctx.db.get(screenshot.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    await ctx.db.delete(args.containerId);
    return { success: true };
  },
});

export const getContainersForScreenshot = query({
  args: {
    screenshotId: v.id("screenshots"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const screenshot = await ctx.db.get(args.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found or access denied");
    }

    const project = await ctx.db.get(screenshot.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const containers = await ctx.db
      .query("screenshotContainers")
      .withIndex("by_screenshot", (q) => q.eq("screenshotId", args.screenshotId))
      .collect();

    const containersWithKeys = await Promise.all(
      containers.map(async (container) => {
        const translationKey = await ctx.db.get(container.translationKeyId);
        if (!translationKey || translationKey.status === -1) {
          return null;
        }

        const namespace = await ctx.db.get(translationKey.namespaceId);

        return {
          ...container,
          translationKey: {
            _id: translationKey._id,
            key: translationKey.key,
            namespaceName: namespace?.name || "Unknown",
          },
        };
      }),
    );

    return containersWithKeys.filter((c) => c !== null);
  },
});

export const getScreenshot = query({
  args: {
    screenshotId: v.id("screenshots"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const screenshot = await ctx.db.get(args.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found or access denied");
    }

    const project = await ctx.db.get(screenshot.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const imageUrl = await getFileUrl(screenshot.imageFileId, 60 * 60 * 24);

    return {
      ...screenshot,
      imageUrl,
    };
  },
});
