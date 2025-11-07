import { paginationOptsValidator } from 'convex/server';
import { action, internalAction, internalMutation, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { Workpool, vOnCompleteArgs } from '@convex-dev/workpool';
import { components, internal } from './_generated/api';
import { Id } from './_generated/dataModel';

const mergeWorkpool = new Workpool((components as any).mergeWorkpool, {
    retryActionsByDefault: true,
    defaultRetryBehavior: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 },
});

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

export const mergeNamespaceVersions = action({
    args: {
        namespaceId: v.id('namespaces'),
        workspaceId: v.id('workspaces'),
        sourceVersion: v.union(v.literal('development'), v.literal('production')),
        targetVersion: v.union(v.literal('development'), v.literal('production')),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        if (args.sourceVersion === args.targetVersion) {
            throw new Error('Source and target versions must be different');
        }

        // Verify workspace access
        const clerkId = typeof identity.org === 'string' ? identity.org : '';
        const workspace = await ctx.runMutation(internal.namespaceVersions.getWorkspace, {
            workspaceId: args.workspaceId,
            clerkId,
        });

        if (!workspace) {
            throw new Error('Workspace not found or access denied');
        }

        // Get namespace and verify access
        const namespace = await ctx.runMutation(internal.namespaceVersions.getNamespaceForMerge, {
            namespaceId: args.namespaceId,
            workspaceId: args.workspaceId,
        });

        // Get source and target versions
        const sourceVersionDoc = await ctx.runMutation(internal.namespaceVersions.getVersionByName, {
            namespaceId: args.namespaceId,
            version: args.sourceVersion,
        });

        const targetVersionDoc = await ctx.runMutation(internal.namespaceVersions.getVersionByName, {
            namespaceId: args.namespaceId,
            version: args.targetVersion,
        });

        if (!sourceVersionDoc || !targetVersionDoc) {
            throw new Error('Source or target version not found');
        }

        // Set both versions to merging status
        await ctx.runMutation(internal.namespaceVersions.setVersionStatus, {
            versionId: sourceVersionDoc._id,
            status: 'merging',
        });

        await ctx.runMutation(internal.namespaceVersions.setVersionStatus, {
            versionId: targetVersionDoc._id,
            status: 'merging',
        });

        // Get all languages from source version
        const sourceLanguages = await ctx.runMutation(internal.namespaceVersions.getVersionLanguages, {
            versionId: sourceVersionDoc._id,
        });

        // Get all languages from target version
        const targetLanguages = await ctx.runMutation(internal.namespaceVersions.getVersionLanguages, {
            versionId: targetVersionDoc._id,
        });

        // Prepare merge operations
        type MergeOperation = {
            languageCode: string;
            sourceLanguageId: Id<'languages'>;
            targetLanguageId?: Id<'languages'>;
            operation: 'create' | 'update';
        };

        const mergeOperations: MergeOperation[] = [];

        // Map target languages by code for easy lookup
        const targetLanguageMap = new Map(
            targetLanguages.map(lang => [lang.languageCode, lang] as [string, typeof lang])
        );

        // Process source languages
        for (const sourceLang of sourceLanguages) {
            const targetLang = targetLanguageMap.get(sourceLang.languageCode);
            if (targetLang) {
                mergeOperations.push({
                    languageCode: sourceLang.languageCode,
                    sourceLanguageId: sourceLang._id,
                    targetLanguageId: targetLang._id,
                    operation: 'update',
                });
                targetLanguageMap.delete(sourceLang.languageCode);
            } else {
                mergeOperations.push({
                    languageCode: sourceLang.languageCode,
                    sourceLanguageId: sourceLang._id,
                    operation: 'create',
                });
            }
        }

        // Remaining target languages need to be deleted
        const languagesToDelete = Array.from(targetLanguageMap.values());

        // Delete languages that don't exist in source
        for (const langToDelete of languagesToDelete) {
            await ctx.runMutation(internal.namespaceVersions.deleteLanguageForMerge, {
                languageId: langToDelete._id,
                versionId: targetVersionDoc._id,
            });
        }

        // Use workpool to process merge operations
        await mergeWorkpool.enqueueActionBatch(
            ctx,
            internal.namespaceVersions.mergeLanguage,
            mergeOperations.map(op => ({
                ...op,
                targetVersionId: targetVersionDoc._id,
                sourceVersionId: sourceVersionDoc._id,
                namespaceId: args.namespaceId,
                workspaceId: args.workspaceId,
            })),
            {
                onComplete: internal.namespaceVersions.completeMerge,
                context: {
                    sourceVersionId: sourceVersionDoc._id,
                    targetVersionId: targetVersionDoc._id,
                    namespaceId: args.namespaceId,
                },
            }
        );

        return { success: true };
    },
});

