import { paginationOptsValidator } from 'convex/server';
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Query to get releases for a project with pagination
export const getReleases = query({
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

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Only allow access to organization workspaces
        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only access organization workspaces');
        }

        // Verify project belongs to workspace
        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        return await ctx.db
            .query('releases')
            .withIndex('by_project', q => q.eq('projectId', args.projectId))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

// Query to get a single release by ID
export const getRelease = query({
    args: {
        releaseId: v.id('releases'),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Only allow access to organization workspaces
        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only access organization workspaces');
        }

        const release = await ctx.db.get(args.releaseId);
        if (!release) {
            return null;
        }

        // Verify access through project hierarchy
        const project = await ctx.db.get(release.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            return null;
        }

        return release;
    },
});

// Mutation to create a new release
export const createRelease = mutation({
    args: {
        projectId: v.id('projects'),
        workspaceId: v.id('workspaces'),
        name: v.string(),
        version: v.string(),
        namespaceVersions: v.array(
            v.object({
                namespaceId: v.id('namespaces'),
                versionId: v.id('namespaceVersions'),
            })
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Only allow access to organization workspaces
        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only create releases in organization workspaces');
        }

        // Verify project belongs to workspace
        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        // Check if release version already exists in project
        const existingRelease = await ctx.db
            .query('releases')
            .withIndex('by_project_version', q => q.eq('projectId', args.projectId).eq('version', args.version))
            .first();

        if (existingRelease) {
            throw new Error('A release with this version already exists in this project');
        }

        // Validate release name and version
        if (!args.name.trim()) {
            throw new Error('Release name cannot be empty');
        }

        if (!args.version.trim()) {
            throw new Error('Release version cannot be empty');
        }

        if (args.name.length > 100) {
            throw new Error('Release name cannot exceed 100 characters');
        }

        if (args.version.length > 50) {
            throw new Error('Release version cannot exceed 50 characters');
        }

        // Validate that all namespace versions exist and belong to the project
        for (const nsVersion of args.namespaceVersions) {
            const namespace = await ctx.db.get(nsVersion.namespaceId);
            if (!namespace || namespace.projectId !== args.projectId) {
                throw new Error('Invalid namespace selected');
            }

            const namespaceVersion = await ctx.db.get(nsVersion.versionId);
            if (!namespaceVersion || namespaceVersion.namespaceId !== nsVersion.namespaceId) {
                throw new Error('Invalid namespace version selected');
            }
        }

        // Create the release
        const releaseId = await ctx.db.insert('releases', {
            projectId: args.projectId,
            name: args.name.trim(),
            version: args.version.trim(),
            namespaceVersions: args.namespaceVersions,
        });

        return releaseId;
    },
});

// Mutation to update a release
export const updateRelease = mutation({
    args: {
        releaseId: v.id('releases'),
        workspaceId: v.id('workspaces'),
        name: v.string(),
        version: v.string(),
        namespaceVersions: v.array(
            v.object({
                namespaceId: v.id('namespaces'),
                versionId: v.id('namespaceVersions'),
            })
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only update releases in organization workspaces');
        }

        const release = await ctx.db.get(args.releaseId);
        if (!release) {
            throw new Error('Release not found');
        }

        // Verify project belongs to workspace
        const project = await ctx.db.get(release.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        // Validate release name and version
        if (!args.name.trim()) {
            throw new Error('Release name cannot be empty');
        }

        if (!args.version.trim()) {
            throw new Error('Release version cannot be empty');
        }

        if (args.name.length > 100) {
            throw new Error('Release name cannot exceed 100 characters');
        }

        if (args.version.length > 50) {
            throw new Error('Release version cannot exceed 50 characters');
        }

        // If updating version, check for duplicates
        if (args.version.trim() !== release.version) {
            const existingRelease = await ctx.db
                .query('releases')
                .withIndex('by_project_version', q => q.eq('projectId', release.projectId).eq('version', args.version.trim()))
                .first();

            if (existingRelease) {
                throw new Error('A release with this version already exists in this project');
            }
        }

        // Validate that all namespace versions exist and belong to the project
        for (const nsVersion of args.namespaceVersions) {
            const namespace = await ctx.db.get(nsVersion.namespaceId);
            if (!namespace || namespace.projectId !== release.projectId) {
                throw new Error('Invalid namespace selected');
            }

            const namespaceVersion = await ctx.db.get(nsVersion.versionId);
            if (!namespaceVersion || namespaceVersion.namespaceId !== nsVersion.namespaceId) {
                throw new Error('Invalid namespace version selected');
            }
        }

        // Update the release
        await ctx.db.patch(args.releaseId, {
            name: args.name.trim(),
            version: args.version.trim(),
            namespaceVersions: args.namespaceVersions,
        });

        return args.releaseId;
    },
});

// Mutation to delete a release
export const deleteRelease = mutation({
    args: {
        releaseId: v.id('releases'),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only delete releases from organization workspaces');
        }

        const release = await ctx.db.get(args.releaseId);
        if (!release) {
            throw new Error('Release not found');
        }

        // Verify project belongs to workspace
        const project = await ctx.db.get(release.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        // Delete the release
        await ctx.db.delete(args.releaseId);

        return args.releaseId;
    },
});