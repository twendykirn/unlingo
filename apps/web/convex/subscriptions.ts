import { v } from 'convex/values';
import { internalMutation, QueryCtx } from './_generated/server';
import { Id } from './_generated/dataModel';

async function internalGetWorkspaceByCreemCustomerId(ctx: QueryCtx, creemCustomerId: string) {
    return await ctx.db
        .query('workspaces')
        .withIndex('by_webPaymentCustomerId', q => q.eq('webPaymentCustomerId', creemCustomerId))
        .unique();
}

async function internalGetWorkspaceByInternalId(ctx: QueryCtx, workspaceId: string) {
    try {
        const user = await ctx.db.get(workspaceId as Id<'workspaces'>);
        return user;
    } catch (e) {
        console.warn(`Attempted to get user by invalid internal ID format: ${workspaceId}`, e);
        return null;
    }
}

async function internalGetSubscriptionByCreemId(ctx: QueryCtx, creemSubscriptionId: string) {
    return await ctx.db
        .query('subscriptions')
        .withIndex('by_webPaymentSubscriptionId', q => q.eq('webPaymentSubscriptionId', creemSubscriptionId))
        .unique();
}

export const internalUpsertCreemSubscription = internalMutation({
    args: {
        // Identifiers
        eventId: v.string(),
        creemCustomerId: v.string(),
        creemSubscriptionId: v.string(),
        creemProductId: v.string(),
        internalUserId: v.optional(v.string()), // From metadata

        // Subscription Details from Creem event
        status: v.string(),
        currentPeriodStart: v.optional(v.number()), // Already converted to ms timestamp
        currentPeriodEnd: v.optional(v.number()), // Already converted to ms timestamp
        canceledAt: v.optional(v.number()), // Already converted to ms timestamp
    },
    handler: async (ctx, args) => {
        console.log(`Upserting Creem subscription ${args.creemSubscriptionId} for event ${args.eventId}`);

        // 1. Find User (Prioritize metadata ID)
        let workspace = null;
        if (args.internalUserId) {
            workspace = await internalGetWorkspaceByInternalId(ctx, args.internalUserId);
            if (!workspace) {
                console.warn(
                    `Webhook Warning (Event ${args.eventId}): User specified in metadata (${args.internalUserId}) not found. Falling back to customer ID.`
                );
                workspace = await internalGetWorkspaceByCreemCustomerId(ctx, args.creemCustomerId);
            }
        } else {
            workspace = await internalGetWorkspaceByCreemCustomerId(ctx, args.creemCustomerId);
        }

        if (!workspace) {
            console.warn(
                `Webhook Error (Event ${args.eventId}): User not found for Creem Customer ID ${args.creemCustomerId} or ${args.internalUserId}. Might be a late subscription cancellation after user deletion.`
            );
        } else {
            // 2. Find Existing Subscription Record
            const existingSubscription = await internalGetSubscriptionByCreemId(ctx, args.creemSubscriptionId);

            // 3. Prepare Data for DB
            const mappedStatus = args.status.toLowerCase(); // Ensure consistent casing

            const subscriptionData = {
                workspaceId: workspace._id,
                status: mappedStatus,
                webPaymentSubscriptionId: args.creemSubscriptionId,
                webPaymentProductId: args.creemProductId,
                currentPeriodStart: args.currentPeriodStart,
                currentPeriodEnd: args.currentPeriodEnd,
                canceledAt: args.canceledAt,
            };

            // 4. Create or Update Subscription Entry
            if (existingSubscription) {
                console.log(
                    `Updating existing subscription ${existingSubscription._id} for user ${workspace._id} with status ${mappedStatus}`
                );
                await ctx.db.patch(existingSubscription._id, subscriptionData);
            } else if (mappedStatus !== 'canceled' && mappedStatus !== 'expired') {
                console.log(`Creating new subscription for user ${workspace._id} with status ${mappedStatus}`);
                await ctx.db.insert('subscriptions', subscriptionData);
            }

            // 5. Update User's Customer ID if needed
            if (!workspace.webPaymentCustomerId || workspace.webPaymentCustomerId !== args.creemCustomerId) {
                await ctx.db.patch(workspace._id, { webPaymentCustomerId: args.creemCustomerId });
                console.log(`Updated webPaymentCustomerId for user ${workspace._id} to ${args.creemCustomerId}`);
            }

            console.log(
                `Successfully processed Creem subscription ${args.creemSubscriptionId} for user ${workspace._id}.`
            );
        }
    },
});
