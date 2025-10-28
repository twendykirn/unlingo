'use client';

import { useAction, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect, useState } from 'react';
import { IconHighlight, IconPlus, IconTrash, IconUndo } from '@intentui/icons';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { Snippet } from '@heroui/snippet';
import { Id } from '@/convex/_generated/dataModel';
import { Loader } from '@/components/ui/loader';
import { Button, buttonStyles } from '@/components/ui/button';
import { useSearchParams } from 'next/navigation';
import DashboardSidebar, { WorkspaceWithPremium } from '../components/dashboard-sidebar';
import { Collection, TableLoadMoreItem, type Selection } from 'react-aria-components';
import { flattenJson, LanguageContentInterface, LanguageItem } from './utils/jsonFlatten';
import { Textarea } from '@/components/ui/textarea';
import EditValueModal from './components/EditValueModal';
import { Tooltip } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
    editorItems$,
    editorMaxPages$,
    editorPage$,
    editorVisibleItems$,
    languageContent$,
    translationHistory$,
} from './store';
import { use$ } from '@legendapp/state/react';
import EditorAddKeySheet from './components/editor-add-sheet';

export default function EditorPage() {
    const searchParams = useSearchParams();
    const languageId = searchParams.get('languageId') as Id<'languages'> | null;

    const [selectedLanguage, setSelectedLanguage] = useState<Id<'languages'> | null>(null);

    const [workspace, setWorkspace] = useState<WorkspaceWithPremium | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedKey, setSelectedKey] = useState<LanguageItem | null>(null);
    const [isCreateKeySheetOpen, setIsCreateKeySheetOpen] = useState(false);

    const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());

    const [primaryLanguageSchema, setPrimaryLanguageSchema] = useState<any | null>(null);

    const [primaryLanguageContent, setPrimaryLanguageContent] = useState<LanguageContentInterface>({});

    const [didInit, setDidInit] = useState(false);
    const [loadingContent, setLoadingContent] = useState(false);

    const [loadingTable, setLoadingTable] = useState(false);

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

    const contentArray = use$(editorVisibleItems$);
    const contentKeys = use$(Object.keys(languageContent$.get()));
    const status = use$(() => (editorPage$.get() < editorMaxPages$.get() ? 'CanLoadMore' : 'Exhausted'));

    const handleLoadingMore = () => {
        const currentPage = editorPage$.get();
        const totalPages = editorMaxPages$.get();

        if (currentPage < totalPages) {
            setLoadingTable(true);
            const newPage = currentPage + 1;
            const allItems = editorItems$.get();
            editorVisibleItems$.set(allItems.slice(0, newPage * 20));
            editorPage$.set(newPage);
            setLoadingTable(false);
        }
    };

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

            const itemsArray = Object.values(result).sort((a, b) => (a.key < b.key ? -1 : 1));
            editorMaxPages$.set(Math.ceil(itemsArray.length / 20));
            editorItems$.set(itemsArray);
            editorVisibleItems$.set(itemsArray.slice(0, 1 * 20));

            setDidInit(true);
        } catch (error) {
            console.error('Failed to process language content:', error);
        } finally {
            setLoadingContent(false);
        }
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
                                            <Badge intent={isPrimaryLanguage ? 'primary' : 'secondary'}>
                                                {isPrimaryLanguage ? 'Primary' : 'Secondary'}
                                            </Badge>
                                        ) : null}
                                    </Card.Title>
                                    <Card.Description>Translate and edit your translations keys.</Card.Description>
                                </div>
                                <div className='flex items-center gap-2'>
                                    {translationHistory$.length > 0 ? (
                                        <Button
                                            intent='warning'
                                            onClick={() => {
                                                const lastItem = translationHistory$.pop();
                                                if (lastItem) {
                                                    if (lastItem.action === 'delete') {
                                                        languageContent$.set(s => ({
                                                            ...s,
                                                            [lastItem.key]: lastItem.item,
                                                        }));
                                                    } else if (lastItem.action === 'modify') {
                                                        languageContent$[lastItem.key]?.value.set(lastItem.item.value);
                                                    } else if (lastItem.action === 'add') {
                                                        languageContent$[lastItem.key]?.delete();
                                                    }
                                                }
                                            }}>
                                            <IconUndo />
                                            Undo Last Change
                                        </Button>
                                    ) : null}
                                    {!isPrimaryLanguage ? (
                                        <Tooltip delay={0}>
                                            <Tooltip.Trigger
                                                aria-label='Add key'
                                                className={buttonStyles({
                                                    isDisabled: true,
                                                })}>
                                                <IconPlus />
                                                Add Key
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
                                            Add Key
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card.Header>
                        <Card.Content>
                            <Table
                                bleed
                                className='[--gutter:var(--card-spacing)] sm:[--gutter:var(--card-spacing)]'
                                aria-label='Translations'>
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
                                    )}>
                                    <Collection items={contentArray}>
                                        {item => {
                                            return (
                                                <Table.Row id={item.key}>
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
                                                                    }}>
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
                                                                    }}>
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
                                                                    <strong className='font-semibold'>
                                                                        Key Removal
                                                                    </strong>
                                                                    <p className='mt-1 max-w-2xs text-pretty text-muted-fg text-sm'>
                                                                        You can remove a key only inside the primary
                                                                        language. That way we can sync the changes
                                                                        properly.
                                                                    </p>
                                                                </Tooltip.Content>
                                                            </Tooltip>
                                                        ) : (
                                                            <Button
                                                                intent='danger'
                                                                size='sm'
                                                                onClick={() => {
                                                                    translationHistory$.push({
                                                                        key: item.key,
                                                                        item,
                                                                        action: 'delete',
                                                                    });
                                                                    languageContent$[item.key]?.delete();
                                                                }}>
                                                                <IconTrash />
                                                            </Button>
                                                        )}
                                                    </Table.Cell>
                                                </Table.Row>
                                            );
                                        }}
                                    </Collection>
                                    {status !== 'Exhausted' ? (
                                        <TableLoadMoreItem
                                            className='sticky inset-x-0 bottom-0 h-16'
                                            onLoadMore={handleLoadingMore}
                                            isLoading={loadingTable}>
                                            <Loader className='mx-auto' isIndeterminate aria-label='Loading more...' />
                                        </TableLoadMoreItem>
                                    ) : null}
                                </Table.Body>
                            </Table>
                        </Card.Content>
                    </Card>
                    {selectedKey ? (
                        <EditValueModal
                            isOpen={isEditModalOpen}
                            setIsOpen={setIsEditModalOpen}
                            originalValue={selectedKey.value}
                            primaryValue={selectedKey.primaryValue}
                            isPrimaryLanguage={isPrimaryLanguage}
                            onApply={value => {
                                translationHistory$.push({
                                    key: selectedKey.key,
                                    item: selectedKey,
                                    newValue: value,
                                    action: 'modify',
                                });
                                languageContent$[selectedKey.key]?.value.set(value);
                                setSelectedKey(null);
                                setIsEditModalOpen(false);
                            }}
                        />
                    ) : null}

                    <EditorAddKeySheet
                        isOpen={isCreateKeySheetOpen}
                        setIsOpen={setIsCreateKeySheetOpen}
                        keys={contentKeys}
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

                            const itemsArray = Object.values(newContent).sort((a, b) => (a.key < b.key ? -1 : 1));
                            editorMaxPages$.set(Math.ceil(itemsArray.length / 20));
                            editorItems$.set(itemsArray);
                            editorPage$.set(1);
                            editorVisibleItems$.set(itemsArray.slice(0, 1 * 20));
                        }}
                    />
                </>
            ) : (
                <Loader />
            )}
        </DashboardSidebar>
    );
}
