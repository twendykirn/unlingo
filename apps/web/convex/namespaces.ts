import { paginationOptsValidator } from 'convex/server';
import { mutation, query, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { r2 } from './files';

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

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || identity.org !== workspace.clerkId) {
            throw new Error('Workspace not found or access denied');
        }

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

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || identity.org !== workspace.clerkId) {
            throw new Error('Workspace not found or access denied');
        }

        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const namespace = await ctx.db.get(args.namespaceId);

        if (!namespace || namespace.projectId !== args.projectId) {
            throw new Error('Namespace not found or access denied');
        }

        return namespace;
    },
});

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

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || identity.org !== workspace.clerkId) {
            throw new Error('Workspace not found or access denied');
        }

        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const existingNamespace = await ctx.db
            .query('namespaces')
            .withIndex('by_project', q => q.eq('projectId', args.projectId))
            .filter(q => q.eq(q.field('name'), args.name))
            .first();

        if (existingNamespace) {
            throw new Error('A namespace with this name already exists in this project');
        }

        const currentNamespaceCount = project.usage?.namespaces ?? 0;
        if (currentNamespaceCount >= workspace.limits.namespacesPerProject) {
            throw new Error(
                `Namespace limit reached. Maximum ${workspace.limits.namespacesPerProject} namespaces per project. Please upgrade your plan.`
            );
        }

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

        const namespaceId = await ctx.db.insert('namespaces', {
            projectId: args.projectId,
            name: args.name.trim(),
            usage: {
                versions: 2,
            },
        });

        const now = Date.now();

        await ctx.db.insert('namespaceVersions', {
            namespaceId: namespaceId,
            version: 'development',
            usage: {
                languages: 0,
            },
            updatedAt: now,
        });

        await ctx.db.insert('namespaceVersions', {
            namespaceId: namespaceId,
            version: 'production',
            usage: {
                languages: 0,
            },
            updatedAt: now,
        });

        await ctx.db.patch(args.projectId, {
            usage: {
                namespaces: currentNamespaceCount + 1,
            },
        });

        return namespaceId;
    },
});

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

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || identity.org !== workspace.clerkId) {
            throw new Error('Workspace not found or access denied');
        }

        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const namespace = await ctx.db.get(args.namespaceId);

        if (!namespace || namespace.projectId !== args.projectId) {
            throw new Error('Namespace not found');
        }

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

        await ctx.db.patch(args.namespaceId, {
            name: args.name.trim(),
        });

        return args.namespaceId;
    },
});

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

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || identity.org !== workspace.clerkId) {
            throw new Error('Workspace not found or access denied');
        }

        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const namespace = await ctx.db.get(args.namespaceId);

        if (!namespace || namespace.projectId !== args.projectId) {
            throw new Error('Namespace not found or access denied');
        }

        // 1. Delete namespace versions and languages
        const namespaceVersions = await ctx.db
            .query('namespaceVersions')
            .withIndex('by_namespace_version', q => q.eq('namespaceId', args.namespaceId))
            .collect();

        for (const version of namespaceVersions) {
            const languages = await ctx.db
                .query('languages')
                .withIndex('by_namespace_version_language', q => q.eq('namespaceVersionId', version._id))
                .collect();

            for (const language of languages) {
                const mappings = await ctx.db
                    .query('screenshotKeyMappings')
                    .withIndex('by_version_language_key', q =>
                        q.eq('namespaceVersionId', language.namespaceVersionId).eq('languageId', language._id)
                    )
                    .collect();

                for (const mapping of mappings) {
                    await ctx.db.delete(mapping._id);
                }

                if (language.fileId) {
                    await r2.deleteObject(ctx, language.fileId);
                }
                await ctx.db.delete(language._id);
            }

            await ctx.db.delete(version._id);
        }

        // 2. Remove namespace from any releases
        const releases = await ctx.db
            .query('releases')
            .withIndex('by_project_tag', q => q.eq('projectId', args.projectId))
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

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || identity.org !== workspace.clerkId) {
            throw new Error('Workspace not found or access denied');
        }

        const namespace = await ctx.db.get(args.namespaceId);
        if (!namespace) {
            throw new Error('Namespace not found');
        }

        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const language = await ctx.db.get(args.languageId);
        if (!language) {
            throw new Error('Language not found');
        }

        const namespaceVersion = await ctx.db.get(language.namespaceVersionId);
        if (!namespaceVersion || namespaceVersion.namespaceId !== args.namespaceId) {
            throw new Error('Language does not belong to this namespace');
        }

        await ctx.db.patch(language.namespaceVersionId, {
            primaryLanguageId: args.languageId,
            updatedAt: Date.now(),
        });

        return args.namespaceId;
    },
});

export const getNamespaceInternal = internalQuery({
    args: {
        namespaceId: v.id('namespaces'),
        projectId: v.id('projects'),
        workspaceId: v.id('workspaces'),
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

        const namespace = await ctx.db.get(args.namespaceId);

        if (!namespace || namespace.projectId !== args.projectId) {
            throw new Error('Namespace not found or access denied');
        }

        return namespace;
    },
});
