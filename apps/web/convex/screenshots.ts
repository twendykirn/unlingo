import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';

// Query to get paginated screenshots for a project
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

        // Verify workspace access
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org) {
            throw new Error('Access denied: Workspace not found or access denied');
        }

        // Verify project belongs to workspace
        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied: Project does not belong to workspace');
        }

        const result = await ctx.db
            .query('screenshots')
            .withIndex('by_uploaded_at')
            .order('desc')
            .filter(q => q.eq(q.field('projectId'), args.projectId))
            .paginate(args.paginationOpts);

        // Get image URLs for each screenshot
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

// Mutation to create a new screenshot record after upload
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
            throw new Error('Not authenticated');
        }

        // Verify workspace access
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org) {
            throw new Error('Access denied: Workspace not found or access denied');
        }

        // Verify project belongs to workspace
        const project = await ctx.db.get(args.projectId);
        if (!project || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied: Project does not belong to workspace');
        }

        // Check if screenshot name already exists in project
        const existingScreenshot = await ctx.db
            .query('screenshots')
            .withIndex('by_project_name', q => q.eq('projectId', args.projectId).eq('name', args.name))
            .first();

        if (existingScreenshot) {
            throw new Error('A screenshot with this name already exists in this project');
        }

        const screenshotId = await ctx.db.insert('screenshots', {
            projectId: args.projectId,
            name: args.name,
            description: args.description,
            imageFileId: args.imageFileId,
            imageSize: args.imageSize,
            imageMimeType: args.imageMimeType,
            dimensions: args.dimensions,
            uploadedAt: Date.now(),
            uploadedBy: identity.subject,
        });

        return screenshotId;
    },
});

// Mutation to delete a screenshot and all its key mappings
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

        // Get screenshot to verify access
        const screenshot = await ctx.db.get(args.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found');
        }

        // Verify workspace access through project
        const project = await ctx.db.get(screenshot.projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied');
        }

        // First, get all containers for this screenshot
        const containers = await ctx.db
            .query('screenshotContainers')
            .withIndex('by_screenshot', q => q.eq('screenshotId', args.screenshotId))
            .collect();

        // Delete all key mappings for each container
        for (const container of containers) {
            const keyMappings = await ctx.db
                .query('screenshotKeyMappings')
                .withIndex('by_container', q => q.eq('containerId', container._id))
                .collect();

            for (const mapping of keyMappings) {
                await ctx.db.delete(mapping._id);
            }
        }

        // Delete all containers for this screenshot
        for (const container of containers) {
            await ctx.db.delete(container._id);
        }

        // Delete the image file from storage
        await ctx.storage.delete(screenshot.imageFileId);

        // Delete the screenshot record
        await ctx.db.delete(args.screenshotId);

        return { success: true };
    },
});

// Get mappings for a specific container and language
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

        // Verify container access
        const container = await ctx.db.get(args.containerId);
        if (!container) {
            throw new Error('Container not found');
        }

        const screenshot = await ctx.db.get(container.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied');
        }

        // Get mappings for this container and language
        const mappings = await ctx.db
            .query('screenshotKeyMappings')
            .withIndex('by_container_namespace_language', q =>
                q
                    .eq('containerId', args.containerId)
                    .eq('namespaceVersionId', args.namespaceVersionId)
                    .eq('languageId', args.languageId)
            )
            .paginate(args.paginationOpts);

        return mappings;
    },
});

// Generate upload URL for screenshot
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

