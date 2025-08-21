// Check if a value is empty or contains only empty values
export const isEmptyValue = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (typeof value === 'object' && !Array.isArray(value)) {
        const values = Object.values(value);
        return values.length === 0 || values.some(v => typeof v === 'string' && v.trim() === '');
    }
    if (Array.isArray(value)) {
        return value.length === 0 || value.some(isEmptyValue);
    }
    return false;
};
