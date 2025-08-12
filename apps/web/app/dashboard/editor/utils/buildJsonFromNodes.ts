import { TranslationNode } from '../types';

interface Params {
    nodes: TranslationNode[];
    nodeId: string;
    action: 'rename' | 'delete' | '';
    selectedNodeId?: string;
    newKeyName?: string;
}

export const buildJsonFromNodes = (params: Params): any => {
    const { nodes, nodeId, action, selectedNodeId, newKeyName } = params;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    if (action === 'delete' && node.id === selectedNodeId) return null; // Skip deleted node

    if (action === 'rename' && node.id === selectedNodeId) {
        // Use the renamed key for the selected node
        return node.value;
    } else if (node.type === 'object') {
        const obj: any = {};
        node.children.forEach(child => {
            // Skip deleted child
            if (action !== 'delete' || (action === 'delete' && child.id !== selectedNodeId)) {
                const childNode = nodes.find(n => n.id === child.id);
                if (childNode) {
                    let key = childNode.key.split('.').pop() || childNode.key;
                    if (action === 'rename' && childNode.id === selectedNodeId && newKeyName) {
                        key = newKeyName.trim();
                    }
                    obj[key] = buildJsonFromNodes({ ...params, nodeId: child.id });
                }
            }
        });
        return obj;
    } else if (node.type === 'array') {
        const arr: any[] = [];
        // Sort children by index to maintain array order
        const sortedChildren = node.children
            .map(child => {
                if (action === 'delete' && child.id === selectedNodeId) return null; // Skip deleted child
                const childNode = nodes.find(n => n.id === child.id);
                if (!childNode) return null;
                const key = childNode.key;
                const match = key.match(/\[(\d+)\]$/);
                const index = match ? parseInt(match[1] ?? '0') : 0;
                return { childId: child.id, index, node: childNode };
            })
            .filter(item => item !== null)
            .sort((a, b) => a!.index - b!.index);

        sortedChildren.forEach(item => {
            if (item) {
                arr[item.index] = buildJsonFromNodes({ ...params, nodeId: item.childId });
            }
        });
        return arr;
    } else {
        return node.value;
    }
};
