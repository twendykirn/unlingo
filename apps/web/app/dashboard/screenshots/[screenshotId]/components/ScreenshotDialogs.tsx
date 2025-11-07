'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    ModalBody,
    ModalClose,
    ModalContent,
    ModalDescription,
    ModalFooter,
    ModalHeader,
    ModalTitle,
} from '@/components/ui/modal';
import {
    MagnifyingGlassIcon,
    CheckIcon,
    PencilSquareIcon,
    TrashIcon,
    LanguageIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { Doc } from '@/convex/_generated/dataModel';
import { useEffect, useState } from 'react';
import { TranslationKey } from '../utils';
import { Label } from '@/components/ui/field';
import { Loader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';

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
            <ModalContent isOpen={isKeyDialogOpen} onOpenChange={onKeyDialogChange} size='5xl'>
                <ModalHeader>
                    <ModalTitle>
                        <LanguageIcon className='size-5 inline mr-2' />
                        Select Translation Key
                    </ModalTitle>
                    <ModalDescription>Choose a translation key to assign to this container</ModalDescription>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div className='relative'>
                            <MagnifyingGlassIcon className='absolute left-3 top-3 size-4 text-muted-fg' />
                            <Input
                                placeholder='Search keys...'
                                value={keySearchTerm}
                                onChange={e => setKeySearchTerm(e.target.value)}
                                className='pl-10'
                            />
                        </div>

                        <div className='max-h-[60vh] overflow-y-auto space-y-2'>
                            {isLoadingKeys ? (
                                <div className='flex items-center justify-center py-12'>
                                    <Loader isIndeterminate aria-label='Loading keys...' />
                                </div>
                            ) : (
                                <>
                                    {filteredKeys.map(key => (
                                        <div
                                            key={key.key}
                                            onClick={() => onAssignKey(key)}
                                            className='p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors'>
                                            <div className='flex items-start justify-between gap-3'>
                                                <div className='flex-1 min-w-0'>
                                                    <h4 className='font-medium text-sm truncate'>{key.key}</h4>
                                                    <p className='text-xs text-muted-fg mt-1 break-words'>
                                                        {String(key.value)}
                                                    </p>
                                                </div>
                                                <Badge>{key.type}</Badge>
                                            </div>
                                        </div>
                                    ))}

                                    {filteredKeys.length === 0 ? (
                                        <div className='text-center py-10 text-muted-fg'>
                                            {keySearchTerm ? 'No keys match your search' : 'No primitive keys available'}
                                        </div>
                                    ) : null}
                                </>
                            )}
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalClose>Close</ModalClose>
                </ModalFooter>
            </ModalContent>

            <ModalContent isOpen={isMappingsDialogOpen} onOpenChange={onMappingsDialogChange} size='5xl'>
                <ModalHeader>
                    <ModalTitle>
                        <DocumentTextIcon className='size-5 inline mr-2' />
                        Assigned Keys
                    </ModalTitle>
                    <ModalDescription>View and manage translation keys assigned to this container</ModalDescription>
                </ModalHeader>
                <ModalBody>
                    <div className='max-h-[60vh] overflow-y-auto space-y-2'>
                        {memoizedMappings.length > 0 ? (
                            memoizedMappings.map(mapping => {
                                const currentValue = getCurrentValue(mapping);
                                const hasChange = pendingChanges.has(`${mapping.translationKey}`);
                                const isEditing = editingMapping?._id === mapping._id;
                                return (
                                    <div
                                        key={mapping._id}
                                        className={`p-3 rounded-lg border ${hasChange ? 'bg-warning/10 border-warning/30' : ''}`}>
                                        {isEditing ? (
                                            <div className='space-y-2'>
                                                <Label>{mapping.translationKey}</Label>
                                                <div className='flex items-center gap-2'>
                                                    <Input
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        placeholder='Enter value'
                                                        className='flex-1'
                                                    />
                                                    <Button intent='primary' onClick={() => onSaveValue(editValue)}>
                                                        <CheckIcon />
                                                    </Button>
                                                    <Button intent='outline' onClick={onCancelEdit}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className='flex items-center justify-between gap-2'>
                                                <div
                                                    className='min-w-0 flex-1 cursor-pointer'
                                                    onClick={() => handleEditMapping(mapping)}>
                                                    <p className='text-sm font-medium truncate'>
                                                        {mapping.translationKey}
                                                    </p>
                                                    <div className='flex items-center gap-2'>
                                                        <p className='text-xs text-muted-fg break-all'>
                                                            {String(currentValue)}
                                                        </p>
                                                        {hasChange ? (
                                                            <Badge intent='warning'>Modified</Badge>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className='flex items-center gap-1'>
                                                    <Button
                                                        intent='plain'
                                                        onClick={() => handleEditMapping(mapping)}>
                                                        <PencilSquareIcon />
                                                    </Button>
                                                    <Button
                                                        intent='danger'
                                                        onClick={() => {
                                                            onRemoveKeyFromContainer(mapping.translationKey);
                                                        }}>
                                                        <TrashIcon />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className='text-center py-8 text-muted-fg'>No keys assigned</div>
                        )}
                        {containerMappings.status === 'CanLoadMore' ? (
                            <div className='mt-4 pt-3 border-t'>
                                <Button
                                    intent='outline'
                                    onClick={() => containerMappings.loadMore(10)}
                                    className='w-full'>
                                    Load More Keys
                                </Button>
                            </div>
                        ) : null}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalClose>Close</ModalClose>
                </ModalFooter>
            </ModalContent>
        </>
    );
}
