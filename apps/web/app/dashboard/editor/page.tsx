'use client';

import { useAction, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect, useRef, useState } from 'react';
import {
    PlusIcon,
    TrashIcon,
    PencilSquareIcon,
    ArrowDownTrayIcon,
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/components/ui/table';
import { Snippet } from '@heroui/snippet';
import { Id } from '@/convex/_generated/dataModel';
import { Loader } from '@/components/ui/loader';
import { Button, buttonStyles } from '@/components/ui/button';
import { useSearchParams } from 'next/navigation';
import DashboardSidebar, { WorkspaceWithPremium } from '../components/dashboard-sidebar';
import { flattenJson, LanguageContentInterface, LanguageItem, unflattenJson } from './utils/jsonFlatten';
import { Textarea } from '@/components/ui/textarea';
import EditValueModal from './components/edit-value-modal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { languageContent$, undoTranslationHistory$, redoTranslationHistory$ } from './store';
import { use$ } from '@legendapp/state/react';
import EditorAddKeySheet from './components/editor-add-sheet';
import { ButtonGroup } from '@/components/ui/button-group';
import { useVirtualizer } from '@tanstack/react-virtual';
import { validateWithAjv } from '@/lib/zodSchemaGenerator';
import { toast } from 'sonner';
import { consolidateHistory } from './utils/consolidateHistory';
import { TextField } from '@/components/ui/text-field';

export default function EditorPage() {
    const searchParams = useSearchParams();
    const languageId = searchParams.get('languageId') as Id<'languages'> | null;

    const [selectedLanguage, setSelectedLanguage] = useState<Id<'languages'> | null>(null);

    const [workspace, setWorkspace] = useState<WorkspaceWithPremium | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedKey, setSelectedKey] = useState<LanguageItem | null>(null);
    const [isCreateKeySheetOpen, setIsCreateKeySheetOpen] = useState(false);

    const [primaryLanguageSchema, setPrimaryLanguageSchema] = useState<any | null>(null);

    const [loadingContent, setLoadingContent] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const getLanguageContent = useAction(api.languages.getLanguageContent);
    const getJsonSchema = useAction(api.languages.getJsonSchema);
    const applyChangeOperations = useAction(api.languages.applyChangeOperations);

    const language = useQuery(
        api.languages.getLanguageWithContext,
        selectedLanguage && workspace
            ? {
                  languageId: selectedLanguage,
                  workspaceId: workspace._id,
              }
            : 'skip'
    );

    const selectedLanguageCode = language?.languageCode || 'en';
    const isPrimaryLanguage = !!language?.isPrimary;

    const contentItems = use$(Object.values(languageContent$.get()).sort((a, b) => (a.key < b.key ? -1 : 1)));
    const undoHistoryItems = use$(undoTranslationHistory$);
    const redoHistoryItems = use$(redoTranslationHistory$);

    const parentRef = useRef(null);

    const virtualizer = useVirtualizer({
        count: contentItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 41,
    });

    const getContentOnInit = async () => {
        try {
            if (!selectedLanguage || !workspace || !language) return;

            setLoadingContent(true);
            languageContent$.set({});
            undoTranslationHistory$.set([]);
            redoTranslationHistory$.set([]);

            const content = await getLanguageContent({
                languageId: selectedLanguage,
                workspaceId: workspace._id,
            });

            const primarySchema = await getJsonSchema({
                namespaceVersionId: language.namespaceVersionId,
                workspaceId: workspace._id,
            });

            if (primarySchema) {
                setPrimaryLanguageSchema(JSON.parse(primarySchema));
            }

            let flattenedPrimaryContent: LanguageContentInterface | null = null;

            if (!isPrimaryLanguage && language.primaryLanguageId) {
                try {
                    const primaryContent = await getLanguageContent({
                        languageId: language.primaryLanguageId,
                        workspaceId: workspace._id,
                    });

                    flattenedPrimaryContent = flattenJson(primaryContent);
                } catch (error) {
                    console.error('Failed to fetch primary language content:', error);
                }
            }

            const flattenedLanguageContent = flattenJson(content);

            let result: LanguageContentInterface = {};

            if (flattenedPrimaryContent) {
                const entries = Object.entries(flattenedLanguageContent);

                for (const [key, value] of entries) {
                    if (flattenedPrimaryContent[key] !== undefined) {
                        result[key] = {
                            key,
                            value: value.value,
                            primaryValue: flattenedPrimaryContent[key].value,
                        };
                    }
                }
            } else if (isPrimaryLanguage) {
                result = { ...flattenedLanguageContent };
            }

            languageContent$.set(result);
        } catch (error) {
            console.error('Failed to process language content:', error);
        } finally {
            setLoadingContent(false);
        }
    };

    const saveLanguageAsFile = () => {
        setIsDownloading(true);
        const dataObjToWrite = unflattenJson(languageContent$.get());
        const blob = new Blob([JSON.stringify(dataObjToWrite, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');

        link.download = `${selectedLanguageCode}.json`;
        link.href = window.URL.createObjectURL(blob);
        link.dataset.downloadurl = ['application/json', link.download, link.href].join(':');

        const evt = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
        });

        link.dispatchEvent(evt);
        link.remove();
        setIsDownloading(false);
    };

    const handleSaveChanges = async () => {
        const languageContent = languageContent$.get();
        if (!Object.keys(languageContent) || !selectedLanguage || !workspace) return;

        setIsSaving(true);

        try {
            const jsonContent = unflattenJson(languageContent);

            if (!isPrimaryLanguage && primaryLanguageSchema) {
                const validation = validateWithAjv(jsonContent, primaryLanguageSchema);

                if (!validation.isValid) {
                    const errorMessage =
                        validation.errors
                            ?.slice(0, 3)
                            .map(err => `• ${err.instancePath || 'root'}: ${err.message}`)
                            .join('\n') || 'Unknown validation errors';

                    toast.error(
                        `Schema validation failed:\n${errorMessage}${validation.errors && validation.errors.length > 3 ? '\n... and more errors' : ''}`
                    );
                    setIsSaving(false);
                    return;
                }
            }

            const languageChanges = consolidateHistory(undoHistoryItems);

            await applyChangeOperations({
                languageId: selectedLanguage,
                workspaceId: workspace._id,
                languageChanges,
            });

            undoTranslationHistory$.set([]);
            redoTranslationHistory$.set([]);
        } catch (error) {
            console.error('Failed to save changes:', error);
            toast.error('Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (workspace?._id && language && selectedLanguage) {
            getContentOnInit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLanguage, workspace, language]);

    useEffect(() => {
        if (languageId) {
            setSelectedLanguage(languageId);
        }
    }, [languageId]);

    return (
        <DashboardSidebar activeItem='languages' onWorkspaceChange={setWorkspace}>
            {workspace ? (
                <>
                    <Card>
                        <CardHeader>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col gap-1'>
                                    <CardTitle className='flex items-center gap-1'>
                                        Translations {language ? `(${language.languageCode})` : null}
                                        {selectedLanguage ? (
                                            <Badge intent={isPrimaryLanguage ? 'warning' : 'secondary'}>
                                                {isPrimaryLanguage ? 'Primary' : 'Secondary'}
                                            </Badge>
                                        ) : null}
                                        {language ? (
                                            <Badge intent={language.status ? 'warning' : 'success'}>
                                                {language.status || 'ready'}
                                            </Badge>
                                        ) : null}
                                    </CardTitle>
                                    <CardDescription>Translate and edit your translations keys.</CardDescription>
                                </div>
                                <div className='flex items-center gap-2'>
                                    {undoHistoryItems.length > 0 || redoHistoryItems.length > 0 ? (
                                        <ButtonGroup>
                                            <Button
                                                intent='secondary'
                                                size='sm'
                                                onClick={() => {
                                                    const lastItem = undoTranslationHistory$.pop();
                                                    if (lastItem) {
                                                        if (lastItem.action === 'delete') {
                                                            for (const item of lastItem.items) {
                                                                languageContent$.set(s => ({
                                                                    ...s,
                                                                    [item.key]: item.item,
                                                                }));
                                                            }
                                                        } else if (lastItem.action === 'modify') {
                                                            for (const item of lastItem.items) {
                                                                languageContent$[item.key]?.value.set(item.item.value);
                                                            }
                                                        } else if (lastItem.action === 'add') {
                                                            for (const item of lastItem.items) {
                                                                languageContent$[item.key]?.delete();
                                                            }
                                                        }
                                                        redoTranslationHistory$.push(lastItem);
                                                    }
                                                }}
                                                isDisabled={undoHistoryItems.length === 0}
                                                isPending={!!language?.status}>
                                                <ArrowUturnLeftIcon />
                                            </Button>
                                            <Button
                                                intent='secondary'
                                                size='sm'
                                                onClick={() => {
                                                    const lastItem = redoTranslationHistory$.pop();
                                                    if (lastItem) {
                                                        if (lastItem.action === 'delete') {
                                                            for (const item of lastItem.items) {
                                                                languageContent$[item.key]?.delete();
                                                            }
                                                        } else if (lastItem.action === 'modify') {
                                                            for (const item of lastItem.items) {
                                                                languageContent$[item.key]?.value.set(item.newValue);
                                                            }
                                                        } else if (lastItem.action === 'add') {
                                                            for (const item of lastItem.items) {
                                                                languageContent$.set(s => ({
                                                                    ...s,
                                                                    [item.key]: item.item,
                                                                }));
                                                            }
                                                        }
                                                        undoTranslationHistory$.push(lastItem);
                                                    }
                                                }}
                                                isDisabled={redoHistoryItems.length === 0}
                                                isPending={!!language?.status}>
                                                <ArrowUturnRightIcon />
                                            </Button>
                                        </ButtonGroup>
                                    ) : null}
                                    <Button
                                        intent='secondary'
                                        size='sm'
                                        onClick={saveLanguageAsFile}
                                        isDisabled={contentItems.length === 0}
                                        isPending={isDownloading}>
                                        <ArrowDownTrayIcon />
                                    </Button>
                                    {!isPrimaryLanguage ? (
                                        <Tooltip delay={0}>
                                            <TooltipTrigger
                                                aria-label='Add key'
                                                className={buttonStyles({
                                                    size: 'sm',
                                                })}
                                                isDisabled={true}
                                                isPending={!!language?.status}>
                                                <PlusIcon />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <strong className='font-semibold'>Key Creation</strong>
                                                <p className='mt-1 max-w-2xs text-pretty text-muted-fg text-sm'>
                                                    You can create a new key only inside the primary language. That way
                                                    we can sync the changes properly.
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    ) : (
                                        <Button
                                            size='sm'
                                            onClick={() => setIsCreateKeySheetOpen(true)}
                                            isPending={!!language?.status}>
                                            <PlusIcon />
                                        </Button>
                                    )}
                                    <Button
                                        size='sm'
                                        onClick={handleSaveChanges}
                                        isDisabled={undoHistoryItems.length === 0}
                                        isPending={isSaving || !!language?.status}>
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!loadingContent && !language?.status ? (
                                <Table
                                    bleed
                                    className='[--gutter:var(--card-spacing)] sm:[--gutter:var(--card-spacing)] flex-1 max-h-full'
                                    aria-label='Translations'
                                    ref={parentRef}>
                                    <TableHeader>
                                        <TableColumn className='w-0'>Key</TableColumn>
                                        <TableColumn isRowHeader>Original (Primary)</TableColumn>
                                        {!isPrimaryLanguage ? <TableColumn>Translations</TableColumn> : null}
                                        <TableColumn />
                                    </TableHeader>
                                    <TableBody
                                        renderEmptyState={() => (
                                            <div className='flex h-full items-center justify-center p-4 text-muted-fg'>
                                                No translations found.
                                            </div>
                                        )}
                                        style={{
                                            height: `${virtualizer.getTotalSize()}px`,
                                            width: '100%',
                                            position: 'relative',
                                        }}>
                                        {virtualizer.getVirtualItems().map(virtualRow => {
                                            const item = contentItems[virtualRow.index];

                                            if (!item) return null;

                                            return (
                                                <TableRow
                                                    id={virtualRow.index}
                                                    key={virtualRow.key}
                                                    data-index={virtualRow.index}
                                                    ref={virtualizer.measureElement}>
                                                    <TableCell>
                                                        <Snippet size='sm' hideSymbol>
                                                            {item.key}
                                                        </Snippet>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className='flex items-center gap-2 w-9/12'>
                                                            <TextField
                                                                isReadOnly
                                                                value={
                                                                    isPrimaryLanguage
                                                                        ? item.value
                                                                        : (item.primaryValue ?? '-')
                                                                }
                                                                className='w-full'
                                                                aria-label={
                                                                    isPrimaryLanguage
                                                                        ? item.value
                                                                        : (item.primaryValue ?? '-')
                                                                }>
                                                                <Textarea />
                                                            </TextField>
                                                            {isPrimaryLanguage ? (
                                                                <Button
                                                                    onClick={() => {
                                                                        setSelectedKey(item);
                                                                        setIsEditModalOpen(true);
                                                                    }}
                                                                    size='sm'
                                                                    isPending={!!language.status}>
                                                                    <PencilSquareIcon />
                                                                </Button>
                                                            ) : null}
                                                        </div>
                                                    </TableCell>
                                                    {!isPrimaryLanguage ? (
                                                        <TableCell>
                                                            <div className='flex items-center gap-2 w-9/12'>
                                                                <TextField
                                                                    isReadOnly
                                                                    value={item.value}
                                                                    className='w-full'
                                                                    aria-label={item.value}>
                                                                    <Textarea />
                                                                </TextField>
                                                                <Button
                                                                    onClick={() => {
                                                                        setSelectedKey(item);
                                                                        setIsEditModalOpen(true);
                                                                    }}
                                                                    size='sm'
                                                                    isPending={!!language?.status}>
                                                                    <PencilSquareIcon />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    ) : null}
                                                    <TableCell className='flex justify-end'>
                                                        {!isPrimaryLanguage ? (
                                                            <Tooltip delay={0}>
                                                                <TooltipTrigger
                                                                    aria-label='Remove key'
                                                                    className={buttonStyles({
                                                                        intent: 'danger',
                                                                        size: 'sm',
                                                                    })}
                                                                    isDisabled={true}>
                                                                    <TrashIcon />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <strong className='font-semibold'>
                                                                        Key Removal
                                                                    </strong>
                                                                    <p className='mt-1 max-w-2xs text-pretty text-muted-fg text-sm'>
                                                                        You can remove a key only inside the primary
                                                                        language. That way we can sync the changes
                                                                        properly.
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        ) : (
                                                            <Button
                                                                intent='danger'
                                                                size='sm'
                                                                onClick={() => {
                                                                    undoTranslationHistory$.push({
                                                                        items: [
                                                                            {
                                                                                key: item.key,
                                                                                item,
                                                                            },
                                                                        ],
                                                                        action: 'delete',
                                                                    });
                                                                    redoTranslationHistory$.set([]);
                                                                    languageContent$[item.key]?.delete();
                                                                }}
                                                                isPending={!!language.status}>
                                                                <TrashIcon />
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            ) : (
                                <Loader />
                            )}
                        </CardContent>
                    </Card>
                    {selectedKey ? (
                        <EditValueModal
                            isOpen={isEditModalOpen}
                            setIsOpen={setIsEditModalOpen}
                            originalKey={selectedKey.key}
                            originalValue={selectedKey.value}
                            primaryValue={selectedKey.primaryValue}
                            isPrimaryLanguage={isPrimaryLanguage}
                            onApply={params => {
                                undoTranslationHistory$.push({
                                    items: [
                                        {
                                            key: params.key,
                                            item: {
                                                key: params.key,
                                                value: params.oldValue,
                                                primaryValue: params.primaryValue,
                                            },
                                            newValue: params.newValue,
                                        },
                                    ],
                                    action: 'modify',
                                });
                                redoTranslationHistory$.set([]);
                                languageContent$[selectedKey.key]?.value.set(params.newValue);
                                setSelectedKey(null);
                                setIsEditModalOpen(false);
                            }}
                        />
                    ) : null}

                    <EditorAddKeySheet
                        isOpen={isCreateKeySheetOpen}
                        setIsOpen={setIsCreateKeySheetOpen}
                        onSave={newKeys => {
                            const currentContent = languageContent$.get();
                            const newContent: LanguageContentInterface = {
                                ...currentContent,
                                ...newKeys.reduce(
                                    (acc, item) => ({
                                        ...acc,
                                        [item.key]: item,
                                    }),
                                    {}
                                ),
                            };

                            languageContent$.set(newContent);

                            undoTranslationHistory$.push({
                                items: newKeys.map(key => ({
                                    key: key.key,
                                    item: key,
                                    newValue: key.value,
                                })),
                                action: 'add',
                            });
                            redoTranslationHistory$.set([]);
                        }}
                    />
                </>
            ) : (
                <Loader />
            )}
        </DashboardSidebar>
    );
}
