import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { r2 } from "./files";

export const getScreenshotsForProject = query({
  args: {
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.clerkId !== identity.org) {
      throw new Error("Workspace not found or access denied");
    }

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
        const imageUrl = await r2.getUrl(screenshot.imageFileId, {
          expiresIn: 60 * 60 * 24,
        });
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      await r2.deleteObject(ctx, args.imageFileId);
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.clerkId !== identity.org) {
      await r2.deleteObject(ctx, args.imageFileId);
      throw new Error("Workspace not found or access denied");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      await r2.deleteObject(ctx, args.imageFileId);
      throw new Error("Project not found or access denied");
    }

    const existingScreenshot = await ctx.db
      .query("screenshots")
      .withIndex("by_project_name", (q) => q.eq("projectId", args.projectId).eq("name", args.name))
      .first();

    if (existingScreenshot) {
      await r2.deleteObject(ctx, args.imageFileId);
      throw new Error("A screenshot with this name already exists in this project");
    }

    // Check file size limit (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (args.imageSize > MAX_FILE_SIZE) {
      await r2.deleteObject(ctx, args.imageFileId);
      throw new Error("Image file size cannot exceed 10MB. Please compress your image and try again.");
    }

    const screenshotId = await ctx.db.insert("screenshots", {
      projectId: args.projectId,
      name: args.name,
      imageFileId: args.imageFileId,
      imageSize: args.imageSize,
      imageMimeType: args.imageMimeType,
      dimensions: args.dimensions,
    });

    return screenshotId;
  },
});

