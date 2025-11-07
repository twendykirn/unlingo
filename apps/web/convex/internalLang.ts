import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from './_generated/server';
import { Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import { flattenJson, unflattenJson } from './utils/jsonFlatten';
import { applyLanguageChanges } from './utils/applyLanguageChanges';
import { vOnCompleteArgs } from '@convex-dev/workpool';
import { translateContentUtil } from './utils/translateContentUtil';
import { generateSchemas } from '../lib/zodSchemaGenerator';
import { translateNewContentUtil } from './utils/translateNewContentUtil';

export const languageChangesContext = internalQuery({
    args: {
        languageId: v.id('languages'),
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

        const language = await ctx.db.get(args.languageId);
        if (!language) {
            throw new Error('Language not found');
        }

        const namespaceVersion = await ctx.db.get(language.namespaceVersionId);
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

        return {
            namespaceVersion,
            language,
            namespace,
            project,
        };
    },
});

export const schemaContext = internalQuery({
    args: {
        workspaceId: v.id('workspaces'),
        namespaceVersionId: v.id('namespaceVersions'),
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

        return {
            jsonSchemaFileId: namespaceVersion.jsonSchemaFileId,
            namespace,
            project,
        };
    },
});

export const internalVersionLanguages = internalQuery({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
        primaryLanguageId: v.id('languages'),
    },
    handler: async (ctx, args) => {
        const allLanguages = await ctx.db
            .query('languages')
            .withIndex('by_namespace_version_language', q => q.eq('namespaceVersionId', args.namespaceVersionId))
            .collect();

        const otherLanguages = allLanguages.filter(lang => lang._id !== args.primaryLanguageId);

        return {
            otherLanguages,
        };
    },
});

export const languageUpdateSchema = internalMutation({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
        jsonSchemaFileId: v.id('_storage'),
        jsonSchemaSize: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.namespaceVersionId, {
            jsonSchemaFileId: args.jsonSchemaFileId,
            jsonSchemaSize: args.jsonSchemaSize,
            updatedAt: Date.now(),
        });
    },
});

export const internalLanguageUpdate = internalMutation({
    args: {
        languageId: v.id('languages'),
        fileId: v.id('_storage'),
        fileSize: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.languageId, {
            fileId: args.fileId,
            fileSize: args.fileSize,
            updatedAt: Date.now(),
        });
    },
});

export const namespaceVersionUpdateStatus = internalMutation({
    args: vOnCompleteArgs(v.object({ namespaceVersionId: v.id('namespaceVersions') })),
    handler: async (ctx, { context }) => {
        await ctx.db.patch(context.namespaceVersionId, {
            status: undefined,
        });
    },
});

export const languageUpdateStatus = internalMutation({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
        languageId: v.id('languages'),
        status: v.optional(v.union(v.literal('merging'), v.literal('syncing'))),
        isBranchUpdate: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        if (args.isBranchUpdate) {
            await ctx.db.patch(args.namespaceVersionId, {
                status: args.status,
            });
        }

        await ctx.db.patch(args.languageId, {
            status: args.status,
        });
    },
});

