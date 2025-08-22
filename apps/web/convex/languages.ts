import { paginationOptsValidator } from 'convex/server';
import { action, ActionCtx, mutation, query, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { generateSchemas } from '../lib/zodSchemaGenerator';
import { internal } from './_generated/api';
import { applyJsonDiffToContent, applyStructuralOperations } from './utils';
import { Id } from './_generated/dataModel';

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
            .withIndex('by_namespace_version', q => q.eq('namespaceVersionId', args.namespaceVersionId))
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

export const createLanguage = action({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
        workspaceId: v.id('workspaces'),
        languageCode: v.string(),
    },
    handler: async (ctx, args): Promise<Id<'languages'>> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const { primaryFileId, namespaceVersion, namespace, isFirstLanguage, currentLanguageCount } =
            await ctx.runQuery(internal.internalLang.createLanguageContext, {
                namespaceVersionId: args.namespaceVersionId,
                workspaceId: args.workspaceId,
                languageCode: args.languageCode,
            });

        let fileId: Id<'_storage'> | undefined = undefined;
        let fileSize: number | undefined = undefined;

        if (!isFirstLanguage && namespaceVersion.primaryLanguageId) {
            if (primaryFileId) {
                try {
                    const sourceFileUrl = await ctx.storage.getUrl(primaryFileId);
                    if (!sourceFileUrl) {
                        throw new Error('Failed to get primary language file URL');
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
                    fileId = storageId;
                    fileSize = newBlob.size;
                } catch (error) {
                    console.error('Failed to copy from primary language:', error);
                }
            }
        }

        const languageId = await ctx.runMutation(internal.internalLang.internalCreateLanguageUpdate, {
            fileId,
            fileSize,
            isFirstLanguage: isFirstLanguage,
            languageCode: args.languageCode,
            namespaceVersionId: args.namespaceVersionId,
            nameSpaceId: namespaceVersion.namespaceId,
            currentLanguageCount: currentLanguageCount,
            versionUsage: namespace.usage?.versions ?? 0,
        });

        return languageId;
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

        if (language.fileId) {
            await ctx.storage.delete(language.fileId);
        }

        await ctx.db.delete(args.languageId);

        const currentLanguageCount = namespaceVersion.usage?.languages ?? 1;
        await ctx.db.patch(namespaceVersion._id, {
            usage: {
                languages: Math.max(0, currentLanguageCount - 1),
            },
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
            namespaceVersion: {
                _id: Id<'namespaceVersions'>;
                _creationTime: number;
                jsonSchemaFileId?: Id<'_storage'> | undefined;
                jsonSchemaSize?: number | undefined;
                version: string;
                namespaceId: Id<'namespaces'>;
            };
            language: {
                _id: Id<'languages'>;
                _creationTime: number;
                fileId?: Id<'_storage'> | undefined;
                fileSize?: number | undefined;
                namespaceVersionId: Id<'namespaceVersions'>;
                languageCode: string;
            };
        } = await ctx.runQuery(internal.internalLang.languageChangesContext, {
            workspaceId: args.workspaceId,
            languageId: args.languageId,
        });

        // If no file exists, return empty object
        if (!result.language.fileId) {
            return {};
        }

        try {
            // Fetch file content directly and parse as JSON
            const fileUrl = await ctx.storage.getUrl(result.language.fileId);
            if (!fileUrl) {
                console.warn('File URL is null for language:', args.languageId);
                return {};
            }
            const response = await fetch(fileUrl);
            const content = await response.text();
            return JSON.parse(content);
        } catch (error) {
            console.error('Failed to fetch language content:', error);
            // Return empty object if file is corrupted or missing
            return {};
        }
    },
});

// Query to get JSON schema for a namespace version
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

        const jsonSchemaFileId = await ctx.runQuery(internal.internalLang.schemaContext, {
            workspaceId: args.workspaceId,
            namespaceVersionId: args.namespaceVersionId,
        });

        // Return null if no schema exists
        if (!jsonSchemaFileId) {
            return null;
        }

        try {
            // Fetch and parse the schema file
            const fileUrl = await ctx.storage.getUrl(jsonSchemaFileId);
            if (!fileUrl) {
                console.warn('Schema file URL is null for namespace version:', args.namespaceVersionId);
                return null;
            }

            const response = await fetch(fileUrl);
            const schemaContent = await response.text();

            return schemaContent;
        } catch (error) {
            console.error('Failed to fetch schema content:', error);
            return null;
        }
    },
});

