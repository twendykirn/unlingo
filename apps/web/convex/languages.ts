import { paginationOptsValidator } from 'convex/server';
import { action, mutation, query, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { generateSchemas } from '../lib/zodSchemaGenerator';
import { components, internal } from './_generated/api';
import { Doc, Id } from './_generated/dataModel';
import { flattenJson, unflattenJson } from './utils/jsonFlatten';
import { applyLanguageChanges } from './utils/applyLanguageChanges';
import { Workpool } from '@convex-dev/workpool';

const languagePool = new Workpool(components.languageWorkpool, {
    maxParallelism: 25,
    retryActionsByDefault: true,
    defaultRetryBehavior: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 },
});

const createLanguagePool = new Workpool(components.createLanguageWorkpool, {
    maxParallelism: 25,
    retryActionsByDefault: true,
    defaultRetryBehavior: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 },
});

export const getLanguages = query({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
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

        return await ctx.db
            .query('languages')
            .withIndex('by_namespace_version_language', q => q.eq('namespaceVersionId', args.namespaceVersionId))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

export const getLanguageWithContext = query({
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
            throw new Error('Language not found or access denied');
        }

        const namespaceVersion = await ctx.db.get(language.namespaceVersionId);
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

        return {
            ...language,
            namespaceName: namespace.name,
            version: namespaceVersion.version,
            projectId: project._id,
            namespaceId: namespace._id,
            namespaceVersionId: namespaceVersion._id,
            isPrimary: namespaceVersion.primaryLanguageId === language._id,
            primaryLanguageId: namespaceVersion.primaryLanguageId,
        };
    },
});

export const createLanguages = mutation({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
        workspaceId: v.id('workspaces'),
        languageCodes: v.array(v.string()),
        primaryLanguageCode: v.optional(v.string()),
        primaryJSON: v.optional(v.string()),
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

        const currentLanguageCount = namespaceVersion.usage?.languages ?? 0;
        if (currentLanguageCount + args.languageCodes.length > workspace.limits.languagesPerVersion) {
            throw new Error(
                `Language limit reached. Maximum ${workspace.limits.languagesPerVersion} languages per version. Please upgrade your plan.`
            );
        }

        const isFirstLanguage = currentLanguageCount === 0;
        const primaryLanguageId = namespaceVersion.primaryLanguageId;
        const now = Date.now();
        const languages = [];
        const isRequireWorkpool =
            (isFirstLanguage && !primaryLanguageId && args.primaryJSON) || (!isFirstLanguage && primaryLanguageId);

        if (isFirstLanguage && !args.primaryLanguageCode) {
            throw new Error('Primary language code is required.');
        }

        await ctx.db.patch(args.namespaceVersionId, {
            usage: {
                languages: currentLanguageCount + args.languageCodes.length,
            },
            updatedAt: now,
            status: isRequireWorkpool ? 'syncing' : undefined,
        });

        for (const languageCode of args.languageCodes) {
            const languageId = await ctx.db.insert('languages', {
                namespaceVersionId: namespaceVersion._id,
                languageCode,
                status: isRequireWorkpool ? 'syncing' : undefined,
                updatedAt: now,
            });

            languages.push({ _id: languageId, languageCode });

            if (!primaryLanguageId && languageCode === args.primaryLanguageCode) {
                await ctx.db.patch(args.namespaceVersionId, {
                    primaryLanguageId: languageId,
                });
            }
        }

        let primaryFileId: Id<'_storage'> | undefined = undefined;

        if (!isFirstLanguage && primaryLanguageId) {
            const primaryLanguage = await ctx.db.get(primaryLanguageId);

            if (primaryLanguage?.fileId) {
                primaryFileId = primaryLanguage.fileId;
            }
        }

        if (isFirstLanguage && !primaryLanguageId && args.primaryJSON) {
            await ctx.scheduler.runAfter(0, internal.internalLang.languageCreateSchema, {
                namespaceVersionId: namespaceVersion._id,
                newJson: args.primaryJSON,
            });
        }

        if (isRequireWorkpool) {
            await createLanguagePool.enqueueActionBatch(
                ctx,
                internal.internalLang.languageCreateContent,
                languages.map(lang => ({
                    languageId: lang._id,
                    languageCode: lang.languageCode,
                    isPrimaryLanguage: primaryLanguageId
                        ? lang._id === primaryLanguageId
                        : lang.languageCode === args.primaryLanguageCode,
                    primaryLanguageFileId: primaryFileId,
                    namespaceVersionId: namespaceVersion._id,
                    primaryJSON: args.primaryJSON,
                })),
                {
                    onComplete: internal.internalLang.namespaceVersionUpdateStatus,
                    context: {
                        namespaceVersionId: namespaceVersion._id,
                    },
                }
            );
        }
    },
});

