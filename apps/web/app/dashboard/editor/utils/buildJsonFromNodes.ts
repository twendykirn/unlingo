import { TranslationNode } from '../types';

interface Params {
    nodes: TranslationNode[];
    nodeId: string;
    action: 'delete' | '';
    selectedNodeId?: string;
}

export const buildJsonFromNodes = (params: Params): any => {
    const { nodes, nodeId, action, selectedNodeId } = params;
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    if (action === 'delete' && node.id === selectedNodeId) return null; // Skip deleted node

    if (node.type === 'object') {
        const obj: any = {};
        node.children.forEach(childId => {
            // Skip deleted child
            if (action !== 'delete' || (action === 'delete' && childId !== selectedNodeId)) {
                const childNode = nodes.find(n => n.id === childId);
                if (childNode) {
                    let key = childNode.key.split('.').pop() || childNode.key;
                    obj[key] = buildJsonFromNodes({ ...params, nodeId: childId });
                }
            }
        });
        return obj;
    } else if (node.type === 'array') {
        const arr: any[] = [];
        // Sort children by index to maintain array order
        const sortedChildren = node.children
            .map(childId => {
                if (action === 'delete' && childId === selectedNodeId) return null; // Skip deleted child
                const childNode = nodes.find(n => n.id === childId);
                if (!childNode) return null;
                const key = childNode.key;
                const match = key.match(/\[(\d+)\]$/);
                const index = match ? parseInt(match[1] ?? '0') : 0;
                return { childId, index, node: childNode };
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