export const languageUpdateContent = internalAction({
    args: {
        languageId: v.id('languages'),
        languageCode: v.string(),
        languageFileId: v.optional(v.id('_storage')),
        primaryLanguageFileId: v.id('_storage'),
        namespaceVersionId: v.id('namespaceVersions'),
        languageChanges: v.object({
            add: v.array(
                v.object({
                    key: v.string(),
                    item: v.object({
                        key: v.string(),
                        value: v.any(),
                        primaryValue: v.any(),
                    }),
                    newValue: v.optional(v.any()),
                })
            ),
            modify: v.array(
                v.object({
                    key: v.string(),
                    item: v.object({
                        key: v.string(),
                        value: v.any(),
                        primaryValue: v.any(),
                    }),
                    newValue: v.optional(v.any()),
                })
            ),
            delete: v.array(
                v.object({
                    key: v.string(),
                    item: v.object({
                        key: v.string(),
                        value: v.any(),
                        primaryValue: v.any(),
                    }),
                    newValue: v.optional(v.any()),
                })
            ),
        }),
    },
    handler: async (ctx, args) => {
        const { languageId, languageCode, languageFileId, primaryLanguageFileId, namespaceVersionId, languageChanges } =
            args;

        try {
            const fileUrl = await ctx.storage.getUrl(languageFileId || primaryLanguageFileId);

            if (!fileUrl) {
                throw new Error('No file URL found');
            }

            await ctx.runMutation(internal.internalLang.languageUpdateStatus, {
                namespaceVersionId,
                languageId,
                status: 'syncing',
                isBranchUpdate: true,
            });

            const response = await fetch(fileUrl);
            const existingContent = await response.text();
            const existingJson = JSON.parse(existingContent);

            let targetContent;

            if (!languageFileId) {
                targetContent = existingJson;
                console.log(`Applied primary content for ${languageCode}`);
            } else {
                const { newChanges } = await translateContentUtil({
                    targetLanguage: languageCode,
                    changes: languageChanges,
                });

                const flatJson = flattenJson(existingJson);
                const updatedContentFlat = applyLanguageChanges(flatJson, newChanges);
                targetContent = unflattenJson(updatedContentFlat);
                console.log(`Applied structural operations for ${languageCode}`);
            }

            const syncedContentBlob = new Blob([JSON.stringify(targetContent, null, 2)], { type: 'application/json' });
            const syncUploadUrl = await ctx.storage.generateUploadUrl();
            const syncUploadResponse = await fetch(syncUploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: syncedContentBlob,
            });

            const { storageId: syncStorageId } = await syncUploadResponse.json();

            if (languageFileId) {
                await ctx.storage.delete(languageFileId);
            }

            await ctx.runMutation(internal.internalLang.internalLanguageUpdate, {
                languageId,
                fileId: syncStorageId,
                fileSize: syncedContentBlob.size,
            });

            await ctx.runMutation(internal.internalLang.languageUpdateStatus, {
                namespaceVersionId,
                languageId,
            });
        } catch (error) {
            throw new Error(`Failed to sync ${languageCode}: ${error}`);
        }
    },
});

export const languageCreateSchema = internalAction({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
        newJson: v.string(),
    },
    handler: async (ctx, args) => {
        const { namespaceVersionId, newJson } = args;

        try {
            const schema = generateSchemas(newJson);

            const schemaContent = JSON.stringify(schema.jsonSchema, null, 2);
            const schemaBlob = new Blob([schemaContent], { type: 'application/json' });

            const schemaUploadUrl = await ctx.storage.generateUploadUrl();
            const schemaUploadResponse = await fetch(schemaUploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: schemaBlob,
            });

            const { storageId: schemaStorageId } = await schemaUploadResponse.json();

            await ctx.runMutation(internal.internalLang.languageUpdateSchema, {
                namespaceVersionId,
                jsonSchemaFileId: schemaStorageId,
                jsonSchemaSize: schemaBlob.size,
            });

            console.log('JSON Schema always updated for primary language save');
        } catch (error) {
            throw new Error(`Failed to sync schema: ${error}`);
        }
    },
});

export const languageCreateContent = internalAction({
    args: {
        languageId: v.id('languages'),
        languageCode: v.string(),
        isPrimaryLanguage: v.boolean(),
        primaryLanguageFileId: v.optional(v.id('_storage')),
        namespaceVersionId: v.id('namespaceVersions'),
        primaryJSON: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { languageId, languageCode, primaryLanguageFileId, namespaceVersionId, primaryJSON, isPrimaryLanguage } =
            args;

        try {
            let targetContent = primaryJSON ? JSON.parse(primaryJSON) : undefined;

            if (primaryLanguageFileId) {
                const fileUrl = await ctx.storage.getUrl(primaryLanguageFileId);

                if (!fileUrl) {
                    throw new Error('No file URL found');
                }

                const response = await fetch(fileUrl);
                const existingContent = await response.text();

                targetContent = JSON.parse(existingContent);
                console.log(`Applied primary content for ${languageCode}`);
            }

            if (!targetContent) {
                throw new Error('JSON content is invalid');
            }

            let translatedContent = targetContent;

            if (!isPrimaryLanguage) {
                translatedContent = await translateNewContentUtil({
                    targetLanguage: languageCode,
                    json: targetContent,
                });
            }

            const syncedContentBlob = new Blob([JSON.stringify(translatedContent, null, 2)], {
                type: 'application/json',
            });
            const syncUploadUrl = await ctx.storage.generateUploadUrl();
            const syncUploadResponse = await fetch(syncUploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: syncedContentBlob,
            });

            const { storageId: syncStorageId } = await syncUploadResponse.json();

            await ctx.runMutation(internal.internalLang.internalLanguageUpdate, {
                languageId,
                fileId: syncStorageId,
                fileSize: syncedContentBlob.size,
            });

            await ctx.runMutation(internal.internalLang.languageUpdateStatus, {
                namespaceVersionId,
                languageId,
            });
        } catch (error) {
            throw new Error(`Failed to sync ${languageCode}: ${error}`);
        }
    },
});
