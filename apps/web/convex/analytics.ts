import { action, internalAction } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import {
    getMonthlyTimeseries,
    getTopNamespaces,
    getTopApiCalls,
    getTopLanguages,
    ingestApiRequest,
    ApiRequestEventType,
} from '../lib/posthog';

export const getMonthlySuccess = action({
    args: {
        months: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.runQuery(internal.workspaces.getWorkspaceInfo, {});

        try {
            const data = await getMonthlyTimeseries(workspace._id, args.months || 6);
            const points = Array.isArray(data.data)
                ? data.data.map((row: any) => ({
                      time: row.month_start ?? row.time,
                      success: Number(row.success || 0),
                      total_requests: Number(row.total_requests || 0),
                  }))
                : [];

            return { points };
        } catch (error) {
            console.error('PostHog query failed:', error);
            throw new Error(`Analytics query failed: ${error}`);
        }
    },
});

export const getTopNamespacesAction = action({
    args: {
        months: v.number(),
        limit: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.runQuery(internal.workspaces.getWorkspaceInfo, {});

        try {
            const data = await getTopNamespaces(workspace._id, args.months || 6, args.limit || 10);
            const points = Array.isArray(data.data)
                ? data.data.map((row: any) => ({ namespace: row.namespace, success: Number(row.success || 0) }))
                : [];

            return { points };
        } catch (error) {
            console.error('PostHog query failed:', error);
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
            console.warn('Failed to ingest PostHog event', e);
        }
    },
});

export const getTopApiCallsAction = action({
    args: {
        months: v.number(),
        limit: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.runQuery(internal.workspaces.getWorkspaceInfo, {});

        try {
            const data = await getTopApiCalls(workspace._id, args.months || 6, args.limit || 10);
            const points = Array.isArray(data.data)
                ? data.data.map((row: any) => ({
                      apiCallName: row.apiCallName,
                      success: Number(row.success || 0),
                      total_requests: Number(row.total_requests || 0),
                  }))
                : [];

            return { points };
        } catch (error) {
            console.error('PostHog query failed:', error);
            throw new Error(`Analytics query failed: ${error}`);
        }
    },
});

export const getTopLanguagesAction = action({
    args: {
        months: v.number(),
        limit: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.runQuery(internal.workspaces.getWorkspaceInfo, {});

        try {
            const data = await getTopLanguages(workspace._id, args.months || 6, args.limit || 10);
            const points = Array.isArray(data.data)
                ? data.data.map((row: any) => ({
                      languageCode: row.languageCode,
                      success: Number(row.success || 0),
                  }))
                : [];

            return { points };
        } catch (error) {
            console.error('PostHog query failed:', error);
            throw new Error(`Analytics query failed: ${error}`);
        }
    },
});
