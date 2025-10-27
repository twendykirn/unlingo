import { LanguageItem } from './utils/jsonFlatten';

export interface TranslationNode {
    id: string;
    key: string;
    value: any;
    type: 'object' | 'string' | 'array' | 'number' | 'boolean';
    parent?: string;
    children: string[];
}

export interface StructuredChange {
    type: 'add' | 'delete' | 'modify';
    path: string; // JSON path like "items[2].title"
    oldValue?: any;
    newValue?: any;
    arrayIndex?: number; // Exact array index for array operations
    isStructural: boolean; // Whether this affects structure vs just values
}

export interface TranslationHistoryItem {
    key: string;
    item: LanguageItem;
    newValue?: any;
    action: 'add' | 'delete' | 'modify';
}