export const deleteLanguage = mutation({
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

        const mappings = await ctx.db
            .query('screenshotKeyMappings')
            .withIndex('by_version_language_key', q =>
                q.eq('namespaceVersionId', language.namespaceVersionId).eq('languageId', args.languageId)
            )
            .collect();

        for (const mapping of mappings) {
            await ctx.db.delete(mapping._id);
        }

        if (language.fileId) {
            await ctx.storage.delete(language.fileId);
        }

        await ctx.db.delete(args.languageId);

        const currentLanguageCount = namespaceVersion.usage?.languages ?? 1;
        const isLastFile = currentLanguageCount === 1;

        if (isLastFile && namespaceVersion.jsonSchemaFileId) {
            await ctx.storage.delete(namespaceVersion.jsonSchemaFileId);
        }

        await ctx.db.patch(namespaceVersion._id, {
            usage: {
                languages: Math.max(0, currentLanguageCount - 1),
            },
            updatedAt: Date.now(),
            jsonSchemaFileId: isLastFile ? undefined : namespaceVersion.jsonSchemaFileId,
            jsonSchemaSize: isLastFile ? undefined : namespaceVersion.jsonSchemaSize,
            primaryLanguageId: isLastFile ? undefined : namespaceVersion.primaryLanguageId,
        });

        return args.languageId;
    },
});

export const getLanguageContent = action({
    args: {
        languageId: v.id('languages'),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const result: {
            namespaceVersion: Doc<'namespaceVersions'>;
            language: Doc<'languages'>;
            namespace: Doc<'namespaces'>;
            project: Doc<'projects'>;
        } = await ctx.runQuery(internal.internalLang.languageChangesContext, {
            workspaceId: args.workspaceId,
            languageId: args.languageId,
        });

        if (!result.language.fileId) {
            return {};
        }

        try {
            const fileUrl = await ctx.storage.getUrl(result.language.fileId);
            if (!fileUrl) {
                console.warn('File URL is null for language:', args.languageId);
                return {};
            }
            const response = await fetch(fileUrl);
            const content = await response.text();
            const parsedContent = JSON.parse(content);

            // Track analytics for language content fetch
            await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
                workspaceId: args.workspaceId as string,
                projectId: result.project._id as string,
                projectName: result.project.name,
                namespaceId: result.namespace._id as string,
                namespaceName: result.namespace.name,
                elementId: `lang:${result.language.languageCode}`,
                type: 'language_content',
                apiCallName: 'getLanguageContent',
                languageCode: result.language.languageCode,
                responseSize: new TextEncoder().encode(content).length,
                time: Date.now(),
            });

            return parsedContent;
        } catch (error) {
            console.error('Failed to fetch language content:', error);

            // Track failed fetch
            await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
                workspaceId: args.workspaceId as string,
                projectId: result.project._id as string,
                projectName: result.project.name,
                namespaceId: result.namespace._id as string,
                namespaceName: result.namespace.name,
                elementId: `lang:${result.language.languageCode}`,
                type: 'language_content',
                apiCallName: 'getLanguageContent',
                languageCode: result.language.languageCode,
                deniedReason: 'fetch_error',
                time: Date.now(),
            });

            return {};
        }
    },
});

export const getJsonSchema = action({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args): Promise<any> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const { jsonSchemaFileId, namespace, project } = await ctx.runQuery(internal.internalLang.schemaContext, {
            workspaceId: args.workspaceId,
            namespaceVersionId: args.namespaceVersionId,
        });

        if (!jsonSchemaFileId) {
            return null;
        }

        try {
            const fileUrl = await ctx.storage.getUrl(jsonSchemaFileId);
            if (!fileUrl) {
                console.warn('Schema file URL is null for namespace version:', args.namespaceVersionId);
                return null;
            }

            const response = await fetch(fileUrl);
            const schemaContent = await response.text();

            // Track analytics for schema fetch
            await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
                workspaceId: args.workspaceId as string,
                projectId: project._id as string,
                projectName: project.name,
                namespaceId: namespace._id as string,
                namespaceName: namespace.name,
                elementId: `schema:${args.namespaceVersionId}`,
                type: 'schema_content',
                apiCallName: 'getJsonSchema',
                responseSize: new TextEncoder().encode(schemaContent).length,
                time: Date.now(),
            });

            return schemaContent;
        } catch (error) {
            console.error('Failed to fetch schema content:', error);

            // Track failed fetch
            await ctx.scheduler.runAfter(0, internal.analytics.ingestEvent, {
                workspaceId: args.workspaceId as string,
                projectId: project._id as string,
                projectName: project.name,
                namespaceId: namespace._id as string,
                namespaceName: namespace.name,
                elementId: `schema:${args.namespaceVersionId}`,
                type: 'schema_content',
                apiCallName: 'getJsonSchema',
                deniedReason: 'fetch_error',
                time: Date.now(),
            });

            return null;
        }
    },
});

