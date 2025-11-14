import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    workspaces: defineTable({
        clerkId: v.string(),
        contactEmail: v.string(),
        currentUsage: v.object({
            projects: v.number(),
        }),
        limits: v.object({
            requests: v.number(),
            projects: v.number(),
            namespacesPerProject: v.number(),
            versionsPerNamespace: v.number(),
            languagesPerVersion: v.number(),
        }),
        workspaceUsageId: v.id('workspaceUsage'),
    })
        .index('by_clerk_id', ['clerkId'])
        .index('by_contactEmail', ['contactEmail']),
    workspaceUsage: defineTable({
        month: v.string(), // Format: "YYYY-MM" (e.g., "2024-08")
        requests: v.number(),
    }),
    projects: defineTable({
        workspaceId: v.id('workspaces'),
        name: v.string(),
        description: v.optional(v.string()),
        usage: v.object({
            namespaces: v.number(),
        }),
    }).index('by_workspace_name', ['workspaceId', 'name']),
    releases: defineTable({
        projectId: v.id('projects'),
        name: v.string(),
        tag: v.string(),
        namespaceVersions: v.array(
            v.object({
                namespaceId: v.id('namespaces'),
                versionId: v.id('namespaceVersions'),
            })
        ),
    }).index('by_project_tag', ['projectId', 'tag']),
    namespaces: defineTable({
        projectId: v.id('projects'),
        name: v.string(),
        usage: v.object({
            versions: v.number(),
        }),
    }).index('by_project', ['projectId']),
    namespaceVersions: defineTable({
        namespaceId: v.id('namespaces'),
        version: v.string(),
        jsonSchemaFileId: v.optional(v.string()),
        jsonSchemaSize: v.optional(v.number()),
        primaryLanguageId: v.optional(v.id('languages')),
        usage: v.object({
            languages: v.number(),
        }),
        updatedAt: v.number(),
        status: v.optional(v.union(v.literal('merging'), v.literal('syncing'))),
    }).index('by_namespace_version', ['namespaceId', 'version']),
    languages: defineTable({
        namespaceVersionId: v.id('namespaceVersions'),
        languageCode: v.string(),
        fileId: v.optional(v.string()),
        fileSize: v.optional(v.number()),
        updatedAt: v.number(),
        status: v.optional(v.union(v.literal('merging'), v.literal('syncing'))),
    }).index('by_namespace_version_language', ['namespaceVersionId', 'languageCode']),
    screenshots: defineTable({
        projectId: v.id('projects'),
        name: v.string(),
        description: v.optional(v.string()),
        imageFileId: v.string(),
        imageSize: v.number(), // size of image file in bytes
        imageMimeType: v.string(), // MIME type (image/png, image/jpeg, etc.)
        dimensions: v.object({
            width: v.number(), // original image width in pixels
            height: v.number(), // original image height in pixels
        }),
    }).index('by_project_name', ['projectId', 'name']),
    screenshotContainers: defineTable({
        screenshotId: v.id('screenshots'),
        position: v.object({
            x: v.number(), // X coordinate (percentage of image width)
            y: v.number(), // Y coordinate (percentage of image height)
            width: v.number(), // width of container (percentage of image width)
            height: v.number(), // height of container (percentage of image height)
        }),
        backgroundColor: v.optional(v.string()), // hex color for background (default: blue)
        description: v.optional(v.string()),
    }).index('by_screenshot', ['screenshotId']),
    screenshotKeyMappings: defineTable({
        containerId: v.id('screenshotContainers'),
        namespaceVersionId: v.id('namespaceVersions'),
        languageId: v.id('languages'),
        translationKey: v.string(), // full dot-notation key path (e.g., "welcome.title")
    })
        .index('by_container_version_language_key', [
            'containerId',
            'namespaceVersionId',
            'languageId',
            'translationKey',
        ])
        .index('by_version_language_key', ['namespaceVersionId', 'languageId', 'translationKey']),
});