// Helper function to synchronize other languages with change operations
const synchronizeLanguagesWithOperations = async (
    ctx: ActionCtx,
    namespaceVersionId: Id<'namespaceVersions'>,
    primaryLanguageId: Id<'languages'>,
    operations: any[],
    primaryContent: any
) => {
    // Get all other languages in this namespace version
    const { otherLanguages } = await ctx.runQuery(internal.internalLang.internalVersionLanguages, {
        namespaceVersionId,
        primaryLanguageId,
    });

    // Process each other language
    for (const otherLanguage of otherLanguages) {
        try {
            let targetContent: any;

            if (!otherLanguage.fileId) {
                // No existing file - copy entire primary language structure
                targetContent = primaryContent;
                console.log(`📄 Creating new file for ${otherLanguage.languageCode} with primary language structure`);
            } else {
                // Get existing content and apply operations selectively
                const fileUrl = await ctx.storage.getUrl(otherLanguage.fileId);
                if (!fileUrl) {
                    // Fallback to copy entire structure
                    targetContent = primaryContent;
                } else {
                    const response = await fetch(fileUrl);
                    const existingContent = await response.text();
                    const existingJson = JSON.parse(existingContent);

                    // Apply structural operations while preserving values for non-structural changes
                    targetContent = applyStructuralOperations(existingJson, operations);
                    console.log(`🔧 Applied structural operations for ${otherLanguage.languageCode}`);
                }
            }

            // Save the synchronized content
            const syncedContentBlob = new Blob([JSON.stringify(targetContent, null, 2)], { type: 'application/json' });
            const syncUploadUrl = await ctx.storage.generateUploadUrl();
            const syncUploadResponse = await fetch(syncUploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: syncedContentBlob,
            });

            const { storageId: syncStorageId } = await syncUploadResponse.json();

            // Delete old file and update language record
            if (otherLanguage.fileId) {
                await ctx.storage.delete(otherLanguage.fileId);
            }

            await ctx.runMutation(internal.internalLang.internalLanguageUpdate, {
                languageId: otherLanguage._id,
                fileId: syncStorageId,
                fileSize: syncedContentBlob.size,
            });
        } catch (error) {
            throw new Error(`Failed to sync ${otherLanguage.languageCode}: ${error}`);
        }
    }
};

// New mutation that processes change operations for more precise updates
export const applyChangeOperations = action({
    args: {
        languageId: v.id('languages'),
        workspaceId: v.id('workspaces'),
        languageChanges: v.optional(
            v.object({
                changes: v.any(), // structured changes object with precise array indexing
                timestamp: v.number(),
                languageId: v.string(),
                isPrimaryLanguage: v.boolean(),
            })
        ),
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

        const isPrimaryLanguage = namespaceVersion.primaryLanguageId === args.languageId;

        try {
            // Get current language content
            let currentContent: any = {};

            if (language.fileId) {
                const fileUrl = await ctx.storage.getUrl(language.fileId);
                if (fileUrl) {
                    const response = await fetch(fileUrl);
                    const contentText = await response.text();
                    currentContent = JSON.parse(contentText);
                }
            }

            // Apply changes to current content
            let updatedContent: any;
            if (args.languageChanges && args.languageChanges.changes) {
                // Use json-diff format (for primary language saves)
                updatedContent = applyJsonDiffToContent(currentContent, args.languageChanges.changes);
            }

            // For primary language: Always generate and update schema
            if (isPrimaryLanguage) {
                // Always generate JSON schema from the updated content
                const schema = generateSchemas(updatedContent);

                // Always save JSON schema to backend for primary language
                const schemaContent = JSON.stringify(schema.jsonSchema, null, 2);
                const schemaBlob = new Blob([schemaContent], { type: 'application/json' });

                const schemaUploadUrl = await ctx.storage.generateUploadUrl();
                const schemaUploadResponse = await fetch(schemaUploadUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: schemaBlob,
                });

                const { storageId: schemaStorageId } = await schemaUploadResponse.json();

                // Delete old schema file if it exists
                if (namespaceVersion.jsonSchemaFileId) {
                    await ctx.storage.delete(namespaceVersion.jsonSchemaFileId);
                }

                // Update namespace version with schema file ID
                await ctx.runMutation(internal.internalLang.languageUpdateSchema, {
                    namespaceVersionId: language.namespaceVersionId,
                    jsonSchemaFileId: schemaStorageId,
                    jsonSchemaSize: schemaBlob.size,
                });

                console.log('📋 JSON Schema always updated for primary language save');

                // If there are structural changes, sync other languages
                const hasStructuralChanges = !!args.languageChanges?.changes.hasStructuralChanges;

                if (hasStructuralChanges) {
                    const changesForSync = args.languageChanges?.changes.structuredChanges ?? [];

                    await synchronizeLanguagesWithOperations(
                        ctx,
                        language.namespaceVersionId,
                        args.languageId,
                        changesForSync,
                        updatedContent
                    );
                }
            }

            // For non-primary languages, existing schema is validated on frontend side only because of speed of Nodejs action

            // Save the updated content
            const updatedContentString = JSON.stringify(updatedContent, null, 2);
            const contentBlob = new Blob([updatedContentString], { type: 'application/json' });
            const uploadUrl = await ctx.storage.generateUploadUrl();
            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: contentBlob,
            });

            const { storageId } = await uploadResponse.json();

            // Delete old file and update language record
            if (language.fileId) {
                await ctx.storage.delete(language.fileId);
            }

            await ctx.runMutation(internal.internalLang.internalLanguageUpdate, {
                languageId: args.languageId,
                fileId: storageId,
                fileSize: contentBlob.size,
            });

            return {
                success: true,
            };
        } catch (error) {
            console.error('Failed to apply change operations:', error);
            throw error;
        }
    },
});

// Internal query to get a specific language by namespace version and language code (for API access)
export const getLanguageByCode = internalQuery({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
        languageCode: v.string(),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        // Verify workspace exists
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Get the namespace version to verify access
        const namespaceVersion = await ctx.db.get(args.namespaceVersionId);
        if (!namespaceVersion) {
            throw new Error('Namespace version not found');
        }

        // Get the namespace to verify project access
        const namespace = await ctx.db.get(namespaceVersion.namespaceId);
        if (!namespace) {
            throw new Error('Namespace not found');
        }

        // Get the project to verify workspace access
        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        // Use the index to find language by namespace version and language code
        const language = await ctx.db
            .query('languages')
            .withIndex('by_namespace_version_language', q =>
                q.eq('namespaceVersionId', args.namespaceVersionId).eq('languageCode', args.languageCode)
            )
            .first();

        return language;
    },
});
