import { convertTypedValueToJson } from './convertTypedValueToJson';

interface Params {
    uiValueType: string;
    uiStringValue: string;
    uiNumberValue: string;
    uiBooleanValue: boolean;
    uiArrayItems: { value: string; type: 'string' | 'number' | 'boolean' | 'object' | 'array' }[];
    uiObjectKeys: { key: string; value: string; type: 'string' | 'number' | 'boolean' | 'object' | 'array' }[];
}

// Convert UI values to JSON string
export const getUIValueAsJSON = ({
    uiValueType,
    uiStringValue,
    uiNumberValue,
    uiBooleanValue,
    uiArrayItems,
    uiObjectKeys,
}: Params) => {
    let value: string | number | boolean | string[];

    try {
        switch (uiValueType) {
            case 'string':
                return JSON.stringify(uiStringValue, null, 2);
            case 'number':
                value = parseFloat(uiNumberValue);
                return isNaN(value) ? '""' : value.toString();
            case 'boolean':
                return uiBooleanValue.toString();
            case 'array':
                value = uiArrayItems
                    .filter(item => item.value.trim() !== '')
                    .map(item => convertTypedValueToJson(item.value, item.type));
                return JSON.stringify(JSON.parse(`[${value.join(', ')}]`), null, 2);
            case 'object':
                value = uiObjectKeys
                    .filter(entry => entry.key.trim() !== '')
                    .map(entry => {
                        const key = JSON.stringify(entry.key, null, 2);
                        const value = convertTypedValueToJson(entry.value, entry.type);
                        return `${key}: ${value}`;
                    });
                return JSON.stringify(JSON.parse(`{${value.join(', ')}}`), null, 2);
            default:
                return '""';
        }
    } catch {
        return '""';
    }
};
