import { StructuredChange } from '../types';

// Create structured changes with precise array index tracking using correct json-diff full format
export const createStructuredChanges = (fullDiff: any) => {
    if (!fullDiff) return null;

    const structuredChanges: StructuredChange[] = [];

    // Recursively analyze the json-diff full format
    const analyzeChanges = (diffObj: any, path: string = '') => {
        if (!diffObj) return;

        // Handle arrays in json-diff full format: [ [ " ", 1 ], [ "-", 7 ], [ "+", 2 ], [ " ", 3 ] ]
        if (Array.isArray(diffObj)) {
            // Check if this is a json-diff array format (contains tuples with operation markers)
            const isJsonDiffArray =
                diffObj.length > 0 &&
                Array.isArray(diffObj[0]) &&
                diffObj[0].length === 2 &&
                typeof diffObj[0][0] === 'string' &&
                [' ', '+', '-', '~'].includes(diffObj[0][0]);

            if (isJsonDiffArray) {
                // This is a json-diff format array
                let currentIndex = 0;

                for (const [operation, value] of diffObj) {
                    const itemPath = `${path}[${currentIndex}]`;

                    switch (operation) {
                        case '+':
                            // Item added
                            structuredChanges.push({
                                type: 'add',
                                path: itemPath,
                                newValue: value,
                                arrayIndex: currentIndex,
                                isStructural: true,
                            });
                            currentIndex++;
                            break;

                        case '-':
                            // Item deleted
                            structuredChanges.push({
                                type: 'delete',
                                path: itemPath,
                                oldValue: value,
                                arrayIndex: currentIndex,
                                isStructural: true,
                            });
                            // Don't increment currentIndex for deletions
                            break;

                        case '~':
                            // Item modified
                            if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
                                // Recursively analyze modified object/array
                                analyzeChanges(value, itemPath);
                            } else {
                                structuredChanges.push({
                                    type: 'modify',
                                    path: itemPath,
                                    newValue: value,
                                    arrayIndex: currentIndex,
                                    isStructural: false,
                                });
                            }
                            currentIndex++;
                            break;

                        case ' ':
                            // Item unchanged, just increment index
                            currentIndex++;
                            break;
                    }
                }
            } else {
                // This is a regular array, not json-diff format - shouldn't happen in full mode
                // but handle it just in case
                for (let i = 0; i < diffObj.length; i++) {
                    if (typeof diffObj[i] === 'object') {
                        analyzeChanges(diffObj[i], `${path}[${i}]`);
                    }
                }
            }
        } else if (typeof diffObj === 'object' && diffObj !== null) {
            // Handle objects
            for (const key in diffObj) {
                if (!diffObj.hasOwnProperty(key)) continue;

                const value = diffObj[key];
                let actualKey = key;
                let currentPath = path ? `${path}.${actualKey}` : actualKey;

                // Handle json-diff object key markers
                if (key.endsWith('__deleted')) {
                    // Key was deleted: "a__deleted": [4, 5]
                    actualKey = key.replace('__deleted', '');
                    currentPath = path ? `${path}.${actualKey}` : actualKey;

                    structuredChanges.push({
                        type: 'delete',
                        path: currentPath,
                        oldValue: value,
                        isStructural: true,
                    });
                } else if (key.endsWith('__added')) {
                    // Key was added: "b__added": [4, 5]
                    actualKey = key.replace('__added', '');
                    currentPath = path ? `${path}.${actualKey}` : actualKey;

                    structuredChanges.push({
                        type: 'add',
                        path: currentPath,
                        newValue: value,
                        isStructural: true,
                    });
                } else if (
                    value &&
                    typeof value === 'object' &&
                    value.hasOwnProperty('__old') &&
                    value.hasOwnProperty('__new')
                ) {
                    // Scalar value change: { "a": { "__old": 4, "__new": 5 } }
                    const oldVal = value.__old;
                    const newVal = value.__new;
                    const isStructural =
                        typeof oldVal !== typeof newVal || Array.isArray(oldVal) !== Array.isArray(newVal);

                    structuredChanges.push({
                        type: 'modify',
                        path: currentPath,
                        oldValue: oldVal,
                        newValue: newVal,
                        isStructural,
                    });
                } else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
                    // Nested object or array diff
                    analyzeChanges(value, currentPath);
                }
                // If none of the above, it means the value is unchanged (equal values are left as-is)
            }
        }
    };

    analyzeChanges(fullDiff);

    return {
        fullDiff, // Keep full diff for reference
        structuredChanges,
        hasStructuralChanges: structuredChanges.some(c => c.isStructural),
        summary: {
            totalChanges: structuredChanges.length,
            additions: structuredChanges.filter(c => c.type === 'add').length,
            deletions: structuredChanges.filter(c => c.type === 'delete').length,
            modifications: structuredChanges.filter(c => c.type === 'modify').length,
            structuralChanges: structuredChanges.filter(c => c.isStructural).length,
        },
    };
};
