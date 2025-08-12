import { TranslationNode } from '../types';
import { isEmptyValue } from './isEmptyValue';

// Validate nodes and count empty values
export const validateNodes = (nodesToValidate: TranslationNode[]) => {
    let emptyCount = 0;

    nodesToValidate.forEach(node => {
        if (node.type === 'string' && isEmptyValue(node.value)) {
            emptyCount++;
        }
    });

    return emptyCount === 0;
};
