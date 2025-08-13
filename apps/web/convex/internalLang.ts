import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { Id } from './_generated/dataModel';

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

        return {
            namespaceVersion,
            namespace,
            language,
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

        return namespaceVersion.jsonSchemaFileId;
    },
});

export const internalVersionLanguages = internalQuery({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
        primaryLanguageId: v.id('languages'),
    },
    handler: async (ctx, args) => {
        // Get all other languages in this namespace version
        const allLanguages = await ctx.db
            .query('languages')
            .withIndex('by_namespace_version', q => q.eq('namespaceVersionId', args.namespaceVersionId))
            .collect();

        const otherLanguages = allLanguages.filter((lang: any) => lang._id !== args.primaryLanguageId);

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
        schemaUpdatedAt: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.namespaceVersionId, {
            jsonSchemaFileId: args.jsonSchemaFileId,
            jsonSchemaSize: args.jsonSchemaSize,
            schemaUpdatedAt: args.schemaUpdatedAt,
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
        });
    },
});

export const createLanguageContext = internalQuery({
    args: {
        namespaceVersionId: v.id('namespaceVersions'),
        workspaceId: v.id('workspaces'),
        languageCode: v.string(),
        copyFromLanguage: v.optional(v.id('languages')),
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

        let sourceFileId: Id<'_storage'> | undefined = undefined;
        let primaryFileId: Id<'_storage'> | undefined = undefined;

        if (args.copyFromLanguage) {
            // Manual copy from specified language
            const sourceLanguage = await ctx.db.get(args.copyFromLanguage);

            // Validate that source language belongs to the same namespace version
            if (!sourceLanguage || sourceLanguage.namespaceVersionId !== args.namespaceVersionId) {
                throw new Error('Source language not found or belongs to different namespace version');
            }

            if (sourceLanguage.fileId) {
                sourceFileId = sourceLanguage.fileId;
            }
        } else if (!isFirstLanguage && namespace.primaryLanguageId) {
            // Auto-copy from primary language for 2nd, 3rd, etc. languages
            const primaryLanguage = await ctx.db.get(namespace.primaryLanguageId);

            if (primaryLanguage && primaryLanguage.fileId) {
                primaryFileId = primaryLanguage.fileId;
            }
        }

        return {
            sourceFileId,
            primaryFileId,
            namespaceVersion,
            namespace,
            isFirstLanguage,
            currentLanguageCount,
        };
    },
});

export const internalCreateLanguageUpdate = internalMutation({
    args: {
        fileId: v.optional(v.id('_storage')),
        fileSize: v.optional(v.number()),
        isFirstLanguage: v.boolean(),
        languageCode: v.string(),
        namespaceVersionId: v.id('namespaceVersions'),
        nameSpaceId: v.id('namespaces'),
        currentLanguageCount: v.number(),
        versionUsage: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // Create the language record (without file initially, unless copied from another language)
        const languageId = await ctx.db.insert('languages', {
            namespaceVersionId: args.namespaceVersionId,
            languageCode: args.languageCode,
            fileId: args.fileId ?? undefined,
            fileSize: args.fileSize,
        });

        // Update namespace usage counter
        await ctx.db.patch(args.nameSpaceId, {
            usage: {
                languages: args.currentLanguageCount + 1,
                versions: args.versionUsage ?? 0,
            },
        });

        // If this is the first language, set it as primary
        if (args.isFirstLanguage) {
            await ctx.db.patch(args.nameSpaceId, {
                primaryLanguageId: languageId,
            });
        }

        return languageId;
    },
});
