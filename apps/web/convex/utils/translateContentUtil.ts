import { GoogleGenAI } from '@google/genai';
import { IChanges } from './types';

interface Params {
    targetLanguage: string;
    changes: IChanges;
}

export const translateContentUtil = async ({ targetLanguage, changes }: Params) => {
    console.log(`Starting translation for ${targetLanguage}`);
    let content = {};

    const modifiedItems = changes.modify.map(item => ({ key: item.key, value: item.newValue }));
    const addedItems = changes.add.map(item => ({ key: item.key, value: item.newValue }));

    content = {
        add: addedItems,
        modify: modifiedItems,
    };

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
${JSON.stringify(content, null, 2)}

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

        const newChanges = { ...changes };

        translatedValue.add.forEach((translatedItem: { key: string; value: any }) => {
            const originalItem = newChanges.add.find(item => item.key === translatedItem.key);
            if (originalItem) {
                originalItem.newValue = translatedItem.value;
                originalItem.item.value = translatedItem.value;
            }
        });

        translatedValue.modify.forEach((translatedItem: { key: string; value: any }) => {
            const originalItem = newChanges.modify.find(item => item.key === translatedItem.key);
            if (originalItem) {
                originalItem.newValue = translatedItem.value;
            }
        });

        console.log(`Created new changes for ${targetLanguage}`);

        return { newChanges };
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Translation failed');
    }
};