export const mergeLanguage = internalAction({
    args: {
        languageCode: v.string(),
        sourceLanguageId: v.id('languages'),
        targetLanguageId: v.optional(v.id('languages')),
        operation: v.union(v.literal('create'), v.literal('update')),
        targetVersionId: v.id('namespaceVersions'),
        sourceVersionId: v.id('namespaceVersions'),
        namespaceId: v.id('namespaces'),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        // Get source language file
        const sourceLanguage = await ctx.runMutation(internal.namespaceVersions.getLanguageById, {
            languageId: args.sourceLanguageId,
        });

        if (!sourceLanguage?.fileId) {
            console.warn(`No file found for source language: ${args.languageCode}`);
            return;
        }

        // Download source file content
        const fileUrl = await ctx.storage.getUrl(sourceLanguage.fileId);
        if (!fileUrl) {
            throw new Error(`Failed to get URL for source language file: ${args.languageCode}`);
        }

        const response = await fetch(fileUrl);
        const content = await response.text();

        // Upload content to target version
        const contentBlob = new Blob([content], { type: 'application/json' });
        const uploadUrl = await ctx.storage.generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: contentBlob,
        });

        const { storageId } = await uploadResponse.json();

        if (args.operation === 'update' && args.targetLanguageId) {
            // Update existing language
            await ctx.runMutation(internal.namespaceVersions.updateLanguageForMerge, {
                languageId: args.targetLanguageId,
                fileId: storageId,
                fileSize: contentBlob.size,
            });
        } else if (args.operation === 'create') {
            // Create new language
            await ctx.runMutation(internal.namespaceVersions.createLanguageForMerge, {
                versionId: args.targetVersionId,
                languageCode: args.languageCode,
                fileId: storageId,
                fileSize: contentBlob.size,
            });
        }
    },
});

export const completeMerge = internalMutation({
    args: vOnCompleteArgs(
        v.object({
            sourceVersionId: v.id('namespaceVersions'),
            targetVersionId: v.id('namespaceVersions'),
            namespaceId: v.id('namespaces'),
        })
    ),
    handler: async (ctx, { context }) => {
        // Clear merging status
        await ctx.db.patch(context.sourceVersionId, {
            status: undefined,
            updatedAt: Date.now(),
        });

        await ctx.db.patch(context.targetVersionId, {
            status: undefined,
            updatedAt: Date.now(),
        });

        // Recalculate language counts
        const targetLanguages = await ctx.db
            .query('languages')
            .withIndex('by_namespace_version_language', q => q.eq('namespaceVersionId', context.targetVersionId))
            .collect();

        await ctx.db.patch(context.targetVersionId, {
            usage: {
                languages: targetLanguages.length,
            },
            updatedAt: Date.now(),
        });

        // Update namespace usage (total unique languages across versions)
        const allVersions = await ctx.db
            .query('namespaceVersions')
            .withIndex('by_namespace_version', q => q.eq('namespaceId', context.namespaceId))
            .collect();

        // Nothing to update for namespace usage since versions count doesn't change
    },
});

// Internal queries and mutations for merge operations

export const getWorkspace = internalMutation({
    args: {
        workspaceId: v.id('workspaces'),
        clerkId: v.string(),
    },
    handler: async (ctx, args) => {
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== args.clerkId) {
            return null;
        }
        return workspace;
    },
});

export const getNamespaceForMerge = internalMutation({
    args: {
        namespaceId: v.id('namespaces'),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const namespace = await ctx.db.get(args.namespaceId);
        if (!namespace) {
            throw new Error('Namespace not found');
        }

        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied');
        }

        return namespace;
    },
});

export const getVersionByName = internalMutation({
    args: {
        namespaceId: v.id('namespaces'),
        version: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('namespaceVersions')
            .withIndex('by_namespace_version', q => q.eq('namespaceId', args.namespaceId).eq('version', args.version))
            .first();
    },
});

export const setVersionStatus = internalMutation({
    args: {
        versionId: v.id('namespaceVersions'),
        status: v.optional(v.union(v.literal('merging'), v.literal('syncing'))),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.versionId, {
            status: args.status,
            updatedAt: Date.now(),
        });
    },
});

export const getVersionLanguages = internalMutation({
    args: {
        versionId: v.id('namespaceVersions'),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('languages')
            .withIndex('by_namespace_version_language', q => q.eq('namespaceVersionId', args.versionId))
            .collect();
    },
});

export const getLanguageById = internalMutation({
    args: {
        languageId: v.id('languages'),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.languageId);
    },
});

export const deleteLanguageForMerge = internalMutation({
    args: {
        languageId: v.id('languages'),
        versionId: v.id('namespaceVersions'),
    },
    handler: async (ctx, args) => {
        const language = await ctx.db.get(args.languageId);
        if (!language) {
            return;
        }

        // Delete screenshot mappings
        const mappings = await ctx.db
            .query('screenshotKeyMappings')
            .withIndex('by_version_language_key', q =>
                q.eq('namespaceVersionId', language.namespaceVersionId).eq('languageId', args.languageId)
            )
            .collect();

        for (const mapping of mappings) {
            await ctx.db.delete(mapping._id);
        }

        // Delete file
        if (language.fileId) {
            await ctx.storage.delete(language.fileId);
        }

        // Delete language
        await ctx.db.delete(args.languageId);
    },
});

export const updateLanguageForMerge = internalMutation({
    args: {
        languageId: v.id('languages'),
        fileId: v.id('_storage'),
        fileSize: v.number(),
    },
    handler: async (ctx, args) => {
        const language = await ctx.db.get(args.languageId);
        if (!language) {
            throw new Error('Language not found');
        }

        // Delete old file
        if (language.fileId) {
            await ctx.storage.delete(language.fileId);
        }

        // Update language with new file
        await ctx.db.patch(args.languageId, {
            fileId: args.fileId,
            fileSize: args.fileSize,
            updatedAt: Date.now(),
        });
    },
});

export const createLanguageForMerge = internalMutation({
    args: {
        versionId: v.id('namespaceVersions'),
        languageCode: v.string(),
        fileId: v.id('_storage'),
        fileSize: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert('languages', {
            namespaceVersionId: args.versionId,
            languageCode: args.languageCode,
            fileId: args.fileId,
            fileSize: args.fileSize,
            updatedAt: Date.now(),
        });
    },
});
