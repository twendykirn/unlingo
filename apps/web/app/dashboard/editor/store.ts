import { observable } from '@legendapp/state';
import { TranslationNode } from './types';

export const nodes$ = observable<TranslationNode[]>([]);
export const expandedKeys$ = observable(new Set());
export const selectedNode$ = observable<TranslationNode | null>(null);
export const hasUnsavedChanges$ = observable(false);
export const filteredNodes$ = observable<TranslationNode[]>([]);
export const searchQuery$ = observable('');
