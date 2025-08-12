import { TranslationNode } from '../types';
import { buildJsonFromNodes } from './buildJsonFromNodes';

// Convert nodes back to JSON structure
export const convertNodesToJson = (nodesToConvert: TranslationNode[]) => {
    const result: any = {};

    // Get all root level nodes (nodes without parents)
    const rootNodes = nodesToConvert.filter(node => !node.parent);

    rootNodes.forEach(rootNode => {
        const key = rootNode.key.split('.').pop() || rootNode.key;
        result[key] = buildJsonFromNodes({
            nodes: nodesToConvert,
            nodeId: rootNode.id,
            action: '',
        });
    });

    return result;
};
