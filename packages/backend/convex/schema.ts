import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  workspaces: defineTable({
    clerkId: v.string(),
    contactEmail: v.string(),
    currentUsage: v.object({
      translationKeys: v.number(),
    }),
    limits: v.object({
      requests: v.number(),
      translationKeys: v.number(),
    }),
    workspaceUsageId: v.id("workspaceUsage"),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_contactEmail", ["contactEmail"]),
  workspaceUsage: defineTable({
    month: v.string(), // Format: "YYYY-MM" (e.g., "2024-08")
    requests: v.number(),
  }),
  projects: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    primaryLanguageId: v.optional(v.id("languages")),
    currentUsage: v.object({
      translationKeys: v.number(),
    }),
    status: v.union(
      v.literal(1), // Active
      v.literal(-1), // Deleting
      v.literal(2), // Processing
    ),
  })
    .index("by_workspace_name", ["workspaceId", "name"])
    .index("by_workspace_status", ["workspaceId", "status"]),
  languages: defineTable({
    projectId: v.id("projects"),
    languageCode: v.string(),
    status: v.union(
      v.literal(1), // Active
      v.literal(-1), // Deleting
      v.literal(2), // Processing
    ),
    rules: v.optional(v.record(v.string(), v.string())),
  })
    .index("by_project_language", ["projectId", "languageCode"])
    .index("by_project_status", ["projectId", "status"]),
  namespaces: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    currentUsage: v.object({
      translationKeys: v.number(),
    }),
    status: v.union(
      v.literal(1), // Active
      v.literal(-1), // Deleting
      v.literal(2), // Processing
    ),
  })
    .index("by_project_name", ["projectId", "name"])
    .index("by_project_status", ["projectId", "status"])
    .searchIndex("search", {
      searchField: "name",
      filterFields: ["projectId"],
    }),
  translationKeys: defineTable({
    projectId: v.id("projects"),
    namespaceId: v.id("namespaces"),
    key: v.string(),
    values: v.record(v.id("languages"), v.string()),
    statuses: v.optional(
      v.record(
        v.id("languages"),
        v.union(
          v.literal(1), // Active
          v.literal(-1), // Deleting
          v.literal(2), // Processing
        ),
      ),
    ),
    status: v.union(
      v.literal(1), // Active
      v.literal(-1), // Deleting
      v.literal(2), // Processing
    ),
  })
    .index("by_project_namespace_key", ["projectId", "namespaceId", "key"])
    .searchIndex("search", {
      searchField: "key",
      filterFields: ["projectId", "namespaceId"],
    }),
  translationValues: defineTable({
    projectId: v.id("projects"),
    namespaceId: v.id("namespaces"),
    languageId: v.id("languages"),
    translationKeyId: v.id("translationKeys"),
    key: v.string(),
    values: v.string(),
  })
    .index("by_project_language", ["projectId", "languageId"])
    .index("by_project_namespace_language_key", ["projectId", "namespaceId", "languageId", "translationKeyId"]),
  builds: defineTable({
    projectId: v.id("projects"),
    namespace: v.string(),
    tag: v.string(),
    languageFiles: v.record(
      v.string(),
      v.object({
        fileId: v.string(),
        fileSize: v.number(),
      }),
    ),
    status: v.union(
      v.literal(1), // Active
      v.literal(-1), // Deleting
      v.literal(2), // Building
    ),
    statusDescription: v.optional(v.string()),
  })
    .searchIndex("search", {
      searchField: "tag",
      filterFields: ["projectId"],
    })
    .index("by_project_tag", ["projectId", "tag"]),
  releases: defineTable({
    projectId: v.id("projects"),
    tag: v.string(),
    builds: v.array(
      v.object({
        buildId: v.id("builds"),
        selectionChance: v.number(), // 0-100%, for A/B testing
      }),
    ),
  })
    .index("by_project_tag", ["projectId", "tag"])
    .searchIndex("search", {
      searchField: "tag",
      filterFields: ["projectId"],
    }),
  screenshots: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    imageFileId: v.string(),
    imageSize: v.number(), // size of image file in bytes
    imageMimeType: v.string(), // MIME type (image/png, image/jpeg, etc.)
    dimensions: v.object({
      width: v.number(), // original image width in pixels
      height: v.number(), // original image height in pixels
    }),
  }).index("by_project_name", ["projectId", "name"]),
  screenshotContainers: defineTable({
    screenshotId: v.id("screenshots"),
    position: v.object({
      x: v.number(), // X coordinate (percentage of image width)
      y: v.number(), // Y coordinate (percentage of image height)
      width: v.number(), // width of container (percentage of image width)
      height: v.number(), // height of container (percentage of image height)
    }),
    backgroundColor: v.optional(v.string()), // hex color for background (default: blue)
  }).index("by_screenshot", ["screenshotId"]),
  screenshotKeyMappings: defineTable({
    containerId: v.id("screenshotContainers"),
    namespaceId: v.id("namespaces"),
    translationKeyId: v.id("translationKeys"),
  })
    .index("by_container_namespace_translation_key", ["containerId", "namespaceId", "translationKeyId"])
    .index("by_container_translation_key", ["containerId", "translationKeyId"])
    .index("by_namespace_translation_key", ["namespaceId", "translationKeyId"]),
  glossaryTerms: defineTable({
    projectId: v.id("projects"),
    term: v.string(),
    description: v.optional(v.string()),
    isNonTranslatable: v.boolean(),
    isCaseSensitive: v.boolean(),
    isForbidden: v.boolean(),
    translations: v.record(v.id("languages"), v.string()),
  })
    .index("by_project_term", ["projectId", "term"])
    .searchIndex("search_term", {
      searchField: "term",
      filterFields: ["projectId"],
    }),
});
