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

        return namespaceVersion.jsonSchemaFileId;
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

        const existingLanguage = await ctx.db
            .query('languages')
            .withIndex('by_namespace_version_language', q =>
                q.eq('namespaceVersionId', args.namespaceVersionId).eq('languageCode', args.languageCode)
            )
            .first();

        if (existingLanguage) {
            throw new Error(`Language '${args.languageCode}' already exists for this namespace version`);
        }

        const currentLanguageCount = namespaceVersion.usage?.languages ?? 0;
        if (currentLanguageCount >= workspace.limits.languagesPerVersion) {
            throw new Error(
                `Language limit reached. Maximum ${workspace.limits.languagesPerVersion} languages per version. Please upgrade your plan.`
            );
        }

        // Validate language code format (ISO 639-1 or similar)
        if (!/^[a-z]{2}(-[A-Z]{2})?$/i.test(args.languageCode)) {
            throw new Error('Language code must be in format: "en", "en-US", "fr", "pt-BR", etc.');
        }

        const isFirstLanguage = (namespaceVersion.usage?.languages ?? 0) === 0;

        let primaryFileId: Id<'_storage'> | undefined = undefined;

        if (!isFirstLanguage && namespaceVersion.primaryLanguageId) {
            const primaryLanguage = await ctx.db.get(namespaceVersion.primaryLanguageId);

            if (primaryLanguage && primaryLanguage.fileId) {
                primaryFileId = primaryLanguage.fileId;
            }
        }

        return {
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
        const languageId = await ctx.db.insert('languages', {
            namespaceVersionId: args.namespaceVersionId,
            languageCode: args.languageCode,
            fileId: args.fileId ?? undefined,
            fileSize: args.fileSize,
        });

        await ctx.db.patch(
            args.namespaceVersionId,
            args.isFirstLanguage
                ? {
                      usage: {
                          languages: args.currentLanguageCount + 1,
                      },
                      primaryLanguageId: languageId,
                  }
                : {
                      usage: {
                          languages: args.currentLanguageCount + 1,
                      },
                  }
        );

        return languageId;
    },
});
