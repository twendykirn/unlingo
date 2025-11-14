import { internalMutation, internalQuery, MutationCtx, query, mutation, internalAction } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { polar } from './polar';
import { internal } from './_generated/api';
import { customersDelete } from '@polar-sh/sdk/funcs/customersDelete.js';
import { customersUpdate } from '@polar-sh/sdk/funcs/customersUpdate.js';
import { getCurrentMonth } from './utils';
import { r2 } from './files';

export const verifyWorkspaceContactEmail = mutation({
    args: {
        contactEmail: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const existingWorkspace = await ctx.db
            .query('workspaces')
            .withIndex('by_contactEmail', q => q.eq('contactEmail', args.contactEmail))
            .first();

        return { success: existingWorkspace === null };
    },
});

export const createOrganizationWorkspace = mutation({
    args: {
        clerkOrgId: v.string(),
        contactEmail: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const existingWorkspace = await ctx.db
            .query('workspaces')
            .withIndex('by_contactEmail', q => q.eq('contactEmail', args.contactEmail))
            .first();

        if (existingWorkspace) {
            throw new Error(
                'A workspace with this contact email already exists. Please use a different email address.'
            );
        }

        const currentMonth = getCurrentMonth();

        const workspaceUsageId = await ctx.db.insert('workspaceUsage', {
            month: currentMonth,
            requests: 0,
        });

        const workspaceId = await ctx.db.insert('workspaces', {
            clerkId: args.clerkOrgId,
            contactEmail: args.contactEmail,
            currentUsage: {
                projects: 0,
            },
            limits: {
                requests: 10000,
                projects: 1,
                namespacesPerProject: 5,
                languagesPerVersion: 6,
                versionsPerNamespace: 2,
            },
            workspaceUsageId,
        });

        console.log(`Created team workspace for organization ${args.clerkOrgId} by user ${identity.issuer}`);
        return workspaceId;
    },
});

export const deletePolarCustomer = internalAction({
    args: {
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const customer = await polar.getCustomerByUserId(ctx, args.workspaceId);

        if (customer) {
            await customersDelete(polar.polar, {
                id: customer.id,
            });
        }
    },
});

export const deleteOrganizationWorkspace = internalMutation({
    args: {
        clerkOrgId: v.string(),
    },
    handler: async (ctx, args) => {
        const workspace = await ctx.db
            .query('workspaces')
            .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkOrgId))
            .first();

        if (!workspace) {
            console.log(`No workspace found for organization ${args.clerkOrgId}`);
            return;
        }

        await deleteWorkspaceAndRelatedData(ctx, workspace._id, workspace.workspaceUsageId);
        console.log(`Deleted workspace for organization ${args.clerkOrgId}`);
    },
});

async function deleteWorkspaceAndRelatedData(
    ctx: MutationCtx,
    workspaceId: Id<'workspaces'>,
    workspaceUsageId: Id<'workspaceUsage'>
) {
    try {
        await ctx.scheduler.runAfter(0, internal.workspaces.deletePolarCustomer, {
            workspaceId,
        });
        console.log(`Delete Polar customer for workspace ${workspaceId}`);
    } catch (error) {
        console.warn(`Failed to delete Polar customer for workspace ${workspaceId}:`, error);
    }

    await ctx.db.delete(workspaceUsageId);

    const projects = await ctx.db
        .query('projects')
        .withIndex('by_workspace_name', q => q.eq('workspaceId', workspaceId))
        .collect();

    for (const project of projects) {
        await ctx.scheduler.runAfter(0, internal.keys.deleteUnkeyIdentity, {
            projectId: project._id,
            workspaceId,
        });

        const releases = await ctx.db
            .query('releases')
            .withIndex('by_project_tag', q => q.eq('projectId', project._id))
            .collect();

        for (const release of releases) {
            await ctx.db.delete(release._id);
        }

        const screenshots = await ctx.db
            .query('screenshots')
            .withIndex('by_project_name', q => q.eq('projectId', project._id))
            .collect();

        for (const screenshot of screenshots) {
            const containers = await ctx.db
                .query('screenshotContainers')
                .withIndex('by_screenshot', q => q.eq('screenshotId', screenshot._id))
                .collect();

            for (const container of containers) {
                const mappings = await ctx.db
                    .query('screenshotKeyMappings')
                    .withIndex('by_container_version_language_key', q => q.eq('containerId', container._id))
                    .collect();

                for (const mapping of mappings) {
                    await ctx.db.delete(mapping._id);
                }

                await ctx.db.delete(container._id);
            }

            if (screenshot.imageFileId) {
                await r2.deleteObject(ctx, screenshot.imageFileId);
            }

            await ctx.db.delete(screenshot._id);
        }

        const namespaces = await ctx.db
            .query('namespaces')
            .withIndex('by_project', q => q.eq('projectId', project._id))
            .collect();

        for (const namespace of namespaces) {
            const namespaceVersions = await ctx.db
                .query('namespaceVersions')
                .withIndex('by_namespace_version', q => q.eq('namespaceId', namespace._id))
                .collect();

            for (const version of namespaceVersions) {
                const languages = await ctx.db
                    .query('languages')
                    .withIndex('by_namespace_version_language', q => q.eq('namespaceVersionId', version._id))
                    .collect();

                for (const language of languages) {
                    if (language.fileId) {
                        await r2.deleteObject(ctx, language.fileId);
                    }
                    await ctx.db.delete(language._id);
                }

                if (version.jsonSchemaFileId) {
                    await r2.deleteObject(ctx, version.jsonSchemaFileId);
                }

                await ctx.db.delete(version._id);
            }

            await ctx.db.delete(namespace._id);
        }

        await ctx.db.delete(project._id);
    }

    await ctx.db.delete(workspaceId);
}

