import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';

export const getScreenshotsForProject = query({
    args: {
        projectId: v.id('projects'),
        workspaceId: v.id('workspaces'),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org) {
            throw new Error('Workspace not found or access denied');
        }

        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const result = await ctx.db
            .query('screenshots')
            .withIndex('by_project_name', q => q.eq('projectId', args.projectId))
            .paginate(args.paginationOpts);

        const screenshotsWithUrls = await Promise.all(
            result.page.map(async screenshot => {
                const imageUrl = await ctx.storage.getUrl(screenshot.imageFileId);
                return {
                    ...screenshot,
                    imageUrl,
                };
            })
        );

        return {
            ...result,
            page: screenshotsWithUrls,
        };
    },
});

export const createScreenshot = mutation({
    args: {
        projectId: v.id('projects'),
        workspaceId: v.id('workspaces'),
        name: v.string(),
        description: v.optional(v.string()),
        imageFileId: v.id('_storage'),
        imageSize: v.number(),
        imageMimeType: v.string(),
        dimensions: v.object({
            width: v.number(),
            height: v.number(),
        }),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            await ctx.storage.delete(args.imageFileId);
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org) {
            await ctx.storage.delete(args.imageFileId);
            throw new Error('Workspace not found or access denied');
        }

        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            await ctx.storage.delete(args.imageFileId);
            throw new Error('Project not found or access denied');
        }

        const existingScreenshot = await ctx.db
            .query('screenshots')
            .withIndex('by_project_name', q => q.eq('projectId', args.projectId).eq('name', args.name))
            .first();

        if (existingScreenshot) {
            await ctx.storage.delete(args.imageFileId);
            throw new Error('A screenshot with this name already exists in this project');
        }

        // Check file size limit (10MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (args.imageSize > MAX_FILE_SIZE) {
            await ctx.storage.delete(args.imageFileId);
            throw new Error('Image file size cannot exceed 10MB. Please compress your image and try again.');
        }

        const screenshotId = await ctx.db.insert('screenshots', {
            projectId: args.projectId,
            name: args.name,
            description: args.description,
            imageFileId: args.imageFileId,
            imageSize: args.imageSize,
            imageMimeType: args.imageMimeType,
            dimensions: args.dimensions,
        });

        return screenshotId;
    },
});

export const deleteScreenshot = mutation({
    args: {
        screenshotId: v.id('screenshots'),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org) {
            throw new Error('Workspace not found or access denied');
        }

        const screenshot = await ctx.db.get(args.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const containers = await ctx.db
            .query('screenshotContainers')
            .withIndex('by_screenshot', q => q.eq('screenshotId', args.screenshotId))
            .collect();

        for (const container of containers) {
            const keyMappings = await ctx.db
                .query('screenshotKeyMappings')
                .withIndex('by_container_version_language_key', q => q.eq('containerId', container._id))
                .collect();

            for (const mapping of keyMappings) {
                await ctx.db.delete(mapping._id);
            }

            await ctx.db.delete(container._id);
        }

        await ctx.storage.delete(screenshot.imageFileId);

        await ctx.db.delete(args.screenshotId);

        return { success: true };
    },
});

export const getContainerMappings = query({
    args: {
        containerId: v.id('screenshotContainers'),
        namespaceVersionId: v.id('namespaceVersions'),
        languageId: v.id('languages'),
        workspaceId: v.id('workspaces'),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org) {
            throw new Error('Workspace not found or access denied');
        }

        const container = await ctx.db.get(args.containerId);
        if (!container) {
            throw new Error('Container not found or access denied');
        }

        const screenshot = await ctx.db.get(container.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found or access denied');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        return await ctx.db
            .query('screenshotKeyMappings')
            .withIndex('by_container_version_language_key', q =>
                q
                    .eq('containerId', args.containerId)
                    .eq('namespaceVersionId', args.namespaceVersionId)
                    .eq('languageId', args.languageId)
            )
            .paginate(args.paginationOpts);
    },
});

export const generateUploadUrl = mutation({
    args: {},
    handler: async ctx => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        return await ctx.storage.generateUploadUrl();
    },
});

export const assignKeyToContainer = mutation({
    args: {
        containerId: v.id('screenshotContainers'),
        namespaceVersionId: v.id('namespaceVersions'),
        languageId: v.id('languages'),
        translationKey: v.string(),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org) {
            throw new Error('Workspace not found or access denied');
        }

        const container = await ctx.db.get(args.containerId);
        if (!container) {
            throw new Error('Container not found or access denied');
        }

        const screenshot = await ctx.db.get(container.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found or access denied');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const language = await ctx.db.get(args.languageId);
        const namespaceVersion = await ctx.db.get(args.namespaceVersionId);

        if (!language || language.namespaceVersionId !== args.namespaceVersionId) {
            throw new Error('Language not found or access denied');
        }

        if (!namespaceVersion) {
            throw new Error('Namespace version not found or access denied');
        }

        const existingMapping = await ctx.db
            .query('screenshotKeyMappings')
            .withIndex('by_container_version_language_key', q =>
                q
                    .eq('containerId', args.containerId)
                    .eq('namespaceVersionId', args.namespaceVersionId)
                    .eq('languageId', args.languageId)
                    .eq('translationKey', args.translationKey)
            )
            .first();

        if (existingMapping) {
            return existingMapping._id;
        } else {
            const mappingId = await ctx.db.insert('screenshotKeyMappings', {
                containerId: args.containerId,
                namespaceVersionId: args.namespaceVersionId,
                languageId: args.languageId,
                translationKey: args.translationKey,
            });
            return mappingId;
        }
    },
});

