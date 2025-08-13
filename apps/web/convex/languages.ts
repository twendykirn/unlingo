import { paginationOptsValidator } from 'convex/server';
import { mutation, MutationCtx, query } from './_generated/server';
import { v } from 'convex/values';
import Ajv2020 from 'ajv/dist/2020';
import { generateSchemas } from '../lib/zodSchemaGenerator';

// Query to get languages for a namespace version with pagination
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

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Only allow access to organization workspaces
        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only access organization workspaces');
        }

        // Verify namespace version exists and user has access
        const namespaceVersion = await ctx.db.get(args.namespaceVersionId);
        if (!namespaceVersion) {
            throw new Error('Namespace version not found');
        }

        // Get namespace to verify project ownership
        const namespace = await ctx.db.get(namespaceVersion.namespaceId);
        if (!namespace) {
            throw new Error('Namespace not found');
        }

        // Get project to verify workspace ownership
        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied: Project does not belong to workspace');
        }

        return await ctx.db
            .query('languages')
            .withIndex('by_namespace_version', q => q.eq('namespaceVersionId', args.namespaceVersionId))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

// Query to get a single language by ID
export const getLanguage = query({
    args: {
        languageId: v.id('languages'),
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

        const language = await ctx.db.get(args.languageId);
        if (!language) {
            return null;
        }

        // Verify access through the hierarchy
        const namespaceVersion = await ctx.db.get(language.namespaceVersionId);
        if (!namespaceVersion) {
            return null;
        }

        const namespace = await ctx.db.get(namespaceVersion.namespaceId);
        if (!namespace) {
            return null;
        }

        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            return null;
        }

        return language;
    },
});

// Query to get language with additional context for the editor
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

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Only allow access to organization workspaces
        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only access organization workspaces');
        }

        const language = await ctx.db.get(args.languageId);
        if (!language) {
            return null;
        }

        // Verify access through the hierarchy
        const namespaceVersion = await ctx.db.get(language.namespaceVersionId);
        if (!namespaceVersion) {
            return null;
        }

        const namespace = await ctx.db.get(namespaceVersion.namespaceId);
        if (!namespace) {
            return null;
        }

        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            return null;
        }

        return {
            ...language,
            namespaceName: namespace.name,
            version: namespaceVersion.version,
            projectId: project._id,
            namespaceId: namespace._id,
            namespaceVersionId: namespaceVersion._id,
            isPrimary: namespace.primaryLanguageId === language._id,
        };
    },
});

// Mutation to create a new language (without file initially)
export const createLanguage = mutation({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
        workspaceId: v.id('workspaces'),
        languageCode: v.string(),
        copyFromLanguage: v.optional(v.id('languages')), // Language ID to copy keys from
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
            throw new Error('Unauthorized: Can only create languages in organization workspaces');
        }

        // Verify namespace version exists and user has access
        const namespaceVersion = await ctx.db.get(args.namespaceVersionId);
        if (!namespaceVersion) {
            throw new Error('Namespace version not found');
        }

        // Get namespace to verify project ownership
        const namespace = await ctx.db.get(namespaceVersion.namespaceId);
        if (!namespace) {
            throw new Error('Namespace not found');
        }

        // Get project to verify workspace ownership
        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied: Project does not belong to workspace');
        }

        // Check if language already exists for this namespace version
        const existingLanguage = await ctx.db
            .query('languages')
            .withIndex('by_namespace_version_language', q =>
                q.eq('namespaceVersionId', args.namespaceVersionId).eq('languageCode', args.languageCode)
            )
            .first();

        if (existingLanguage) {
            throw new Error(`Language '${args.languageCode}' already exists for this namespace version`);
        }

        // Check if namespace has reached language limit using usage counter
        const currentLanguageCount = namespace.usage?.languages ?? 0;
        if (currentLanguageCount >= workspace.limits.languagesPerNamespace) {
            throw new Error(
                `Language limit reached. Maximum ${workspace.limits.languagesPerNamespace} languages per namespace. Please upgrade your plan.`
            );
        }

        // Validate language code format (ISO 639-1 or similar)
        if (!/^[a-z]{2}(-[A-Z]{2})?$/i.test(args.languageCode)) {
            throw new Error('Language code must be in format: "en", "en-US", "fr", "pt-BR", etc.');
        }

        // Check if this is the first language in the namespace using usage counter
        const isFirstLanguage = (namespace.usage?.languages ?? 0) === 0;

        // Prepare file content
        let fileId: string | undefined = undefined;
        let fileSize: number | undefined = undefined;

        if (args.copyFromLanguage) {
            // Manual copy from specified language
            const sourceLanguage = await ctx.db.get(args.copyFromLanguage);

            // Validate that source language belongs to the same namespace version
            if (!sourceLanguage || sourceLanguage.namespaceVersionId !== args.namespaceVersionId) {
                throw new Error('Source language not found or belongs to different namespace version');
            }

            if (sourceLanguage.fileId) {
                try {
                    const sourceFileUrl = await ctx.storage.getUrl(sourceLanguage.fileId);
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
                    fileId = storageId;
                    fileSize = newBlob.size;
                } catch (error) {
                    console.error('Failed to copy from specified language:', error);
                }
            }
        } else if (!isFirstLanguage && namespace.primaryLanguageId) {
            // Auto-copy from primary language for 2nd, 3rd, etc. languages
            const primaryLanguage = await ctx.db.get(namespace.primaryLanguageId);

            if (primaryLanguage && primaryLanguage.fileId) {
                try {
                    const sourceFileUrl = await ctx.storage.getUrl(primaryLanguage.fileId);
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

        // Create the language record (without file initially, unless copied from another language)
        const languageId = await ctx.db.insert('languages', {
            namespaceVersionId: args.namespaceVersionId,
            languageCode: args.languageCode.toLowerCase(),
            fileId: fileId ? (fileId as any) : undefined,
            fileSize: fileSize,
        });

        // Update namespace usage counter
        await ctx.db.patch(namespaceVersion.namespaceId, {
            usage: {
                languages: currentLanguageCount + 1,
                versions: namespace.usage?.versions ?? 0,
            },
        });

        // If this is the first language, set it as primary
        if (isFirstLanguage) {
            await ctx.db.patch(namespaceVersion.namespaceId, {
                primaryLanguageId: languageId,
            });
        }

        return languageId;
    },
});

