import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { authMiddleware } from "../middlewares/auth";

export const getAllTerms = query({
  args: {
    projectId: v.id("projects"),
    workspaceId: v.id("workspaces"),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    if (args.search) {
      return await ctx.db
        .query("glossaryTerms")
        .withSearchIndex("search_term", (q) => q.search("term", args.search!).eq("projectId", args.projectId))
        .paginate(args.paginationOpts);
    }

    return await ctx.db
      .query("glossaryTerms")
      .withIndex("by_project_term", (q) => q.eq("projectId", args.projectId))
      .paginate(args.paginationOpts);
  },
});

export const createTerm = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    term: v.string(),
    description: v.optional(v.string()),
    isNonTranslatable: v.boolean(),
    isCaseSensitive: v.boolean(),
    isForbidden: v.boolean(),
    translations: v.record(v.id("languages"), v.string()),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const existing = await ctx.db
      .query("glossaryTerms")
      .withIndex("by_project_term", (q) => q.eq("projectId", args.projectId).eq("term", args.term))
      .first();

    if (existing) {
      throw new ConvexError("This term already exists in the project.");
    }

    let finalTranslations = args.translations;

    if (args.isNonTranslatable) {
      finalTranslations = {};
    } else {
      finalTranslations = args.translations;
    }

    const termId = await ctx.db.insert("glossaryTerms", {
      projectId: args.projectId,
      term: args.term,
      description: args.description,
      isNonTranslatable: args.isNonTranslatable,
      isCaseSensitive: args.isCaseSensitive,
      isForbidden: args.isForbidden,
      translations: finalTranslations,
    });

    return termId;
  },
});

export const updateTerm = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    termId: v.id("glossaryTerms"),
    term: v.optional(v.string()),
    description: v.optional(v.string()),
    isNonTranslatable: v.optional(v.boolean()),
    isCaseSensitive: v.optional(v.boolean()),
    isForbidden: v.optional(v.boolean()),
    translations: v.optional(v.record(v.id("languages"), v.string())),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const project = await ctx.db.get(args.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    const existingTerm = await ctx.db.get(args.termId);
    if (!existingTerm) {
      throw new ConvexError("Term not found");
    }

    const updates: any = {};

    if (args.term && args.term !== existingTerm.term) {
      const duplicate = await ctx.db
        .query("glossaryTerms")
        .withIndex("by_project_term", (q) => q.eq("projectId", existingTerm.projectId).eq("term", args.term!))
        .first();

      if (duplicate && duplicate._id !== args.termId) {
        throw new ConvexError("Another entry with this term already exists.");
      }

      updates.term = args.term;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    if (args.isCaseSensitive !== undefined) {
      updates.isCaseSensitive = args.isCaseSensitive;
    }

    if (args.isForbidden !== undefined) {
      updates.isForbidden = args.isForbidden;
    }

    const newIsNonTranslatable = args.isNonTranslatable ?? existingTerm.isNonTranslatable;

    updates.isNonTranslatable = newIsNonTranslatable;

    if (newIsNonTranslatable) {
      updates.translations = {};
    } else if (args.translations !== undefined) {
      updates.translations = args.translations;
    }

    await ctx.db.patch(args.termId, updates);
  },
});

export const deleteTerm = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    termId: v.id("glossaryTerms"),
  },
  handler: async (ctx, args) => {
    await authMiddleware(ctx, args.workspaceId);

    const term = await ctx.db.get(args.termId);
    if (!term) {
      throw new Error("Term not found");
    }

    const project = await ctx.db.get(term.projectId);
    if (!project || project.workspaceId !== args.workspaceId) {
      throw new Error("Project not found or access denied");
    }

    await ctx.db.delete(term._id);

    return term._id;
  },
});

export const getGlossaryContext = internalQuery({
  args: {
    projectId: v.id("projects"),
    languageId: v.id("languages"),
  },
  handler: async (ctx, args) => {
    const language = await ctx.db.get(args.languageId);

    if (!language) {
      throw new Error("Language not found");
    }

    const targetLanguageId = language._id;

    const terms = await ctx.db
      .query("glossaryTerms")
      .withIndex("by_project_term", (q) => q.eq("projectId", args.projectId))
      .collect();

    return terms.map((t) => ({
      term: t.term,
      description: t.description,
      isNonTranslatable: t.isNonTranslatable,
      isForbidden: t.isForbidden,
      isCaseSensitive: t.isCaseSensitive,
      forcedTranslation: targetLanguageId ? t.translations[targetLanguageId] : undefined,
    }));
  },
});
