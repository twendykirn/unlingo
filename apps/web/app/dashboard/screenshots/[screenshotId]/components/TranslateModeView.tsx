'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import {
    PlusIcon,
    TrashIcon,
    LockOpenIcon,
    GlobeAltIcon,
    LanguageIcon,
    NewspaperIcon,
} from '@heroicons/react/24/outline';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useAction, useMutation, usePaginatedQuery } from 'convex/react';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import ScreenshotDialogs from './ScreenshotDialogs';
import { api } from '@/convex/_generated/api';
import { selectedContainerId$ } from '../store';
import { use$ } from '@legendapp/state/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { toast } from 'sonner';
import { flattenJson, LanguageContentInterface, LanguageItem } from '@/app/dashboard/editor/utils/jsonFlatten';
import { TranslationHistoryItem } from '@/app/dashboard/editor/types';
import { consolidateHistory } from '@/app/dashboard/editor/utils/consolidateHistory';

interface WorkflowState {
    namespace?: Doc<'namespaces'>;
    version?: Doc<'namespaceVersions'>;
    language?: Doc<'languages'>;
    isLocked: boolean;
}

interface TranslateModeViewProps extends PropsWithChildren {
    projectId: Id<'projects'>;
    workspaceId: Id<'workspaces'>;
    screenshotName: string;
    containers: Doc<'screenshotContainers'>[] | undefined;
    onSwitchToEdit: () => void;
}