// Mutation to update a language file
export const updateLanguage = mutation({
    args: {
        languageId: v.id('languages'),
        workspaceId: v.id('workspaces'),
        fileId: v.id('_storage'),
        fileSize: v.number(),
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
            throw new Error('Unauthorized: Can only update languages in organization workspaces');
        }

        const language = await ctx.db.get(args.languageId);
        if (!language) {
            // Delete the uploaded file since we can't use it
            await ctx.storage.delete(args.fileId);
            throw new Error('Language not found');
        }

        // Verify access through the hierarchy
        const namespaceVersion = await ctx.db.get(language.namespaceVersionId);
        if (!namespaceVersion) {
            await ctx.storage.delete(args.fileId);
            throw new Error('Namespace version not found');
        }

        const namespace = await ctx.db.get(namespaceVersion.namespaceId);
        if (!namespace) {
            await ctx.storage.delete(args.fileId);
            throw new Error('Namespace not found');
        }

        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            await ctx.storage.delete(args.fileId);
            throw new Error('Access denied: Project does not belong to workspace');
        }

        // Validate file size (e.g., max 10MB)
        const maxFileSize = 10 * 1024 * 1024; // 10MB
        if (args.fileSize > maxFileSize) {
            await ctx.storage.delete(args.fileId);
            throw new Error('File size exceeds 10MB limit');
        }

        // Delete the old file from storage
        if (language.fileId) {
            await ctx.storage.delete(language.fileId);
        }

        // Update the language record with new file
        await ctx.db.patch(args.languageId, {
            fileId: args.fileId,
            fileSize: args.fileSize,
        });

        return args.languageId;
    },
});

// Mutation to delete a language
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

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only delete languages from organization workspaces');
        }

        const language = await ctx.db.get(args.languageId);
        if (!language) {
            throw new Error('Language not found');
        }

        // Verify access through the hierarchy
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
            throw new Error('Access denied: Project does not belong to workspace');
        }

        // Delete the file from Convex Storage
        if (language.fileId) {
            await ctx.storage.delete(language.fileId);
        }

        // Delete the language record
        await ctx.db.delete(args.languageId);

        // Update namespace usage counter
        const currentLanguageCount = namespace.usage?.languages ?? 1;
        await ctx.db.patch(namespace._id, {
            usage: {
                languages: Math.max(0, currentLanguageCount - 1),
                versions: namespace.usage?.versions ?? 0,
            },
        });

        return args.languageId;
    },
});

// Mutation to create or update language file content (for JSON editor)
export const updateLanguageContent = mutation({
    args: {
        languageId: v.id('languages'),
        workspaceId: v.id('workspaces'),
        content: v.string(), // JSON content as string
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
            throw new Error('Unauthorized: Can only update languages in organization workspaces');
        }

        const language = await ctx.db.get(args.languageId);
        if (!language) {
            throw new Error('Language not found');
        }

        // Verify access through the hierarchy
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
            throw new Error('Access denied: Project does not belong to workspace');
        }

        try {
            // Validate JSON content
            const parsedContent = JSON.parse(args.content);

            // Get namespace and check if this is the primary language
            const namespace = await ctx.db.get(namespaceVersion.namespaceId);
            if (!namespace) {
                throw new Error('Namespace not found');
            }

            const isCurrentLanguagePrimary = namespace.primaryLanguageId === args.languageId;

            // If this is not the primary language, validate against schema
            if (!isCurrentLanguagePrimary && namespaceVersion.jsonSchemaFileId) {
                try {
                    // Fetch the primary language schema
                    const schemaFileUrl = await ctx.storage.getUrl(namespaceVersion.jsonSchemaFileId);
                    if (schemaFileUrl) {
                        const schemaResponse = await fetch(schemaFileUrl);
                        const schemaContent = await schemaResponse.text();
                        const primarySchema = JSON.parse(schemaContent);

                        // Validate against schema using AJV
                        const ajv = new Ajv2020({ allErrors: true, verbose: true, strict: true });
                        const validate = ajv.compile(primarySchema);
                        const isValid = validate(parsedContent);

                        if (!isValid) {
                            const errorMessages =
                                validate.errors
                                    ?.map(err => `${err.instancePath || 'root'}: ${err.message}`)
                                    .join('; ') || 'Unknown validation errors';

                            throw new Error(
                                `Schema validation failed: ${errorMessages}. Non-primary languages must match the primary language structure.`
                            );
                        }

                        console.log(`✅ Schema validation passed for non-primary language: ${language.languageCode}`);
                    }
                } catch (schemaError) {
                    console.error('Schema validation error:', schemaError);
                    if (schemaError instanceof Error && schemaError.message.includes('Schema validation failed')) {
                        throw schemaError; // Re-throw validation errors
                    }
                    // Continue if schema fetch/parse fails (don't block saves)
                    console.warn('Could not validate against schema, proceeding with save');
                }
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('Schema validation failed')) {
                throw error; // Re-throw schema validation errors
            }
            throw new Error('Invalid JSON content');
        }

        // Create a new file with the content
        const contentBlob = new Blob([args.content], { type: 'application/json' });
        const uploadUrl = await ctx.storage.generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: contentBlob,
        });

        const { storageId } = await uploadResponse.json();

        // Delete the old file if it exists
        if (language.fileId) {
            await ctx.storage.delete(language.fileId);
        }

        // Update the language record with new file
        await ctx.db.patch(args.languageId, {
            fileId: storageId,
            fileSize: contentBlob.size,
        });

        return args.languageId;
    },
});

