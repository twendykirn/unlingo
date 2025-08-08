import { paginationOptsValidator } from 'convex/server';
import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

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
            JSON.parse(args.content);
        } catch (error) {
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
