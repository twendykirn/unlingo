import { action, internalAction } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { ingestApiRequest, ApiRequestEventType, fetchEvents } from '../lib/openpanel';

export const getEvents = action({
    args: {
        start: v.string(),
        end: v.string(),
        page: v.optional(v.number()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.runQuery(internal.workspaces.getWorkspaceInfo, {});

        try {
            const result = await fetchEvents({
                profileId: workspace._id,
                event: 'api_request',
                start: args.start,
                end: args.end,
                page: args.page || 1,
                limit: args.limit || 50,
                includes: ['profile', 'meta'],
            });

            return result;
        } catch (error) {
            console.error('Openpanel query failed:', error);
            throw new Error(`Analytics query failed: ${error}`);
        }
    },
});

export const ingestEvent = internalAction({
    args: {
        workspaceId: v.string(),
        projectId: v.string(),
        projectName: v.optional(v.string()),
        elementId: v.string(),
        type: v.string(),
        deniedReason: v.optional(v.string()),
        time: v.optional(v.number()),
        apiCallName: v.optional(v.string()),
        languageCode: v.optional(v.string()),
        namespaceId: v.optional(v.string()),
        namespaceName: v.optional(v.string()),
        responseSize: v.optional(v.number()),
    },
    handler: async (_, args) => {
        try {
            const event: ApiRequestEventType = {
                workspaceId: args.workspaceId,
                projectId: args.projectId,
                projectName: args.projectName,
                elementId: args.elementId,
                type: args.type,
                time: Math.trunc((args.time ?? Date.now()) / 1000), // Convert to seconds
                deniedReason: args.deniedReason,
                apiCallName: args.apiCallName,
                languageCode: args.languageCode,
                namespaceId: args.namespaceId,
                namespaceName: args.namespaceName,
                responseSize: args.responseSize,
            };

            await ingestApiRequest(event);
        } catch (e) {
            console.warn('Failed to ingest Openpanel event', e);
        }
    },
});
