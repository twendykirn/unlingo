import { mutation } from './_generated/server';
import { v } from 'convex/values';

// Migration to initialize usage counters for existing records
// This should be run once after deploying the schema changes
export const initializeUsageCounters = mutation({
    args: {},
    handler: async (ctx, args) => {
        // Initialize project usage counters
        const projects = await ctx.db.query('projects').collect();
        
        for (const project of projects) {
            if (!project.usage) {
                // Count current namespaces for this project
                const namespaces = await ctx.db
                    .query('namespaces')
                    .withIndex('by_project', q => q.eq('projectId', project._id))
                    .collect();

                await ctx.db.patch(project._id, {
                    usage: {
                        namespaces: namespaces.length,
                    },
                });
            }
        }

        // Initialize namespace usage counters
        const namespaces = await ctx.db.query('namespaces').collect();
        
        for (const namespace of namespaces) {
            if (!namespace.usage) {
                // Count current versions for this namespace
                const versions = await ctx.db
                    .query('namespaceVersions')
                    .withIndex('by_namespace', q => q.eq('namespaceId', namespace._id))
                    .collect();

                // Count current languages across all versions for this namespace
                let totalLanguages = 0;
                for (const version of versions) {
                    const languages = await ctx.db
                        .query('languages')
                        .withIndex('by_namespace_version', q => q.eq('namespaceVersionId', version._id))
                        .collect();
                    totalLanguages += languages.length;
                }

                await ctx.db.patch(namespace._id, {
                    usage: {
                        languages: totalLanguages,
                        versions: versions.length,
                    },
                });
            }
        }

        return { 
            message: 'Usage counters initialized successfully',
            projectsUpdated: projects.filter(p => !p.usage).length,
            namespacesUpdated: namespaces.filter(n => !n.usage).length,
        };
    },
});

// Helper function to recalculate and fix any inconsistent usage counters
export const recalculateUsageCounters = mutation({
    args: {},
    handler: async (ctx, args) => {
        let projectsFixed = 0;
        let namespacesFixed = 0;

        // Recalculate project usage counters
        const projects = await ctx.db.query('projects').collect();
        
        for (const project of projects) {
            const namespaces = await ctx.db
                .query('namespaces')
                .withIndex('by_project', q => q.eq('projectId', project._id))
                .collect();

            const actualCount = namespaces.length;
            const currentCount = project.usage?.namespaces ?? 0;

            if (actualCount !== currentCount) {
                await ctx.db.patch(project._id, {
                    usage: {
                        namespaces: actualCount,
                    },
                });
                projectsFixed++;
            }
        }

        // Recalculate namespace usage counters
        const namespaces = await ctx.db.query('namespaces').collect();
        
        for (const namespace of namespaces) {
            const versions = await ctx.db
                .query('namespaceVersions')
                .withIndex('by_namespace', q => q.eq('namespaceId', namespace._id))
                .collect();

            let totalLanguages = 0;
            for (const version of versions) {
                const languages = await ctx.db
                    .query('languages')
                    .withIndex('by_namespace_version', q => q.eq('namespaceVersionId', version._id))
                    .collect();
                totalLanguages += languages.length;
            }

            const actualVersionCount = versions.length;
            const actualLanguageCount = totalLanguages;
            const currentVersionCount = namespace.usage?.versions ?? 0;
            const currentLanguageCount = namespace.usage?.languages ?? 0;

            if (actualVersionCount !== currentVersionCount || actualLanguageCount !== currentLanguageCount) {
                await ctx.db.patch(namespace._id, {
                    usage: {
                        languages: actualLanguageCount,
                        versions: actualVersionCount,
                    },
                });
                namespacesFixed++;
            }
        }

        return {
            message: 'Usage counters recalculated successfully',
            projectsFixed,
            namespacesFixed,
        };
    },
});