// Query to get language count for a namespace version (useful for checking limits)
export const getLanguageCount = query({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
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

        // Verify namespace version exists and user has access
        const namespaceVersion = await ctx.db.get(args.namespaceVersionId);
        if (!namespaceVersion) {
            throw new Error('Namespace version not found');
        }

        // Get namespace to verify project ownership
        const namespace = await ctx.db.get(namespaceVersion.namespaceId);
        if (!namespace) {
            throw new Error('Namespace not found');
        }

        // Get project to verify workspace ownership
        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied: Project does not belong to workspace');
        }

        // Get language count from namespace usage
        const currentCount = namespace.usage?.languages ?? 0;

        return {
            count: currentCount,
            limit: workspace.limits.languagesPerNamespace,
            canCreateMore: currentCount < workspace.limits.languagesPerNamespace,
        };
    },
});

// Query to get language content as JSON object (replaces getLanguageFileUrl)
export const getLanguageContent = query({
    args: {
        languageId: v.id('languages'),
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

        const language = await ctx.db.get(args.languageId);
        if (!language) {
            throw new Error('Language not found');
        }

        // Verify access through the hierarchy
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
            throw new Error('Access denied: Project does not belong to workspace');
        }

        // If no file exists, return empty object
        if (!language.fileId) {
            return {};
        }

        try {
            // Fetch file content directly and parse as JSON
            const fileUrl = await ctx.storage.getUrl(language.fileId);
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

// Mutation to save/update JSON schema for a namespace version
export const saveJsonSchema = mutation({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
        workspaceId: v.id('workspaces'),
        jsonSchema: v.any(), // The JSON schema object
        primaryLanguageId: v.id('languages'),
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
            throw new Error('Unauthorized: Can only update schemas in organization workspaces');
        }

        // Verify namespace version exists and user has access
        const namespaceVersion = await ctx.db.get(args.namespaceVersionId);
        if (!namespaceVersion) {
            throw new Error('Namespace version not found');
        }

        // Get namespace to verify project ownership
        const namespace = await ctx.db.get(namespaceVersion.namespaceId);
        if (!namespace) {
            throw new Error('Namespace not found');
        }

        // Get project to verify workspace ownership
        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied: Project does not belong to workspace');
        }

        // Verify the primary language exists and belongs to this namespace version
        const primaryLanguage = await ctx.db.get(args.primaryLanguageId);
        if (!primaryLanguage || primaryLanguage.namespaceVersionId !== args.namespaceVersionId) {
            throw new Error('Primary language not found or does not belong to this namespace version');
        }

        // Store the JSON schema as a file
        const schemaContent = JSON.stringify(args.jsonSchema, null, 2);
        const schemaBlob = new Blob([schemaContent], { type: 'application/json' });

        const uploadUrl = await ctx.storage.generateUploadUrl();
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: schemaBlob,
        });

        const { storageId } = await uploadResponse.json();

        // Delete old schema file if it exists
        if (namespaceVersion.jsonSchemaFileId) {
            await ctx.storage.delete(namespaceVersion.jsonSchemaFileId);
        }

        // Update namespace version with schema file ID
        await ctx.db.patch(args.namespaceVersionId, {
            jsonSchemaFileId: storageId,
            jsonSchemaSize: schemaBlob.size,
            schemaUpdatedAt: Date.now(),
        });

        return storageId;
    },
});

// Query to get JSON schema for a namespace version
export const getJsonSchema = query({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
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
            throw new Error('Unauthorized: Can only access schemas in organization workspaces');
        }

        // Get namespace version and verify access
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
            throw new Error('Access denied: Project does not belong to workspace');
        }

        // Return null if no schema exists
        if (!namespaceVersion.jsonSchemaFileId) {
            return null;
        }

        try {
            // Fetch and parse the schema file
            const fileUrl = await ctx.storage.getUrl(namespaceVersion.jsonSchemaFileId);
            if (!fileUrl) {
                console.warn('Schema file URL is null for namespace version:', args.namespaceVersionId);
                return null;
            }

            const response = await fetch(fileUrl);
            const schemaContent = await response.text();
            return JSON.parse(schemaContent);
        } catch (error) {
            console.error('Failed to fetch schema content:', error);
            return null;
        }
    },
});