export default function TranslateModeView({
    projectId,
    workspaceId,
    screenshotName,
    containers,
    onSwitchToEdit,
    children,
}: TranslateModeViewProps) {
    const selectedContainerId = use$(selectedContainerId$);

    const [isEditingContext, setIsEditingContext] = useState(true);
    const [didInitTranslateMode, setDidInitTranslateMode] = useState(false);
    const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
    const [isMappingsDialogOpen, setIsMappingsDialogOpen] = useState(false);
    const [workflow, setWorkflow] = useState<WorkflowState>({ isLocked: false });
    const [originalWorkflow, setOriginalWorkflow] = useState<WorkflowState | null>(null);

    const [draftNamespace, setDraftNamespace] = useState<Doc<'namespaces'> | undefined>(undefined);
    const [draftVersion, setDraftVersion] = useState<Doc<'namespaceVersions'> | undefined>(undefined);
    const [draftLanguage, setDraftLanguage] = useState<Doc<'languages'> | undefined>(undefined);

    const [hasChanges, setHasChanges] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<TranslationHistoryItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const [languageKeys, setLanguageKeys] = useState<LanguageContentInterface>({});
    const [isLoadingKeys, setIsLoadingKeys] = useState(false);
    const [orphanedMappings, setOrphanedMappings] = useState<Doc<'screenshotKeyMappings'>[]>([]);

    const [editValue, setEditValue] = useState('');
    const [editingMapping, setEditingMapping] = useState<Doc<'screenshotKeyMappings'> | null>(null);

    const assignKeyToContainer = useMutation(api.screenshots.assignKeyToContainer);
    const applyChangeOperations = useAction(api.languages.applyChangeOperations);
    const removeKeyFromContainer = useMutation(api.screenshots.removeKeyFromContainer);
    const getLanguageContent = useAction(api.languages.getLanguageContent);

    const namespaces = usePaginatedQuery(
        api.namespaces.getNamespaces,
        projectId && workspaceId && isEditingContext ? { projectId, workspaceId } : 'skip',
        { initialNumItems: 40 }
    );

    const versions = usePaginatedQuery(
        api.namespaceVersions.getNamespaceVersions,
        isEditingContext && draftNamespace && workspaceId ? { namespaceId: draftNamespace._id, workspaceId } : 'skip',
        { initialNumItems: 20 }
    );

    const languages = usePaginatedQuery(
        api.languages.getLanguages,
        isEditingContext && draftVersion && workspaceId
            ? { namespaceVersionId: draftVersion._id, workspaceId }
            : 'skip',
        { initialNumItems: 90 }
    );

    const containerMappings = usePaginatedQuery(
        api.screenshots.getContainerMappings,
        selectedContainerId && workflow.version && workflow.language && workspaceId
            ? {
                  containerId: selectedContainerId,
                  namespaceVersionId: workflow.version._id,
                  languageId: workflow.language._id,
                  workspaceId: workspaceId,
              }
            : 'skip',
        { initialNumItems: 20 }
    );

    const memoizedMappings = useMemo(() => {
        return containerMappings?.results || [];
    }, [containerMappings?.results]);

    const selectedContainer = useMemo(() => {
        if (!containers) return null;

        const container = containers.find(c => c._id === selectedContainerId);
        return container ?? null;
    }, [containers, selectedContainerId]);

    const unsavedCount = useMemo(() => {
        return memoizedMappings.filter(m => pendingChanges.some(c => c.items.some(i => i.key === m.translationKey)))
            .length;
    }, [memoizedMappings, pendingChanges]);

    const handleUnlockWorkflow = () => {
        setOriginalWorkflow(workflow);
        setDraftNamespace(workflow.namespace);
        setDraftVersion(workflow.version);
        setDraftLanguage(workflow.language);
        setIsEditingContext(true);
        setWorkflow(prev => ({ ...prev, isLocked: false }));
        selectedContainerId$.set(null);
    };

    const handleSaveWorkflowContext = () => {
        setWorkflow({
            namespace: draftNamespace,
            version: draftVersion,
            language: draftLanguage,
            isLocked: true,
        });
        setDidInitTranslateMode(true);
        setIsEditingContext(false);
    };

    const handleCancelWorkflowContext = () => {
        setWorkflow(originalWorkflow ?? { isLocked: true });
        setIsEditingContext(false);
    };

    const handleAssignKey = async (key: LanguageItem) => {
        if (!selectedContainerId || !workflow.version || !workflow.language) return;

        try {
            await assignKeyToContainer({
                containerId: selectedContainerId,
                namespaceVersionId: workflow.version._id,
                languageId: workflow.language._id,
                translationKey: key.key,
                workspaceId,
            });

            setIsKeyDialogOpen(false);
        } catch (error) {
            console.error('Failed to assign key:', error);
            alert(error instanceof Error ? error.message : 'Failed to assign key');
        }
    };

    const handleSaveValue = (value: any) => {
        if (!editingMapping) return;

        const item = languageKeys[editingMapping.translationKey];

        if (!item) return;

        if (value === item.value) {
            setEditingMapping(null);
            return;
        }

        setPendingChanges(prev => [
            ...prev,
            {
                action: 'modify',
                items: [
                    {
                        key: editingMapping.translationKey,
                        item: {
                            key: editingMapping.translationKey,
                            value: item.value,
                            primaryValue: null,
                        },
                        newValue: value,
                    },
                ],
            },
        ]);

        setLanguageKeys(keys => ({
            ...keys,
            [editingMapping.translationKey]: {
                ...item,
                value,
            },
        }));

        setHasChanges(true);
        setEditingMapping(null);
        setEditValue('');
    };

    const handleSaveChanges = async () => {
        if (!workflow.language || pendingChanges.length === 0) return;

        setIsSaving(true);
        try {
            const languageChanges = consolidateHistory(pendingChanges);

            await applyChangeOperations({
                languageId: workflow.language._id,
                workspaceId,
                languageChanges,
            });

            setPendingChanges([]);
            setHasChanges(false);

            toast.success('Changes saved successfully!');
        } catch (error) {
            toast.error(`Failed to save changes: ${error}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscardChanges = () => {
        if (confirm('Discard all unsaved changes?')) {
            setPendingChanges([]);
            setHasChanges(false);
            setEditingMapping(null);
            setEditValue('');
        }
    };

    const handleRemoveKeyFromContainer = (translationKey: string) => {
        if (workflow.language) {
            removeKeyFromContainer({
                containerId: selectedContainerId!,
                languageId: workflow.language._id,
                translationKey,
                workspaceId,
            });
        }
    };

    useEffect(() => {
        if (!workflow.language) {
            setLanguageKeys({});
            setOrphanedMappings([]);
            return;
        }

        setIsLoadingKeys(true);
        getLanguageContent({
            languageId: workflow.language._id,
            workspaceId,
        })
            .then(result => {
                const content = result || {};
                const flatContent = flattenJson(content);
                setLanguageKeys(flatContent);
            })
            .catch(error => {
                toast.error(`Error fetching language content: ${error}`);
                setLanguageKeys({});
                setOrphanedMappings([]);
            })
            .finally(() => {
                setIsLoadingKeys(false);
            });
    }, [workflow.language, workspaceId, getLanguageContent]);

    useEffect(() => {
        if (memoizedMappings.length === 0) {
            setOrphanedMappings([]);
            return;
        }
        const orphaned = memoizedMappings.filter(mapping => {
            const val = languageKeys[mapping.translationKey];
            if (val === undefined) return true;
            return false;
        });
        setOrphanedMappings(orphaned);
    }, [languageKeys, memoizedMappings]);

    useEffect(() => {
        if (!workflow.language) return;
        if (orphanedMappings.length === 0) return;

        (async () => {
            try {
                for (const mapping of orphanedMappings) {
                    await removeKeyFromContainer({
                        containerId: mapping.containerId,
                        languageId: workflow.language!._id,
                        translationKey: mapping.translationKey,
                        workspaceId,
                    });
                }
                setOrphanedMappings([]);
            } catch (err) {
                toast.error(`Auto cleanup of orphaned mappings failed: ${err}`);
            }
        })();
    }, [orphanedMappings, workflow.language, workspaceId, removeKeyFromContainer]);

    return (
        <>
            <div className='flex flex-col gap-6 p-6'>
                <Card>
                    <CardHeader>
                        <div className='flex items-center justify-between'>
                            <div className='flex flex-col gap-1'>
                                <CardTitle>Translate Mode</CardTitle>
                                <CardDescription>{screenshotName}</CardDescription>
                            </div>
                            <div className='flex items-center gap-2'>
                                <div>
                                    <Select
                                        value={1}
                                        aria-label='modes-selector'
                                        placeholder='modes'
                                        onChange={() => onSwitchToEdit()}
                                        defaultValue={1}>
                                        <SelectTrigger />
                                        <SelectContent
                                            items={[
                                                { id: 0, name: 'Edit Mode' },
                                                { id: 1, name: 'Translation Mode' },
                                            ]}>
                                            {item => (
                                                <SelectItem id={item.id} textValue={item.name}>
                                                    {item.name}
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {hasChanges ? (
                                    <>
                                        <Button onClick={handleDiscardChanges} isDisabled={isSaving} intent='danger'>
                                            <TrashIcon /> Discard Changes
                                        </Button>
                                        <Button onClick={handleSaveChanges} isPending={isSaving}>
                                            {isSaving ? <Loader /> : 'Save Changes'} ({pendingChanges.length})
                                        </Button>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <div className='grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1'>
                    <div className='lg:col-span-1 space-y-6'>
                        {workflow.isLocked ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Translation Context</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className='flex flex-col gap-3'>
                                        <div className='grid grid-cols-1 gap-2'>
                                            <div className='flex items-center gap-2'>
                                                <GlobeAltIcon className='size-4' />
                                                <span className='text-sm font-medium truncate'>
                                                    {workflow.namespace?.name}
                                                </span>
                                            </div>
                                            <div className='flex items-center gap-2'>
                                                <NewspaperIcon className='size-4' />
                                                <span className='text-sm font-medium truncate'>
                                                    {workflow.version?.version}
                                                </span>
                                            </div>
                                            <div className='flex items-center gap-2'>
                                                <LanguageIcon className='size-4' />
                                                <span className='text-sm font-medium truncate'>
                                                    {workflow.language?.languageCode}
                                                </span>
                                            </div>
                                        </div>
                                        <Button onClick={handleUnlockWorkflow} intent='outline'>
                                            <LockOpenIcon />
                                            Change Context
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : null}

                        {!workflow.isLocked ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Select Translation Context</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className='flex flex-col gap-4'>
                                        <Select
                                            value={draftNamespace?._id || ''}
                                            onChange={val => {
                                                const ns = namespaces?.results?.find(
                                                    n => n._id === (val as Id<'namespaces'>)
                                                );
                                                setDraftNamespace(ns);
                                                setDraftVersion(undefined);
                                                setDraftLanguage(undefined);
                                            }}
                                            aria-label='Namespace'
                                            placeholder='Select namespace'>
                                            <Label>Namespace</Label>
                                            <SelectTrigger />
                                            <SelectContent items={namespaces?.results}>
                                                {item => (
                                                    <SelectItem id={item._id} textValue={item.name}>
                                                        {item.name}
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={draftVersion?._id || ''}
                                            onChange={val => {
                                                const v = versions?.results?.find(
                                                    vv => vv._id === (val as Id<'namespaceVersions'>)
                                                );
                                                setDraftVersion(v);
                                                setDraftLanguage(undefined);
                                            }}
                                            aria-label='Environment'
                                            placeholder='Select environment'
                                            isDisabled={!draftNamespace}>
                                            <Label>Environment</Label>
                                            <SelectTrigger />
                                            <SelectContent items={versions?.results}>
                                                {item => (
                                                    <SelectItem id={item._id} textValue={item.version}>
                                                        {item.version}
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={draftLanguage?._id || ''}
                                            onChange={val => {
                                                const lang = languages?.results?.find(
                                                    l => l._id === (val as Id<'languages'>)
                                                );
                                                setDraftLanguage(lang);
                                            }}
                                            aria-label='Language'
                                            placeholder='Select language'
                                            isDisabled={!draftVersion}>
                                            <Label>Language</Label>
                                            <SelectTrigger />
                                            <SelectContent items={languages?.results}>
                                                {item => (
                                                    <SelectItem id={item._id} textValue={item.languageCode}>
                                                        {item.languageCode}
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <div className='flex gap-2'>
                                            {didInitTranslateMode ? (
                                                <Button intent='outline' onClick={handleCancelWorkflowContext}>
                                                    Cancel
                                                </Button>
                                            ) : null}
                                            <Button
                                                onClick={handleSaveWorkflowContext}
                                                isDisabled={!draftNamespace || !draftVersion || !draftLanguage}
                                                className='flex-1'>
                                                Save Context
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : null}

                        {selectedContainerId && workflow.isLocked ? (
                            <Card>
                                <CardHeader>
                                    <div className='flex items-center justify-between'>
                                        <CardTitle>Container Details</CardTitle>
                                        <Button intent='plain' onClick={() => setIsKeyDialogOpen(true)}>
                                            <PlusIcon />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {selectedContainer?.description ? (
                                        <div className='mb-4 p-3 border rounded-lg'>
                                            <p className='text-sm font-medium mb-1'>Description</p>
                                            <p className='text-sm text-muted-fg'>{selectedContainer.description}</p>
                                        </div>
                                    ) : null}

                                    <div className='flex items-center justify-between mb-3'>
                                        <h4 className='text-sm font-medium'>Translation Keys</h4>
                                        <div className='flex items-center gap-2'>
                                            {memoizedMappings.length > 0 ? (
                                                <>
                                                    <Badge>{memoizedMappings.length}</Badge>
                                                    {unsavedCount > 0 ? (
                                                        <Badge intent='warning'>{unsavedCount} unsaved</Badge>
                                                    ) : null}
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                    {memoizedMappings.length === 0 ? (
                                        <p className='text-sm text-muted-fg mb-3'>No keys assigned to this container</p>
                                    ) : null}
                                    <Button intent='outline' onClick={() => setIsMappingsDialogOpen(true)}>
                                        Explore Keys
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : null}
                    </div>
                    <div className='lg:col-span-3'>{children}</div>
                </div>
            </div>
            <ScreenshotDialogs
                isKeyDialogOpen={isKeyDialogOpen}
                isMappingsDialogOpen={isMappingsDialogOpen}
                isLoadingKeys={isLoadingKeys}
                languageKeys={languageKeys}
                memoizedMappings={memoizedMappings}
                editingMapping={editingMapping}
                editValue={editValue}
                pendingChanges={pendingChanges}
                containerMappings={containerMappings}
                onKeyDialogChange={setIsKeyDialogOpen}
                onMappingsDialogChange={setIsMappingsDialogOpen}
                onAssignKey={handleAssignKey}
                onSaveValue={handleSaveValue}
                onCancelEdit={() => {
                    setEditingMapping(null);
                    setEditValue('');
                }}
                onRemoveKeyFromContainer={handleRemoveKeyFromContainer}
                setEditValue={setEditValue}
                setEditingMapping={setEditingMapping}
            />
        </>
    );
}
