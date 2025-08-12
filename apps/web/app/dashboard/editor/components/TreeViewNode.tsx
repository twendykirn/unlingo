'use client';

import { ChevronRight } from 'lucide-react';
import { TranslationNode } from '../types';
import { isEmptyValue } from '../utils/isEmptyValue';
import { expandedKeys$, selectedNode$ } from '../store';
import { use$ } from '@legendapp/state/react';

interface Props {
    id: string;
    nodeKey: string;
    value: any;
    type: 'object' | 'string' | 'array';
    parent?: string;
    nodeChildren: TranslationNode[];
    level: number;
    toggleExpanded: (id: string, isExpanded: boolean) => void;
}

export default function TreeViewNode({ id, nodeKey, value, type, parent, nodeChildren, level, toggleExpanded }: Props) {
    const isSelected = use$(() => selectedNode$.get()?.id === id);
    const isExpanded = use$(() => expandedKeys$.get().has(id));
    const hasChildren = nodeChildren.length > 0;

    const handleNodeClick = () => {
        toggleExpanded(id, isExpanded);
        selectedNode$.set({
            id,
            key: nodeKey,
            value,
            type,
            parent,
            children: nodeChildren,
        });
    };

    const getDisplayValue = () => {
        if (type === 'object') {
            // Count actual child nodes instead of relying on node.value
            const childCount = nodeChildren.length;
            return `{${childCount} keys}`;
        } else if (type === 'array') {
            const arr = Array.isArray(value) ? value : [];
            return `[${arr.length} items]`;
        }
        return String(value || '');
    };

    // Helper function to get display key (handles array indices)
    const getDisplayKey = () => {
        const keyParts = nodeKey.split('.');
        const lastPart = keyParts[keyParts.length - 1];

        // Check if this is an array item (contains [index])
        if (lastPart?.includes('[') && lastPart?.includes(']')) {
            const match = lastPart.match(/^(.+)\[(\d+)\]$/);
            if (match) {
                return `[${match[2]}]`; // Just show the index like [0], [1], etc.
            }
        }

        return lastPart || nodeKey;
    };

    // Check if this node has empty values for highlighting
    const hasEmptyValue = type === 'string' && isEmptyValue(value);

    return (
        <div key={id} className='select-none' data-node-id={id}>
            <div
                className={`flex items-center py-2 px-3 hover:bg-gray-800 cursor-pointer rounded-md transition-colors ${
                    isSelected ? 'bg-blue-900 border-l-4 border-blue-500' : ''
                } ${hasEmptyValue ? 'border-l-2 border-yellow-500 bg-yellow-900/20' : ''}`}
                style={{ marginLeft: level * 20 }}
                onClick={handleNodeClick}>
                {hasChildren && (
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
                )}
                {!hasChildren && <div className='w-6 mr-2' />}

                <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-2 min-w-0'>
                            <span className='font-medium text-blue-400 truncate'>{getDisplayKey()}</span>
                            <span className='text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded'>{type}</span>
                        </div>
                        <div className='text-sm text-gray-300 truncate ml-2 max-w-48'>{getDisplayValue()}</div>
                    </div>
                </div>
            </div>

            {hasChildren && isExpanded && (
                <div>
                    {nodeChildren.map(childNode => (
                        <TreeViewNode
                            key={childNode.id}
                            level={level + 1}
                            id={childNode.id}
                            nodeKey={childNode.key}
                            value={childNode.value}
                            type={childNode.type}
                            parent={childNode.parent}
                            nodeChildren={childNode.children}
                            toggleExpanded={toggleExpanded}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
