import { paginationOptsValidator } from 'convex/server';
import { internalMutation, query } from './_generated/server';
import { v } from 'convex/values';

export const getNamespaceVersions = query({
    args: {
        namespaceId: v.id('namespaces'),
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

        const namespace = await ctx.db.get(args.namespaceId);
        if (!namespace) {
            throw new Error('Namespace not found');
        }

        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        return await ctx.db
            .query('namespaceVersions')
            .withIndex('by_namespace_version', q => q.eq('namespaceId', args.namespaceId))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

export const getNamespaceVersion = query({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
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

        const namespaceVersion = await ctx.db.get(args.namespaceVersionId);
        if (!namespaceVersion) {
            throw new Error('Namespace version not found or access denied');
        }

        const namespace = await ctx.db.get(namespaceVersion.namespaceId);
        if (!namespace) {
            throw new Error('Namespace not found or access denied');
        }

        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        return namespaceVersion;
    },
});

export const updateNamespaceVersion = internalMutation({
    args: {
        versionId: v.id('namespaceVersions'),
        workspaceId: v.id('workspaces'),
        version: v.string(),
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

        const namespaceVersion = await ctx.db.get(args.versionId);
        if (!namespaceVersion) {
            throw new Error('Namespace version not found');
        }

        const namespace = await ctx.db.get(namespaceVersion.namespaceId);
        if (!namespace) {
            throw new Error('Namespace not found');
        }

        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const existingVersion = await ctx.db
            .query('namespaceVersions')
            .withIndex('by_namespace_version', q => q.eq('namespaceId', namespaceVersion.namespaceId))
            .filter(q => q.and(q.eq(q.field('version'), args.version), q.neq(q.field('_id'), args.versionId)))
            .first();

        if (existingVersion) {
            throw new Error(`Version "${args.version}" already exists for this namespace`);
        }

        await ctx.db.patch(args.versionId, {
            version: args.version,
            updatedAt: Date.now(),
        });

        return args.versionId;
    },
});

export const deleteNamespaceVersion = internalMutation({
    args: {
        versionId: v.id('namespaceVersions'),
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

        const namespaceVersion = await ctx.db.get(args.versionId);
        if (!namespaceVersion) {
            throw new Error('Namespace version not found');
        }

        const namespace = await ctx.db.get(namespaceVersion.namespaceId);
        if (!namespace) {
            throw new Error('Namespace not found');
        }

        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied: Project does not belong to workspace');
        }

        const languages = await ctx.db
            .query('languages')
            .withIndex('by_namespace_version_language', q => q.eq('namespaceVersionId', args.versionId))
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
                await ctx.storage.delete(language.fileId);
            }
            await ctx.db.delete(language._id);
        }

        if (namespaceVersion.jsonSchemaFileId) {
            await ctx.storage.delete(namespaceVersion.jsonSchemaFileId);
        }

        await ctx.db.delete(args.versionId);

        const currentVersionCount = namespace.usage?.versions ?? 1;

        await ctx.db.patch(namespace._id, {
            usage: {
                versions: Math.max(0, currentVersionCount - 1),
            },
        });

        return args.versionId;
    },
});