// Mutation to synchronize all languages in a namespace version with primary language changes
export const synchronizeLanguages = mutation({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
        workspaceId: v.id('workspaces'),
        primaryLanguageId: v.id('languages'),
        changeMetadata: v.object({
            addedKeys: v.array(v.string()),
            deletedKeys: v.array(v.string()),
            changedTypes: v.array(
                v.object({
                    key: v.string(),
                    oldType: v.string(),
                    newType: v.string(),
                })
            ),
        }),
        jsonSchema: v.any(), // The updated JSON schema
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
            throw new Error('Unauthorized: Can only synchronize languages in organization workspaces');
        }

        // Get all languages in this namespace version
        const allLanguages = await ctx.db
            .query('languages')
            .withIndex('by_namespace_version', q => q.eq('namespaceVersionId', args.namespaceVersionId))
            .collect();

        if (allLanguages.length === 0) {
            return { synchronized: 0, errors: [] };
        }

        const primaryLanguage = allLanguages.find(lang => lang._id === args.primaryLanguageId);
        if (!primaryLanguage) {
            throw new Error('Primary language not found');
        }

        const nonPrimaryLanguages = allLanguages.filter(lang => lang._id !== args.primaryLanguageId);
        const errors: string[] = [];
        let synchronized = 0;

        // Helper function to validate JSON against schema
        const validateWithAjv = (data: any, schema: any) => {
            const ajv = new Ajv2020({ allErrors: true, verbose: true, strict: true });
            const validate = ajv.compile(schema);
            const isValid = validate(data);
            return { isValid, errors: validate.errors || null };
        };

        // Helper function to apply structural changes to a language JSON
        const applySyncChanges = (languageJson: any, changes: typeof args.changeMetadata): any => {
            const result = { ...languageJson };

            // Apply deletions (remove keys that were deleted from primary)
            const deleteKeyFromObject = (obj: any, keyPath: string) => {
                const keys = keyPath.split('.');
                const lastKey = keys.pop();
                if (!lastKey) return;

                let current = obj;
                for (const key of keys) {
                    if (current && typeof current === 'object' && key in current) {
                        current = current[key];
                    } else {
                        return; // Path doesn't exist
                    }
                }

                if (current && typeof current === 'object' && lastKey in current) {
                    delete current[lastKey];
                }
            };

            // Apply additions (add keys that were added to primary with empty/default values)
            const addKeyToObject = (obj: any, keyPath: string, defaultValue: any) => {
                const keys = keyPath.split('.');
                const lastKey = keys.pop();
                if (!lastKey) return;

                let current = obj;
                for (const key of keys) {
                    if (!current || typeof current !== 'object') return;
                    if (!(key in current)) {
                        current[key] = {};
                    }
                    current = current[key];
                }

                if (current && typeof current === 'object') {
                    current[lastKey] = defaultValue;
                }
            };

            // Delete removed keys
            changes.deletedKeys.forEach(key => deleteKeyFromObject(result, key));

            // Add new keys with empty string defaults
            changes.addedKeys.forEach(key => addKeyToObject(result, key, ''));

            // Handle type changes by preserving existing values if possible, otherwise use defaults
            changes.changedTypes.forEach(change => {
                const keys = change.key.split('.');
                let current = result;
                for (let i = 0; i < keys.length - 1; i++) {
                    if (current && typeof current === 'object' && keys[i] in current) {
                        current = current[keys[i]];
                    } else {
                        return; // Path doesn't exist
                    }
                }

                const lastKey = keys[keys.length - 1];
                if (current && typeof current === 'object' && lastKey in current) {
                    // Try to preserve value if types are compatible
                    const currentValue = current[lastKey];
                    if (change.newType === 'string' && typeof currentValue !== 'string') {
                        current[lastKey] = String(currentValue || '');
                    } else if (change.newType === 'number' && typeof currentValue !== 'number') {
                        const num = Number(currentValue);
                        current[lastKey] = isNaN(num) ? 0 : num;
                    } else if (change.newType === 'boolean' && typeof currentValue !== 'boolean') {
                        current[lastKey] = Boolean(currentValue);
                    } else if (change.newType === 'object' && typeof currentValue !== 'object') {
                        current[lastKey] = {};
                    } else if (change.newType === 'array' && !Array.isArray(currentValue)) {
                        current[lastKey] = [];
                    }
                }
            });

            return result;
        };

        // Process each non-primary language
        for (const language of nonPrimaryLanguages) {
            try {
                if (!language.fileId) {
                    // Create empty language file with structure from primary
                    const emptyContent = applySyncChanges({}, args.changeMetadata);
                    const contentBlob = new Blob([JSON.stringify(emptyContent, null, 2)], { type: 'application/json' });

                    const uploadUrl = await ctx.storage.generateUploadUrl();
                    const uploadResponse = await fetch(uploadUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: contentBlob,
                    });

                    const { storageId } = await uploadResponse.json();

                    await ctx.db.patch(language._id, {
                        fileId: storageId,
                        fileSize: contentBlob.size,
                    });

                    synchronized++;
                    continue;
                }

                // Get existing language content
                const fileUrl = await ctx.storage.getUrl(language.fileId);
                if (!fileUrl) {
                    errors.push(`Failed to get file URL for language ${language.languageCode}`);
                    continue;
                }

                const response = await fetch(fileUrl);
                const existingContent = await response.text();
                const languageJson = JSON.parse(existingContent);

                // Apply structural changes
                const updatedJson = applySyncChanges(languageJson, args.changeMetadata);

                // Validate against schema
                const validation = validateWithAjv(updatedJson, args.jsonSchema);
                if (!validation.isValid) {
                    errors.push(
                        `Validation failed for ${language.languageCode}: ${validation.errors?.map(e => e.message).join(', ')}`
                    );
                    continue;
                }

                // Save updated content
                const updatedContent = JSON.stringify(updatedJson, null, 2);
                const updatedBlob = new Blob([updatedContent], { type: 'application/json' });

                const uploadUrl = await ctx.storage.generateUploadUrl();
                const uploadResponse = await fetch(uploadUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: updatedBlob,
                });

                const { storageId } = await uploadResponse.json();

                // Delete old file and update language record
                await ctx.storage.delete(language.fileId);
                await ctx.db.patch(language._id, {
                    fileId: storageId,
                    fileSize: updatedBlob.size,
                });

                synchronized++;
            } catch (error) {
                errors.push(`Failed to sync ${language.languageCode}: ${error}`);
            }
        }

        return {
            synchronized,
            total: nonPrimaryLanguages.length,
            errors,
        };
    },
});

