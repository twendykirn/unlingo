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
            languagesPerNamespace: v.number(), // max languages per namespace
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
        version: v.string(), // e.g., "1.0.0"
        namespaceVersions: v.array(
            v.object({
                namespaceId: v.id('namespaces'),
                versionId: v.id('namespaceVersions'),
            })
        ), // selected namespace versions for this release
    })
        .index('by_project', ['projectId'])
        .index('by_project_version', ['projectId', 'version']),

    // Translation namespaces within projects
    namespaces: defineTable({
        projectId: v.id('projects'),
        name: v.string(),
        primaryLanguageId: v.optional(v.id('languages')), // Primary/fallback language ID for faster lookup
        // Usage tracking
        usage: v.optional(
            v.object({
                languages: v.number(), // current language count across all versions
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
});
