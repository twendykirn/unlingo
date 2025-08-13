import { TranslationNode } from '../types';

// Convert JSON to graph nodes with proper hierarchy and positioning
export const createNodesFromJson = (obj: any, parentKey = '', parentId?: string): TranslationNode[] => {
    const nodes: TranslationNode[] = [];
    const entries = Object.entries(obj);

    entries.forEach(([key, value]) => {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        const nodeId = `node-${fullKey}`;

        const isArray = Array.isArray(value);
        const isObject = typeof value === 'object' && value !== null && !isArray;

        let nodeType: 'object' | 'string' | 'array' = 'string';
        if (isArray) {
            nodeType = 'array';
        } else if (isObject) {
            nodeType = 'object';
        }

        const node: TranslationNode = {
            id: nodeId,
            key: fullKey,
            value: value,
            type: nodeType,
            parent: parentId,
            children: [],
        };

        nodes.push(node);

        // Handle object children
        if (isObject) {
            const childEntries = Object.entries(value);
            const childNodes = createNodesFromJson(value, fullKey, nodeId);
            nodes.push(...childNodes);

            // Only add direct children to the children array
            const directChildren = childEntries.map(([childKey]) => `node-${fullKey}.${childKey}`);
            node.children = directChildren;
        }

        // Handle array children
        if (isArray && value.length > 0) {
            const arrayChildren: TranslationNode[] = [];

            value.forEach((item: any, index: number) => {
                const arrayItemKey = `${fullKey}[${index}]`;
                const arrayItemId = `node-${arrayItemKey}`;
                const itemIsArray = Array.isArray(item);
                const itemIsObject = typeof item === 'object' && item !== null && !itemIsArray;

                let itemType: 'object' | 'string' | 'array' = 'string';
                if (itemIsArray) {
                    itemType = 'array';
                } else if (itemIsObject) {
                    itemType = 'object';
                }

                const arrayItemNode: TranslationNode = {
                    id: arrayItemId,
                    key: arrayItemKey,
                    value: item,
                    type: itemType,
                    parent: nodeId,
                    children: [],
                };

                nodes.push(arrayItemNode);
                arrayChildren.push(arrayItemNode);

                // Recursively handle nested objects/arrays
                if (itemIsObject) {
                    const itemChildNodes = createNodesFromJson(item, arrayItemKey, arrayItemId);
                    nodes.push(...itemChildNodes);

                    const directChildren = Object.keys(item).map(childKey => `node-${arrayItemKey}.${childKey}`);
                    arrayItemNode.children = directChildren;
                } else if (itemIsArray) {
                    // For nested arrays, create a temporary object to process recursively
                    const tempArrayObj: Record<string, any> = {};
                    item.forEach((nestedItem: any, nestedIndex: number) => {
                        tempArrayObj[nestedIndex.toString()] = nestedItem;
                    });
                    const itemChildNodes = createNodesFromJson(tempArrayObj, arrayItemKey, arrayItemId);
                    nodes.push(...itemChildNodes);

                    arrayItemNode.children = itemChildNodes.map(child => child.id);
                }
            });

            node.children = arrayChildren.map(child => child.id);
        }
    });

    return nodes;
};