// Assign a translation key to a container
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

        // Verify container access
        const container = await ctx.db.get(args.containerId);
        if (!container) {
            throw new Error('Container not found');
        }

        const screenshot = await ctx.db.get(container.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied');
        }

        // Verify language and namespace version exist and are accessible
        const language = await ctx.db.get(args.languageId);
        const namespaceVersion = await ctx.db.get(args.namespaceVersionId);

        if (!language || language.namespaceVersionId !== args.namespaceVersionId) {
            throw new Error('Invalid language selection');
        }

        if (!namespaceVersion) {
            throw new Error('Namespace version not found');
        }

        // Check if mapping already exists for this specific container + language + key combination
        const existingMapping = await ctx.db
            .query('screenshotKeyMappings')
            .withIndex('by_container_language_key', q =>
                q
                    .eq('containerId', args.containerId)
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

// Remove specific key assignment from a container
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

        // Verify container access
        const container = await ctx.db.get(args.containerId);
        if (!container) {
            throw new Error('Container not found');
        }

        const screenshot = await ctx.db.get(container.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied');
        }

        // Find and delete the specific mapping
        const mapping = await ctx.db
            .query('screenshotKeyMappings')
            .withIndex('by_container_language_key', q =>
                q
                    .eq('containerId', args.containerId)
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

// Delete a key mapping
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

        const mapping = await ctx.db.get(args.mappingId);
        if (!mapping) {
            throw new Error('Mapping not found');
        }

        // Verify access through container -> screenshot -> project -> workspace
        const container = await ctx.db.get(mapping.containerId);
        if (!container) {
            throw new Error('Container not found');
        }

        const screenshot = await ctx.db.get(container.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied');
        }

        await ctx.db.delete(args.mappingId);
        return { success: true };
    },
});

// Create a new container on a screenshot
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

        const screenshot = await ctx.db.get(args.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied');
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

// Update container position and appearance
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

        const container = await ctx.db.get(args.containerId);
        if (!container) {
            throw new Error('Container not found');
        }

        // Verify access through screenshot -> project -> workspace
        const screenshot = await ctx.db.get(container.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied');
        }

        const updates: any = {};
        if (args.position) updates.position = args.position;
        if (args.backgroundColor !== undefined) updates.backgroundColor = args.backgroundColor;
        if (args.description !== undefined) updates.description = args.description;

        await ctx.db.patch(args.containerId, updates);
        return { success: true };
    },
});

// Delete a container and all its key mappings
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

        const container = await ctx.db.get(args.containerId);
        if (!container) {
            throw new Error('Container not found');
        }

        // Verify access through screenshot -> project -> workspace
        const screenshot = await ctx.db.get(container.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied');
        }

        // Delete all key mappings for this container first
        const keyMappings = await ctx.db
            .query('screenshotKeyMappings')
            .withIndex('by_container', q => q.eq('containerId', args.containerId))
            .collect();

        for (const mapping of keyMappings) {
            await ctx.db.delete(mapping._id);
        }

        // Delete the container
        await ctx.db.delete(args.containerId);
        return { success: true };
    },
});

// Get containers for a screenshot
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

        // Verify screenshot access
        const screenshot = await ctx.db.get(args.screenshotId);
        if (!screenshot) {
            throw new Error('Screenshot not found');
        }

        const project = await ctx.db.get(screenshot.projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org || project.workspaceId !== args.workspaceId) {
            throw new Error('Access denied');
        }

        const containers = await ctx.db
            .query('screenshotContainers')
            .withIndex('by_screenshot', q => q.eq('screenshotId', args.screenshotId))
            .collect();

        return containers;
    },
});

// Get a single screenshot by ID
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

        // Get screenshot and verify access
        const screenshot = await ctx.db.get(args.screenshotId);
        if (!screenshot) {
            return null;
        }

        // Verify workspace access through project
        const project = await ctx.db.get(screenshot.projectId);
        if (!project) {
            return null;
        }

        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace || workspace.clerkId !== identity.org || project.workspaceId !== args.workspaceId) {
            return null;
        }

        // Get image URL
        const imageUrl = await ctx.storage.getUrl(screenshot.imageFileId);

        return {
            ...screenshot,
            imageUrl,
        };
    },
});

// Note: Position updates are now handled by updateContainer mutation
// Key mappings no longer have positions in the new schema