export const removeKeyFromContainer = mutation({
    args: {
        containerId: v.id('screenshotContainers'),
        languageId: v.id('languages'),
        translationKey: v.string(),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org) {
            throw new Error('Workspace not found or access denied');
        }

        const container = await ctx.db.get(args.containerId);
        if (!container) {
            throw new Error('Container not found or access denied');
        }

        const screenshot = await ctx.db.get(container.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found or access denied');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const language = await ctx.db.get(args.languageId);
        if (!language) {
            throw new Error('Language not found or access denied');
        }

        const mapping = await ctx.db
            .query('screenshotKeyMappings')
            .withIndex('by_container_version_language_key', q =>
                q
                    .eq('containerId', args.containerId)
                    .eq('namespaceVersionId', language.namespaceVersionId)
                    .eq('languageId', args.languageId)
                    .eq('translationKey', args.translationKey)
            )
            .first();

        if (mapping) {
            await ctx.db.delete(mapping._id);
        }

        return { success: true };
    },
});

export const deleteKeyMapping = mutation({
    args: {
        mappingId: v.id('screenshotKeyMappings'),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org) {
            throw new Error('Workspace not found or access denied');
        }

        const mapping = await ctx.db.get(args.mappingId);
        if (!mapping) {
            throw new Error('Mapping not found');
        }

        const container = await ctx.db.get(mapping.containerId);
        if (!container) {
            throw new Error('Container not found');
        }

        const screenshot = await ctx.db.get(container.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        await ctx.db.delete(args.mappingId);
        return { success: true };
    },
});

export const createContainer = mutation({
    args: {
        screenshotId: v.id('screenshots'),
        position: v.object({
            x: v.number(),
            y: v.number(),
            width: v.number(),
            height: v.number(),
        }),
        backgroundColor: v.optional(v.string()),
        description: v.optional(v.string()),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org) {
            throw new Error('Workspace not found or access denied');
        }

        const screenshot = await ctx.db.get(args.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found or access denied');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const containerId = await ctx.db.insert('screenshotContainers', {
            screenshotId: args.screenshotId,
            position: args.position,
            backgroundColor: args.backgroundColor,
            description: args.description,
        });

        return containerId;
    },
});

export const updateContainer = mutation({
    args: {
        containerId: v.id('screenshotContainers'),
        position: v.optional(
            v.object({
                x: v.number(),
                y: v.number(),
                width: v.number(),
                height: v.number(),
            })
        ),
        backgroundColor: v.optional(v.string()),
        description: v.optional(v.string()),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org) {
            throw new Error('Workspace not found or access denied');
        }

        const container = await ctx.db.get(args.containerId);
        if (!container) {
            throw new Error('Container not found or access denied');
        }

        const screenshot = await ctx.db.get(container.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found or access denied');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const updates: any = {};
        if (args.position) updates.position = args.position;
        if (args.backgroundColor !== undefined) updates.backgroundColor = args.backgroundColor;
        if (args.description !== undefined) updates.description = args.description;

        await ctx.db.patch(args.containerId, updates);
        return { success: true };
    },
});

export const deleteContainer = mutation({
    args: {
        containerId: v.id('screenshotContainers'),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org) {
            throw new Error('Workspace not found or access denied');
        }

        const container = await ctx.db.get(args.containerId);
        if (!container) {
            throw new Error('Container not found or access denied');
        }

        const screenshot = await ctx.db.get(container.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found or access denied');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const keyMappings = await ctx.db
            .query('screenshotKeyMappings')
            .withIndex('by_container_version_language_key', q => q.eq('containerId', args.containerId))
            .collect();

        for (const mapping of keyMappings) {
            await ctx.db.delete(mapping._id);
        }

        await ctx.db.delete(args.containerId);
        return { success: true };
    },
});

export const getContainersForScreenshot = query({
    args: {
        screenshotId: v.id('screenshots'),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org) {
            throw new Error('Workspace not found or access denied');
        }

        const screenshot = await ctx.db.get(args.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found or access denied');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const containers = await ctx.db
            .query('screenshotContainers')
            .withIndex('by_screenshot', q => q.eq('screenshotId', args.screenshotId))
            .collect();

        return containers;
    },
});

export const getScreenshot = query({
    args: {
        screenshotId: v.id('screenshots'),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error('Not authenticated');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org) {
            throw new Error('Workspace not found or access denied');
        }

        const screenshot = await ctx.db.get(args.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found or access denied');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Project not found or access denied');
        }

        const imageUrl = await ctx.storage.getUrl(screenshot.imageFileId);

        return {
            ...screenshot,
            imageUrl,
        };
    },
});
