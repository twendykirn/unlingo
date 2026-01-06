import { GoogleGenAI } from "@google/genai";

export interface DetectedTextRegion {
  text: string;
  boundingBox: {
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    width: number; // percentage 0-100
    height: number; // percentage 0-100
  };
}

export async function detectTextInScreenshot(
  imageUrl: string,
  imageDimensions: { width: number; height: number },
): Promise<DetectedTextRegion[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const prompt = `You are an expert UI text extraction assistant. Analyze this screenshot and extract all UI text elements that would need to be translated in an internationalization (i18n) context.

IMAGE DIMENSIONS: ${imageDimensions.width}px wide × ${imageDimensions.height}px tall

IMPORTANT GUIDELINES:
1. ONLY extract static UI text - buttons, labels, menu items, headings, navigation items, form labels, tooltips, error messages, etc.
2. DO NOT extract:
   - User-generated content (usernames, comments, posts, messages)
   - Dynamic/generated content (timestamps, dates, numbers, IDs)
   - Code snippets or technical identifiers
   - URLs or email addresses
   - Company/product names that should remain unchanged
3. Handle variables intelligently:
   - If you see text like "Hello John" or "Welcome User123", extract the template form "Hello {{name}}" or "Welcome {{username}}"
   - If you see "3 items selected", extract "{{count}} items selected"
   - Common patterns: "X minutes ago" -> "{{time}} ago", "$19.99" -> "{{price}}"
4. COORDINATE ACCURACY IS CRITICAL:
   - The image is ${imageDimensions.width}px wide and ${imageDimensions.height}px tall
   - Return coordinates as PERCENTAGES (0-100) of these dimensions
   - x: horizontal position from LEFT edge as percentage (0 = left, 100 = right)
   - y: vertical position from TOP edge as percentage (0 = top, 100 = bottom)
   - width/height: size of text bounding box as percentage of image dimensions
   - The x,y coordinates should represent the TOP-LEFT corner of the text bounding box
   - Be PRECISE with coordinates - carefully measure where text appears on screen
   - Ensure ALL detected text falls WITHIN the image bounds (x + width <= 100, y + height <= 100)

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {
    "text": "Button Label",
    "boundingBox": {
      "x": 10.5,
      "y": 20.3,
      "width": 15.2,
      "height": 3.5
    }
  }
]

If no UI text is found, return an empty array: []`;

  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString("base64");
  const mimeType = imageResponse.headers.get("content-type") || "image/png";

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
          { text: prompt },
        ],
      },
    ],
  });

  const responseText = result.text;
  if (!responseText) {
    return [];
  }

  try {
    const cleanedText = responseText.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleanedText);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item: unknown): item is DetectedTextRegion => {
      if (typeof item !== "object" || item === null) return false;
      const obj = item as Record<string, unknown>;
      return (
        typeof obj.text === "string" &&
        typeof obj.boundingBox === "object" &&
        obj.boundingBox !== null &&
        typeof (obj.boundingBox as Record<string, unknown>).x === "number" &&
        typeof (obj.boundingBox as Record<string, unknown>).y === "number" &&
        typeof (obj.boundingBox as Record<string, unknown>).width === "number" &&
        typeof (obj.boundingBox as Record<string, unknown>).height === "number"
      );
    });
  } catch (e) {
    console.error("Failed to parse AI text detection response:", e);
    return [];
  }
}

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
