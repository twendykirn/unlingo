import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export const checkAndUpdateRequestUsage = internalMutation({
    args: {
        workspaceId: v.id('workspaces'),
        projectId: v.id('projects'),
    },
    handler: async (ctx, args) => {
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        const usage = await ctx.db.get(workspace.workspaceUsageId);
        if (!usage) {
            throw new Error('Usage record not found');
        }

        const project = await ctx.db.get(args.projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const limit = workspace.limits.requests;
        const currentMonth = getCurrentMonth();
        const hardLimit = Math.round(limit * 1.3);

        let isRequestAllowed = true;
        let shouldSendHardLimitEmail = false;
        let currentRequests = 1;

        if (usage.month === currentMonth) {
            currentRequests = usage.requests + 1;

            if (currentRequests === hardLimit) {
                shouldSendHardLimitEmail = true;
            } else if (currentRequests > hardLimit) {
                isRequestAllowed = false;
                currentRequests = usage.requests;
            }
        }

        if (isRequestAllowed) {
            await ctx.db.patch(usage._id, {
                requests: currentRequests,
                month: currentMonth,
            });
        }

        return {
            currentRequests,
            limit,
            exceedsHardLimit: currentRequests === hardLimit, // Block at 130%
            shouldSendHardLimitEmail, // Send email at 130%
            isRequestAllowed,
            nearLimit: currentRequests === Math.round(limit * 0.8), // Warning at 80%
            exceedsLimit: currentRequests === limit, // At 100% of plan limit
            workspace,
            project,
        };
    },
});

export const getCurrentUsage = internalQuery({
    args: {
        workspaceUsageId: v.id('workspaceUsage'),
    },
    handler: async (ctx, args) => {
        const currentMonth = getCurrentMonth();
        const usage = await ctx.db.get(args.workspaceUsageId);

        if (!usage) {
            throw new Error('Usage record not found');
        }

        let requests = 0;
        if (usage.month === currentMonth) {
            requests = usage.requests;
        }

        return {
            requests,
            month: currentMonth,
        };
    },
});