export const applyChangeOperations = action({
    args: {
        languageId: v.id('languages'),
        workspaceId: v.id('workspaces'),
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
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const { namespaceVersion, language } = await ctx.runQuery(internal.internalLang.languageChangesContext, {
            languageId: args.languageId,
            workspaceId: args.workspaceId,
        });

        await ctx.runMutation(internal.internalLang.languageUpdateStatus, {
            namespaceVersionId: namespaceVersion._id,
            languageId: language._id,
            status: 'syncing',
            isBranchUpdate: true,
        });

        const isPrimaryLanguage = namespaceVersion.primaryLanguageId === args.languageId;

        try {
            let currentContent: any = {};

            if (language.fileId) {
                const fileUrl = await ctx.storage.getUrl(language.fileId);
                if (fileUrl) {
                    const response = await fetch(fileUrl);
                    const contentText = await response.text();
                    currentContent = JSON.parse(contentText);
                }
            }

            const flatJson = flattenJson(currentContent);
            const updatedContentFlat = applyLanguageChanges(flatJson, args.languageChanges);
            const newJson = unflattenJson(updatedContentFlat);

            const updatedContentString = JSON.stringify(newJson, null, 2);
            const contentBlob = new Blob([updatedContentString], { type: 'application/json' });
            const uploadUrl = await ctx.storage.generateUploadUrl();
            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: contentBlob,
            });

            const { storageId } = await uploadResponse.json();

            if (language.fileId) {
                await ctx.storage.delete(language.fileId);
            }

            await ctx.runMutation(internal.internalLang.internalLanguageUpdate, {
                languageId: args.languageId,
                fileId: storageId,
                fileSize: contentBlob.size,
            });

            // For primary language: Always generate and update schema
            if (isPrimaryLanguage) {
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

                if (namespaceVersion.jsonSchemaFileId) {
                    await ctx.storage.delete(namespaceVersion.jsonSchemaFileId);
                }

                await ctx.runMutation(internal.internalLang.languageUpdateSchema, {
                    namespaceVersionId: language.namespaceVersionId,
                    jsonSchemaFileId: schemaStorageId,
                    jsonSchemaSize: schemaBlob.size,
                });

                console.log('JSON Schema always updated for primary language save');
            }

            await ctx.runMutation(internal.internalLang.languageUpdateStatus, {
                namespaceVersionId: namespaceVersion._id,
                languageId: language._id,
                isBranchUpdate: !isPrimaryLanguage,
            });

            const primaryLanguageFileId = language.fileId;
            if (isPrimaryLanguage && primaryLanguageFileId) {
                const { otherLanguages } = await ctx.runQuery(internal.internalLang.internalVersionLanguages, {
                    namespaceVersionId: language.namespaceVersionId,
                    primaryLanguageId: language._id,
                });

                await languagePool.enqueueActionBatch(
                    ctx,
                    internal.internalLang.languageUpdateContent,
                    otherLanguages.map(lang => ({
                        languageId: lang._id,
                        languageCode: lang.languageCode,
                        languageFileId: lang.fileId,
                        primaryLanguageFileId,
                        namespaceVersionId: language.namespaceVersionId,
                        languageChanges: args.languageChanges,
                    })),
                    {
                        onComplete: internal.internalLang.namespaceVersionUpdateStatus,
                        context: {
                            namespaceVersionId: language.namespaceVersionId,
                        },
                    }
                );
            }

            return {
                success: true,
            };
        } catch (error) {
            console.error('Failed to apply change operations:', error);
            throw error;
        }
    },
});

export const getLanguageByCode = internalQuery({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
        languageCode: v.string(),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
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

        const language = await ctx.db
            .query('languages')
            .withIndex('by_namespace_version_language', q =>
                q.eq('namespaceVersionId', args.namespaceVersionId).eq('languageCode', args.languageCode)
            )
            .first();

        return language;
    },
});
