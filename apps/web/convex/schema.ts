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
    }).index('by_clerk_id', ['clerkId']),
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
    })
        .index('by_workspace', ['workspaceId'])
        .index('by_workspace_name', ['workspaceId', 'name']),
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
    })
        .index('by_project', ['projectId'])
        .index('by_project_tag', ['projectId', 'tag']),
    namespaces: defineTable({
        projectId: v.id('projects'),
        name: v.string(),
        usage: v.object({
            versions: v.number(),
        }),
    }).index('by_project', ['projectId']),
    namespaceVersions: defineTable({
        namespaceId: v.id('namespaces'),
        version: v.string(), // e.g., "1.0.0", "1.1.0"
        jsonSchemaFileId: v.optional(v.id('_storage')), // reference to JSON schema file in Convex storage (created later)
        jsonSchemaSize: v.optional(v.number()), // size of JSON schema file in bytes
        primaryLanguageId: v.optional(v.id('languages')), // Primary/fallback language ID for faster lookup
        usage: v.object({
            languages: v.number(), // current language count for this version
        }),
    })
        .index('by_namespace', ['namespaceId'])
        .index('by_namespace_version', ['namespaceId', 'version']),
    languages: defineTable({
        namespaceVersionId: v.id('namespaceVersions'),
        languageCode: v.string(), // e.g., "en", "es", "fr"
        fileId: v.optional(v.id('_storage')), // reference to JSON file in Convex storage (created later)
        fileSize: v.optional(v.number()), // size of JSON file in bytes
    })
        .index('by_namespace_version', ['namespaceVersionId'])
        .index('by_namespace_version_language', ['namespaceVersionId', 'languageCode'])
        .index('by_language_code', ['languageCode']),
    apiKeys: defineTable({
        workspaceId: v.id('workspaces'),
        projectId: v.id('projects'),
        name: v.string(), // user-friendly name for the key
        keyHash: v.string(), // hashed API key for security
        prefix: v.string(), // visible prefix (e.g., "uk_live_" or "uk_test_")
    })
        .index('by_workspace', ['workspaceId'])
        .index('by_project', ['projectId'])
        .index('by_workspace_project', ['workspaceId', 'projectId'])
        .index('by_key_hash', ['keyHash']),
    screenshots: defineTable({
        projectId: v.id('projects'),
        name: v.string(), // user-friendly name for the screenshot
        description: v.optional(v.string()),
        imageFileId: v.id('_storage'), // reference to image file in Convex storage
        imageSize: v.number(), // size of image file in bytes
        imageMimeType: v.string(), // MIME type (image/png, image/jpeg, etc.)
        dimensions: v.object({
            width: v.number(), // original image width in pixels
            height: v.number(), // original image height in pixels
        }),
        uploadedAt: v.number(), // timestamp when uploaded
        uploadedBy: v.string(), // Clerk user ID who uploaded it
    })
        .index('by_project', ['projectId'])
        .index('by_project_name', ['projectId', 'name'])
        .index('by_uploaded_at', ['uploadedAt']),
    screenshotContainers: defineTable({
        screenshotId: v.id('screenshots'),
        position: v.object({
            x: v.number(), // X coordinate (percentage of image width)
            y: v.number(), // Y coordinate (percentage of image height)
            width: v.number(), // width of container (percentage of image width)
            height: v.number(), // height of container (percentage of image height)
        }),
        backgroundColor: v.optional(v.string()), // hex color for background (default: blue)
        description: v.optional(v.string()), // optional description for the container
    }).index('by_screenshot', ['screenshotId']),
    screenshotKeyMappings: defineTable({
        containerId: v.id('screenshotContainers'),
        namespaceVersionId: v.id('namespaceVersions'),
        languageId: v.id('languages'),
        translationKey: v.string(), // full dot-notation key path (e.g., "welcome.title")
    })
        .index('by_container', ['containerId'])
        .index('by_container_namespace_language', ['containerId', 'namespaceVersionId', 'languageId']) // main query index
        .index('by_container_language_key', ['containerId', 'languageId', 'translationKey']) // unique constraint index
        .index('by_language_key', ['languageId', 'translationKey']) // for quick key lookups
        .index('by_namespace_key', ['namespaceVersionId', 'translationKey']), // for cross-language key lookups
});
