import { action, internalQuery } from './_generated/server';
import { v } from 'convex/values';
import { GoogleGenAI } from '@google/genai';
import { internal } from './_generated/api';

export const getTranslationContext = internalQuery({
    args: {
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error('Not authenticated');
        }

        if (!identity.org) {
            throw new Error('No organization selected');
        }

        // Verify workspace access and premium status
        const workspace = await ctx.db.get(args.workspaceId);
        if (!workspace) {
            throw new Error('Workspace not found');
        }

        if (workspace.clerkId !== identity.org) {
            throw new Error('Access denied: Workspace does not belong to organization');
        }

        const { polar } = await import('./polar');
        const currentSubscription = await polar.getCurrentSubscription(ctx, {
            userId: workspace._id,
        });

        const isPremium =
            currentSubscription &&
            currentSubscription.status === 'active' &&
            !currentSubscription.customerCancellationReason;

        if (!isPremium) {
            throw new Error('Premium subscription required for AI translation');
        }

        return {
            success: true,
        };
    },
});

export const translateContent = action({
    args: {
        primaryValue: v.any(),
        targetLanguage: v.string(),
        workspaceId: v.id('workspaces'),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error('Not authenticated');
        }

        if (!identity.org) {
            throw new Error('No organization selected');
        }

        const { success } = await ctx.runQuery(internal.translation.getTranslationContext, {
            workspaceId: args.workspaceId,
        });

        if (!success) {
            throw new Error('Premium subscription required for AI translation');
        }

        // Validate inputs
        if (!args.primaryValue) {
            throw new Error('Primary value is required');
        }

        if (!args.targetLanguage) {
            throw new Error('Target language is required');
        }

        // Check if we have Gemini API key
        const geminiApiKey = process.env.GEMINI_API_KEY!;
        if (!geminiApiKey) {
            throw new Error('Translation service not configured');
        }

        try {
            // Initialize Google GenAI
            const ai = new GoogleGenAI({ apiKey: geminiApiKey });

            // Prepare the translation prompt
            const prompt = `You are a professional translator. Translate the following content to ${args.targetLanguage}. 
        
IMPORTANT RULES:
1. Maintain the exact same JSON structure and data types
2. Only translate string values that contain actual text content
3. Do not translate:
   - Object keys
   - Technical terms, API endpoints, URLs
   - Code snippets or variables
   - Numbers, booleans, or null values
4. For arrays, translate each string element while keeping the array structure
5. For objects, translate only the string values, not the keys
6. Return valid JSON only, no explanation

Content to translate:
${JSON.stringify(args.primaryValue, null, 2)}

Target language: ${args.targetLanguage}`;

            // Generate content
            const result = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });
            const translatedText = result.text;

            if (!translatedText) {
                throw new Error('Translation service returned empty response');
            }

            // Try to parse the translated text as JSON
            let translatedValue;
            try {
                // Clean up the response in case it has markdown code blocks
                const cleanedText = translatedText.replace(/```json\n?|\n?```/g, '').trim();
                translatedValue = JSON.parse(cleanedText);
            } catch {
                throw new Error('Translation service returned invalid JSON');
            }

            return { translatedValue };
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Translation failed');
        }
    },
});
