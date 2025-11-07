export interface TranslationKey {
    key: string;
    value: string | number | boolean;
    type: 'string' | 'number' | 'boolean';
}

export const extractPrimitiveKeys = (obj: any, prefix = ''): TranslationKey[] => {
    const keys: TranslationKey[] = [];

    Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            keys.push({
                key: fullKey,
                value,
                type: typeof value as 'string' | 'number' | 'boolean',
            });
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            keys.push(...extractPrimitiveKeys(value, fullKey));
        }
    });

    return keys;
};