// Enhanced mutation to handle primary language saves with automatic schema generation and synchronization
export const updatePrimaryLanguageWithSync = mutation({
    args: {
        languageId: v.id('languages'),
        workspaceId: v.id('workspaces'),
        content: v.string(), // JSON content as string
        previousContent: v.optional(v.string()), // Previous content to detect changes
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
            throw new Error('Unauthorized: Can only update languages in organization workspaces');
        }

        const language = await ctx.db.get(args.languageId);
        if (!language) {
            throw new Error('Language not found');
        }

        // Verify access through the hierarchy
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
            throw new Error('Access denied: Project does not belong to workspace');
        }

        // Verify this is the primary language
        if (namespace.primaryLanguageId !== args.languageId) {
            throw new Error(
                'This mutation is only for primary languages. Use updateLanguageContent for other languages.'
            );
        }

        try {
            // Validate JSON content
            const parsedContent = JSON.parse(args.content);

            // Generate JSON schema from the content
            const generateJsonSchemaFromContent = (content: any): any => {
                const generateSchema = (value: any): any => {
                    if (value === null) {
                        return { type: 'null' };
                    }

                    if (Array.isArray(value)) {
                        if (value.length === 0) {
                            return { type: 'array', items: {}, minItems: 0, maxItems: 0 };
                        }

                        // Use tuple schema for exact array structure
                        const prefixItems = value.map(item => generateSchema(item));
                        return {
                            type: 'array',
                            prefixItems: prefixItems,
                            minItems: value.length,
                            maxItems: value.length,
                            additionalItems: false,
                        };
                    }

                    if (typeof value === 'object' && value !== null) {
                        const properties: any = {};
                        const required: string[] = [];

                        for (const [key, val] of Object.entries(value)) {
                            properties[key] = generateSchema(val);
                            required.push(key);
                        }

                        return {
                            type: 'object',
                            properties,
                            required,
                            additionalProperties: false,
                        };
                    }

                    return { type: typeof value };
                };

                return {
                    $schema: 'https://json-schema.org/draft/2020-12/schema',
                    ...generateSchema(content),
                };
            };

            const jsonSchema = generateJsonSchemaFromContent(parsedContent);

            // Save the primary language content first
            const contentBlob = new Blob([args.content], { type: 'application/json' });
            const uploadUrl = await ctx.storage.generateUploadUrl();
            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: contentBlob,
            });

            const { storageId } = await uploadResponse.json();

            // Delete the old file if it exists
            if (language.fileId) {
                await ctx.storage.delete(language.fileId);
            }

            // Update the primary language record
            await ctx.db.patch(args.languageId, {
                fileId: storageId,
                fileSize: contentBlob.size,
            });

            // Save JSON schema to backend
            const schemaContent = JSON.stringify(jsonSchema, null, 2);
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
            await ctx.db.patch(language.namespaceVersionId, {
                jsonSchemaFileId: schemaStorageId,
                jsonSchemaSize: schemaBlob.size,
                schemaUpdatedAt: Date.now(),
            });

            console.log('📋 JSON Schema saved to backend storage');

            // Detect structural changes if previous content is provided
            let hasStructuralChanges = false;
            let changeDetails: any = null;

            if (args.previousContent) {
                try {
                    const previousParsedContent = JSON.parse(args.previousContent);
                    changeDetails = detectStructuralChanges(previousParsedContent, parsedContent);
                    hasStructuralChanges = changeDetails.hasStructuralChanges;
                } catch (error) {
                    console.warn('Could not parse previous content for change detection:', error);
                }
            }

            // If there are structural changes or this is first time, synchronize other languages
            if (hasStructuralChanges || !args.previousContent) {
                console.log('🔄 Starting language synchronization');

                // Get all other languages in this namespace version
                const allLanguages = await ctx.db
                    .query('languages')
                    .withIndex('by_namespace_version', q => q.eq('namespaceVersionId', language.namespaceVersionId))
                    .collect();

                const otherLanguages = allLanguages.filter(lang => lang._id !== args.languageId);
                let synchronized = 0;
                const errors: string[] = [];

                // Process each other language
                for (const otherLanguage of otherLanguages) {
                    try {
                        let targetContent;

                        if (!otherLanguage.fileId) {
                            // No existing file - copy entire primary language structure
                            targetContent = parsedContent;
                            console.log(
                                `📄 Creating new file for ${otherLanguage.languageCode} with primary language structure`
                            );
                        } else {
                            // Get existing content and apply structural changes
                            const fileUrl = await ctx.storage.getUrl(otherLanguage.fileId);
                            if (!fileUrl) {
                                // Fallback to copy entire structure
                                targetContent = parsedContent;
                            } else {
                                const response = await fetch(fileUrl);
                                const existingContent = await response.text();
                                const existingJson = JSON.parse(existingContent);

                                // Apply structural synchronization while preserving existing values
                                targetContent = applyStructuralSync(existingJson, parsedContent);
                                console.log(`🔧 Applied structural sync for ${otherLanguage.languageCode}`);
                            }
                        }

                        // Validate against schema
                        const ajv = new Ajv2020({ allErrors: true, verbose: true, strict: true });
                        const validate = ajv.compile(jsonSchema);
                        const isValid = validate(targetContent);

                        if (!isValid) {
                            errors.push(
                                `Validation failed for ${otherLanguage.languageCode}: ${validate.errors?.map(e => e.message).join(', ')}`
                            );
                            continue;
                        }

                        // Save the synchronized content
                        const syncedContentBlob = new Blob([JSON.stringify(targetContent, null, 2)], {
                            type: 'application/json',
                        });
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

                        await ctx.db.patch(otherLanguage._id, {
                            fileId: syncStorageId,
                            fileSize: syncedContentBlob.size,
                        });

                        synchronized++;
                    } catch (error) {
                        errors.push(`Failed to sync ${otherLanguage.languageCode}: ${error}`);
                    }
                }

                console.log(`✅ Synchronized ${synchronized} languages`);

                return {
                    success: true,
                    synchronized,
                    total: otherLanguages.length,
                    errors,
                    schemaUpdated: true,
                };
            }

            return {
                success: true,
                synchronized: 0,
                total: 0,
                errors: [],
                schemaUpdated: true,
            };
        } catch (error) {
            console.error('Primary language update failed:', error);
            throw error;
        }
    },
});

