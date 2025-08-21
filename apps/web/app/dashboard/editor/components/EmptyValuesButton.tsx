'use client';

import { useState } from 'react';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TranslationNode } from '../types';
import { Button } from '@/components/ui/button';

interface Props {
    emptyNodes: TranslationNode[];
    onNavigateToEmptyValue: (nodeId: string) => void;
}

export default function EmptyValuesButton({ emptyNodes, onNavigateToEmptyValue }: Props) {
    const [showEmptyValuesDialog, setShowEmptyValuesDialog] = useState(false);

    const navigateToEmptyValue = (nodeId: string) => {
        setShowEmptyValuesDialog(false);

        onNavigateToEmptyValue(nodeId);

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
            {emptyNodes.length > 0 ? (
                <Button
                    size='sm'
                    onClick={() => setShowEmptyValuesDialog(true)}
                    className='bg-amber-600/20 border border-amber-500/30 hover:bg-amber-600/30 transition-all'>
                    <AlertTriangle className='h-4 w-4 text-amber-400' />
                    <span className='text-sm font-medium text-amber-300'>
                        {emptyNodes.length} Issue{emptyNodes.length !== 1 ? 's' : ''}
                    </span>
                </Button>
            ) : null}
            <Dialog open={showEmptyValuesDialog} onOpenChange={setShowEmptyValuesDialog}>
                <DialogContent className='max-w-lg max-h-[70vh] bg-gray-950/95 border-gray-800/50 overflow-hidden flex flex-col backdrop-blur-md'>
                    <DialogHeader className='flex-shrink-0 pb-4 border-b border-gray-800/50'>
                        <DialogTitle className='flex items-center space-x-3 text-white'>
                            <div className='w-10 h-10 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl flex items-center justify-center border border-amber-500/30'>
                                <AlertTriangle className='h-5 w-5 text-amber-400' />
                            </div>
                            <div>
                                <h3 className='text-lg font-semibold'>Translation Issues</h3>
                                <p className='text-sm text-gray-400 font-normal'>
                                    {emptyNodes.length} empty value{emptyNodes.length !== 1 ? 's' : ''} found
                                </p>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <div className='flex-1 overflow-hidden flex flex-col py-4'>
                        <DialogDescription className='text-sm text-gray-400 mb-4 flex-shrink-0'>
                            Click on any item below to navigate to it and fix the issue.
                        </DialogDescription>

                        <div className='flex flex-1 min-h-0'>
                            <ScrollArea className='flex-1 space-y-1 pr-6 max-w-full'>
                                {emptyNodes.map(node => (
                                    <button
                                        key={node.id}
                                        onClick={() => navigateToEmptyValue(node.id)}
                                        className='w-full text-left p-4 rounded-xl hover:bg-gray-800/50 transition-all group border border-transparent hover:border-gray-700/50 cursor-pointer'>
                                        <div className='flex items-center justify-between w-full'>
                                            <div className='flex-1 min-w-0'>
                                                <div className='text-sm font-medium text-white group-hover:text-amber-300 transition-colors truncate'>
                                                    {node.key}
                                                </div>
                                                <div className='text-xs text-gray-500 mt-1 flex items-center space-x-2'>
                                                    <span className='px-2 py-1 bg-gray-700/50 rounded-md'>
                                                        {node.type}
                                                    </span>
                                                    <span>Empty value</span>
                                                </div>
                                            </div>
                                            <ChevronRight className='h-4 w-4 text-gray-500 group-hover:text-amber-400 flex-shrink-0 ml-3 transition-all' />
                                        </div>
                                    </button>
                                ))}

                                {emptyNodes.length === 0 ? (
                                    <div className='text-center py-8 text-gray-500'>
                                        <AlertTriangle className='h-12 w-12 mx-auto mb-3 text-gray-600' />
                                        <p>No empty values found</p>
                                    </div>
                                ) : null}
                            </ScrollArea>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
