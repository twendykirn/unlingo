import { internalAction, mutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { ActionRetrier } from "@convex-dev/action-retrier";
import { components, internal } from "./_generated/api";
import * as s3 from "../lib/s3";
import { authMiddleware } from "../middlewares/auth";

const retrier = new ActionRetrier(components.actionRetrier);

export const deleteFile = async (ctx: MutationCtx, key: string) => {
  await retrier.run(ctx, internal.files.deleteS3Object, { key });
};

export const getFileUrl = async (key: string, expiresIn: number = 900) => {
  const url = await s3.getUrl(key, expiresIn);
  return url;
};

export const storeFile = async (file: Uint8Array | Buffer | Blob) => {
  const key = await s3.store(file);
  return key;
};

export const deleteS3Object = internalAction({
  args: {
    key: v.string(),
  },
  handler: async (_, args) => {
    const { key } = args;
    await s3.deleteObject(key);
  },
});

export const getFileContent = internalAction({
  args: {
    fileId: v.string(),
  },
  handler: async (_, args) => {
    const sourceFileUrl = await s3.getUrl(args.fileId);
    const sourceResponse = await fetch(sourceFileUrl);
    const source = await sourceResponse.text();

    return source;
  },
});

export const generateUploadUrl = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    return await s3.generateUploadUrl();
  },
});
