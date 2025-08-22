import { paginationOptsValidator } from 'convex/server';
import { mutation, query, internalQuery } from './_generated/server';
import { v } from 'convex/values';

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

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || identity.org !== workspace.clerkId) {
            throw new Error('Workspace not found or access denied');
        }

        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        return await ctx.db
            .query('releases')
            .withIndex('by_project_tag', q => q.eq('projectId', args.projectId))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

export const getReleaseByTag = internalQuery({
    args: {
        projectId: v.id('projects'),
        workspaceId: v.id('workspaces'),
        tag: v.string(),
    },
    handler: async (ctx, args) => {
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        return await ctx.db
            .query('releases')
            .withIndex('by_project_tag', q => q.eq('projectId', args.projectId).eq('tag', args.tag))
            .first();
    },
});

export const createRelease = mutation({
    args: {
        projectId: v.id('projects'),
        workspaceId: v.id('workspaces'),
        name: v.string(),
        tag: v.string(),
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

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || identity.org !== workspace.clerkId) {
            throw new Error('Workspace not found or access denied');
        }

        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const existingRelease = await ctx.db
            .query('releases')
            .withIndex('by_project_tag', q => q.eq('projectId', args.projectId).eq('tag', args.tag))
            .first();

        if (existingRelease) {
            throw new Error('A release with this tag already exists in this project');
        }

        if (!args.name.trim()) {
            throw new Error('Release name cannot be empty');
        }

        if (!args.tag.trim()) {
            throw new Error('Release tag cannot be empty');
        }

        if (args.name.length > 100) {
            throw new Error('Release name cannot exceed 100 characters');
        }

        if (args.tag.length > 50) {
            throw new Error('Release tag cannot exceed 50 characters');
        }

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

        const releaseId = await ctx.db.insert('releases', {
            projectId: args.projectId,
            name: args.name.trim(),
            tag: args.tag.trim(),
            namespaceVersions: args.namespaceVersions,
        });

        return releaseId;
    },
});

export const updateRelease = mutation({
    args: {
        releaseId: v.id('releases'),
        workspaceId: v.id('workspaces'),
        name: v.string(),
        tag: v.string(),
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

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || identity.org !== workspace.clerkId) {
            throw new Error('Workspace not found or access denied');
        }

        const release = await ctx.db.get(args.releaseId);
        if (!release) {
            throw new Error('Release not found');
        }

        const project = await ctx.db.get(release.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        if (!args.name.trim()) {
            throw new Error('Release name cannot be empty');
        }

        if (!args.tag.trim()) {
            throw new Error('Release tag cannot be empty');
        }

        if (args.name.length > 100) {
            throw new Error('Release name cannot exceed 100 characters');
        }

        if (args.tag.length > 50) {
            throw new Error('Release tag cannot exceed 50 characters');
        }

        if (args.tag.trim() !== release.tag) {
            const existingRelease = await ctx.db
                .query('releases')
                .withIndex('by_project_tag', q => q.eq('projectId', release.projectId).eq('tag', args.tag.trim()))
                .first();

            if (existingRelease) {
                throw new Error('A release with this tag already exists in this project');
            }
        }

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

        await ctx.db.patch(args.releaseId, {
            name: args.name.trim(),
            tag: args.tag.trim(),
            namespaceVersions: args.namespaceVersions,
        });

        return args.releaseId;
    },
});

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

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || identity.org !== workspace.clerkId) {
            throw new Error('Workspace not found or access denied');
        }

        const release = await ctx.db.get(args.releaseId);
        if (!release) {
            throw new Error('Release not found');
        }

        const project = await ctx.db.get(release.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        await ctx.db.delete(args.releaseId);

        return args.releaseId;
    },
});