// Helper function to apply structural synchronization while preserving existing values
function detectStructuralChanges(
    oldObj: any,
    newObj: any
): {
    hasStructuralChanges: boolean;
    addedPaths: { path: string; value: any }[];
    deletedPaths: { path: string; value: any }[];
    changedTypes: { path: string; oldValue: any; newValue: any }[];
} {
    const result = {
        hasStructuralChanges: false,
        addedPaths: [] as { path: string; value: any }[],
        deletedPaths: [] as { path: string; value: any }[],
        changedTypes: [] as { path: string; oldValue: any; newValue: any }[],
    };

    const compare = (old: any, current: any, path = '') => {
        if (old === null && current === null) return;

        const oldType = old === null ? 'null' : Array.isArray(old) ? 'array' : typeof old;
        const currentType = current === null ? 'null' : Array.isArray(current) ? 'array' : typeof current;

        if (oldType !== currentType) {
            result.changedTypes.push({ path, oldValue: old, newValue: current });
            result.hasStructuralChanges = true;
            return;
        }

        if (Array.isArray(old) && Array.isArray(current)) {
            const maxLength = Math.max(old.length, current.length);

            for (let i = 0; i < maxLength; i++) {
                const currentPath = path ? `${path}[${i}]` : `[${i}]`;

                if (i >= old.length) {
                    result.addedPaths.push({ path: currentPath, value: current[i] });
                    result.hasStructuralChanges = true;
                } else if (i >= current.length) {
                    result.deletedPaths.push({ path: currentPath, value: old[i] });
                    result.hasStructuralChanges = true;
                } else {
                    compare(old[i], current[i], currentPath);
                }
            }
        } else if (oldType === 'object' && currentType === 'object' && old !== null && current !== null) {
            const allKeys = new Set([...Object.keys(old), ...Object.keys(current)]);

            for (const key of allKeys) {
                const currentPath = path ? `${path}.${key}` : key;

                if (!(key in old)) {
                    result.addedPaths.push({ path: currentPath, value: current[key] });
                    result.hasStructuralChanges = true;
                } else if (!(key in current)) {
                    result.deletedPaths.push({ path: currentPath, value: old[key] });
                    result.hasStructuralChanges = true;
                } else {
                    compare(old[key], current[key], currentPath);
                }
            }
        }
    };

    compare(oldObj, newObj);
    return result;
}

function applyStructuralSync(existingLanguage: any, primaryLanguage: any): any {
    const result = JSON.parse(JSON.stringify(existingLanguage)); // Deep clone

    const applyChanges = (existing: any, primary: any, path = ''): any => {
        if (primary === null) return null;

        const primaryType = Array.isArray(primary) ? 'array' : typeof primary;
        const existingType =
            existing === null || existing === undefined
                ? 'undefined'
                : Array.isArray(existing)
                  ? 'array'
                  : typeof existing;

        // If types don't match, use primary structure
        if (existingType !== primaryType || existing === undefined || existing === null) {
            return primary; // Use primary language value for new/type-changed nodes
        }

        if (Array.isArray(primary)) {
            const syncedArray = [];

            // Sync array structure exactly
            for (let i = 0; i < primary.length; i++) {
                if (i < existing.length) {
                    // Preserve existing value if structure matches, otherwise use primary
                    syncedArray[i] = applyChanges(existing[i], primary[i], `${path}[${i}]`);
                } else {
                    // New array element - use primary language value
                    syncedArray[i] = primary[i];
                }
            }

            return syncedArray;
        }

        if (primaryType === 'object' && primary !== null) {
            const syncedObject: any = {};

            // Process all keys from primary language
            for (const key in primary) {
                const currentPath = path ? `${path}.${key}` : key;

                if (key in existing) {
                    // Key exists - recursively sync
                    syncedObject[key] = applyChanges(existing[key], primary[key], currentPath);
                } else {
                    // New key - use primary language value
                    syncedObject[key] = primary[key];
                }
            }

            return syncedObject;
        }

        // For primitives, preserve existing value
        return existing;
    };

    return applyChanges(result, primaryLanguage);
}

