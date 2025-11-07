import { v } from 'convex/values';
import { internalQuery, mutation, query } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { Unkey } from '@unkey/api';

export const getApiKeys = query({
    args: {
        projectId: v.id('projects'),
        workspaceId: v.id('workspaces'),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || identity.org !== workspace.clerkId) {
            throw new Error('Workspace not found or access denied');
        }

        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        return await ctx.db
            .query('apiKeys')
            .withIndex('by_workspace_project', q =>
                q.eq('workspaceId', args.workspaceId).eq('projectId', args.projectId)
            )
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

export const generateApiKey = mutation({
    args: {
        projectId: v.id('projects'),
        workspaceId: v.id('workspaces'),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || identity.org !== workspace.clerkId) {
            throw new Error('Workspace not found or access denied');
        }

        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        // Initialize Unkey client
        const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY! });

        // Check if UNKEY_API_ID is set
        if (!process.env.UNKEY_API_ID) {
            throw new Error('UNKEY_API_ID environment variable is not set');
        }

        // Create key via Unkey API
        const unkeyResponse = await unkey.keys.create({
            apiId: process.env.UNKEY_API_ID!,
            name: args.name,
            meta: {
                workspaceId: args.workspaceId,
                projectId: args.projectId,
                projectName: project.name,
            },
        });

        if (unkeyResponse.error) {
            throw new Error(`Failed to create Unkey key: ${unkeyResponse.error.message}`);
        }

        const { key, keyId } = unkeyResponse.result;

        // Extract prefix from the key (e.g., "prefix_xxxxx")
        const prefix = key.split('_').slice(0, 2).join('_') + '_';

        // Store the Unkey key ID in database
        const dbKeyId = await ctx.db.insert('apiKeys', {
            workspaceId: args.workspaceId,
            projectId: args.projectId,
            name: args.name,
            unkeyKeyId: keyId,
            prefix,
        });

        // Return the full key (this is the ONLY time it will be visible)
        return {
            id: dbKeyId,
            key,
            name: args.name,
            prefix,
        };
    },
});

export const deleteApiKey = mutation({
    args: {
        keyId: v.id('apiKeys'),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || identity.org !== workspace.clerkId) {
            throw new Error('Workspace not found or access denied');
        }

        const apiKey = await ctx.db.get(args.keyId);
        if (!apiKey || apiKey.workspaceId !== args.workspaceId) {
            throw new Error('API key not found or access denied');
        }

        // Initialize Unkey client
        const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY! });

        // Delete key from Unkey
        const unkeyResponse = await unkey.keys.delete({
            keyId: apiKey.unkeyKeyId,
        });

        if (unkeyResponse.error) {
            throw new Error(`Failed to delete Unkey key: ${unkeyResponse.error.message}`);
        }

        // Delete from database
        await ctx.db.delete(args.keyId);
    },
});

export const verifyApiKey = internalQuery({
    args: {
        key: v.string(),
    },
    handler: async (ctx, args) => {
        // Initialize Unkey client
        const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY! });

        // Verify key via Unkey API
        const verifyResponse = await unkey.keys.verify({
            apiId: process.env.UNKEY_API_ID!,
            key: args.key,
        });

        if (verifyResponse.error || !verifyResponse.result.valid) {
            return null;
        }

        // Extract metadata from Unkey response
        const { meta } = verifyResponse.result;

        if (!meta || !meta.workspaceId || !meta.projectId) {
            return null;
        }

        const workspace = await ctx.db.get(meta.workspaceId as any);
        const project = await ctx.db.get(meta.projectId as any);

        if (!workspace || !project) {
            return null;
        }

        return {
            workspaceId: meta.workspaceId as any,
            projectId: meta.projectId as any,
            workspace,
            project,
        };
    },
});
