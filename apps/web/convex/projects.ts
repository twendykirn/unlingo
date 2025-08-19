import { paginationOptsValidator } from 'convex/server';
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Query to get projects with pagination
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

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Only allow access to organization workspaces
        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only access organization workspaces');
        }

        return await ctx.db
            .query('projects')
            .withIndex('by_workspace', q => q.eq('workspaceId', args.workspaceId))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

// Query to get a single project by ID
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

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Only allow access to organization workspaces
        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only access organization workspaces');
        }

        const project = await ctx.db.get(args.projectId);

        // Verify the project belongs to the workspace
        if (!project || project.workspaceId !== args.workspaceId) {
            return null;
        }

        return project;
    },
});

// Mutation to create a new project
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

        // Get workspace to check limits
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Verify user is in organization that owns this workspace
        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only create projects in organization workspaces');
        }

        // Check if user has reached project limit
        if (workspace.currentUsage.projects >= workspace.limits.projects) {
            throw new Error('Project limit reached. Please upgrade your plan.');
        }

        // Check if project name already exists in workspace
        const existingProject = await ctx.db
            .query('projects')
            .withIndex('by_workspace_name', q => q.eq('workspaceId', args.workspaceId).eq('name', args.name))
            .first();

        if (existingProject) {
            throw new Error('A project with this name already exists');
        }

        // Create the project
        const projectId = await ctx.db.insert('projects', {
            workspaceId: args.workspaceId,
            name: args.name,
            description: args.description,
            usage: {
                namespaces: 0,
            },
        });

        // Update workspace usage
        await ctx.db.patch(args.workspaceId, {
            currentUsage: {
                ...workspace.currentUsage,
                projects: workspace.currentUsage.projects + 1,
            },
        });

        return projectId;
    },
});

// Mutation to update a project
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

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only update projects in organization workspaces');
        }

        const project = await ctx.db.get(args.projectId);

        // Verify the project belongs to the workspace
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found');
        }

        const { name, description } = args;

        // If updating name, check for duplicates
        if (name && name !== project.name) {
            const existingProject = await ctx.db
                .query('projects')
                .withIndex('by_workspace_name', q => q.eq('workspaceId', args.workspaceId).eq('name', name))
                .first();

            if (existingProject) {
                throw new Error('A project with this name already exists');
            }
        }

        // Update the project
        const updates: { name?: string; description?: string } = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;

        await ctx.db.patch(args.projectId, updates);

        return args.projectId;
    },
});

// Mutation to delete a project
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

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only delete projects from organization workspaces');
        }

        const project = await ctx.db.get(args.projectId);

        // Verify the project belongs to the workspace
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found');
        }

        // Delete all related data
        // 1. Delete releases
        const releases = await ctx.db
            .query('releases')
            .withIndex('by_project', q => q.eq('projectId', args.projectId))
            .collect();

        for (const release of releases) {
            await ctx.db.delete(release._id);
        }

        // 2. Delete screenshots and related data
        const screenshots = await ctx.db
            .query('screenshots')
            .withIndex('by_project', q => q.eq('projectId', args.projectId))
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

        // 3. Delete namespaces and related data
        const namespaces = await ctx.db
            .query('namespaces')
            .withIndex('by_project', q => q.eq('projectId', args.projectId))
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

        // 4. Delete API keys for this project
        const apiKeys = await ctx.db
            .query('apiKeys')
            .withIndex('by_project', q => q.eq('projectId', args.projectId))
            .collect();

        for (const apiKey of apiKeys) {
            await ctx.db.delete(apiKey._id);
        }

        // 5. Delete the project
        await ctx.db.delete(args.projectId);

        // 6. Update workspace usage
        await ctx.db.patch(args.workspaceId, {
            currentUsage: {
                ...workspace.currentUsage,
                projects: Math.max(0, workspace.currentUsage.projects - 1),
            },
        });

        return args.projectId;
    },
});