export const getWorkspaceInfo = internalQuery({
    args: {},
    handler: async ctx => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity || !identity.org) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.db
            .query('workspaces')
            .withIndex('by_clerk_id', q => q.eq('clerkId', identity.org as string))
            .first();

        if (!workspace) {
            throw new Error('Workspace not found');
        }

        return workspace;
    },
});

export const getWorkspaceWithSubscription = query({
    args: {
        clerkId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const hasOrgAccess = identity.org === args.clerkId;

        if (!hasOrgAccess) {
            // For race condition during org creation, return null instead of throwing
            return null;
        }

        const workspace = await ctx.db
            .query('workspaces')
            .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkId))
            .first();

        if (!workspace) {
            return null;
        }

        try {
            const currentSubscription = await polar.getCurrentSubscription(ctx, {
                userId: workspace._id,
            });

            const isPremium =
                currentSubscription &&
                currentSubscription.status === 'active' &&
                !currentSubscription.customerCancellationReason;

            console.log(
                `Workspace ${workspace._id} premium status: ${isPremium}, subscription: ${currentSubscription?.id || 'none'}`
            );

            return {
                ...workspace,
                isPremium: Boolean(isPremium),
            };
        } catch (error) {
            // If Polar query fails, fall back to free tier
            console.warn(`Failed to get subscription for workspace ${workspace._id}:`, error);
            return {
                ...workspace,
                isPremium: false,
            };
        }
    },
});

export const updatePolarCustomer = internalAction({
    args: {
        workspaceId: v.id('workspaces'),
        contactEmail: v.string(),
    },
    handler: async (ctx, args) => {
        const customer = await polar.getCustomerByUserId(ctx, args.workspaceId);

        if (customer) {
            await customersUpdate(polar.polar, {
                id: customer.id,
                customerUpdate: {
                    email: args.contactEmail,
                },
            });
        }
    },
});

export const updateWorkspaceContactEmail = mutation({
    args: {
        clerkId: v.string(),
        contactEmail: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        // Handle race condition: during org creation, Clerk's token might not have updated yet
        const hasOrgAccess = identity.org === args.clerkId;

        if (!hasOrgAccess) {
            throw new Error('Unauthorized: Can only update organization workspaces - please try again in a moment');
        }

        const existingWorkspace = await ctx.db
            .query('workspaces')
            .withIndex('by_contactEmail', q => q.eq('contactEmail', args.contactEmail))
            .first();

        if (existingWorkspace) {
            throw new Error(
                'A workspace with this contact email already exists. Please use a different email address.'
            );
        }

        const workspace = await ctx.db
            .query('workspaces')
            .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkId))
            .first();

        if (!workspace) {
            throw new Error('Workspace not found');
        }

        if (workspace.contactEmail === args.contactEmail) {
            return { success: true };
        }

        await ctx.db.patch(workspace._id, {
            contactEmail: args.contactEmail,
        });

        return { success: true };
    },
});

export const updateWorkspaceLimits = internalMutation({
    args: {
        workspaceId: v.id('workspaces'),
        tier: v.union(v.literal('free'), v.literal('starter'), v.literal('premium')),
        requestLimit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const workspace = await ctx.db.get(args.workspaceId);

        if (!workspace) {
            throw new Error('Workspace not found');
        }

        let limits;
        switch (args.tier) {
            case 'free':
                limits = {
                    requests: 10000,
                    projects: 1,
                    namespacesPerProject: 5,
                    versionsPerNamespace: 2,
                    languagesPerVersion: 6,
                };
                break;
            case 'starter':
                limits = {
                    requests: 50000,
                    projects: 3,
                    namespacesPerProject: 12,
                    versionsPerNamespace: 2,
                    languagesPerVersion: 25,
                };
                break;
            case 'premium':
                limits = {
                    requests: args.requestLimit || 250000,
                    projects: 30,
                    namespacesPerProject: 40,
                    versionsPerNamespace: 2,
                    languagesPerVersion: 90,
                };
                break;
            default:
                throw new Error('Invalid tier');
        }

        await ctx.db.patch(workspace._id, { limits });

        console.log(`Updated limits for workspace ${workspace._id}, tier: ${args.tier}`);
        return { success: true };
    },
});

export const getCurrentUsage = query({
    args: {
        clerkId: v.string(),
        workspaceUsageId: v.id('workspaceUsage'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        // Handle race condition: during org creation, Clerk's token might not have updated yet
        const hasOrgAccess = identity.org === args.clerkId;

        if (!hasOrgAccess) {
            return null;
        }

        const currentMonth = getCurrentMonth();
        const usage = await ctx.db.get(args.workspaceUsageId);

        let currentRequests = 0;
        if (usage && usage.month === currentMonth) {
            currentRequests = usage.requests;
        }

        return {
            requests: currentRequests,
            month: currentMonth,
        };
    },
});
