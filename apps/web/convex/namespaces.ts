import { paginationOptsValidator } from 'convex/server';
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Query to get namespaces for a project with pagination
export const getNamespaces = query({
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
            .query('namespaces')
            .withIndex('by_project', q => q.eq('projectId', args.projectId))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

// Query to get a single namespace by ID
export const getNamespace = query({
    args: {
        namespaceId: v.id('namespaces'),
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

        // Verify project belongs to workspace
        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const namespace = await ctx.db.get(args.namespaceId);

        // Verify the namespace belongs to the project
        if (!namespace || namespace.projectId !== args.projectId) {
            return null;
        }

        return namespace;
    },
});

// Mutation to create a new namespace
export const createNamespace = mutation({
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

        // Get workspace to check limits
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Verify user is in organization that owns this workspace
        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only create namespaces in organization workspaces');
        }

        // Verify project belongs to workspace
        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        // Check if namespace name already exists in project
        const existingNamespace = await ctx.db
            .query('namespaces')
            .withIndex('by_project', q => q.eq('projectId', args.projectId))
            .filter(q => q.eq(q.field('name'), args.name))
            .first();

        if (existingNamespace) {
            throw new Error('A namespace with this name already exists in this project');
        }

        // Check if project has reached namespace limit using usage counter
        const currentNamespaceCount = project.usage?.namespaces ?? 0;
        if (currentNamespaceCount >= workspace.limits.namespacesPerProject) {
            throw new Error(
                `Namespace limit reached. Maximum ${workspace.limits.namespacesPerProject} namespaces per project. Please upgrade your plan.`
            );
        }

        // Validate namespace name
        if (!args.name.trim()) {
            throw new Error('Namespace name cannot be empty');
        }

        if (args.name.length > 100) {
            throw new Error('Namespace name cannot exceed 100 characters');
        }

        // Validate namespace name format (allow alphanumeric, hyphens, underscores)
        if (!/^[a-zA-Z0-9_-]+$/.test(args.name)) {
            throw new Error('Namespace name can only contain letters, numbers, hyphens, and underscores');
        }

        // Create the namespace
        const namespaceId = await ctx.db.insert('namespaces', {
            projectId: args.projectId,
            name: args.name.trim(),
            usage: {
                languages: 0,
                versions: 1, // Start with 1 version (main)
            },
        });

        // Automatically create a "main" version for the namespace
        await ctx.db.insert('namespaceVersions', {
            namespaceId: namespaceId,
            version: 'main',
        });

        // Update project usage counter
        await ctx.db.patch(args.projectId, {
            usage: {
                namespaces: currentNamespaceCount + 1,
            },
        });

        return namespaceId;
    },
});

// Mutation to update a namespace
export const updateNamespace = mutation({
    args: {
        namespaceId: v.id('namespaces'),
        projectId: v.id('projects'),
        workspaceId: v.id('workspaces'),
        name: v.string(),
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
            throw new Error('Unauthorized: Can only update namespaces in organization workspaces');
        }

        // Verify project belongs to workspace
        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const namespace = await ctx.db.get(args.namespaceId);

        // Verify the namespace belongs to the project
        if (!namespace || namespace.projectId !== args.projectId) {
            throw new Error('Namespace not found');
        }

        // Validate namespace name
        if (!args.name.trim()) {
            throw new Error('Namespace name cannot be empty');
        }

        if (args.name.length > 100) {
            throw new Error('Namespace name cannot exceed 100 characters');
        }

        // Validate namespace name format (allow alphanumeric, hyphens, underscores)
        if (!/^[a-zA-Z0-9_-]+$/.test(args.name)) {
            throw new Error('Namespace name can only contain letters, numbers, hyphens, and underscores');
        }

        // If updating name, check for duplicates
        if (args.name.trim() !== namespace.name) {
            const existingNamespace = await ctx.db
                .query('namespaces')
                .withIndex('by_project', q => q.eq('projectId', args.projectId))
                .filter(q => q.eq(q.field('name'), args.name.trim()))
                .first();

            if (existingNamespace) {
                throw new Error('A namespace with this name already exists in this project');
            }
        }

        // Update the namespace
        await ctx.db.patch(args.namespaceId, {
            name: args.name.trim(),
        });

        return args.namespaceId;
    },
});

