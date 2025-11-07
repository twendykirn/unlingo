import { observable } from '@legendapp/state';
import { TranslationHistoryItem } from './types';
import { LanguageContentInterface } from './utils/jsonFlatten';

export const undoTranslationHistory$ = observable<TranslationHistoryItem[]>([]);
export const redoTranslationHistory$ = observable<TranslationHistoryItem[]>([]);
export const languageContent$ = observable<LanguageContentInterface>({});
