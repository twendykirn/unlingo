import { GoogleGenAI } from '@google/genai';

interface Params {
    targetLanguage: string;
    json: any;
}

export const translateNewContentUtil = async ({ targetLanguage, json }: Params) => {
    console.log(`Starting translation for ${targetLanguage}`);

    const geminiApiKey = process.env.GEMINI_API_KEY!;
    if (!geminiApiKey) {
        throw new Error('Translation service not configured');
    }

    try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const prompt = `You are a professional translator. Translate the following content to ${targetLanguage}.
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
7. Make sure the translated content is natural and fluent in the target language

Content to translate:
${JSON.stringify(json, null, 2)}

Target language: ${targetLanguage}`;

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const translatedText = result.text;

        if (!translatedText) {
            throw new Error('Translation service returned empty response');
        }

        console.log(`Received translation for ${targetLanguage}`);

        let translatedValue;
        try {
            const cleanedText = translatedText.replace(/```json\n?|\n?```/g, '').trim();
            translatedValue = JSON.parse(cleanedText);
        } catch {
            throw new Error('Translation service returned invalid JSON');
        }

        return translatedValue;
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Translation failed');
    }
};
