'use client';

import { useAction, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect, useRef, useState } from 'react';
import { IconDownload, IconHighlight, IconPlus, IconRedo, IconTrash, IconUndo } from '@intentui/icons';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Snippet } from '@heroui/snippet';
import { Id } from '@/convex/_generated/dataModel';
import { Loader } from '@/components/ui/loader';
import { Button, buttonStyles } from '@/components/ui/button';
import { useSearchParams } from 'next/navigation';
import DashboardSidebar, { WorkspaceWithPremium } from '../components/dashboard-sidebar';
import { flattenJson, LanguageContentInterface, LanguageItem, unflattenJson } from './utils/jsonFlatten';
import { Textarea } from '@/components/ui/textarea';
import EditValueModal from './components/EditValueModal';
import { Tooltip } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { languageContent$, undoTranslationHistory$, redoTranslationHistory$ } from './store';
import { use$ } from '@legendapp/state/react';
import EditorAddKeySheet from './components/editor-add-sheet';
import { ButtonGroup } from '@/components/ui/button-group';
import { useVirtualizer } from '@tanstack/react-virtual';

export default function EditorPage() {
    const searchParams = useSearchParams();
    const languageId = searchParams.get('languageId') as Id<'languages'> | null;

    const [selectedLanguage, setSelectedLanguage] = useState<Id<'languages'> | null>(null);

    const [workspace, setWorkspace] = useState<WorkspaceWithPremium | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedKey, setSelectedKey] = useState<LanguageItem | null>(null);
    const [isCreateKeySheetOpen, setIsCreateKeySheetOpen] = useState(false);

    const [primaryLanguageSchema, setPrimaryLanguageSchema] = useState<any | null>(null);

    const [primaryLanguageContent, setPrimaryLanguageContent] = useState<LanguageContentInterface>({});

    const [didInit, setDidInit] = useState(false);
    const [loadingContent, setLoadingContent] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const getLanguageContent = useAction(api.languages.getLanguageContent);
    const getJsonSchema = useAction(api.languages.getJsonSchema);

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
    const isPremium = !!workspace?.isPremium;

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

                    if (flattenedPrimaryContent) {
                        setPrimaryLanguageContent(flattenedPrimaryContent);
                    }
                } catch (error) {
                    console.error('Failed to fetch primary language content:', error);
                    setPrimaryLanguageContent({});
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

            setDidInit(true);
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

    useEffect(() => {
        if (workspace?._id && !didInit && language && selectedLanguage) {
            getContentOnInit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLanguage, workspace, didInit, language]);

    useEffect(() => {
        if (languageId) {
            setSelectedLanguage(languageId);
        }
    }, [languageId]);

    return (
        <DashboardSidebar activeItem='editor' onWorkspaceChange={setWorkspace}>
            {workspace && !loadingContent ? (
                <>
                    <Card>
                        <Card.Header>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col gap-1'>
                                    <Card.Title className='flex items-center gap-1'>
                                        Translations {language ? `(${language.languageCode})` : null}
                                        {selectedLanguage ? (
                                            <Badge intent={isPrimaryLanguage ? 'warning' : 'secondary'}>
                                                {isPrimaryLanguage ? 'Primary' : 'Secondary'}
                                            </Badge>
                                        ) : null}
                                    </Card.Title>
                                    <Card.Description>Translate and edit your translations keys.</Card.Description>
                                </div>
                                <div className='flex items-center gap-2'>
                                    {undoHistoryItems.length > 0 || redoHistoryItems.length > 0 ? (
                                        <ButtonGroup>
                                            <Button
                                                intent='secondary'
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
                                                isDisabled={undoHistoryItems.length === 0}>
                                                <IconUndo />
                                            </Button>
                                            <Button
                                                intent='secondary'
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
                                                isDisabled={redoHistoryItems.length === 0}>
                                                <IconRedo />
                                            </Button>
                                        </ButtonGroup>
                                    ) : null}
                                    <Button
                                        intent='secondary'
                                        onClick={saveLanguageAsFile}
                                        isDisabled={contentItems.length === 0}
                                        isPending={isDownloading}>
                                        <IconDownload />
                                    </Button>
                                    {!isPrimaryLanguage ? (
                                        <Tooltip delay={0}>
                                            <Tooltip.Trigger
                                                aria-label='Add key'
                                                className={buttonStyles({
                                                    isDisabled: true,
                                                })}>
                                                <IconPlus />
                                            </Tooltip.Trigger>
                                            <Tooltip.Content>
                                                <strong className='font-semibold'>Key Creation</strong>
                                                <p className='mt-1 max-w-2xs text-pretty text-muted-fg text-sm'>
                                                    You can create a new key only inside the primary language. That way
                                                    we can sync the changes properly.
                                                </p>
                                            </Tooltip.Content>
                                        </Tooltip>
                                    ) : (
                                        <Button onClick={() => setIsCreateKeySheetOpen(true)}>
                                            <IconPlus />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card.Header>
                        <Card.Content>
                            <Table
                                bleed
                                className='[--gutter:var(--card-spacing)] sm:[--gutter:var(--card-spacing)] flex-1 max-h-full'
                                aria-label='Translations'
                                ref={parentRef}>
                                <Table.Header>
                                    <Table.Column className='w-0'>Key</Table.Column>
                                    <Table.Column isRowHeader>Original (Primary)</Table.Column>
                                    {!isPrimaryLanguage ? <Table.Column>Translations</Table.Column> : null}
                                    <Table.Column />
                                </Table.Header>
                                <Table.Body
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
                                            <Table.Row
                                                id={virtualRow.index}
                                                key={virtualRow.key}
                                                data-index={virtualRow.index}
                                                ref={virtualizer.measureElement}>
                                                <Table.Cell>
                                                    <Snippet size='sm' hideSymbol>
                                                        {item.key}
                                                    </Snippet>
                                                </Table.Cell>
                                                <Table.Cell>
                                                    <div className='flex items-center gap-2 w-9/12'>
                                                        <Textarea
                                                            value={
                                                                isPrimaryLanguage
                                                                    ? item.value
                                                                    : (item.primaryValue ?? '-')
                                                            }
                                                            isReadOnly
                                                            className='w-full'
                                                            aria-label={
                                                                isPrimaryLanguage
                                                                    ? item.value
                                                                    : (item.primaryValue ?? '-')
                                                            }
                                                        />
                                                        {isPrimaryLanguage ? (
                                                            <Button
                                                                onClick={() => {
                                                                    setSelectedKey(item);
                                                                    setIsEditModalOpen(true);
                                                                }}
                                                                size='sm'>
                                                                <IconHighlight />
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                </Table.Cell>
                                                {!isPrimaryLanguage ? (
                                                    <Table.Cell>
                                                        <div className='flex items-center gap-2 w-9/12'>
                                                            <Textarea
                                                                value={item.value}
                                                                isReadOnly
                                                                className='w-full'
                                                                aria-label={item.value}
                                                            />
                                                            <Button
                                                                onClick={() => {
                                                                    setSelectedKey(item);
                                                                    setIsEditModalOpen(true);
                                                                }}
                                                                size='sm'>
                                                                <IconHighlight />
                                                            </Button>
                                                        </div>
                                                    </Table.Cell>
                                                ) : null}
                                                <Table.Cell className='text-end pr-2.5'>
                                                    {!isPrimaryLanguage ? (
                                                        <Tooltip delay={0}>
                                                            <Tooltip.Trigger
                                                                aria-label='Remove key'
                                                                className={buttonStyles({
                                                                    intent: 'danger',
                                                                    size: 'sm',
                                                                    isDisabled: true,
                                                                })}>
                                                                <IconTrash />
                                                            </Tooltip.Trigger>
                                                            <Tooltip.Content>
                                                                <strong className='font-semibold'>Key Removal</strong>
                                                                <p className='mt-1 max-w-2xs text-pretty text-muted-fg text-sm'>
                                                                    You can remove a key only inside the primary
                                                                    language. That way we can sync the changes properly.
                                                                </p>
                                                            </Tooltip.Content>
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
                                                            }}>
                                                            <IconTrash />
                                                        </Button>
                                                    )}
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    })}
                                </Table.Body>
                            </Table>
                        </Card.Content>
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
