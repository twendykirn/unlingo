import { R2 } from '@convex-dev/r2';
import { components } from './_generated/api';
import { internalAction } from './_generated/server';
import { v } from 'convex/values';

export const r2 = new R2(components.r2);

export const { generateUploadUrl, syncMetadata } = r2.clientApi({
    checkUpload: async ctx => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
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
