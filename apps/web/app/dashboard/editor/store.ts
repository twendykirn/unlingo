import { observable } from '@legendapp/state';
import { TranslationHistoryItem, TranslationNode } from './types';
import { LanguageContentInterface } from './utils/jsonFlatten';

export const nodes$ = observable<TranslationNode[]>([]);
export const expandedKeys$ = observable(new Set());
export const selectedNode$ = observable<TranslationNode | null>(null);
export const hasUnsavedChanges$ = observable(false);
export const filteredNodes$ = observable<TranslationNode[]>([]);
export const searchQuery$ = observable('');
export const originalJsonContent$ = observable('');

export const translationHistory$ = observable<TranslationHistoryItem[]>([]);
export const languageContent$ = observable<LanguageContentInterface>({});
