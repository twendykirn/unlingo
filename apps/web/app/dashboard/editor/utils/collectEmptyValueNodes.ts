import { TranslationNode } from '../types';
import { isEmptyValue } from './isEmptyValue';

// Collect all empty value nodes
export const collectEmptyValueNodes = (nodes: TranslationNode[]) => {
    const emptyNodes: TranslationNode[] = [];

    nodes.forEach(node => {
        if (node.type === 'string' && isEmptyValue(node.value)) {
            emptyNodes.push(node);
        }
    });

    return emptyNodes.sort((a, b) => a.key.localeCompare(b.key));
};
