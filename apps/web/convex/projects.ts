import { paginationOptsValidator } from 'convex/server';
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';

export const getProjects = query({
    args: {
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

        return await ctx.db
            .query('projects')
            .withIndex('by_workspace_name', q => q.eq('workspaceId', args.workspaceId))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

export const getProject = query({
    args: {
        projectId: v.id('projects'),
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

        const project = await ctx.db.get(args.projectId);

        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        return project;
    },
});

export const createProject = mutation({
    args: {
        workspaceId: v.id('workspaces'),
        name: v.string(),
        description: v.optional(v.string()),
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

        if (workspace.currentUsage.projects >= workspace.limits.projects) {
            throw new Error('Project limit reached. Please upgrade your plan.');
        }

        const existingProject = await ctx.db
            .query('projects')
            .withIndex('by_workspace_name', q => q.eq('workspaceId', args.workspaceId).eq('name', args.name))
            .first();

        if (existingProject) {
            throw new Error('A project with this name already exists');
        }

        const projectId = await ctx.db.insert('projects', {
            workspaceId: args.workspaceId,
            name: args.name,
            description: args.description,
            usage: {
                namespaces: 0,
            },
        });

        await ctx.db.patch(args.workspaceId, {
            currentUsage: {
                ...workspace.currentUsage,
                projects: workspace.currentUsage.projects + 1,
            },
        });

        await ctx.scheduler.runAfter(0, internal.keys.createUnkeyIdentity, {
            projectId,
            workspaceId: workspace._id,
        });

        return projectId;
    },
});

export const updateProject = mutation({
    args: {
        projectId: v.id('projects'),
        workspaceId: v.id('workspaces'),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
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

        const { name, description } = args;

        if (name && name !== project.name) {
            const existingProject = await ctx.db
                .query('projects')
                .withIndex('by_workspace_name', q => q.eq('workspaceId', args.workspaceId).eq('name', name))
                .first();

            if (existingProject) {
                throw new Error('A project with this name already exists');
            }
        }

        const updates: { name?: string; description?: string } = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;

        await ctx.db.patch(args.projectId, updates);

        return args.projectId;
    },
});

export const deleteProject = mutation({
    args: {
        projectId: v.id('projects'),
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

        const project = await ctx.db.get(args.projectId);

        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        await ctx.scheduler.runAfter(0, internal.keys.deleteUnkeyIdentity, {
            projectId: project._id,
            workspaceId: workspace._id,
        });

        const releases = await ctx.db
            .query('releases')
            .withIndex('by_project_tag', q => q.eq('projectId', args.projectId))
            .collect();

        for (const release of releases) {
            await ctx.db.delete(release._id);
        }

        const screenshots = await ctx.db
            .query('screenshots')
            .withIndex('by_project_name', q => q.eq('projectId', args.projectId))
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
                await ctx.storage.delete(screenshot.imageFileId);
            }

            await ctx.db.delete(screenshot._id);
        }

        const namespaces = await ctx.db
            .query('namespaces')
            .withIndex('by_project', q => q.eq('projectId', args.projectId))
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
                        await ctx.storage.delete(language.fileId);
                    }
                    await ctx.db.delete(language._id);
                }

                if (version.jsonSchemaFileId) {
                    await ctx.storage.delete(version.jsonSchemaFileId);
                }

                await ctx.db.delete(version._id);
            }

            await ctx.db.delete(namespace._id);
        }

        await ctx.db.delete(args.projectId);

        await ctx.db.patch(args.workspaceId, {
            currentUsage: {
                ...workspace.currentUsage,
                projects: Math.max(0, workspace.currentUsage.projects - 1),
            },
        });

        return args.projectId;
    },
});
