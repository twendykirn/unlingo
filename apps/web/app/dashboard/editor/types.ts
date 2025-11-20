import { LanguageItem } from './utils/jsonFlatten';

export interface HistoryItems {
    key: string;
    item: LanguageItem;
    newValue?: any;
}

export interface TranslationHistoryItem {
    items: HistoryItems[];
    action: 'add' | 'delete' | 'modify';
}
