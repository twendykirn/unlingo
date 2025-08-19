import { internalMutation, internalQuery, MutationCtx, query, mutation, internalAction } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';
import { polar } from './polar';
import { internal } from './_generated/api';
import { customersDelete } from '@polar-sh/sdk/funcs/customersDelete.js';
import { customersGetExternal } from '@polar-sh/sdk/funcs/customersGetExternal.js';

// Personal workspaces are no longer supported - only organization workspaces

// Create a team workspace for a new organization
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

        // Create team workspace
        const workspaceId = await ctx.db.insert('workspaces', {
            clerkId: args.clerkOrgId,
            contactEmail: args.contactEmail,
            currentUsage: {
                requests: 0,
                projects: 0,
            },
            limits: {
                requests: 100000, // Free tier limits
                projects: 1,
                namespacesPerProject: 5,
                languagesPerVersion: 5,
                versionsPerNamespace: 1, // Allow 1 version (main) for free tier
            },
        });

        console.log(`Created team workspace for organization ${args.clerkOrgId} by user ${identity.issuer}`);
        return workspaceId;
    },
});

export const deletePolarCustomer = internalAction({
    args: {
        workspaceId: v.id('workspaces'),
    },
    handler: async (_, args) => {
        const customer = await customersGetExternal(polar.polar, {
            externalId: args.workspaceId,
        });

        if (customer.ok) {
            await customersDelete(polar.polar, {
                id: customer.value.id,
            });
        }
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
    // Cancel any active Polar subscriptions first
    try {
        await ctx.scheduler.runAfter(0, internal.workspaces.deletePolarCustomer, {
            workspaceId,
        });
        console.log(`Delete Polar customer for workspace ${workspaceId}`);
    } catch (error) {
        console.warn(`Failed to delete Polar customer for workspace ${workspaceId}:`, error);
        // Continue with deletion even if subscription cancellation fails
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

        // Delete screenshots and related data
        const screenshots = await ctx.db
            .query('screenshots')
            .withIndex('by_project', q => q.eq('projectId', project._id))
            .collect();

        for (const screenshot of screenshots) {
            // Delete screenshot containers and their mappings
            const containers = await ctx.db
                .query('screenshotContainers')
                .withIndex('by_screenshot', q => q.eq('screenshotId', screenshot._id))
                .collect();

            for (const container of containers) {
                // Delete key mappings for this container
                const mappings = await ctx.db
                    .query('screenshotKeyMappings')
                    .withIndex('by_container', q => q.eq('containerId', container._id))
                    .collect();

                for (const mapping of mappings) {
                    await ctx.db.delete(mapping._id);
                }

                // Delete the container
                await ctx.db.delete(container._id);
            }

            // Delete the screenshot image file from Convex Storage
            if (screenshot.imageFileId) {
                await ctx.storage.delete(screenshot.imageFileId);
            }

            // Delete the screenshot
            await ctx.db.delete(screenshot._id);
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
                    // Delete the JSON file from Convex Storage
                    if (language.fileId) {
                        await ctx.storage.delete(language.fileId);
                    }
                    await ctx.db.delete(language._id);
                }

                // Delete the JSON schema file from Convex Storage
                if (version.jsonSchemaFileId) {
                    await ctx.storage.delete(version.jsonSchemaFileId);
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

// Query to get workspace by organization ID
export const getWorkspaceByClerkId = query({
    args: {
        clerkId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        // Handle race condition: during org creation, Clerk's token might not have updated yet
        // Allow query if either identity.org matches OR if the user just created this org
        const hasOrgAccess = identity.org === args.clerkId;

        if (!hasOrgAccess) {
            // For race condition during org creation, return null instead of throwing
            // This allows the frontend to handle the "not yet available" state gracefully
            return null;
        }

        return await ctx.db
            .query('workspaces')
            .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkId))
            .first();
    },
});

// Query to get workspace with subscription (organization only)
export const getWorkspaceWithSubscription = query({
    args: {
        clerkId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        // Handle race condition: during org creation, Clerk's token might not have updated yet
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

        // Get current subscription status from Polar
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

// Update workspace contact email
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

        const workspace = await ctx.db
            .query('workspaces')
            .withIndex('by_clerk_id', q => q.eq('clerkId', args.clerkId))
            .first();

        if (!workspace) {
            throw new Error('Workspace not found');
        }

        await ctx.db.patch(workspace._id, {
            contactEmail: args.contactEmail,
        });

        return { success: true };
    },
});

// Update workspace limits based on premium status
export const updateWorkspaceLimits = internalMutation({
    args: {
        workspaceId: v.id('workspaces'),
        isPremium: v.boolean(),
        requestLimit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const workspace = await ctx.db.get(args.workspaceId);

        if (!workspace) {
            throw new Error('Workspace not found');
        }

        const limits = args.isPremium
            ? {
                  // Pro tier limits from pricing page
                  requests: args.requestLimit || 250000, // Default to 250k requests
                  projects: 30,
                  namespacesPerProject: 40,
                  versionsPerNamespace: 20,
                  languagesPerVersion: 35,
              }
            : {
                  // Free tier limits
                  requests: 100000,
                  projects: 1,
                  namespacesPerProject: 5,
                  versionsPerNamespace: 1, // Allow 1 version (main) for free tier
                  languagesPerVersion: 5,
              };

        await ctx.db.patch(workspace._id, { limits });

        console.log(`Updated limits for workspace ${workspace._id}, premium: ${args.isPremium}`);
        return { success: true };
    },
});
