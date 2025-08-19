import { paginationOptsValidator } from 'convex/server';
import { action, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { Id } from './_generated/dataModel';

// Query to get versions for a namespace with pagination
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

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Only allow access to organization workspaces
        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only access organization workspaces');
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

        return await ctx.db
            .query('namespaceVersions')
            .withIndex('by_namespace', q => q.eq('namespaceId', args.namespaceId))
            .order('desc')
            .paginate(args.paginationOpts);
    },
});

// Query to get a single namespace version by ID
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

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // Only allow access to organization workspaces
        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only access organization workspaces');
        }

        const namespaceVersion = await ctx.db.get(args.namespaceVersionId);
        if (!namespaceVersion) {
            return null;
        }

        // Verify access through the hierarchy
        const namespace = await ctx.db.get(namespaceVersion.namespaceId);
        if (!namespace) {
            return null;
        }

        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            return null;
        }

        return namespaceVersion;
    },
});

// Mutation to create a new namespace version
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

        // If copying from another version, copy all its languages
        if (args.copyFromVersionId && sourceLanguages) {
            try {
                for (const sourceLang of sourceLanguages) {
                    let newFileId: string | undefined = undefined;
                    let newFileSize: number | undefined = undefined;

                    // Only copy file if source language has one
                    if (sourceLang.fileId) {
                        try {
                            // Get the source file content
                            const sourceFileUrl = await ctx.storage.getUrl(sourceLang.fileId);
                            if (!sourceFileUrl) {
                                throw new Error('Failed to get source file URL');
                            }
                            const sourceResponse = await fetch(sourceFileUrl);
                            const sourceContent = await sourceResponse.text();

                            // Create a new file with the same content
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

                    // Create the language record for the new version (with or without file)
                    await ctx.runMutation(internal.internalNamespaces.internalInsertLanguage, {
                        namespaceVersionId: versionId,
                        languageCode: sourceLang.languageCode,
                        fileId: newFileId ? (newFileId as any) : undefined,
                        fileSize: newFileSize,
                    });
                }

                // Update language count for this version if we copied languages
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

// Mutation to update a namespace version
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

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only update versions from organization workspaces');
        }

        const namespaceVersion = await ctx.db.get(args.versionId);
        if (!namespaceVersion) {
            throw new Error('Namespace version not found');
        }

        // Verify access through the hierarchy
        const namespace = await ctx.db.get(namespaceVersion.namespaceId);
        if (!namespace) {
            throw new Error('Namespace not found');
        }

        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied: Project does not belong to workspace');
        }

        // Check if the new version name already exists for this namespace
        const existingVersion = await ctx.db
            .query('namespaceVersions')
            .withIndex('by_namespace', q => q.eq('namespaceId', namespaceVersion.namespaceId))
            .filter(q => q.and(q.eq(q.field('version'), args.version), q.neq(q.field('_id'), args.versionId)))
            .first();

        if (existingVersion) {
            throw new Error(`Version "${args.version}" already exists for this namespace`);
        }

        // Update the namespace version
        await ctx.db.patch(args.versionId, {
            version: args.version,
        });

        return args.versionId;
    },
});

// Mutation to delete a namespace version
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

        // Verify user has access to this workspace
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        if (identity.org !== workspace.clerkId) {
            throw new Error('Unauthorized: Can only delete versions from organization workspaces');
        }

        const namespaceVersion = await ctx.db.get(args.versionId);
        if (!namespaceVersion) {
            throw new Error('Namespace version not found');
        }

        // Verify access through the hierarchy
        const namespace = await ctx.db.get(namespaceVersion.namespaceId);
        if (!namespace) {
            throw new Error('Namespace not found');
        }

        const project = await ctx.db.get(namespace.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied: Project does not belong to workspace');
        }

        // Delete all languages for this version and count them
        const languages = await ctx.db
            .query('languages')
            .withIndex('by_namespace_version', q => q.eq('namespaceVersionId', args.versionId))
            .collect();

        for (const language of languages) {
            // Delete the file from Convex Storage
            if (language.fileId) {
                await ctx.storage.delete(language.fileId);
            }
            await ctx.db.delete(language._id);
        }

        if (namespaceVersion.jsonSchemaFileId) {
            await ctx.storage.delete(namespaceVersion.jsonSchemaFileId);
        }

        // Delete the namespace version
        await ctx.db.delete(args.versionId);

        // Update namespace version usage counter
        const currentVersionCount = namespace.usage?.versions ?? 1;

        await ctx.db.patch(namespace._id, {
            usage: {
                versions: Math.max(0, currentVersionCount - 1),
            },
        });

        return args.versionId;
    },
});
