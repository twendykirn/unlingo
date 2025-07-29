import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Translation namespaces (e.g., "dashboard", "auth", "common")
  namespaces: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_name_user", ["name", "userId"]),

  // Namespace versions - each version references a JSON file in storage
  namespaceVersions: defineTable({
    namespaceId: v.id("namespaces"),
    version: v.string(), // e.g., "1.0.0", "1.1.0"
    description: v.optional(v.string()),
    isActive: v.boolean(), // only one active version per namespace
    fileId: v.id("_storage"), // Reference to the JSON file in Convex storage
    fileSize: v.number(), // Size of the JSON file in bytes
    translationCount: v.number(), // Number of translation keys in this version
    languages: v.array(v.string()), // Available languages in this version
    createdAt: v.number(),
    userId: v.id("users"),
  })
    .index("by_namespace", ["namespaceId"])
    .index("by_namespace_version", ["namespaceId", "version"])
    .index("by_namespace_active", ["namespaceId", "isActive"]),
});