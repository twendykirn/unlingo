import { paginationOptsValidator } from 'convex/server';
import { action, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { Id } from './_generated/dataModel';

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

export const createNamespaceVersion = action({
    args: {
        namespaceId: v.id('namespaces'),
        workspaceId: v.id('workspaces'),
        version: v.string(),
        copyFromVersionId: v.optional(v.id('namespaceVersions')),
    },
    handler: async (ctx, args): Promise<Id<'namespaceVersions'>> => {
        const { versionId, sourceLanguages } = await ctx.runMutation(
            internal.internalNamespaces.createNamespaceVersionContext,
            {
                namespaceId: args.namespaceId,
                workspaceId: args.workspaceId,
                version: args.version,
                copyFromVersionId: args.copyFromVersionId,
            }
        );

        if (args.copyFromVersionId && sourceLanguages) {
            try {
                for (const sourceLang of sourceLanguages) {
                    let newFileId: string | undefined = undefined;
                    let newFileSize: number | undefined = undefined;

                    if (sourceLang.fileId) {
                        try {
                            const sourceFileUrl = await ctx.storage.getUrl(sourceLang.fileId);
                            if (!sourceFileUrl) {
                                throw new Error('Failed to get source file URL');
                            }
                            const sourceResponse = await fetch(sourceFileUrl);
                            const sourceContent = await sourceResponse.text();

                            const newBlob = new Blob([sourceContent], { type: 'application/json' });
                            const uploadUrl = await ctx.storage.generateUploadUrl();
                            const uploadResponse = await fetch(uploadUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: newBlob,
                            });

                            const { storageId } = await uploadResponse.json();
                            newFileId = storageId;
                            newFileSize = newBlob.size;
                        } catch (error) {
                            throw new Error(`Failed to copy file for language: ${sourceLang.languageCode}. ${error}`);
                        }
                    }

                    await ctx.runMutation(internal.internalNamespaces.internalInsertLanguage, {
                        namespaceVersionId: versionId,
                        languageCode: sourceLang.languageCode,
                        fileId: newFileId ? (newFileId as Id<'_storage'>) : undefined,
                        fileSize: newFileSize,
                    });
                }

                if (sourceLanguages.length > 0) {
                    await ctx.runMutation(internal.internalNamespaces.internalUpdateVersionUsage, {
                        versionId,
                        languageCount: sourceLanguages.length,
                    });
                }
            } catch (error) {
                throw new Error(`Failed to copy file for language: ${error}`);
            }
        }

        return versionId;
    },
});

export const updateNamespaceVersion = mutation({
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
        });

        return args.versionId;
    },
});

export const deleteNamespaceVersion = mutation({
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
