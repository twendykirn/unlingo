import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

// Internal function to increment workspace request usage
export const incrementRequestUsage = internalMutation({
    args: {
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        const currentRequests = workspace.currentUsage.requests;
        const newRequestCount = currentRequests + 1;

        await ctx.db.patch(workspace._id, {
            currentUsage: {
                ...workspace.currentUsage,
                requests: newRequestCount,
            },
        });

        return {
            currentRequests: newRequestCount,
            limit: workspace.limits.requests,
            exceedsLimit: newRequestCount > workspace.limits.requests * 1.5, // 1.5x buffer
            nearLimit: newRequestCount > workspace.limits.requests * 0.8, // 80% warning
            exceedsHardLimit: newRequestCount > workspace.limits.requests, // At limit
        };
    },
});

// Internal function to check if workspace is at or near request limits
export const checkRequestLimits = internalQuery({
    args: {
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        const currentRequests = workspace.currentUsage.requests;
        const limit = workspace.limits.requests;

        return {
            currentRequests,
            limit,
            exceedsLimit: currentRequests >= limit * 1.5, // Block at 1.5x
            nearLimit: currentRequests >= limit * 0.8, // Warning at 80%
            exceedsHardLimit: currentRequests >= limit, // At 100% of plan limit
            workspace,
        };
    },
});

// Internal function to reset monthly usage (called by scheduled job)
export const resetMonthlyUsage = internalMutation({
    args: {
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        await ctx.db.patch(workspace._id, {
            currentUsage: {
                ...workspace.currentUsage,
                requests: 0,
            },
        });

        return { success: true };
    },
});
