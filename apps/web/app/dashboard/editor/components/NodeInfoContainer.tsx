'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TranslationNode } from '../types';
import { Id } from '@/convex/_generated/dataModel';
import { Copy, Plus, Search, Trash2, X } from 'lucide-react';
import { createNodesFromJson } from '../utils/createNodesFromJson';
import { copyToClipboard } from '../utils/copyToClipboard';
import { buildJsonFromNodes } from '../utils/buildJsonFromNodes';
import SelectedNodeEditArea from './SelectedNodeEditArea';
import { use$ } from '@legendapp/state/react';
import { nodes$, selectedNode$ } from '../store';

interface Props {
    isPrimaryLanguage: boolean;
    onDeleteNode: (newNodes: TranslationNode[]) => void;
    onAddParentNode: (nodeId: string) => void;
    primaryLanguageContent: any;
    selectedLanguage: string;
    isPremium: boolean;
    workspaceId?: Id<'workspaces'>;
}

export default function NodeInfoContainer({
    isPrimaryLanguage,
    onDeleteNode,
    onAddParentNode,
    primaryLanguageContent,
    selectedLanguage,
    isPremium,
    workspaceId,
}: Props) {
    const [editKey, setEditKey] = useState('');

    const selectedNode = use$(selectedNode$);

    const keyParts = selectedNode ? selectedNode.key.split('.') : [];
    const parentPath = keyParts.slice(0, -1).join('.');

    const deleteSelectedKey = () => {
        if (!selectedNode) return;
        const nodes = nodes$.get();
        const completeJson: any = {};
        const rootNodes = nodes.filter(node => !node.parent);

        rootNodes.forEach(rootNode => {
            if (rootNode.id !== selectedNode.id) {
                const key = rootNode.key.split('.').pop() || rootNode.key;
                const result = buildJsonFromNodes({
                    nodes,
                    nodeId: rootNode.id,
                    action: 'delete',
                    selectedNodeId: selectedNode.id,
                });
                if (result !== null) {
                    completeJson[key] = result;
                }
            }
        });

        const newNodes = createNodesFromJson(completeJson);
        onDeleteNode(newNodes);
        setEditKey('');
    };

    const handleKeyChange = (newKeyName: string) => {
        if (!selectedNode) return;
        const keyParts = selectedNode.key.split('.');
        keyParts[keyParts.length - 1] = newKeyName.trim();
        const newKey = keyParts.join('.');

        const nodes = nodes$.get();

        const parentPath = keyParts.slice(0, -1).join('.');
        const sameLevelNodes = nodes.filter(n => {
            const nParts = n.key.split('.');
            const nParentPath = nParts.slice(0, -1).join('.');
            return nParentPath === parentPath && n.id !== selectedNode.id;
        });

        if (sameLevelNodes.some(n => n.key === newKey)) {
            alert('A key with this name already exists at this level');
            return;
        }

        const completeJson: any = {};
        const rootNodes = nodes.filter(node => !node.parent);

        rootNodes.forEach(rootNode => {
            let key = rootNode.key.split('.').pop() || rootNode.key;
            if (rootNode.id === selectedNode.id) {
                key = newKeyName.trim();
            }
            completeJson[key] = buildJsonFromNodes({
                nodes,
                nodeId: rootNode.id,
                action: 'rename',
                selectedNodeId: selectedNode.id,
                newKeyName: newKeyName.trim(),
            });
        });

        const newNodes = createNodesFromJson(completeJson);

        const renamedNode = newNodes.find(n => n.key === newKey);
        if (renamedNode) {
            selectedNode$.set(renamedNode);
            setEditKey(newKeyName.trim());
        }

        nodes$.set(newNodes);
    };

    useEffect(() => {
        if (selectedNode) {
            const lastKeyPart = selectedNode.key.split('.').pop() || selectedNode.key;
            if (lastKeyPart.includes('[') && lastKeyPart.includes(']')) {
                setEditKey('');
            } else {
                setEditKey(lastKeyPart);
            }
        }
    }, [selectedNode]);

    return (
        <div className='w-80 bg-gray-950 border-l border-gray-800 flex flex-col'>
            {selectedNode ? (
                <div className='flex flex-col h-full'>
                    <div className='p-6 flex-shrink-0 border-b border-gray-800'>
                        <div className='flex items-center justify-between'>
                            <h3 className='text-lg font-semibold'>Selected Key</h3>
                            <div className='flex items-center space-x-2'>
                                {selectedNode.type === 'object' ? (
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        disabled={!isPrimaryLanguage}
                                        onClick={() => {
                                            if (!isPrimaryLanguage) {
                                                alert(
                                                    'Only the primary language can add translation keys. Non-primary languages can only edit values.'
                                                );
                                                return;
                                            }

                                            onAddParentNode(selectedNode.id);
                                        }}
                                        className={
                                            isPrimaryLanguage
                                                ? 'text-green-400 hover:text-green-300 hover:border-green-400'
                                                : 'text-gray-500 cursor-not-allowed opacity-50'
                                        }
                                        title={
                                            isPrimaryLanguage ? 'Add child key' : 'Only primary language can add keys'
                                        }>
                                        <Plus className='h-4 w-4' />
                                    </Button>
                                ) : null}
                                <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() => {
                                        selectedNode$.set(null);
                                        setEditKey('');
                                    }}
                                    className='text-gray-400 hover:text-white hover:border-gray-400'>
                                    <X className='h-4 w-4' />
                                </Button>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={!isPrimaryLanguage}
                                    onClick={deleteSelectedKey}
                                    className={
                                        isPrimaryLanguage
                                            ? 'text-red-400 hover:text-red-300 hover:border-red-400'
                                            : 'text-gray-500 cursor-not-allowed opacity-50'
                                    }
                                    title={isPrimaryLanguage ? 'Delete key' : 'Only primary language can delete keys'}>
                                    <Trash2 className='h-4 w-4' />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className='flex-1 overflow-y-auto p-6 pt-4'>
                        <div className='space-y-6 flex-1'>
                            <div>
                                <div className='flex items-center justify-between mb-2'>
                                    <label className='text-sm font-medium text-gray-400'>Full Path</label>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => copyToClipboard(selectedNode.key)}
                                        className='text-gray-400 hover:text-white hover:border-gray-400 h-6 w-6 p-0'>
                                        <Copy className='h-3 w-3' />
                                    </Button>
                                </div>
                                <div className='px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm font-mono text-gray-300 break-all'>
                                    {selectedNode.key}
                                </div>
                            </div>
                            {parentPath ? (
                                <div>
                                    <div className='flex items-center justify-between mb-2'>
                                        <label className='text-sm font-medium text-gray-400'>Parents</label>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() => copyToClipboard(parentPath)}
                                            className='text-gray-400 hover:text-white hover:border-gray-400 h-6 w-6 p-0'>
                                            <Copy className='h-3 w-3' />
                                        </Button>
                                    </div>
                                    <div className='px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm font-mono text-gray-300 break-all'>
                                        {parentPath}
                                    </div>
                                </div>
                            ) : null}
                            <div>
                                <div className='flex items-center justify-between mb-2'>
                                    <label className='text-sm font-medium text-gray-400'>Key</label>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => copyToClipboard(editKey)}
                                        className='text-gray-400 hover:text-white hover:border-gray-400 h-6 w-6 p-0'>
                                        <Copy className='h-3 w-3' />
                                    </Button>
                                </div>
                                <input
                                    type='text'
                                    value={editKey}
                                    onChange={e => setEditKey(e.target.value)}
                                    onBlur={() => handleKeyChange(editKey)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleKeyChange(editKey);
                                        }
                                    }}
                                    className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                                    placeholder='Enter key name'
                                />
                            </div>

                            <div>
                                <label className='block text-sm font-medium text-gray-400 mb-2'>Type</label>
                                <div className='px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-300'>
                                    {selectedNode.type}
                                </div>
                            </div>

                            <SelectedNodeEditArea
                                isPrimaryLanguage={isPrimaryLanguage}
                                primaryLanguageContent={primaryLanguageContent}
                                selectedLanguage={selectedLanguage}
                                isPremium={isPremium}
                                workspaceId={workspaceId}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className='p-6 text-center text-gray-500'>
                    <Search className='h-12 w-12 mx-auto mb-4 opacity-50' />
                    <p>Select a key to view its details</p>
                </div>
            )}
        </div>
    );
}
