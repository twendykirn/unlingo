import { internalMutation, MutationCtx, query } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';

// Create a personal workspace for a new user
export const createUserWorkspace = internalMutation({
    args: {
        clerkUserId: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if workspace already exists
        const existingWorkspace = await ctx.db
            .query('workspaces')
            .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkUserId))
            .first();

        if (existingWorkspace) {
            console.log(`Workspace already exists for user ${args.clerkUserId}`);
            return existingWorkspace._id;
        }

        // Create personal workspace
        const workspaceId = await ctx.db.insert('workspaces', {
            clerkId: args.clerkUserId,
            type: 'personal',
            currentUsage: {
                requests: 0,
                projects: 0,
            },
            limits: {
                requests: 100000, // Free tier limits
                projects: 1,
                namespacesPerProject: 5,
                languagesPerNamespace: 5,
                versionsPerNamespace: 0,
            },
        });

        console.log(`Created personal workspace for user ${args.clerkUserId}`);
        return workspaceId;
    },
});

// Create a team workspace for a new organization
export const createOrganizationWorkspace = internalMutation({
    args: {
        clerkOrgId: v.string(),
    },
    handler: async (ctx, args) => {
        // Check if workspace already exists
        const existingWorkspace = await ctx.db
            .query('workspaces')
            .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkOrgId))
            .first();

        if (existingWorkspace) {
            console.log(`Workspace already exists for organization ${args.clerkOrgId}`);
            return existingWorkspace._id;
        }

        // Create team workspace
        const workspaceId = await ctx.db.insert('workspaces', {
            clerkId: args.clerkOrgId,
            type: 'team',
            currentUsage: {
                requests: 0,
                projects: 0,
            },
            limits: {
                requests: 100000, // Free tier limits
                projects: 1,
                namespacesPerProject: 5,
                languagesPerNamespace: 5,
                versionsPerNamespace: 0,
            },
        });

        console.log(`Created team workspace for organization ${args.clerkOrgId}`);
        return workspaceId;
    },
});

// Delete a user's workspace and all related data
export const deleteUserWorkspace = internalMutation({
    args: {
        clerkUserId: v.string(),
    },
    handler: async (ctx, args) => {
        // Find workspace by Clerk user ID
        const workspace = await ctx.db
            .query('workspaces')
            .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkUserId))
            .first();

        if (!workspace) {
            console.log(`No workspace found for user ${args.clerkUserId}`);
            return;
        }

        await deleteWorkspaceAndRelatedData(ctx, workspace._id);
        console.log(`Deleted workspace for user ${args.clerkUserId}`);
    },
});

// Delete an organization's workspace and all related data
export const deleteOrganizationWorkspace = internalMutation({
    args: {
        clerkOrgId: v.string(),
    },
    handler: async (ctx, args) => {
        // Find workspace by Clerk organization ID
        const workspace = await ctx.db
            .query('workspaces')
            .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkOrgId))
            .first();

        if (!workspace) {
            console.log(`No workspace found for organization ${args.clerkOrgId}`);
            return;
        }

        await deleteWorkspaceAndRelatedData(ctx, workspace._id);
        console.log(`Deleted workspace for organization ${args.clerkOrgId}`);
    },
});

