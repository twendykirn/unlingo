import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { deleteFile, getFileUrl } from "./files";
import { authMiddleware } from "../middlewares/auth";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { detectTextInScreenshot, DetectedTextRegion } from "../lib/gemini";

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

        // Get primary value from translation key values
        let primaryValue: string | null = null;
        if (project.primaryLanguageId && translationKey.values) {
          primaryValue = translationKey.values[project.primaryLanguageId] || null;
        }

        return {
          ...container,
          translationKey: {
            _id: translationKey._id,
            key: translationKey.key,
            namespaceName: namespace?.name || "Unknown",
            primaryValue,
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

// AI Text Detection
export const detectTextAction = internalAction({
  args: {
    screenshotId: v.id("screenshots"),
    projectId: v.id("projects"),
    imageUrl: v.string(),
    imageDimensions: v.object({
      width: v.number(),
      height: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const detectedRegions = await detectTextInScreenshot(args.imageUrl, args.imageDimensions);

    if (detectedRegions.length === 0) {
      return { success: true, created: 0, skipped: 0, message: "No UI text detected in screenshot" };
    }

    const result = await ctx.runMutation(internal.screenshots.createContainersFromDetection, {
      screenshotId: args.screenshotId,
      projectId: args.projectId,
      detectedRegions: detectedRegions.map((region) => ({
        text: region.text,
        x: region.boundingBox.x,
        y: region.boundingBox.y,
        width: region.boundingBox.width,
        height: region.boundingBox.height,
      })),
    });

    return result;
  },
});

// Calculate similarity between two strings using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  const matrix: number[][] = [];

  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[str1.length][str2.length];
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - distance / maxLength;
}

export const createContainersFromDetection = internalMutation({
  args: {
    screenshotId: v.id("screenshots"),
    projectId: v.id("projects"),
    detectedRegions: v.array(
      v.object({
        text: v.string(),
        x: v.number(),
        y: v.number(),
        width: v.number(),
        height: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const existingContainers = await ctx.db
      .query("screenshotContainers")
      .withIndex("by_screenshot", (q) => q.eq("screenshotId", args.screenshotId))
      .collect();

    const existingKeyIds = new Set(existingContainers.map((c) => c.translationKeyId));

    let created = 0;
    let skipped = 0;

    for (const region of args.detectedRegions) {
      const valueResults = await ctx.db
        .query("translationValues")
        .withSearchIndex("search_values", (q) =>
          q.search("values", region.text).eq("projectId", args.projectId)
        )
        .take(5);

      let matchedKeyId: Id<"translationKeys"> | null = null;
      let bestSimilarity = 0;

      for (const valueResult of valueResults) {
        const key = await ctx.db.get(valueResult.translationKeyId);
        if (!key || key.status === -1) {
          continue;
        }

        const similarity = calculateSimilarity(region.text.toLowerCase(), valueResult.values.toLowerCase());

        // Exact match (case-insensitive) - use immediately
        if (similarity === 1) {
          matchedKeyId = valueResult.translationKeyId;
          break;
        }

        // Only accept matches with at least 70% similarity
        if (similarity >= 0.7 && similarity > bestSimilarity) {
          bestSimilarity = similarity;
          matchedKeyId = valueResult.translationKeyId;
        }
      }

      if (!matchedKeyId) {
        skipped++;
        continue;
      }

      if (existingKeyIds.has(matchedKeyId)) {
        skipped++;
        continue;
      }

      await ctx.db.insert("screenshotContainers", {
        screenshotId: args.screenshotId,
        translationKeyId: matchedKeyId,
        position: {
          x: Math.max(0, Math.min(100, region.x)),
          y: Math.max(0, Math.min(100, region.y)),
          width: Math.max(1, Math.min(100, region.width)),
          height: Math.max(1, Math.min(100, region.height)),
        },
        backgroundColor: "#10b981",
      });

      existingKeyIds.add(matchedKeyId);
      created++;
    }

    return {
      success: true,
      created,
      skipped,
      message:
        created > 0
          ? `Created ${created} container${created !== 1 ? "s" : ""} from detected text`
          : "No matching translation keys found for detected text",
    };
  },
});

export const triggerTextDetection = mutation({
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

    const imageUrl = await getFileUrl(screenshot.imageFileId, 60 * 60);

    await ctx.scheduler.runAfter(0, internal.screenshots.detectTextAction, {
      screenshotId: args.screenshotId,
      projectId: project._id,
      imageUrl,
      imageDimensions: screenshot.dimensions,
    });

    return { success: true };
  },
});
