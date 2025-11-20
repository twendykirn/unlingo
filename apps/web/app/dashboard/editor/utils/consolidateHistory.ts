import { HistoryItems, TranslationHistoryItem } from "../types";

export const consolidateHistory = (history: TranslationHistoryItem[]): { [key in 'add' | 'delete' | 'modify']: HistoryItems[] } => {
    const latestChanges = new Map<string, { action: 'add' | 'delete' | 'modify'; item: HistoryItems }>();

    history.forEach((historyEntry) => {
        const { action, items } = historyEntry;
        items.forEach((item) => {
            latestChanges.set(item.key, { action, item });
        });
    });

    const groupedByAction: { [key in 'add' | 'delete' | 'modify']: HistoryItems[] } = {
        add: [],
        modify: [],
        delete: [],
    };

    latestChanges.forEach(({ action, item }) => {
        groupedByAction[action].push(item);
    });

    return groupedByAction;
};