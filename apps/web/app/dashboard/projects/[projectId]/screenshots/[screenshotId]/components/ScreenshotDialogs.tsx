'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Languages, Search, Check, Edit3, Trash2, FileText } from 'lucide-react';
import { Doc } from '@/convex/_generated/dataModel';
import { useEffect, useState } from 'react';
import { TranslationKey } from '../utils';

interface ScreenshotDialogsProps {
    isKeyDialogOpen: boolean;
    isMappingsDialogOpen: boolean;
    languageKeys: TranslationKey[];
    isLoadingKeys: boolean;
    memoizedMappings: Doc<'screenshotKeyMappings'>[];
    pendingChanges: Map<string, any>;
    containerMappings: any;
    editValue: string;
    editingMapping: Doc<'screenshotKeyMappings'> | null;
    onKeyDialogChange: (open: boolean) => void;
    onMappingsDialogChange: (open: boolean) => void;
    onAssignKey: (key: TranslationKey) => void;
    onSaveValue: (value: string) => void;
    onCancelEdit: () => void;
    onRemoveKeyFromContainer: (args: any) => void;
    setEditValue: (value: string) => void;
    setEditingMapping: (mapping: Doc<'screenshotKeyMappings'>) => void;
}

export default function ScreenshotDialogs({
    isKeyDialogOpen,
    isMappingsDialogOpen,
    languageKeys,
    isLoadingKeys,
    memoizedMappings,
    pendingChanges,
    containerMappings,
    editValue,
    editingMapping,
    onKeyDialogChange,
    onMappingsDialogChange,
    onAssignKey,
    onSaveValue,
    onCancelEdit,
    onRemoveKeyFromContainer,
    setEditValue,
    setEditingMapping,
}: ScreenshotDialogsProps) {
    const [keySearchTerm, setKeySearchTerm] = useState('');
    const [filteredKeys, setFilteredKeys] = useState<TranslationKey[]>([]);

    const getCurrentValue = (mapping: Doc<'screenshotKeyMappings'>) => {
        const changeKey = `${mapping.translationKey}`;
        const pendingChange = pendingChanges.get(changeKey);
        if (pendingChange) return pendingChange.newValue;
        const lk = languageKeys.find(k => k.key === mapping.translationKey);
        return lk?.value ?? '';
    };

    const handleEditMapping = (mapping: Doc<'screenshotKeyMappings'>) => {
        setEditingMapping(mapping);
        const lk = languageKeys.find(k => k.key === mapping.translationKey);
        setEditValue(String(lk?.value ?? ''));
    };

    useEffect(() => {
        const term = keySearchTerm.trim().toLowerCase();
        const list = languageKeys.filter(key => {
            const matchesTerm = term
                ? key.key.toLowerCase().includes(term) || String(key.value).toLowerCase().includes(term)
                : true;
            return matchesTerm;
        });
        setFilteredKeys(list.slice(0, 50));
    }, [languageKeys, keySearchTerm]);

    return (
        <>
            <Dialog open={isKeyDialogOpen} onOpenChange={onKeyDialogChange}>
                <DialogContent className='bg-gray-900 border-gray-800 text-white w-[96vw] sm:w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col'>
                    <DialogHeader className='shrink-0 border-b border-gray-800 pb-2'>
                        <DialogTitle className='flex items-center text-white'>
                            <Languages className='h-5 w-5 mr-2 text-pink-400' />
                            Select Translation Key
                        </DialogTitle>
                    </DialogHeader>
                    <div className='sticky top-0 z-10 bg-gray-900/95 backdrop-blur border-b border-gray-800 py-3'>
                        <div className='relative w-full'>
                            <Search className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
                            <Input
                                placeholder='Search keys...'
                                value={keySearchTerm}
                                onChange={e => setKeySearchTerm(e.target.value)}
                                className='pl-10 bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-400'
                            />
                        </div>
                    </div>

                    <div
                        className='flex-1 pt-3 overflow-y-auto pr-2'
                        style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(75, 85, 99, 0.5) rgba(31, 41, 55, 0.3)',
                        }}>
                        {isLoadingKeys ? (
                            <div className='flex items-center justify-center py-12'>
                                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                            </div>
                        ) : (
                            <>
                                {filteredKeys.map(key => (
                                    <div
                                        key={key.key}
                                        onClick={() => onAssignKey(key)}
                                        className='mb-2 p-4 rounded-xl border cursor-pointer transition-all duration-200 bg-gray-800/30 border-gray-700/30 hover:border-gray-600/50 hover:bg-gray-800/50'>
                                        <div className='flex items-start justify-between gap-3'>
                                            <div className='flex-1 min-w-0'>
                                                <h4 className='font-medium text-white text-sm truncate'>{key.key}</h4>
                                                <p className='text-xs text-gray-400 mt-1 break-words'>
                                                    {String(key.value)}
                                                </p>
                                            </div>
                                            <div
                                                className={`${key.type === 'string' ? 'bg-green-500/10 text-green-400' : key.type === 'number' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'} px-2 py-1 rounded text-xs font-medium shrink-0`}>
                                                {key.type}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {filteredKeys.length === 0 ? (
                                    <div className='text-center py-10 text-gray-400'>
                                        {keySearchTerm ? 'No keys match your search' : 'No primitive keys available'}
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isMappingsDialogOpen} onOpenChange={onMappingsDialogChange}>
                <DialogContent className='bg-gray-900 border-gray-800 text-white w-[96vw] sm:w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col'>
                    <DialogHeader className='shrink-0 border-b border-gray-800 pb-2'>
                        <DialogTitle className='flex items-center text-white'>
                            <FileText className='h-5 w-5 mr-2 text-blue-400' />
                            Assigned Keys
                        </DialogTitle>
                    </DialogHeader>
                    <div
                        className='flex-1 overflow-y-auto pt-3 pr-2'
                        style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(75, 85, 99, 0.5) rgba(31, 41, 55, 0.3)',
                        }}>
                        {memoizedMappings.length > 0 ? (
                            memoizedMappings.map(mapping => {
                                const currentValue = getCurrentValue(mapping);
                                const hasChange = pendingChanges.has(`${mapping.translationKey}`);
                                const isEditing = editingMapping?._id === mapping._id;
                                return (
                                    <div
                                        key={mapping._id}
                                        className={`p-3 mb-2 rounded-lg border ${hasChange ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-gray-800/50 border-gray-700/50'}`}>
                                        {isEditing ? (
                                            <div className='space-y-2'>
                                                <p className='text-sm font-medium text-white'>
                                                    {mapping.translationKey}
                                                </p>
                                                <div className='flex items-center space-x-2'>
                                                    <Input
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        className='flex-1 bg-gray-700 border-gray-600 text-white'
                                                        placeholder='Enter value'
                                                    />
                                                    <Button
                                                        size='sm'
                                                        onClick={() => onSaveValue(editValue)}
                                                        className='bg-green-600 hover:bg-green-700'>
                                                        <Check className='h-3 w-3' />
                                                    </Button>
                                                    <Button size='sm' variant='outline' onClick={onCancelEdit}>
                                                        ×
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className='flex items-center justify-between gap-2'>
                                                <div
                                                    className='min-w-0 flex-1'
                                                    onClick={() => handleEditMapping(mapping)}
                                                    style={{ cursor: 'pointer' }}>
                                                    <p className='text-sm font-medium text-white truncate'>
                                                        {mapping.translationKey}
                                                    </p>
                                                    <div className='flex items-center gap-2'>
                                                        <p
                                                            className={`text-xs ${hasChange ? 'text-yellow-400' : 'text-gray-400'} break-all`}>
                                                            {String(currentValue)}
                                                        </p>
                                                        {hasChange ? (
                                                            <span className='text-xs text-yellow-400 font-medium'>
                                                                • Modified
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className='flex items-center gap-1 shrink-0'>
                                                    <Button
                                                        size='sm'
                                                        variant='ghost'
                                                        onClick={() => handleEditMapping(mapping)}
                                                        className='text-blue-400 hover:text-blue-300 hover:bg-blue-400/10'>
                                                        <Edit3 className='h-3 w-3' />
                                                    </Button>
                                                    <Button
                                                        size='sm'
                                                        variant='destructive'
                                                        onClick={() => {
                                                            onRemoveKeyFromContainer(mapping.translationKey);
                                                        }}>
                                                        <Trash2 className='h-3 w-3' />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className='text-center py-8 text-gray-400'>No keys assigned</div>
                        )}
                        {containerMappings.status === 'CanLoadMore' ? (
                            <div className='mt-4 pt-3 border-t border-gray-800'>
                                <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={() => containerMappings.loadMore(10)}
                                    className='w-full border-gray-600 text-gray-300 hover:bg-gray-800'>
                                    Load More Keys
                                </Button>
                            </div>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
