import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';

// Get paginated API keys for a project
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

        // Verify user owns the workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || (identity.org !== workspace.clerkId && identity.subject !== workspace.clerkId)) {
            throw new Error('Workspace not found or access denied');
        }

        // Verify project belongs to workspace
        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        // Get paginated API keys (excluding sensitive keyHash)
        return await ctx.db
            .query('apiKeys')
            .withIndex('by_project', q => q.eq('projectId', args.projectId))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

// Generate a secure API key
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

        // Verify user owns the workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || (identity.org !== workspace.clerkId && identity.subject !== workspace.clerkId)) {
            throw new Error('Workspace not found or access denied');
        }

        // Verify project belongs to workspace
        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        // Generate a cryptographically secure random API key
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);

        // Convert to base64 and make URL-safe
        const keyData = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');

        // Create prefix based on environment (you can customize this)
        const prefix = 'ulg_live_';
        const fullKey = `${prefix}${keyData}`;

        // Hash the key for storage (using Web Crypto API)
        const encoder = new TextEncoder();
        const data = encoder.encode(fullKey);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = new Uint8Array(hashBuffer);
        const keyHash = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');

        // Store the hashed key in database
        const keyId = await ctx.db.insert('apiKeys', {
            workspaceId: args.workspaceId,
            projectId: args.projectId,
            name: args.name,
            keyHash,
            prefix,
        });

        // Return the full key (this is the ONLY time it will be visible)
        return {
            id: keyId,
            key: fullKey,
            name: args.name,
            prefix,
        };
    },
});

// Delete an API key
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

        // Verify user owns the workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || (identity.org !== workspace.clerkId && identity.subject !== workspace.clerkId)) {
            throw new Error('Workspace not found or access denied');
        }

        // Get the API key
        const apiKey = await ctx.db.get(args.keyId);
        if (!apiKey || apiKey.workspaceId !== args.workspaceId) {
            throw new Error('API key not found or access denied');
        }

        // Delete the API key
        await ctx.db.delete(args.keyId);
    },
});

// Function to verify API key (for API authentication)
export const verifyApiKey = query({
    args: {
        key: v.string(),
    },
    handler: async (ctx, args) => {
        // Hash the provided key
        const encoder = new TextEncoder();
        const data = encoder.encode(args.key);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = new Uint8Array(hashBuffer);
        const keyHash = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');

        // Find the API key by hash
        const apiKey = await ctx.db
            .query('apiKeys')
            .withIndex('by_key_hash', q => q.eq('keyHash', keyHash))
            .first();

        if (!apiKey) {
            return null;
        }

        // Get workspace and project info
        const workspace = await ctx.db.get(apiKey.workspaceId);
        const project = await ctx.db.get(apiKey.projectId);

        return {
            keyId: apiKey._id,
            workspaceId: apiKey.workspaceId,
            projectId: apiKey.projectId,
            workspace,
            project,
        };
    },
});
