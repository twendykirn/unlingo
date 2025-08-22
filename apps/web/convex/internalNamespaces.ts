import { v } from 'convex/values';
import { internalMutation } from './_generated/server';

export const createNamespaceVersionContext = internalMutation({
    args: {
        namespaceId: v.id('namespaces'),
        workspaceId: v.id('workspaces'),
        version: v.string(),
        copyFromVersionId: v.optional(v.id('namespaceVersions')),
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

        const existingVersion = await ctx.db
            .query('namespaceVersions')
            .withIndex('by_namespace_version', q => q.eq('namespaceId', args.namespaceId).eq('version', args.version))
            .first();

        if (existingVersion) {
            throw new Error(`Version '${args.version}' already exists for this namespace`);
        }

        const currentVersionCount = namespace.usage?.versions ?? 0;
        if (currentVersionCount >= workspace.limits.versionsPerNamespace) {
            throw new Error(
                `Version limit reached. Maximum ${workspace.limits.versionsPerNamespace} versions per namespace. Please upgrade your plan.`
            );
        }

        const versionId = await ctx.db.insert('namespaceVersions', {
            namespaceId: args.namespaceId,
            version: args.version,
            usage: {
                languages: 0,
            },
        });

        await ctx.db.patch(args.namespaceId, {
            usage: {
                versions: currentVersionCount + 1,
            },
        });

        if (args.copyFromVersionId) {
            const sourceLanguages = await ctx.db
                .query('languages')
                .withIndex('by_namespace_version', q => q.eq('namespaceVersionId', args.copyFromVersionId!))
                .collect();

            return {
                versionId,
                sourceLanguages,
            };
        }

        return {
            versionId,
        };
    },
});

export const internalInsertLanguage = internalMutation({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
        languageCode: v.string(),
        fileId: v.optional(v.id('_storage')),
        fileSize: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert('languages', {
            namespaceVersionId: args.namespaceVersionId,
            languageCode: args.languageCode,
            fileId: args.fileId,
            fileSize: args.fileSize,
        });
    },
});

export const internalUpdateVersionUsage = internalMutation({
    args: {
        versionId: v.id('namespaceVersions'),
        languageCount: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.versionId, {
            usage: {
                languages: args.languageCount,
            },
        });
    },
});
