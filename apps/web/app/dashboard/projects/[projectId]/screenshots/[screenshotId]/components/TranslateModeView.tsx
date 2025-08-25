'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    ArrowLeft,
    Save,
    Trash2,
    Edit3,
    Languages,
    Unlock,
    Globe,
    GitBranch,
    Plus,
    MoreVertical,
    FileText,
} from 'lucide-react';
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
    const router = useRouter();

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
            <div className='h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800'>
                <div className='container mx-auto h-full flex flex-col px-4 sm:px-6 py-4 sm:py-6'>
                    <div className='bg-gray-950/50 border border-gray-800/50 rounded-xl p-4 sm:p-6 backdrop-blur-sm mb-4 sm:mb-6'>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center space-x-3 sm:space-x-4'>
                                <Button
                                    onClick={() => router.push(`/dashboard/projects/${projectId}`)}
                                    variant='ghost'
                                    size='icon'
                                    className='text-gray-400 hover:text-white'>
                                    <ArrowLeft className='h-4 w-4' />
                                </Button>
                                <div className='w-12 h-12 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-xl flex items-center justify-center border border-pink-500/20'>
                                    <Languages className='h-6 w-6 text-pink-400' />
                                </div>
                                <div>
                                    <h3 className='text-2xl font-semibold text-white'>Screenshot Editor</h3>
                                    <p className='text-gray-400 text-sm'>{screenshotName}</p>
                                </div>
                            </div>
                            <div className='flex items-center gap-2'>
                                {hasChanges ? (
                                    <Button
                                        onClick={handleSaveChanges}
                                        disabled={isSaving}
                                        className='bg-green-600 hover:bg-green-700 text-white'>
                                        {isSaving ? (
                                            <>
                                                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className='h-4 w-4 mr-2' />
                                                Save Changes ({pendingChanges.size})
                                            </>
                                        )}
                                    </Button>
                                ) : null}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            className='text-gray-400 hover:text-white hover:bg-gray-800/50'>
                                            <MoreVertical className='h-4 w-4' />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent align='end' className='w-56 bg-gray-900 border-gray-800 p-1'>
                                        <div className='flex flex-col'>
                                            {hasChanges ? (
                                                <Button
                                                    variant='ghost'
                                                    className='justify-start text-red-400 hover:text-white hover:bg-red-600/20'
                                                    onClick={handleDiscardChanges}>
                                                    <Trash2 className='h-3 w-3 mr-2' /> Discard Changes
                                                </Button>
                                            ) : null}
                                            <Button
                                                variant='ghost'
                                                className='justify-start text-blue-400 hover:text-white hover:bg-blue-600/20'
                                                onClick={onSwitchToEdit}>
                                                <Edit3 className='h-3 w-3 mr-2' /> Switch to Edit
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </div>

                    <div className='grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0'>
                        <div className='order-2 lg:order-1 lg:col-span-1 space-y-6 min-h-0 lg:overflow-y-auto lg:pr-1'>
                            {workflow.isLocked ? (
                                <div className='bg-gray-950/50 border border-gray-800/50 rounded-2xl p-4 sm:p-6 backdrop-blur-sm'>
                                    <div className='flex flex-col gap-3'>
                                        <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
                                            <div className='flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg min-w-0'>
                                                <Globe className='h-4 w-4 text-cyan-400 shrink-0' />
                                                <span className='text-sm font-medium text-white truncate'>
                                                    {workflow.namespace?.name}
                                                </span>
                                            </div>
                                            <div className='flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg min-w-0'>
                                                <GitBranch className='h-4 w-4 text-green-400 shrink-0' />
                                                <span className='text-sm font-medium text-white truncate'>
                                                    {workflow.version?.version}
                                                </span>
                                            </div>
                                            <div className='flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg min-w-0'>
                                                <Languages className='h-4 w-4 text-purple-400 shrink-0' />
                                                <span className='text-sm font-medium text-white truncate'>
                                                    {workflow.language?.languageCode}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleUnlockWorkflow}
                                            variant='outline'
                                            size='sm'
                                            className='text-yellow-400 border-yellow-400/50 hover:bg-yellow-400/10'>
                                            <Unlock className='h-4 w-4 mr-2' />
                                            Change Context
                                        </Button>
                                    </div>
                                </div>
                            ) : null}

                            {!workflow.isLocked ? (
                                <div className='bg-gray-950/50 border border-gray-800/50 rounded-2xl p-4 sm:p-6 backdrop-blur-sm'>
                                    <h3 className='text-lg font-semibold text-white mb-4'>
                                        Select Translation Context
                                    </h3>
                                    <div className='grid grid-cols-1 gap-4'>
                                        <div className='grid grid-cols-1 gap-4'>
                                            <div>
                                                <label className='block text-sm font-medium text-gray-300 mb-2'>
                                                    Namespace
                                                </label>
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
                                                    <SelectTrigger className='bg-gray-900 border-gray-700 text-white w-full'>
                                                        <SelectValue placeholder='Select namespace' />
                                                    </SelectTrigger>
                                                    <SelectContent className='bg-gray-900 border-gray-700 text-white'>
                                                        {namespaces?.results?.map(ns => (
                                                            <SelectItem
                                                                key={ns._id}
                                                                value={ns._id}
                                                                className='text-white'>
                                                                {ns.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <label className='block text-sm font-medium text-gray-300 mb-2'>
                                                    Version
                                                </label>
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
                                                    <SelectTrigger className='bg-gray-900 border-gray-700 text-white w-full'>
                                                        <SelectValue placeholder='Select version' />
                                                    </SelectTrigger>
                                                    <SelectContent className='bg-gray-900 border-gray-700 text-white'>
                                                        {versions?.results?.map(v => (
                                                            <SelectItem
                                                                key={v._id}
                                                                value={v._id}
                                                                className='text-white'>
                                                                {v.version}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <label className='block text-sm font-medium text-gray-300 mb-2'>
                                                    Language
                                                </label>
                                                <Select
                                                    value={draftLanguage?._id || ''}
                                                    onValueChange={val => {
                                                        const lang = languages?.results?.find(
                                                            l => l._id === (val as Id<'languages'>)
                                                        );
                                                        setDraftLanguage(lang);
                                                    }}
                                                    disabled={!draftVersion}>
                                                    <SelectTrigger className='bg-gray-900 border-gray-700 text-white w-full'>
                                                        <SelectValue placeholder='Select language' />
                                                    </SelectTrigger>
                                                    <SelectContent className='bg-gray-900 border-gray-700 text-white'>
                                                        {languages?.results?.map(l => (
                                                            <SelectItem
                                                                key={l._id}
                                                                value={l._id}
                                                                className='text-white'>
                                                                {l.languageCode}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className='flex gap-2 flex-wrap'>
                                            {didInitTranslateMode ? (
                                                <Button
                                                    variant='ghost'
                                                    onClick={handleCancelWorkflowContext}
                                                    className='text-gray-400 hover:text-white hover:bg-gray-800/50 flex-1'>
                                                    Cancel
                                                </Button>
                                            ) : null}
                                            <Button
                                                onClick={handleSaveWorkflowContext}
                                                disabled={!draftNamespace || !draftVersion || !draftLanguage}
                                                className='bg-white text-black hover:bg-gray-200 flex-1'>
                                                Save Context
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {selectedContainerId && workflow.isLocked ? (
                                <div className='bg-gray-950/50 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm flex flex-col min-h-0'>
                                    <h3 className='text-lg font-semibold text-white mb-4'>Container Details</h3>

                                    {selectedContainer?.description ? (
                                        <div className='mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg'>
                                            <div className='flex items-start space-x-2'>
                                                <FileText className='h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0' />
                                                <div>
                                                    <p className='text-sm font-medium text-blue-400 mb-1'>
                                                        Description
                                                    </p>
                                                    <p className='text-sm text-blue-200'>
                                                        {selectedContainer.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className='flex items-center justify-between'>
                                        <h4 className='text-md font-medium text-white'>Translation Keys</h4>
                                        <div className='flex items-center gap-2'>
                                            {memoizedMappings.length > 0 ? (
                                                <>
                                                    <span className='text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded'>
                                                        {memoizedMappings.length}
                                                    </span>
                                                    {unsavedCount > 0 ? (
                                                        <span className='text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 px-2 py-1 rounded'>
                                                            {unsavedCount}
                                                        </span>
                                                    ) : null}
                                                </>
                                            ) : null}
                                            {selectedContainerId && workflow.isLocked ? (
                                                <Button
                                                    size='icon'
                                                    variant='ghost'
                                                    onClick={() => setIsKeyDialogOpen(true)}
                                                    className='text-pink-400 hover:text-white hover:bg-pink-600/20'>
                                                    <Plus className='h-4 w-4' />
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                    {memoizedMappings.length === 0 ? (
                                        <p className='text-gray-400 text-sm mt-3'>No keys assigned to this container</p>
                                    ) : null}
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        onClick={() => setIsMappingsDialogOpen(true)}
                                        className='border-gray-600 text-gray-300 hover:bg-gray-800 mt-3'>
                                        Explore
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                        <div className='order-1 lg:order-2 lg:col-span-3 min-h-0'>{children}</div>
                    </div>
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
