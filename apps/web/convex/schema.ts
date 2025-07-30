import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Workspaces (personal or team from Clerk)
  workspaces: defineTable({
    clerkId: v.string(), // Clerk user or organization ID
    type: v.union(v.literal("personal"), v.literal("team")), // workspace type
    name: v.string(),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_type", ["type"]),

  // Subscriptions for workspaces
  subscriptions: defineTable({
    workspaceId: v.id("workspaces"),
    planType: v.union(v.literal("free"), v.literal("pro"), v.literal("enterprise")),
    status: v.union(v.literal("active"), v.literal("canceled"), v.literal("expired")),
    stripeSubscriptionId: v.optional(v.string()),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_status", ["status"])
    .index("by_stripe_id", ["stripeSubscriptionId"]),

  // Projects within workspaces
  projects: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_name", ["workspaceId", "name"]),

  // Releases within projects
  releases: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    version: v.string(), // e.g., "1.0.0"
    description: v.optional(v.string()),
    namespaceVersions: v.array(v.object({
      namespaceId: v.id("namespaces"),
      versionId: v.id("namespaceVersions"),
    })), // selected namespace versions for this release
    isPublished: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_version", ["projectId", "version"])
    .index("by_published", ["isPublished"]),

  // Translation namespaces within projects
  namespaces: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_name", ["projectId", "name"]),

  // Namespace versions
  namespaceVersions: defineTable({
    namespaceId: v.id("namespaces"),
    version: v.string(), // e.g., "1.0.0", "1.1.0"
    description: v.optional(v.string()),
    isActive: v.boolean(), // only one active version per namespace
    translationCount: v.number(), // number of translation keys
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_namespace", ["namespaceId"])
    .index("by_namespace_version", ["namespaceId", "version"])
    .index("by_namespace_active", ["namespaceId", "isActive"]),

  // Languages with actual JSON files stored via Convex Storage
  languages: defineTable({
    namespaceVersionId: v.id("namespaceVersions"),
    languageCode: v.string(), // e.g., "en", "es", "fr"
    languageName: v.string(), // e.g., "English", "Spanish", "French"
    fileId: v.id("_storage"), // reference to JSON file in Convex storage
    fileSize: v.number(), // size of JSON file in bytes
    translationCount: v.number(), // number of translations in this language
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_namespace_version", ["namespaceVersionId"])
    .index("by_namespace_version_language", ["namespaceVersionId", "languageCode"])
    .index("by_language_code", ["languageCode"]),

  // API keys for workspace and project access
  apiKeys: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")), // if null, workspace-level key
    name: v.string(), // user-friendly name for the key
    keyHash: v.string(), // hashed API key for security
    prefix: v.string(), // visible prefix (e.g., "uk_live_" or "uk_test_")
    permissions: v.array(v.union(
      v.literal("read"), 
      v.literal("write"),
      v.literal("admin")
    )),
    isActive: v.boolean(),
    lastUsedAt: v.optional(v.number()),
    usageCount: v.number(), // track API key usage
    rateLimit: v.optional(v.object({
      requestsPerMinute: v.number(),
      requestsPerHour: v.number(),
    })),
    expiresAt: v.optional(v.number()), // optional expiration
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_project", ["projectId"])
    .index("by_workspace_project", ["workspaceId", "projectId"])
    .index("by_key_hash", ["keyHash"])
    .index("by_prefix", ["prefix"])
    .index("by_active", ["isActive"]),
});