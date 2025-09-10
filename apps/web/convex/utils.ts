// Parse JSON path with array indices (e.g., "items[2].title" -> ["items", 2, "title"])
export function parseJSONPath(path: string): Array<string | number> {
    if (!path) return [];

    const parts: Array<string | number> = [];
    const regex = /\[(\d+)\]|\.?([^.\[]+)/g;
    let match;

    while ((match = regex.exec(path)) !== null) {
        if (match[1] !== undefined) {
            // Array index
            parts.push(parseInt(match[1], 10));
        } else if (match[2] !== undefined) {
            // Object key
            parts.push(match[2]);
        }
    }

    return parts;
}

// Set value at JSON path with precise array index handling
export function setValueAtJSONPath(obj: any, pathParts: Array<string | number>, value: any, arrayIndex?: number): any {
    if (pathParts.length === 0) return value;

    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    const [currentKey, ...remainingPath] = pathParts;

    if (remainingPath.length === 0) {
        // We're at the target location
        if (typeof currentKey === 'number') {
            // Array index operation
            const arr = Array.isArray(result) ? result : [];

            // For array operations, use the arrayIndex if provided (for precise positioning)
            // otherwise use currentKey (from path)
            const targetIndex = arrayIndex !== undefined ? arrayIndex : currentKey;

            // Insert at specific index (for additions) or set at index (for modifications)
            if (arrayIndex !== undefined) {
                // This is an addition - insert at specific position
                arr.splice(targetIndex, 0, value);
            } else {
                // This is a modification - set at existing index
                arr[targetIndex] = value;
            }
            return arr;
        } else {
            // Object property
            result[currentKey] = value;
        }
    } else {
        // Recurse deeper
        const nextValue = result[currentKey] || (typeof remainingPath[0] === 'number' ? [] : {});
        result[currentKey] = setValueAtJSONPath(nextValue, remainingPath, value, arrayIndex);
    }

    return result;
}

// Delete value at JSON path with precise array index handling
export function deleteValueAtJSONPath(obj: any, pathParts: Array<string | number>, arrayIndex?: number): any {
    if (pathParts.length === 0) return obj;

    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    const [currentKey, ...remainingPath] = pathParts;

    if (remainingPath.length === 0) {
        // We're at the target location to delete
        if (typeof currentKey === 'number' && Array.isArray(result)) {
            // Array index deletion - always use arrayIndex for precise positioning
            // The currentKey from path might not match the actual deletion index
            const indexToDelete = arrayIndex !== undefined ? arrayIndex : currentKey;
            if (indexToDelete >= 0 && indexToDelete < result.length) {
                result.splice(indexToDelete, 1);
            }
        } else {
            // Object property deletion
            delete result[currentKey];
        }
    } else {
        // Recurse deeper
        if (result[currentKey] !== undefined) {
            result[currentKey] = deleteValueAtJSONPath(result[currentKey], remainingPath, arrayIndex);
        }
    }

    return result;
}

// Apply a single structured change to the content
export function applyStructuredChange(content: any, change: any): any {
    const pathParts = parseJSONPath(change.path);

    if (change.type === 'add' || change.type === 'modify') {
        return setValueAtJSONPath(content, pathParts, change.newValue, change.arrayIndex);
    } else if (change.type === 'delete') {
        return deleteValueAtJSONPath(content, pathParts, change.arrayIndex);
    }

    return content;
}

// Helper function to apply structured changes to JSON content with precise array indexing
export function applyJsonDiffToContent(originalContent: any, structuredChangesData: any): any {
    if (!structuredChangesData || !structuredChangesData.structuredChanges) {
        return originalContent;
    }

    let result = JSON.parse(JSON.stringify(originalContent));
    const changes = structuredChangesData.structuredChanges;

    for (const change of changes) {
        result = applyStructuredChange(result, change);
    }

    return result;
}

// Helper function to parse JSON path into parts
export function parsePath(path: string): Array<string | number> {
    if (!path) return [];

    const parts: Array<string | number> = [];
    const regex = /\[(\d+)\]|\.?([^.\[]+)/g;
    let match;

    while ((match = regex.exec(path)) !== null) {
        if (match[1] !== undefined) {
            // Array index
            parts.push(parseInt(match[1], 10));
        } else if (match[2] !== undefined) {
            // Object key
            parts.push(match[2]);
        }
    }

    return parts;
}

// Helper function to set value at path
export function setValueAtPath(obj: any, pathParts: Array<string | number>, value: any): void {
    let current = obj;

    for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];

        if (!(part in current)) {
            // Create intermediate objects/arrays as needed
            const nextPart = pathParts[i + 1];
            current[part] = typeof nextPart === 'number' ? [] : {};
        }

        current = current[part];
    }

    if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        current[lastPart] = value;
    }
}

// Helper function to delete value at path
export function deleteValueAtPath(obj: any, pathParts: Array<string | number>): void {
    if (pathParts.length === 0) return;

    let current = obj;

    for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];

        if (!(part in current)) {
            return; // Path doesn't exist
        }

        current = current[part];
    }

    const lastPart = pathParts[pathParts.length - 1];

    if (Array.isArray(current) && typeof lastPart === 'number') {
        current.splice(lastPart, 1);
    } else if (typeof current === 'object' && current !== null) {
        delete current[lastPart];
    }
}

// Helper function to apply structural operations while preserving existing values
export function applyStructuralOperations(existingContent: any, operations: any[]): any {
    let result = JSON.parse(JSON.stringify(existingContent)); // Deep clone

    for (const operation of operations) {
        if (operation.type === 'add') {
            // For add operations, use the primary language value
            const pathParts = parsePath(operation.path);
            setValueAtPath(result, pathParts, operation.newValue);
        } else if (operation.type === 'delete') {
            // For delete operations, remove from existing content
            const pathParts = parsePath(operation.path);
            deleteValueAtPath(result, pathParts);
        }
        // For modify operations on structural changes (type changes),
        // we use the primary language structure
        else if (operation.type === 'modify' && operation.parentType !== 'root') {
            const pathParts = parsePath(operation.path);
            // Only apply if it's a structural change (type change)
            const oldType = Array.isArray(operation.oldValue) ? 'array' : typeof operation.oldValue;
            const newType = Array.isArray(operation.newValue) ? 'array' : typeof operation.newValue;

            if (oldType !== newType) {
                setValueAtPath(result, pathParts, operation.newValue);
            }
            // For same-type modifications, preserve the existing value
        }
    }

    return result;
}

// Helper function to get current month string
export function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