export const deleteScreenshot = mutation({
  args: {
    screenshotId: v.id("screenshots"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.clerkId !== identity.org) {
      throw new Error("Workspace not found or access denied");
    }

    const screenshot = await ctx.db.get(args.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found");
    }

    const project = await ctx.db.get(screenshot.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const containers = await ctx.db
      .query("screenshotContainers")
      .withIndex("by_screenshot", (q) => q.eq("screenshotId", args.screenshotId))
      .collect();

    for (const container of containers) {
      const keyMappings = await ctx.db
        .query("screenshotKeyMappings")
        .withIndex("by_container_namespace_translation_key", (q) => q.eq("containerId", container._id))
        .collect();

      for (const mapping of keyMappings) {
        await ctx.db.delete(mapping._id);
      }

      await ctx.db.delete(container._id);
    }

    await r2.deleteObject(ctx, screenshot.imageFileId);

    await ctx.db.delete(args.screenshotId);

    return { success: true };
  },
});

export const getContainerMappings = query({
  args: {
    containerId: v.id("screenshotContainers"),
    workspaceId: v.id("workspaces"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.clerkId !== identity.org) {
      throw new Error("Workspace not found or access denied");
    }

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

    return await ctx.db
      .query("screenshotKeyMappings")
      .withIndex("by_container_namespace_translation_key", (q) => q.eq("containerId", args.containerId))
      .paginate(args.paginationOpts);
  },
});

export const assignKeyToContainer = mutation({
  args: {
    containerId: v.id("screenshotContainers"),
    translationKeyId: v.id("translationKeys"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.clerkId !== identity.org) {
      throw new Error("Workspace not found or access denied");
    }

    const container = await ctx.db.get(args.containerId);
    if (!container) {
      throw new Error("Container not found or access denied");
    }

    const screenshot = await ctx.db.get(container.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found or access denied");
    }

    const project = await ctx.db.get(screenshot.projectId);
    if (!project || project.workspaceId !== args.workspaceId || project.status === -1) {
      throw new Error("Project not found or access denied");
    }

    const translationKey = await ctx.db.get(args.translationKeyId);
    if (!translationKey || translationKey.projectId !== project._id || translationKey.status === -1) {
      throw new Error("Project not found or access denied");
    }

    const existingMapping = await ctx.db
      .query("screenshotKeyMappings")
      .withIndex("by_container_namespace_translation_key", (q) =>
        q
          .eq("containerId", container._id)
          .eq("namespaceId", translationKey.namespaceId)
          .eq("translationKeyId", translationKey._id),
      )
      .first();

    if (existingMapping) {
      return existingMapping._id;
    } else {
      const mappingId = await ctx.db.insert("screenshotKeyMappings", {
        containerId: container._id,
        namespaceId: translationKey.namespaceId,
        translationKeyId: translationKey._id,
      });
      return mappingId;
    }
  },
});

export const removeKeyFromContainer = mutation({
  args: {
    containerId: v.id("screenshotContainers"),
    translationKeyId: v.id("translationKeys"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.clerkId !== identity.org) {
      throw new Error("Workspace not found or access denied");
    }

    const container = await ctx.db.get(args.containerId);
    if (!container) {
      throw new Error("Container not found or access denied");
    }

    const screenshot = await ctx.db.get(container.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found or access denied");
    }

    const project = await ctx.db.get(screenshot.projectId);
    if (!project || project.workspaceId !== args.workspaceId || project.status === -1) {
      throw new Error("Project not found or access denied");
    }

    const translationKey = await ctx.db.get(args.translationKeyId);
    if (!translationKey || translationKey.projectId !== project._id || translationKey.status === -1) {
      throw new Error("Project not found or access denied");
    }

    const mapping = await ctx.db
      .query("screenshotKeyMappings")
      .withIndex("by_container_namespace_translation_key", (q) =>
        q
          .eq("containerId", container._id)
          .eq("namespaceId", translationKey.namespaceId)
          .eq("translationKeyId", translationKey._id),
      )
      .first();

    if (mapping) {
      await ctx.db.delete(mapping._id);
    }

    return { success: true };
  },
});

export const deleteKeyMapping = mutation({
  args: {
    mappingId: v.id("screenshotKeyMappings"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.clerkId !== identity.org) {
      throw new Error("Workspace not found or access denied");
    }

    const mapping = await ctx.db.get(args.mappingId);
    if (!mapping) {
      throw new Error("Mapping not found");
    }

    const container = await ctx.db.get(mapping.containerId);
    if (!container) {
      throw new Error("Container not found");
    }

    const screenshot = await ctx.db.get(container.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found");
    }

    const project = await ctx.db.get(screenshot.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    await ctx.db.delete(args.mappingId);
    return { success: true };
  },
});

export const createContainer = mutation({
  args: {
    screenshotId: v.id("screenshots"),
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.clerkId !== identity.org) {
      throw new Error("Workspace not found or access denied");
    }

    const screenshot = await ctx.db.get(args.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found or access denied");
    }

    const project = await ctx.db.get(screenshot.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const containerId = await ctx.db.insert("screenshotContainers", {
      screenshotId: args.screenshotId,
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.clerkId !== identity.org) {
      throw new Error("Workspace not found or access denied");
    }

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.clerkId !== identity.org) {
      throw new Error("Workspace not found or access denied");
    }

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

    const keyMappings = await ctx.db
      .query("screenshotKeyMappings")
      .withIndex("by_container_namespace_translation_key", (q) => q.eq("containerId", args.containerId))
      .collect();

    for (const mapping of keyMappings) {
      await ctx.db.delete(mapping._id);
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.clerkId !== identity.org) {
      throw new Error("Workspace not found or access denied");
    }

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

    return containers;
  },
});

export const getScreenshot = query({
  args: {
    screenshotId: v.id("screenshots"),
    workspaceId: v.id("workspaces"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.clerkId !== identity.org) {
      throw new Error("Workspace not found or access denied");
    }

    const screenshot = await ctx.db.get(args.screenshotId);
    if (!screenshot) {
      throw new Error("Screenshot not found or access denied");
    }

    const project = await ctx.db.get(screenshot.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const imageUrl = await r2.getUrl(screenshot.imageFileId, {
      expiresIn: 60 * 60 * 24,
    });

    return {
      ...screenshot,
      imageUrl,
    };
  },
});
