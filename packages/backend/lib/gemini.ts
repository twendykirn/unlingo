import { GoogleGenAI } from "@google/genai";

export interface GlossaryRule {
  term: string;
  description?: string;
  isNonTranslatable: boolean;
  isForbidden: boolean;
  isCaseSensitive: boolean;
  forcedTranslation?: string;
}

export async function generateTranslation(
  content: any,
  targetLanguage: string,
  glossaryRules: GlossaryRule[],
  rules?: Record<string, string>,
) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  let glossarySection = "";
  if (glossaryRules.length > 0) {
    const rulesList = glossaryRules
      .map((rule) => {
        const sensitivity = rule.isCaseSensitive ? "[Case Sensitive] " : "";

        if (rule.isForbidden) {
          return `- ${sensitivity}FORBIDDEN WORD: "${rule.term}". Do not use this word in the output.`;
        }

        if (rule.isNonTranslatable) {
          return `- ${sensitivity}DO NOT TRANSLATE: "${rule.term}". Keep exactly as is.`;
        }

        if (rule.forcedTranslation) {
          return `- ${sensitivity}MANDATORY TRANSLATION: "${rule.term}" -> "${rule.forcedTranslation}"`;
        }

        if (rule.description) {
          return `- CONTEXT for "${rule.term}": ${rule.description}`;
        }

        return null;
      })
      .filter(Boolean);

    if (rulesList.length > 0) {
      glossarySection = `
GLOSSARY ADHERENCE IS MANDATORY. Follow these specific term rules:
${rulesList.join("\n")}
`;
    }
  }

  let customRulesSection = "";
  if (rules && Object.keys(rules).length > 0) {
    const ruleValues = Object.values(rules);

    customRulesSection = `
ADDITIONAL STYLE & GRAMMAR INSTRUCTIONS:
The following rules must be applied to the translation style:
${ruleValues.map((rule) => `- ${rule}`).join("\n")}
`;
  }

  const prompt = `You are a professional translator. Translate the following content to ${targetLanguage}.
IMPORTANT TECHNICAL RULES:
1. Maintain the exact same JSON structure and data types.
2. Only translate string values that contain actual text content.
3. Do not translate:
   - Object keys
   - Technical terms, API endpoints, URLs
   - Code snippets or variables (e.g., {{name}})
   - Numbers, booleans, or null values
4. For arrays, translate each string element while keeping the array structure.
5. For objects, translate only the string values, not the keys.
6. Return valid JSON only, no explanation, no markdown formatting.
7. Make sure the translated content is natural and fluent in the target language.
${customRulesSection}
${glossarySection}

Content to translate:
${JSON.stringify(content, null, 2)}

Target language: ${targetLanguage}`;

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
  });

  const translatedText = result.text;
  if (!translatedText) {
    throw new Error("Translation service returned empty response");
  }

  try {
    const cleanedText = translatedText.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (e) {
    throw new Error("Translation service returned invalid JSON");
  }
}