// Mutation to delete a namespace
export const deleteNamespace = mutation({
    args: {
        namespaceId: v.id('namespaces'),
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
            throw new Error('Unauthorized: Can only delete namespaces from organization workspaces');
        }

        // Verify project belongs to workspace
        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const namespace = await ctx.db.get(args.namespaceId);

        // Verify the namespace belongs to the project
        if (!namespace || namespace.projectId !== args.projectId) {
            throw new Error('Namespace not found');
        }

        // Delete all related data
        // 1. Delete namespace versions and languages
        const namespaceVersions = await ctx.db
            .query('namespaceVersions')
            .withIndex('by_namespace', q => q.eq('namespaceId', args.namespaceId))
            .collect();

        for (const version of namespaceVersions) {
            // Delete languages for this version
            const languages = await ctx.db
                .query('languages')
                .withIndex('by_namespace_version', q => q.eq('namespaceVersionId', version._id))
                .collect();

            for (const language of languages) {
                // Delete the file from Convex Storage
                if (language.fileId) {
                    await ctx.storage.delete(language.fileId);
                }
                await ctx.db.delete(language._id);
            }

            await ctx.db.delete(version._id);
        }

        // 2. Remove namespace from any releases
        const releases = await ctx.db
            .query('releases')
            .withIndex('by_project', q => q.eq('projectId', args.projectId))
            .collect();

        for (const release of releases) {
            const updatedNamespaceVersions = release.namespaceVersions.filter(
                nv => nv.namespaceId !== args.namespaceId
            );

            if (updatedNamespaceVersions.length !== release.namespaceVersions.length) {
                await ctx.db.patch(release._id, {
                    namespaceVersions: updatedNamespaceVersions,
                });
            }
        }

        // 3. Delete the namespace
        await ctx.db.delete(args.namespaceId);

        // 4. Update project usage counter
        if (project) {
            const currentNamespaceCount = project.usage?.namespaces ?? 1;
            await ctx.db.patch(args.projectId, {
                usage: {
                    namespaces: Math.max(0, currentNamespaceCount - 1),
                },
            });
        }

        return args.namespaceId;
    },
});

// Query to get namespace count for a project (useful for checking limits)
export const getNamespaceCount = query({
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

        // Verify project belongs to workspace
        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        // Get namespace count from project usage
        const currentCount = project.usage?.namespaces ?? 0;

        return {
            count: currentCount,
            limit: workspace.limits.namespacesPerProject,
            canCreateMore: currentCount < workspace.limits.namespacesPerProject,
        };
    },
});

// Mutation to set primary language for a namespace
export const setPrimaryLanguage = mutation({
    args: {
        namespaceId: v.id('namespaces'),
        workspaceId: v.id('workspaces'),
        languageId: v.id('languages'),
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
            throw new Error('Unauthorized: Can only update namespaces in organization workspaces');
        }

        // Verify namespace exists and belongs to workspace
        const namespace = await ctx.db.get(args.namespaceId);
        if (!namespace) {
            throw new Error('Namespace not found');
        }

        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        // Verify language exists and belongs to this namespace
        const language = await ctx.db.get(args.languageId);
        if (!language) {
            throw new Error('Language not found');
        }

        // Check if language belongs to any version of this namespace
        const namespaceVersion = await ctx.db.get(language.namespaceVersionId);
        if (!namespaceVersion || namespaceVersion.namespaceId !== args.namespaceId) {
            throw new Error('Language does not belong to this namespace');
        }

        // Update the namespace with primary language
        await ctx.db.patch(args.namespaceId, {
            primaryLanguageId: args.languageId,
        });

        return args.namespaceId;
    },
});
