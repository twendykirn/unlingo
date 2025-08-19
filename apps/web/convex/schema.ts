import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    // Workspaces (organization only)
    workspaces: defineTable({
        clerkId: v.string(), // Clerk organization ID
        contactEmail: v.string(), // Contact email for billing
        // Usage tracking and limits
        currentUsage: v.object({
            requests: v.number(), // current translation requests
            projects: v.number(), // current project count
        }),
        limits: v.object({
            requests: v.number(), // max translation requests
            projects: v.number(), // max projects
            namespacesPerProject: v.number(), // max namespaces per project
            versionsPerNamespace: v.number(), // max versions per namespace
            languagesPerVersion: v.number(), // max languages per version
        }),
    }).index('by_clerk_id', ['clerkId']),
    // Projects within workspaces
    projects: defineTable({
        workspaceId: v.id('workspaces'),
        name: v.string(),
        description: v.optional(v.string()),
        // Usage tracking
        usage: v.optional(
            v.object({
                namespaces: v.number(), // current namespace count
            })
        ),
    })
        .index('by_workspace', ['workspaceId'])
        .index('by_workspace_name', ['workspaceId', 'name']),

    // Releases within projects
    releases: defineTable({
        projectId: v.id('projects'),
        name: v.string(),
        tag: v.string(), // e.g., "1.0.0"
        namespaceVersions: v.array(
            v.object({
                namespaceId: v.id('namespaces'),
                versionId: v.id('namespaceVersions'),
            })
        ), // selected namespace versions for this release
    })
        .index('by_project', ['projectId'])
        .index('by_project_tag', ['projectId', 'tag']),

    // Translation namespaces within projects
    namespaces: defineTable({
        projectId: v.id('projects'),
        name: v.string(),
        // Usage tracking
        usage: v.optional(
            v.object({
                versions: v.number(), // current version count
            })
        ),
    }).index('by_project', ['projectId']),

    // Namespace versions
    namespaceVersions: defineTable({
        namespaceId: v.id('namespaces'),
        version: v.string(), // e.g., "1.0.0", "1.1.0"
        jsonSchemaFileId: v.optional(v.id('_storage')), // reference to JSON schema file in Convex storage (created later)
        jsonSchemaSize: v.optional(v.number()), // size of JSON schema file in bytes
        schemaUpdatedAt: v.optional(v.number()), // timestamp of last schema update
        primaryLanguageId: v.optional(v.id('languages')), // Primary/fallback language ID for faster lookup
        // Usage tracking
        usage: v.optional(
            v.object({
                languages: v.number(), // current language count for this version
            })
        ),
    })
        .index('by_namespace', ['namespaceId'])
        .index('by_namespace_version', ['namespaceId', 'version']),

    // Languages with actual JSON files stored via Convex Storage
    languages: defineTable({
        namespaceVersionId: v.id('namespaceVersions'),
        languageCode: v.string(), // e.g., "en", "es", "fr"
        fileId: v.optional(v.id('_storage')), // reference to JSON file in Convex storage (created later)
        fileSize: v.optional(v.number()), // size of JSON file in bytes
    })
        .index('by_namespace_version', ['namespaceVersionId'])
        .index('by_namespace_version_language', ['namespaceVersionId', 'languageCode'])
        .index('by_language_code', ['languageCode']),

    // API keys for workspace and project access
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
        .index('by_key_hash', ['keyHash'])
        .index('by_prefix', ['prefix']),

    // Screenshots for visual translation editor
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

    // Containers on screenshots (created in edit mode, independent of translations)
    screenshotContainers: defineTable({
        screenshotId: v.id('screenshots'),
        position: v.object({
            x: v.number(), // X coordinate (percentage of image width)
            y: v.number(), // Y coordinate (percentage of image height)
            width: v.number(), // width of container (percentage of image width)
            height: v.number(), // height of container (percentage of image height)
        }),
        // Visual customization and metadata
        backgroundColor: v.optional(v.string()), // hex color for background (default: blue)
        description: v.optional(v.string()), // optional description for the container
        createdAt: v.number(), // when this container was created
        updatedAt: v.number(), // when this container was last modified
        createdBy: v.string(), // Clerk user ID who created this container
    })
        .index('by_screenshot', ['screenshotId'])
        .index('by_created_at', ['createdAt']),

    // Key-position mappings for screenshots (assigns translation keys to containers)
    screenshotKeyMappings: defineTable({
        containerId: v.id('screenshotContainers'), // references the container
        namespaceVersionId: v.id('namespaceVersions'),
        languageId: v.id('languages'),
        translationKey: v.string(), // full dot-notation key path (e.g., "welcome.title")
        valueType: v.union(v.literal('string'), v.literal('number'), v.literal('boolean')), // only simple types allowed
        currentValue: v.union(v.string(), v.number(), v.boolean(), v.null()), // cached current value for quick display
        createdAt: v.number(), // when this mapping was created
        updatedAt: v.number(), // when this mapping was last modified
        createdBy: v.string(), // Clerk user ID who created this mapping
    })
        .index('by_container', ['containerId'])
        .index('by_container_namespace_language', ['containerId', 'namespaceVersionId', 'languageId']) // main query index
        .index('by_container_language_key', ['containerId', 'languageId', 'translationKey']) // unique constraint index
        .index('by_language_key', ['languageId', 'translationKey']) // for quick key lookups
        .index('by_namespace_key', ['namespaceVersionId', 'translationKey']) // for cross-language key lookups
        .index('by_created_at', ['createdAt']),
});
