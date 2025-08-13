// Convert typed value to proper JSON based on type
export const convertTypedValueToJson = (
    value: string,
    type: 'string' | 'number' | 'boolean' | 'object' | 'array'
): string => {
    if (!value.trim()) return '""';

    let num: null | number = null;

    switch (type) {
        case 'string':
            return JSON.stringify(value, null, 2);
        case 'number':
            num = parseFloat(value);
            return isNaN(num) ? '"0"' : num.toString();
        case 'boolean':
            return value.toLowerCase() === 'true' ? 'true' : 'false';
        case 'object':
        case 'array':
            try {
                JSON.parse(value);
                return value;
            } catch {
                return JSON.stringify(value, null, 2);
            }
        default:
            return JSON.stringify(value, null, 2);
    }
};
