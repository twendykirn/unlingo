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

        // Get workspace to check limits
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Verify user is in organization that owns this workspace
        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only create versions in organization workspaces');
        }

        // Verify namespace exists and user has access
        const namespace = await ctx.db.get(args.namespaceId);
        if (!namespace) {
            throw new Error('Namespace not found');
        }

        // Get project to verify workspace ownership
        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied: Project does not belong to workspace');
        }

        // Check if version already exists for this namespace
        const existingVersion = await ctx.db
            .query('namespaceVersions')
            .withIndex('by_namespace_version', q => q.eq('namespaceId', args.namespaceId).eq('version', args.version))
            .first();

        if (existingVersion) {
            throw new Error(`Version '${args.version}' already exists for this namespace`);
        }

        // Check if namespace has reached version limit using usage counter
        const currentVersionCount = namespace.usage?.versions ?? 0;
        if (currentVersionCount >= workspace.limits.versionsPerNamespace) {
            throw new Error(
                `Version limit reached. Maximum ${workspace.limits.versionsPerNamespace} versions per namespace. Please upgrade your plan.`
            );
        }

        // Validate version format (semantic versioning or special names)
        if (args.version !== 'main' && !/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/.test(args.version)) {
            throw new Error(
                'Version must follow semantic versioning format (e.g., "1.0.0", "1.2.3-beta.1") or be "main"'
            );
        }

        // Create the namespace version
        const versionId = await ctx.db.insert('namespaceVersions', {
            namespaceId: args.namespaceId,
            version: args.version,
        });

        // Update namespace usage counter
        await ctx.db.patch(args.namespaceId, {
            usage: {
                versions: currentVersionCount + 1,
            },
        });

        // If copying from another version, copy all its languages
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
            fileId: args.fileId ?? undefined,
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
