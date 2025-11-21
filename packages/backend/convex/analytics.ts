import { action, internalAction } from './_generated/server';
import { v } from 'convex/values';
import { ingestApiRequest, ApiRequestEventType, fetchEvents } from '../lib/openpanel';

export const getEvents = action({
    args: {
        start: v.string(),
        end: v.string(),
        page: v.optional(v.number()),
        limit: v.optional(v.number()),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        try {
            const result = await fetchEvents({
                profileId: args.workspaceId,
                event: ['api/v1/translations', 'getLanguageContent', 'getJsonSchema'],
                start: args.start,
                end: args.end,
                page: args.page || 1,
                limit: args.limit || 50,
                includes: 'properties',
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
        event: v.string(),
        projectName: v.optional(v.string()),
        deniedReason: v.optional(v.string()),
        languageCode: v.optional(v.string()),
        namespaceId: v.optional(v.string()),
        namespaceName: v.optional(v.string()),
        responseSize: v.optional(v.number()),
    },
    handler: async (_, args) => {
        try {
            const params: ApiRequestEventType = {
                workspaceId: args.workspaceId,
                projectId: args.projectId,
                projectName: args.projectName,
                event: args.event,
                time: Date.now(),
                deniedReason: args.deniedReason,
                languageCode: args.languageCode,
                namespaceId: args.namespaceId,
                namespaceName: args.namespaceName,
                responseSize: args.responseSize,
            };

            await ingestApiRequest(params);
        } catch (e) {
            console.warn('Failed to ingest Openpanel event', e);
        }
    },
});
