'use client';

import { useState } from 'react';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TranslationNode } from '../types';

interface Props {
    emptyNodes: TranslationNode[];
    onNavigateToEmptyValue: (nodeId: string) => void;
}

export default function EmptyValuesButton({ emptyNodes, onNavigateToEmptyValue }: Props) {
    const [showEmptyValuesDialog, setShowEmptyValuesDialog] = useState(false);

    // Navigate to and select an empty value node
    const navigateToEmptyValue = (nodeId: string) => {
        setShowEmptyValuesDialog(false);

        onNavigateToEmptyValue(nodeId);

        // Scroll to the node
        setTimeout(() => {
            const element = document.querySelector(`[data-node-id="${nodeId}"]`);
            if (element) {
                element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest',
                });
            }
        }, 100);
    };

    if (!emptyNodes.length) return null;

    return (
        <>
            {emptyNodes.length > 0 && (
                <button
                    onClick={() => setShowEmptyValuesDialog(true)}
                    className='flex items-center space-x-2 px-3 py-1 bg-yellow-900/50 border border-yellow-500/50 rounded-md hover:bg-yellow-900/70 transition-colors cursor-pointer'>
                    <AlertTriangle className='h-4 w-4 text-yellow-500' />
                    <span className='text-sm text-yellow-400'>
                        {emptyNodes.length} empty value{emptyNodes.length !== 1 ? 's' : ''}
                    </span>
                </button>
            )}
            <Dialog open={showEmptyValuesDialog} onOpenChange={setShowEmptyValuesDialog}>
                <DialogContent className='max-w-md max-h-[70vh] bg-gray-900 border-gray-700 overflow-hidden flex flex-col'>
                    <DialogHeader className='flex-shrink-0'>
                        <DialogTitle className='flex items-center space-x-2 text-white'>
                            <AlertTriangle className='h-5 w-5 text-yellow-500' />
                            <span>Empty Values ({emptyNodes.length})</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className='flex-1 overflow-hidden flex flex-col mt-4'>
                        <DialogDescription className='text-sm text-gray-400 mb-4 flex-shrink-0'>
                            Click on any item below to navigate to it in the editor.
                        </DialogDescription>

                        <div className='flex flex-1 min-h-0'>
                            <ScrollArea className='flex-1 space-y-1 pr-6 max-w-full'>
                                {emptyNodes.map(node => (
                                    <button
                                        key={node.id}
                                        onClick={() => navigateToEmptyValue(node.id)}
                                        className='w-full text-left p-3 rounded-lg hover:bg-gray-800 transition-colors group border border-transparent hover:border-gray-600 cursor-pointer'>
                                        <div className='flex items-center justify-between w-full'>
                                            <div className='flex-1 min-w-0'>
                                                <div className='text-sm font-medium text-white group-hover:text-blue-400 transition-colors truncate text-ellipsis w-[370px]'>
                                                    {node.key}
                                                </div>
                                                <div className='text-xs text-gray-500 mt-1'>
                                                    {node.type} • Empty value
                                                </div>
                                            </div>
                                            <ChevronRight className='h-4 w-4 text-gray-500 group-hover:text-blue-400 flex-shrink-0 ml-2' />
                                        </div>
                                    </button>
                                ))}

                                {emptyNodes.length === 0 && (
                                    <div className='text-center py-8 text-gray-500'>
                                        <AlertTriangle className='h-12 w-12 mx-auto mb-3 text-gray-600' />
                                        <p>No empty values found</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
