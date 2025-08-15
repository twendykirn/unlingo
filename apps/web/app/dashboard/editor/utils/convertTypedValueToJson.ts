// Convert typed value to proper JSON based on type
export const convertTypedValueToJson = (
    value: string,
    type: 'string' | 'number' | 'boolean' | 'object' | 'array'
): string => {
    if (!value.trim()) return '""';

    switch (type) {
        case 'string':
            return JSON.stringify(value, null, 2);
        case 'number':
            const num = parseFloat(value);
            return isNaN(num) ? '"0"' : num.toString();
        case 'boolean':
            return value.toLowerCase() === 'true' ? 'true' : 'false';
        case 'object':
            try {
                const parsed = JSON.parse(value);
                // Ensure it's actually an object (not array or null)
                if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                    return JSON.stringify(parsed);
                } else {
                    // If parsed value is not an object, fallback to treating as string
                    return JSON.stringify(value);
                }
            } catch {
                // If it's not valid JSON, treat as string
                return JSON.stringify(value);
            }
        case 'array':
            try {
                const parsed = JSON.parse(value);
                // Ensure it's actually an array
                if (Array.isArray(parsed)) {
                    return JSON.stringify(parsed);
                } else {
                    // If parsed value is not an array, fallback to treating as string
                    return JSON.stringify(value);
                }
            } catch {
                // If it's not valid JSON, treat as string
                return JSON.stringify(value);
            }
        default:
            return JSON.stringify(value, null, 2);
    }
};