// New mutation that processes change operations for more precise updates
export const applyChangeOperations = mutation({
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

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only update languages in organization workspaces');
        }

        const language = await ctx.db.get(args.languageId);
        if (!language) {
            throw new Error('Language not found');
        }

        // Verify access through the hierarchy
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
            throw new Error('Access denied: Project does not belong to workspace');
        }

        const isPrimaryLanguage = namespace.primaryLanguageId === args.languageId;

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
            let syncResult = null;
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
                await ctx.db.patch(language.namespaceVersionId, {
                    jsonSchemaFileId: schemaStorageId,
                    jsonSchemaSize: schemaBlob.size,
                    schemaUpdatedAt: Date.now(),
                });

                console.log('📋 JSON Schema always updated for primary language save');

                // If there are structural changes, sync other languages
                const hasStructuralChanges = !!args.languageChanges?.changes.hasStructuralChanges;

                if (hasStructuralChanges) {
                    const changesForSync = args.languageChanges?.changes.structuredChanges ?? [];

                    syncResult = await synchronizeLanguagesWithOperations(
                        ctx,
                        language.namespaceVersionId,
                        args.languageId,
                        changesForSync,
                        schema.jsonSchema,
                        updatedContent
                    );
                }
            } else {
                // For non-primary languages, validate against existing schema
                if (namespaceVersion.jsonSchemaFileId) {
                    const schemaFileUrl = await ctx.storage.getUrl(namespaceVersion.jsonSchemaFileId);
                    if (schemaFileUrl) {
                        const schemaResponse = await fetch(schemaFileUrl);
                        const schemaContent = await schemaResponse.text();
                        const primarySchema = JSON.parse(schemaContent);

                        // Validate against schema using AJV
                        const ajv = new Ajv2020({ allErrors: true, verbose: true, strict: true });
                        const validate = ajv.compile(primarySchema);
                        const isValid = validate(updatedContent);

                        if (!isValid) {
                            const errorMessages =
                                validate.errors
                                    ?.map(err => `${err.instancePath || 'root'}: ${err.message}`)
                                    .join('; ') || 'Unknown validation errors';

                            throw new Error(`Schema validation failed: ${errorMessages}`);
                        }
                    }
                }
            }

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

            await ctx.db.patch(args.languageId, {
                fileId: storageId,
                fileSize: contentBlob.size,
            });

            // Calculate operations applied count
            const operationsApplied = args.languageChanges?.changes
                ? args.languageChanges.changes.structuredChanges?.length || 0 // Count of structured changes
                : 0;

            return {
                success: true,
                operationsApplied,
                synchronized: syncResult?.synchronized || 0,
                syncErrors: syncResult?.errors || [],
                schemaUpdated: isPrimaryLanguage,
            };
        } catch (error) {
            console.error('Failed to apply change operations:', error);
            throw error;
        }
    },
});

// Helper function to apply structured changes to JSON content with precise array indexing
function applyJsonDiffToContent(originalContent: any, structuredChangesData: any): any {
    if (!structuredChangesData || !structuredChangesData.structuredChanges) {
        return originalContent;
    }

    // Deep clone the original content
    let result = JSON.parse(JSON.stringify(originalContent));

    // Apply each structured change in order
    const changes = structuredChangesData.structuredChanges;

    for (const change of changes) {
        result = applyStructuredChange(result, change);
    }

    return result;
}

// Apply a single structured change to the content
function applyStructuredChange(content: any, change: any): any {
    const pathParts = parseJSONPath(change.path);

    if (change.type === 'add') {
        return setValueAtJSONPath(content, pathParts, change.newValue, change.arrayIndex);
    } else if (change.type === 'delete') {
        return deleteValueAtJSONPath(content, pathParts, change.arrayIndex);
    } else if (change.type === 'modify') {
        return setValueAtJSONPath(content, pathParts, change.newValue, change.arrayIndex);
    }

    return content;
}