// Helper function to delete workspace and all related data
async function deleteWorkspaceAndRelatedData(ctx: MutationCtx, workspaceId: Id<'workspaces'>) {
    // Delete subscriptions
    const subscriptions = await ctx.db
        .query('subscriptions')
        .withIndex('by_workspace', q => q.eq('workspaceId', workspaceId))
        .collect();

    for (const subscription of subscriptions) {
        await ctx.db.delete(subscription._id);
    }

    // Delete API keys
    const apiKeys = await ctx.db
        .query('apiKeys')
        .withIndex('by_workspace', q => q.eq('workspaceId', workspaceId))
        .collect();

    for (const apiKey of apiKeys) {
        await ctx.db.delete(apiKey._id);
    }

    // Delete projects and related data
    const projects = await ctx.db
        .query('projects')
        .withIndex('by_workspace', q => q.eq('workspaceId', workspaceId))
        .collect();

    for (const project of projects) {
        // Delete releases
        const releases = await ctx.db
            .query('releases')
            .withIndex('by_project', q => q.eq('projectId', project._id))
            .collect();

        for (const release of releases) {
            await ctx.db.delete(release._id);
        }

        // Delete namespaces and related data
        const namespaces = await ctx.db
            .query('namespaces')
            .withIndex('by_project', q => q.eq('projectId', project._id))
            .collect();

        for (const namespace of namespaces) {
            // Delete namespace versions and languages
            const namespaceVersions = await ctx.db
                .query('namespaceVersions')
                .withIndex('by_namespace', q => q.eq('namespaceId', namespace._id))
                .collect();

            for (const version of namespaceVersions) {
                // Delete languages
                const languages = await ctx.db
                    .query('languages')
                    .withIndex('by_namespace_version', q => q.eq('namespaceVersionId', version._id))
                    .collect();

                for (const language of languages) {
                    await ctx.db.delete(language._id);
                }

                await ctx.db.delete(version._id);
            }

            await ctx.db.delete(namespace._id);
        }

        await ctx.db.delete(project._id);
    }

    // Finally, delete the workspace
    await ctx.db.delete(workspaceId);
}

// Query to get workspace by Clerk ID
export const getWorkspaceByClerkId = query({
    args: {
        clerkId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }
        
        // Only allow users to query their own workspace
        if (identity.subject !== args.clerkId) {
            throw new Error('Unauthorized: Cannot access another user\'s workspace');
        }
        
        return await ctx.db
            .query('workspaces')
            .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkId))
            .first();
    },
});

// Statuses that generally mean access should NOT be granted, even if period end hasn't passed
// Note: 'canceled' is NOT in this list, as it depends on the period end date.
const INACTIVE_STATUSES = ['expired', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'];

// Query to get workspace with subscription
export const getWorkspaceWithSubscription = query({
    args: {
        clerkId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }
        
        // Only allow users to query their own workspace
        if (identity.subject !== args.clerkId) {
            throw new Error('Unauthorized: Cannot access another user\'s workspace');
        }
        
        const workspace = await ctx.db
            .query('workspaces')
            .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkId))
            .first();

        if (!workspace) {
            return null;
        }

        const now = Date.now(); // Current time in milliseconds

        const subscriptions = await ctx.db
            .query('subscriptions')
            .withIndex('by_workspace', q => q.eq('workspaceId', workspace._id))
            .collect();

        if (subscriptions.length === 0) {
            // No subscription grants access at this moment
            console.log(`Workspace ${workspace._id} has no currently active subscription.`);
            return {
                ...workspace,
                isPremium: false,
            };
        }

        // Check if *any* subscription grants access right now
        for (const sub of subscriptions) {
            // 1. Check if the subscription period is currently active (or hasn't started yet, edge case)
            const isWithinPeriod =
                sub.currentPeriodEnd === undefined || sub.currentPeriodEnd === null || sub.currentPeriodEnd > now;

            // 2. Check if the status indicates the subscription *should* be active during its period
            //    (i.e., it's not explicitly inactive like 'expired' or 'past_due')
            const statusAllowsAccess = !INACTIVE_STATUSES.includes(sub.status.toLowerCase());

            // Access is granted if the period is current AND the status doesn't explicitly deny access
            if (isWithinPeriod && statusAllowsAccess) {
                // This covers:
                // - status: 'active', 'trialing' and now < currentPeriodEnd
                // - status: 'canceled' and now < currentPeriodEnd (access continues until period end)
                console.log(
                    `Workspace ${workspace._id} has active access via subscription: ${sub._id} (Status: ${sub.status}, Ends: ${sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toISOString() : 'N/A'})`
                );
                return {
                    ...workspace,
                    isPremium: true,
                };
            }
        }

        // No subscription grants access at this moment
        console.log(`Workspace ${workspace._id} has no currently active subscription.`);
        return {
            ...workspace,
            isPremium: false,
        };
    },
});
