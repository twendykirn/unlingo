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
import { CheckIcon, PencilSquareIcon, TrashIcon, LanguageIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Doc } from '@/convex/_generated/dataModel';
import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/field';
import { Loader } from '@/components/ui/loader';
import { Badge } from '@/components/ui/badge';
import { TranslationHistoryItem } from '@/app/dashboard/editor/types';
import { LanguageContentInterface, LanguageItem } from '@/app/dashboard/editor/utils/jsonFlatten';
import { SearchField, SearchInput } from '@/components/ui/search-field';
import { ChoiceBox, ChoiceBoxDescription, ChoiceBoxItem, ChoiceBoxLabel } from '@/components/ui/choice-box';

interface ScreenshotDialogsProps {
    isKeyDialogOpen: boolean;
    isMappingsDialogOpen: boolean;
    languageKeys: LanguageContentInterface;
    isLoadingKeys: boolean;
    memoizedMappings: Doc<'screenshotKeyMappings'>[];
    pendingChanges: TranslationHistoryItem[];
    containerMappings: any;
    editValue: string;
    editingMapping: Doc<'screenshotKeyMappings'> | null;
    onKeyDialogChange: (open: boolean) => void;
    onMappingsDialogChange: (open: boolean) => void;
    onAssignKey: (key: LanguageItem) => void;
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
    const [filteredKeys, setFilteredKeys] = useState<LanguageItem[]>([]);

    const getCurrentValue = (mapping: Doc<'screenshotKeyMappings'>) => {
        const pendingChange = pendingChanges.find(c => c.items.some(item => item.key === mapping.translationKey));
        if (pendingChange) return pendingChange.items[0]?.newValue;
        const lk = languageKeys[mapping.translationKey];
        return lk?.value ?? '';
    };

    const handleEditMapping = (mapping: Doc<'screenshotKeyMappings'>) => {
        setEditingMapping(mapping);
        const lk = languageKeys[mapping.translationKey];
        setEditValue(String(lk?.value ?? ''));
    };

    useEffect(() => {
        const term = keySearchTerm.trim().toLowerCase();
        const list = Object.values(languageKeys).filter(key => {
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
                        <SearchField value={keySearchTerm} onChange={setKeySearchTerm} aria-label='Search'>
                            <SearchInput />
                        </SearchField>

                        <div className='max-h-[60vh] overflow-y-auto space-y-2'>
                            {isLoadingKeys ? (
                                <div className='flex items-center justify-center py-12'>
                                    <Loader isIndeterminate aria-label='Loading keys...' />
                                </div>
                            ) : (
                                <>
                                    <ChoiceBox
                                        aria-label='Select key'
                                        onSelectionChange={keys => {
                                            const key = filteredKeys.find(
                                                k => k.key === (Array.from(keys)[0] as string)
                                            );

                                            if (key) {
                                                onAssignKey(key);
                                            }
                                        }}>
                                        {filteredKeys.map(key => (
                                            <ChoiceBoxItem key={key.key} textValue={key.key} id={key.key}>
                                                <ChoiceBoxLabel>{key.key}</ChoiceBoxLabel>
                                                <ChoiceBoxDescription>{key.value}</ChoiceBoxDescription>
                                            </ChoiceBoxItem>
                                        ))}
                                    </ChoiceBox>

                                    {filteredKeys.length === 0 ? (
                                        <div className='text-center py-10 text-muted-fg'>
                                            {keySearchTerm
                                                ? 'No keys match your search'
                                                : 'No primitive keys available'}
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
                                const hasChange = pendingChanges.find(c =>
                                    c.items.some(item => item.key === mapping.translationKey)
                                );
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
                                                        {hasChange ? <Badge intent='warning'>Modified</Badge> : null}
                                                    </div>
                                                </div>
                                                <div className='flex items-center gap-1'>
                                                    <Button intent='plain' onClick={() => handleEditMapping(mapping)}>
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
