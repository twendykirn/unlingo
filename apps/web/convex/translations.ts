import { httpAction, query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// HTTP action to fetch translations from JSON file
export const getTranslations = httpAction({
  args: {
    namespace: v.string(),
    version: v.optional(v.string()), // If not provided, gets the active version
    language: v.optional(v.string()), // Optional language filter
  },
  handler: async (ctx, args) => {
    try {
      const result = await ctx.runQuery(internal.translations.fetchTranslations, {
        namespace: args.namespace,
        version: args.version,
        language: args.language,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : "Unknown error" 
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
});

// Internal query to fetch translations from JSON file
export const fetchTranslations = internal({
  args: {
    namespace: v.string(),
    version: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, { namespace, version, language }) => {
    // Find the namespace
    const namespaceDoc = await ctx.db
      .query("namespaces")
      .withIndex("by_name_user")
      .filter((q) => q.eq(q.field("name"), namespace))
      .first();

    if (!namespaceDoc) {
      throw new Error(`Namespace '${namespace}' not found`);
    }

    // Find the specific version or get the active one
    let namespaceVersion;
    if (version) {
      namespaceVersion = await ctx.db
        .query("namespaceVersions")
        .withIndex("by_namespace_version")
        .filter((q) => 
          q.and(
            q.eq(q.field("namespaceId"), namespaceDoc._id),
            q.eq(q.field("version"), version)
          )
        )
        .first();
    } else {
      namespaceVersion = await ctx.db
        .query("namespaceVersions")
        .withIndex("by_namespace_active")
        .filter((q) => 
          q.and(
            q.eq(q.field("namespaceId"), namespaceDoc._id),
            q.eq(q.field("isActive"), true)
          )
        )
        .first();
    }

    if (!namespaceVersion) {
      throw new Error(
        version 
          ? `Version '${version}' not found for namespace '${namespace}'`
          : `No active version found for namespace '${namespace}'`
      );
    }

    // Fetch the JSON file from storage
    const fileBlob = await ctx.storage.get(namespaceVersion.fileId);
    if (!fileBlob) {
      throw new Error("Translation file not found in storage");
    }

    const fileText = await fileBlob.text();
    const translations = JSON.parse(fileText);

    // Filter by language if requested
    let result = translations;
    if (language) {
      result = {};
      for (const [key, value] of Object.entries(translations)) {
        if (typeof value === 'object' && value !== null) {
          const langValue = (value as any)[language];
          if (langValue) {
            result[key] = langValue;
          }
        }
      }
    }

    return {
      namespace: namespace,
      version: namespaceVersion.version,
      isActive: namespaceVersion.isActive,
      translationCount: namespaceVersion.translationCount,
      languages: namespaceVersion.languages,
      fileSize: namespaceVersion.fileSize,
      translations: result,
      metadata: {
        versionDescription: namespaceVersion.description,
        createdAt: namespaceVersion.createdAt,
      },
    };
  },
});

// HTTP action to update translations JSON file
export const updateTranslations = httpAction({
  args: {
    namespace: v.string(),
    version: v.string(),
    translations: v.any(), // JSON object with translations
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const result = await ctx.runMutation(internal.translations.saveTranslations, {
        namespace: args.namespace,
        version: args.version,
        translations: args.translations,
        description: args.description,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : "Unknown error" 
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
});

// Internal mutation to save translations to JSON file
export const saveTranslations = internal({
  args: {
    namespace: v.string(),
    version: v.string(),
    translations: v.any(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { namespace, version, translations, description }) => {
    // Find or create namespace
    let namespaceDoc = await ctx.db
      .query("namespaces")
      .withIndex("by_name_user")
      .filter((q) => q.eq(q.field("name"), namespace))
      .first();

    if (!namespaceDoc) {
      const namespaceId = await ctx.db.insert("namespaces", {
        name: namespace,
        description: `Auto-created namespace for ${namespace}`,
        userId: "", // Should come from auth context
        createdAt: Date.now(),
      });
      namespaceDoc = await ctx.db.get(namespaceId);
    }

    // Convert translations to JSON and store in Convex storage
    const jsonContent = JSON.stringify(translations, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const fileId = await ctx.storage.store(blob);

    // Calculate metadata
    const translationCount = Object.keys(translations).length;
    const languages = new Set<string>();
    
    for (const value of Object.values(translations)) {
      if (typeof value === 'object' && value !== null) {
        Object.keys(value as object).forEach(lang => languages.add(lang));
      }
    }

    // Deactivate current active version
    const currentActive = await ctx.db
      .query("namespaceVersions")
      .withIndex("by_namespace_active")
      .filter((q) => 
        q.and(
          q.eq(q.field("namespaceId"), namespaceDoc!._id),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (currentActive) {
      await ctx.db.patch(currentActive._id, { isActive: false });
    }

    // Create new version
    const versionId = await ctx.db.insert("namespaceVersions", {
      namespaceId: namespaceDoc._id,
      version,
      description,
      isActive: true,
      fileId,
      fileSize: jsonContent.length,
      translationCount,
      languages: Array.from(languages),
      createdAt: Date.now(),
      userId: "", // Should come from auth context
    });

    return {
      versionId,
      namespace,
      version,
      translationCount,
      languages: Array.from(languages),
      fileSize: jsonContent.length,
    };
  },
});

// Get versions list
export const getVersions = httpAction({
  args: {
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const result = await ctx.runQuery(internal.translations.fetchVersions, {
        namespace: args.namespace,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : "Unknown error" 
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
});

export const fetchVersions = internal({
  args: {
    namespace: v.string(),
  },
  handler: async (ctx, { namespace }) => {
    const namespaceDoc = await ctx.db
      .query("namespaces")
      .withIndex("by_name_user")
      .filter((q) => q.eq(q.field("name"), namespace))
      .first();

    if (!namespaceDoc) {
      throw new Error(`Namespace '${namespace}' not found`);
    }

    const versions = await ctx.db
      .query("namespaceVersions")
      .withIndex("by_namespace")
      .filter((q) => q.eq(q.field("namespaceId"), namespaceDoc._id))
      .order("desc")
      .collect();

    return {
      namespace,
      versions: versions.map(v => ({
        version: v.version,
        description: v.description,
        isActive: v.isActive,
        translationCount: v.translationCount,
        languages: v.languages,
        fileSize: v.fileSize,
        createdAt: v.createdAt,
      })),
    };
  },
});

// Query for dashboard to get translation data for graph
export const getTranslationTree = query({
  args: {
    namespace: v.string(),
    version: v.optional(v.string()),
  },
  handler: async (ctx, { namespace, version }) => {
    const result = await ctx.runQuery(internal.translations.fetchTranslations, {
      namespace,
      version,
    });

    return {
      namespace: result.namespace,
      version: result.version,
      translations: result.translations,
      metadata: result.metadata,
    };
  },
});