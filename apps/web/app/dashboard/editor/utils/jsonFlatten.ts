export interface LanguageItem {
    key: string;
    value: any;
    primaryValue: any;
}

export interface LanguageContentInterface {
    [key: string]: LanguageItem;
}

/**
 * Flattens a JSON object into a single-level object with dot-separated keys.
 * It skips any key-value pair where a key in the path is an empty string.
 *
 * @param json The JSON object to flatten.
 * @returns An object with flattened key-value pairs.
 */
export function flattenJson(json: any): LanguageContentInterface {
    const flattened: LanguageContentInterface = {};

    /**
     * Recursively traverses the JSON object to flatten it.
     * @param obj The current object or value to process.
     * @param path The current path of keys.
     */
    function traverse(obj: any, path: string[] = []) {
        // Handle arrays by iterating over their indices
        if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                // Array indices are never empty strings, so no check is needed here.
                traverse(item, path.concat(index.toString()));
            });
            return;
        }

        // Handle objects
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                // If the key is an empty string, skip this entire branch.
                if (key === '') {
                    continue;
                }

                const newPath = path.concat(key);
                const value = obj[key];

                if (typeof value !== 'object' || value === null) {
                    flattened[newPath.join('.')] = {
                        key: newPath.join('.'),
                        value,
                        primaryValue: null,
                    };
                } else {
                    // Recurse into the nested object
                    traverse(value, newPath);
                }
            }
        }
    }

    traverse(json);
    return flattened;
}

/**
 * Rebuilds a nested JSON object from a flattened object with dot-separated keys.
 * It ignores any flattened key that contains an empty string segment (e.g., "a..b").
 * This version is robust and compatible with strict TypeScript compiler options.
 *
 * @param flattenedObject An object with flattened key-value pairs.
 * @returns The reconstructed JSON object.
 */
export function unflattenJson(flattenedObject: LanguageContentInterface): any {
    const result: any = {};

    for (const flatKey in flattenedObject) {
        if (Object.prototype.hasOwnProperty.call(flattenedObject, flatKey)) {
            const keys = flatKey.split('.');

            // If any segment of the key path is an empty string, skip this entry.
            if (keys.some(key => key === '')) {
                continue;
            }

            let currentLevel = result;

            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];

                // This check satisfies strict TypeScript rules (like noUncheckedIndexedAccess).
                if (key === undefined) {
                    continue;
                }

                const isLastKey = i === keys.length - 1;

                if (isLastKey) {
                    if (!flattenedObject[flatKey]) {
                        continue;
                    }

                    currentLevel[key] = flattenedObject[flatKey].value;
                } else {
                    const nextKey = keys[i + 1];
                    const useArray = nextKey !== undefined && /^\d+$/.test(nextKey);

                    if (currentLevel[key] === undefined || currentLevel[key] === null) {
                        currentLevel[key] = useArray ? [] : {};
                    }

                    currentLevel = currentLevel[key];
                }
            }
        }
    }

    return result;
}
