import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const resolveTranslationFile = internalQuery({
  args: {
    projectId: v.id("projects"),
    releaseTag: v.string(),
    namespaceName: v.string(),
    languageCode: v.string(),
  },
  handler: async (ctx, args) => {
    const release = await ctx.db
      .query("releases")
      .withIndex("by_project_tag", (q) => q.eq("projectId", args.projectId).eq("tag", args.releaseTag))
      .first();

    if (!release) {
      return { error: "release_not_found" };
    }

    const buildPromises = release.builds.map(async (item) => {
      const doc = await ctx.db.get(item.buildId);
      return {
        ...item,
        doc,
      };
    });

    const allBuilds = await Promise.all(buildPromises);

    const candidates = allBuilds.filter((b) => b.doc && b.doc.status === 1 && b.doc.namespace === args.namespaceName);

    if (candidates.length === 0) {
      return { error: "namespace_not_found" };
    }

    let selectedBuild = candidates[0].doc!;

    if (candidates.length > 1) {
      const rnd = Math.random() * 100;
      let currentSum = 0;

      for (const candidate of candidates) {
        currentSum += candidate.selectionChance;
        if (rnd <= currentSum) {
          selectedBuild = candidate.doc!;
          break;
        }
      }
    }

    const fileInfo = selectedBuild.languageFiles[args.languageCode];

    if (!fileInfo) {
      return { error: "language_not_found" };
    }

    return { fileId: fileInfo.fileId };
  },
});
