'use client';

import { ChevronRight } from 'lucide-react';
import { isEmptyValue } from '../utils/isEmptyValue';
import { expandedKeys$, filteredNodes$, selectedNode$ } from '../store';
import { use$ } from '@legendapp/state/react';

interface Props {
    id: string;
    level: number;
    toggleExpanded: (id: string, isExpanded: boolean) => void;
}

export default function TreeViewNode({ id, level, toggleExpanded }: Props) {
    const node = use$(() => filteredNodes$.get().find(node => node.id === id));
    const isSelected = use$(() => selectedNode$.get()?.id === id);
    const isExpanded = use$(() => expandedKeys$.get().has(id));
    const hasChildren = (node?.children?.length ?? 0) > 0;

    const handleNodeClick = () => {
        if (!node) return;

        if (!isExpanded) {
            toggleExpanded(id, isExpanded);
        }
        selectedNode$.set(node);
    };

    const getDisplayValue = () => {
        if (node === undefined) return;

        if (node.type === 'object') {
            const childCount = node.children.length;
            return `{${childCount} keys}`;
        } else if (node.type === 'array') {
            const arr = Array.isArray(node.value) ? node.value : [];
            return `[${arr.length} items]`;
        }
        return node.value === false ? 'false' : String(node.value || '');
    };

    const getDisplayKey = () => {
        if (!node) return;
        const keyParts = node.key.split('.');
        const lastPart = keyParts[keyParts.length - 1];

        if (lastPart?.includes('[') && lastPart?.includes(']')) {
            const match = lastPart.match(/^(.+)\[(\d+)\]$/);
            if (match) {
                return `[${match[2]}]`;
            }
        }

        return lastPart || node.key;
    };

    const hasEmptyValue = node ? node.type === 'string' && isEmptyValue(node.value) : false;

    if (!node) return null;

    return (
        <div key={id} className='select-none' data-node-id={id}>
            <div
                className={`flex items-center py-2 px-3 hover:bg-gray-800 cursor-pointer rounded-md transition-colors ${
                    isSelected ? 'bg-blue-900 border-l-4 border-blue-500' : ''
                } ${hasEmptyValue ? 'border-l-2 border-yellow-500 bg-yellow-900/20' : ''}`}
                style={{ marginLeft: level * 20 }}
                onClick={handleNodeClick}>
                {hasChildren ? (
                    <button
                        onClick={e => {
                            e.stopPropagation();
                            toggleExpanded(id, isExpanded);
                        }}
                        className='mr-2 p-1 hover:bg-gray-700 rounded cursor-pointer'>
                        <ChevronRight
                            className={`h-4 w-4 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                        />
                    </button>
                ) : null}
                {!hasChildren ? <div className='w-6 mr-2' /> : null}

                <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-2 min-w-0'>
                            <span className='font-medium text-blue-400 truncate'>{getDisplayKey()}</span>
                            <span className='text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded'>{node.type}</span>
                        </div>
                        <div className='text-sm text-gray-300 truncate ml-2 max-w-48'>{getDisplayValue()}</div>
                    </div>
                </div>
            </div>

            {hasChildren && isExpanded ? (
                <div>
                    {node.children.map(childNode => (
                        <TreeViewNode
                            key={childNode}
                            level={level + 1}
                            id={childNode}
                            toggleExpanded={toggleExpanded}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
