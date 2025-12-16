import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// Railway Buckets
export const r2 = new R2(components.r2, {
  R2_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID!,
  R2_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY!,
  R2_ENDPOINT: process.env.S3_ENDPOINT!,
  R2_BUCKET: process.env.S3_BUCKET!,
});

export const { generateUploadUrl, syncMetadata } = r2.clientApi({
  checkUpload: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
  },
});

export const getFileContent = internalAction({
  args: {
    fileId: v.string(),
  },
  handler: async (_, args) => {
    const sourceFileUrl = await r2.getUrl(args.fileId);
    const sourceResponse = await fetch(sourceFileUrl);
    const source = await sourceResponse.text();

    return source;
  },
});
