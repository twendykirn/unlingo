'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    PlusIcon,
    TrashIcon,
    PencilSquareIcon,
    EllipsisVerticalIcon,
    LockOpenIcon,
    GlobeAltIcon,
    LanguageIcon,
} from '@heroicons/react/24/outline';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { useAction, useMutation, usePaginatedQuery } from 'convex/react';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import ScreenshotDialogs from './ScreenshotDialogs';
import { useRouter } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { extractPrimitiveKeys, TranslationKey } from '../utils';
import { selectedContainerId$ } from '../store';
import { use$ } from '@legendapp/state/react';
import * as diff from 'json-diff';
import { createStructuredChanges } from '@/app/dashboard/editor/utils/createStructuredChanges';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/field';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';

interface LanguageChanges {
    changes: any; // The structured changes object
    timestamp: number;
    languageId: string;
    isPrimaryLanguage: boolean;
}

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
    const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map());
    const [isSaving, setIsSaving] = useState(false);

    const [languageKeys, setLanguageKeys] = useState<TranslationKey[]>([]);
    const [isLoadingKeys, setIsLoadingKeys] = useState(false);
    const [orphanedMappings, setOrphanedMappings] = useState<Doc<'screenshotKeyMappings'>[]>([]);
    const [originalJson, setOriginalJson] = useState<any>({});

    const [editValue, setEditValue] = useState('');
    const [editingMapping, setEditingMapping] = useState<Doc<'screenshotKeyMappings'> | null>(null);

    const assignKeyToContainer = useMutation(api.screenshots.assignKeyToContainer);
    const applyLanguageChanges = useAction(api.languages.applyChangeOperations);
    const removeKeyFromContainer = useMutation(api.screenshots.removeKeyFromContainer);
    const getLanguageContent = useAction(api.languages.getLanguageContent);

    const namespaces = usePaginatedQuery(
        api.namespaces.getNamespaces,
        projectId && workspaceId && isEditingContext ? { projectId, workspaceId } : 'skip',
        { initialNumItems: 20 }
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
        { initialNumItems: 20 }
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
        return memoizedMappings.filter(m => pendingChanges.has(`${m.translationKey}`)).length;
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

    const handleAssignKey = async (key: TranslationKey) => {
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

    const handleSaveValue = (value: string) => {
        if (!editingMapping) return;

        let parsedValue: string | number | boolean = value;
        if (/^-?\d+(\.\d+)?$/.test(value)) {
            parsedValue = Number(value);
        } else if (/^(true|false)$/i.test(value)) {
            parsedValue = value.toLowerCase() === 'true';
        }

        const changeKey = `${editingMapping.translationKey}`;
        setPendingChanges(prev => {
            const newChanges = new Map(prev);
            newChanges.set(changeKey, {
                key: editingMapping.translationKey,
                oldValue: languageKeys.find(k => k.key === editingMapping.translationKey)?.value,
                newValue: parsedValue,
            });
            return newChanges;
        });

        setHasChanges(true);
        setEditingMapping(null);
        setEditValue('');
    };

    const setValueByPath = (obj: any, dottedPath: string, value: any) => {
        const parts = dottedPath.split('.');
        let cursor = obj;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (part === undefined) continue;
            if (typeof (cursor as any)[part] !== 'object' || (cursor as any)[part] === null) {
                (cursor as any)[part] = {};
            }
            cursor = (cursor as any)[part];
        }
        const last = parts[parts.length - 1];
        if (last !== undefined) {
            (cursor as any)[last] = value;
        }
    };

    const generateLanguageChanges = (oldJson: any, newJson: any): LanguageChanges => {
        const fullDiff = diff.diff(oldJson, newJson, { full: true });
        const changes = createStructuredChanges(fullDiff);

        return {
            changes,
            timestamp: Date.now(),
            languageId: workflow.language!._id as Id<'languages'>,
            isPrimaryLanguage: workflow.version?.primaryLanguageId === workflow.language?._id,
        };
    };

    const handleSaveChanges = async () => {
        if (!workflow.language || pendingChanges.size === 0) return;

        setIsSaving(true);
        try {
            // Build new JSON by applying pending changes to the last fetched originalJson
            const newJson = JSON.parse(JSON.stringify(originalJson));
            for (const [, change] of pendingChanges) {
                setValueByPath(newJson, change.key, change.newValue);
            }

            const languageChanges = generateLanguageChanges(originalJson, newJson);

            await applyLanguageChanges({
                languageId: workflow.language._id,
                workspaceId,
                ...(languageChanges.changes !== undefined ? { languageChanges } : {}),
            });

            setOriginalJson(newJson);
            const keys = extractPrimitiveKeys(newJson);
            setLanguageKeys(keys);
            setPendingChanges(new Map());
            setHasChanges(false);

            alert('Changes saved successfully!');
        } catch (error) {
            console.error('Failed to save changes:', error);
            alert(error instanceof Error ? error.message : 'Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscardChanges = () => {
        if (confirm('Discard all unsaved changes?')) {
            setPendingChanges(new Map());
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
            setLanguageKeys([]);
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
                setOriginalJson(content);
                const keys = extractPrimitiveKeys(content);
                setLanguageKeys(keys);
            })
            .catch(error => {
                console.error('Error fetching language content:', error);
                setLanguageKeys([]);
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
        const keyToValue = new Map(languageKeys.map(k => [k.key, k.value]));
        const orphaned = memoizedMappings.filter(mapping => {
            const val = keyToValue.get(mapping.translationKey);
            if (val === undefined) return true;
            const isPrimitive = ['string', 'number', 'boolean'].includes(typeof val);
            return !isPrimitive;
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
                console.error('Auto cleanup of orphaned mappings failed:', err);
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
                                {hasChanges ? (
                                    <Button onClick={handleSaveChanges} isPending={isSaving} intent='primary'>
                                        {isSaving ? <Loader /> : 'Save Changes'} ({pendingChanges.size})
                                    </Button>
                                ) : null}
                                <Menu>
                                    <MenuTrigger className='size-6'>
                                        <EllipsisVerticalIcon />
                                    </MenuTrigger>
                                    <MenuContent placement='left top'>
                                        {hasChanges ? (
                                            <MenuItem intent='danger' onAction={handleDiscardChanges}>
                                                <TrashIcon /> Discard Changes
                                            </MenuItem>
                                        ) : null}
                                        <MenuItem onAction={onSwitchToEdit}>
                                            <PencilSquareIcon /> Switch to Edit
                                        </MenuItem>
                                    </MenuContent>
                                </Menu>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
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
                                                <span className='text-sm font-medium truncate'>
                                                    v{workflow.version?.version}
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
                                        <div>
                                            <Label>Namespace</Label>
                                            <Select
                                                value={draftNamespace?._id || ''}
                                                onValueChange={val => {
                                                    const ns = namespaces?.results?.find(
                                                        n => n._id === (val as Id<'namespaces'>)
                                                    );
                                                    setDraftNamespace(ns);
                                                    setDraftVersion(undefined);
                                                    setDraftLanguage(undefined);
                                                }}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder='Select namespace' />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {namespaces?.results?.map(ns => (
                                                        <SelectItem key={ns._id} value={ns._id}>
                                                            {ns.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Version</Label>
                                            <Select
                                                value={draftVersion?._id || ''}
                                                onValueChange={val => {
                                                    const v = versions?.results?.find(
                                                        vv => vv._id === (val as Id<'namespaceVersions'>)
                                                    );
                                                    setDraftVersion(v);
                                                    setDraftLanguage(undefined);
                                                }}
                                                disabled={!draftNamespace}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder='Select version' />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {versions?.results?.map(v => (
                                                        <SelectItem key={v._id} value={v._id}>
                                                            {v.version}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Language</Label>
                                            <Select
                                                value={draftLanguage?._id || ''}
                                                onValueChange={val => {
                                                    const lang = languages?.results?.find(
                                                        l => l._id === (val as Id<'languages'>)
                                                    );
                                                    setDraftLanguage(lang);
                                                }}
                                                disabled={!draftVersion}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder='Select language' />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {languages?.results?.map(l => (
                                                        <SelectItem key={l._id} value={l._id}>
                                                            {l.languageCode}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
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