// Parse JSON path with array indices (e.g., "items[2].title" -> ["items", 2, "title"])
function parseJSONPath(path: string): Array<string | number> {
    if (!path) return [];

    const parts: Array<string | number> = [];
    const regex = /\[(\d+)\]|\.?([^.\[]+)/g;
    let match;

    while ((match = regex.exec(path)) !== null) {
        if (match[1] !== undefined) {
            // Array index
            parts.push(parseInt(match[1], 10));
        } else if (match[2] !== undefined) {
            // Object key
            parts.push(match[2]);
        }
    }

    return parts;
}

// Set value at JSON path with precise array index handling
function setValueAtJSONPath(obj: any, pathParts: Array<string | number>, value: any, arrayIndex?: number): any {
    if (pathParts.length === 0) return value;

    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    const [currentKey, ...remainingPath] = pathParts;

    if (remainingPath.length === 0) {
        // We're at the target location
        if (typeof currentKey === 'number') {
            // Array index operation
            const arr = Array.isArray(result) ? result : [];

            // For array operations, use the arrayIndex if provided (for precise positioning)
            // otherwise use currentKey (from path)
            const targetIndex = arrayIndex !== undefined ? arrayIndex : currentKey;

            // Insert at specific index (for additions) or set at index (for modifications)
            if (arrayIndex !== undefined) {
                // This is an addition - insert at specific position
                arr.splice(targetIndex, 0, value);
            } else {
                // This is a modification - set at existing index
                arr[targetIndex] = value;
            }
            return arr;
        } else {
            // Object property
            result[currentKey] = value;
        }
    } else {
        // Recurse deeper
        const nextValue = result[currentKey] || (typeof remainingPath[0] === 'number' ? [] : {});
        result[currentKey] = setValueAtJSONPath(nextValue, remainingPath, value, arrayIndex);
    }

    return result;
}

// Delete value at JSON path with precise array index handling
function deleteValueAtJSONPath(obj: any, pathParts: Array<string | number>, arrayIndex?: number): any {
    if (pathParts.length === 0) return obj;

    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    const [currentKey, ...remainingPath] = pathParts;

    if (remainingPath.length === 0) {
        // We're at the target location to delete
        if (typeof currentKey === 'number' && Array.isArray(result)) {
            // Array index deletion - always use arrayIndex for precise positioning
            // The currentKey from path might not match the actual deletion index
            const indexToDelete = arrayIndex !== undefined ? arrayIndex : currentKey;
            if (indexToDelete >= 0 && indexToDelete < result.length) {
                result.splice(indexToDelete, 1);
            }
        } else {
            // Object property deletion
            delete result[currentKey];
        }
    } else {
        // Recurse deeper
        if (result[currentKey] !== undefined) {
            result[currentKey] = deleteValueAtJSONPath(result[currentKey], remainingPath, arrayIndex);
        }
    }

    return result;
}

// Helper function to parse JSON path into parts
function parsePath(path: string): Array<string | number> {
    if (!path) return [];

    const parts: Array<string | number> = [];
    const regex = /\[(\d+)\]|\.?([^.\[]+)/g;
    let match;

    while ((match = regex.exec(path)) !== null) {
        if (match[1] !== undefined) {
            // Array index
            parts.push(parseInt(match[1], 10));
        } else if (match[2] !== undefined) {
            // Object key
            parts.push(match[2]);
        }
    }

    return parts;
}

// Helper function to set value at path
function setValueAtPath(obj: any, pathParts: Array<string | number>, value: any): void {
    let current = obj;

    for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];

        if (!(part in current)) {
            // Create intermediate objects/arrays as needed
            const nextPart = pathParts[i + 1];
            current[part] = typeof nextPart === 'number' ? [] : {};
        }

        current = current[part];
    }

    if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        current[lastPart] = value;
    }
}

// Helper function to delete value at path
function deleteValueAtPath(obj: any, pathParts: Array<string | number>): void {
    if (pathParts.length === 0) return;

    let current = obj;

    for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];

        if (!(part in current)) {
            return; // Path doesn't exist
        }

        current = current[part];
    }

    const lastPart = pathParts[pathParts.length - 1];

    if (Array.isArray(current) && typeof lastPart === 'number') {
        current.splice(lastPart, 1);
    } else if (typeof current === 'object' && current !== null) {
        delete current[lastPart];
    }
}

// Helper function to synchronize other languages with change operations
async function synchronizeLanguagesWithOperations(
    ctx: MutationCtx,
    namespaceVersionId: any,
    primaryLanguageId: any,
    operations: any[],
    jsonSchema: any,
    primaryContent: any
) {
    // Get all other languages in this namespace version
    const allLanguages = await ctx.db
        .query('languages')
        .withIndex('by_namespace_version', q => q.eq('namespaceVersionId', namespaceVersionId))
        .collect();

    const otherLanguages = allLanguages.filter((lang: any) => lang._id !== primaryLanguageId);
    let synchronized = 0;
    const errors: string[] = [];

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
                    targetContent = applyStructuralOperations(existingJson, operations, primaryContent);
                    console.log(`🔧 Applied structural operations for ${otherLanguage.languageCode}`);
                }
            }

            // Validate against schema
            const ajv = new Ajv2020({ allErrors: true, verbose: true, strict: true });
            const validate = ajv.compile(jsonSchema);
            const isValid = validate(targetContent);

            if (!isValid) {
                errors.push(
                    `Validation failed for ${otherLanguage.languageCode}: ${validate.errors?.map(e => e.message).join(', ')}`
                );
                continue;
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

            await ctx.db.patch(otherLanguage._id, {
                fileId: syncStorageId,
                fileSize: syncedContentBlob.size,
            });

            synchronized++;
        } catch (error) {
            errors.push(`Failed to sync ${otherLanguage.languageCode}: ${error}`);
        }
    }

    return {
        synchronized,
        total: otherLanguages.length,
        errors,
    };
}

// Helper function to apply structural operations while preserving existing values
function applyStructuralOperations(existingContent: any, operations: any[], primaryContent: any): any {
    let result = JSON.parse(JSON.stringify(existingContent)); // Deep clone

    for (const operation of operations) {
        if (operation.type === 'add') {
            // For add operations, use the primary language value
            const pathParts = parsePath(operation.path);
            setValueAtPath(result, pathParts, operation.value);
        } else if (operation.type === 'delete') {
            // For delete operations, remove from existing content
            const pathParts = parsePath(operation.path);
            deleteValueAtPath(result, pathParts);
        }
        // For modify operations on structural changes (type changes),
        // we use the primary language structure
        else if (operation.type === 'modify' && operation.parentType !== 'root') {
            const pathParts = parsePath(operation.path);
            // Only apply if it's a structural change (type change)
            const currentValue = getValueAtPath(result, pathParts);
            const oldType = Array.isArray(operation.oldValue) ? 'array' : typeof operation.oldValue;
            const newType = Array.isArray(operation.value) ? 'array' : typeof operation.value;

            if (oldType !== newType) {
                setValueAtPath(result, pathParts, operation.value);
            }
            // For same-type modifications, preserve the existing value
        }
    }

    return result;
}

// Helper function to get value at path
function getValueAtPath(obj: any, pathParts: Array<string | number>): any {
    let current = obj;

    for (const part of pathParts) {
        if (current === null || current === undefined || !(part in current)) {
            return undefined;
        }
        current = current[part];
    }

    return current;
}
