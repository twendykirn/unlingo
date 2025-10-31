import { HistoryItems } from '../app/dashboard/editor/types';
import { LanguageContentInterface } from './jsonFlatten';

export const applyLanguageChanges = (
    content: LanguageContentInterface,
    changes: { [key in 'add' | 'delete' | 'modify']: HistoryItems[] }
) => {
    const updatedContent: LanguageContentInterface = { ...content };

    if (changes.delete.length) {
        changes.delete.forEach(change => {
            delete updatedContent[change.key];
        });
    }

    if (changes.add.length) {
        changes.add.forEach(change => {
            const { key, item } = change;
            updatedContent[key] = item;
        });
    }

    if (changes.modify.length) {
        changes.modify.forEach(change => {
            const { key, item, newValue } = change;
            updatedContent[key] = {
                ...item,
                value: newValue,
            };
        });
    }

    const modifiedItems = changes.modify.map(item => ({ key: item.key, value: item.newValue }));
    const addedItems = changes.add.map(item => ({ key: item.key, value: item.newValue }));

    return {
        updatedContent,
        addedOrModifiedItems: [...modifiedItems, addedItems],
    };
};
