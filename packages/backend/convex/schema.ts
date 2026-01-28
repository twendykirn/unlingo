import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Polar-related validators
const vRecurringInterval = v.union(
  v.literal("day"),
  v.literal("week"),
  v.literal("month"),
  v.literal("year"),
  v.null(),
);

const vPolarPrice = v.object({
  id: v.string(),
  createdAt: v.string(),
  modifiedAt: v.union(v.string(), v.null()),
  amountType: v.optional(v.string()),
  isArchived: v.boolean(),
  productId: v.string(),
  priceCurrency: v.optional(v.string()),
  priceAmount: v.optional(v.number()),
  type: v.optional(v.string()),
  recurringInterval: v.optional(vRecurringInterval),
  maximumAmount: v.optional(v.union(v.number(), v.null())),
  minimumAmount: v.optional(v.union(v.number(), v.null())),
  presetAmount: v.optional(v.union(v.number(), v.null())),
});

const vPolarMedia = v.object({
  id: v.string(),
  organizationId: v.string(),
  name: v.string(),
  path: v.string(),
  mimeType: v.string(),
  size: v.number(),
  storageVersion: v.union(v.string(), v.null()),
  checksumEtag: v.union(v.string(), v.null()),
  checksumSha256Base64: v.union(v.string(), v.null()),
  checksumSha256Hex: v.union(v.string(), v.null()),
  createdAt: v.string(),
  lastModifiedAt: v.union(v.string(), v.null()),
  version: v.union(v.string(), v.null()),
  service: v.optional(v.string()),
  isUploaded: v.boolean(),
  sizeReadable: v.string(),
  publicUrl: v.string(),
});

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
    .index("by_project_namespace_language_key", ["projectId", "namespaceId", "languageId", "translationKeyId"])
    .searchIndex("search_values", {
      searchField: "values",
      filterFields: ["projectId"],
    }),
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
  })
    .index("by_project_tag", ["projectId", "tag"])
    .searchIndex("search", {
      searchField: "tag",
      filterFields: ["projectId"],
    }),
  releaseBuildConnections: defineTable({
    releaseId: v.id("releases"),
    buildId: v.id("builds"),
    selectionChance: v.number(), // 0-100%, for A/B testing
  })
    .index("by_build", ["buildId"])
    .index("by_release_build", ["releaseId", "buildId"]),
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
    status: v.union(
      v.literal(1), // active
      v.literal(-1), // deleting
      v.literal(2), // processing
      v.literal(3), // text-detection-in-progress
    ),
  }).index("by_project_name", ["projectId", "name"]),
  screenshotContainers: defineTable({
    screenshotId: v.id("screenshots"),
    translationKeyId: v.id("translationKeys"), // Each container is assigned exactly one translation key
    position: v.object({
      x: v.number(), // X coordinate (percentage of image width)
      y: v.number(), // Y coordinate (percentage of image height)
      width: v.number(), // width of container (percentage of image width)
      height: v.number(), // height of container (percentage of image height)
    }),
  })
    .index("by_screenshot", ["screenshotId"])
    .index("by_translation_key", ["translationKeyId"]),
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
  polarCustomers: defineTable({
    polarId: v.string(), // Polar's customer ID
    workspaceId: v.id("workspaces"), // Links to workspace (used as externalId in Polar)
    email: v.string(),
    metadata: v.optional(v.record(v.string(), v.any())),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_polar_id", ["polarId"]),
  polarProducts: defineTable({
    polarId: v.string(), // Polar's product ID
    organizationId: v.string(),
    name: v.string(),
    description: v.union(v.string(), v.null()),
    isRecurring: v.boolean(),
    isArchived: v.boolean(),
    createdAt: v.string(),
    modifiedAt: v.union(v.string(), v.null()),
    recurringInterval: v.optional(vRecurringInterval),
    metadata: v.optional(v.record(v.string(), v.any())),
    prices: v.array(vPolarPrice),
    medias: v.array(vPolarMedia),
  })
    .index("by_polar_id", ["polarId"])
    .index("by_is_archived", ["isArchived"]),
  polarSubscriptions: defineTable({
    polarId: v.string(), // Polar's subscription ID
    customerId: v.id("polarCustomers"), // Reference to our polarCustomers table
    polarCustomerId: v.string(), // Polar's customer ID for webhook lookup
    productId: v.string(), // Polar's product ID
    checkoutId: v.union(v.string(), v.null()),
    createdAt: v.string(),
    modifiedAt: v.union(v.string(), v.null()),
    amount: v.union(v.number(), v.null()),
    currency: v.union(v.string(), v.null()),
    recurringInterval: vRecurringInterval,
    status: v.string(),
    currentPeriodStart: v.string(),
    currentPeriodEnd: v.union(v.string(), v.null()),
    cancelAtPeriodEnd: v.boolean(),
    startedAt: v.union(v.string(), v.null()),
    endedAt: v.union(v.string(), v.null()),
    metadata: v.record(v.string(), v.any()),
    customerCancellationReason: v.optional(v.union(v.string(), v.null())),
    customerCancellationComment: v.optional(v.union(v.string(), v.null())),
  })
    .index("by_polar_id", ["polarId"])
    .index("by_customer", ["customerId"])
    .index("by_polar_customer_id", ["polarCustomerId"])
    .index("by_customer_status", ["customerId", "status"])
    .index("by_customer_ended_at", ["customerId", "endedAt"]),
});
