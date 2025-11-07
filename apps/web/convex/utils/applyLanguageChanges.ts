import { IChanges, LanguageContentInterface } from './types';

export const applyLanguageChanges = (content: LanguageContentInterface, changes: IChanges) => {
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

    return updatedContent;
};
