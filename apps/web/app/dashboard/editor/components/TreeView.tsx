'use client';

import { Search } from 'lucide-react';
import TreeViewNode from './TreeViewNode';
import { expandedKeys$, filteredNodes$ } from '../store';
import { use$ } from '@legendapp/state/react';

export default function TreeView() {
    const rootNodes = use$(() => filteredNodes$.get().filter(node => !node.parent));

    const toggleExpanded = (id: string, isExpanded: boolean) => {
        const newExpanded = new Set(expandedKeys$.get());
        if (isExpanded) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        expandedKeys$.set(newExpanded);
    };

    return (
        <div className='p-4'>
            {rootNodes.length > 0 ? (
                rootNodes.map(node => {
                    return (
                        <TreeViewNode
                            key={node.id}
                            id={node.id}
                            nodeKey={node.key}
                            value={node.value}
                            type={node.type}
                            parent={node.parent}
                            nodeChildren={node.children}
                            level={0}
                            toggleExpanded={toggleExpanded}
                        />
                    );
                })
            ) : (
                <div className='text-center py-12'>
                    <Search className='h-12 w-12 text-gray-600 mx-auto mb-4' />
                    <h3 className='text-lg font-medium text-gray-400 mb-2'>No translations found</h3>
                    <p className='text-gray-500'>
                        Load some translation data to get started or adjust your search query
                    </p>
                </div>
            )}
        </div>
    );
}
