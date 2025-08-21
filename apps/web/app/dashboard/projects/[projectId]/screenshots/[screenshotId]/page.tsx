'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import dynamic from 'next/dynamic';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Save,
    Languages,
    Search,
    Unlock,
    Edit3,
    Globe,
    GitBranch,
    Check,
    FileText,
} from 'lucide-react';
import { usePaginatedQuery, useQuery, useMutation, useAction } from 'convex/react';
import { useUser, useOrganization } from '@clerk/nextjs';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface Container {
    _id: Id<'screenshotContainers'>;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    backgroundColor?: string;
    description?: string;
    createdAt: number;
    updatedAt: number;
}

interface KeyMapping {
    _id: Id<'screenshotKeyMappings'>;
    containerId: Id<'screenshotContainers'>;
    translationKey: string;
    valueType: 'string' | 'number' | 'boolean';
    currentValue: string | number | boolean | null;
    updatedAt: number;
}

interface TranslationKey {
    key: string;
    value: string | number | boolean;
    type: 'string' | 'number' | 'boolean';
}

interface WorkflowState {
    namespace?: any;
    version?: any;
    language?: any;
    isLocked: boolean;
}

type Mode = 'edit' | 'translate';

// Dynamic import for Konva canvas component
const ScreenshotCanvas = dynamic(() => import('@/components/konva'), {
    ssr: false,
    loading: () => (
        <div className='bg-gray-950/50 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm'>
            <div className='text-center py-16'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4'></div>
                <p className='text-gray-400'>Loading canvas...</p>
            </div>
        </div>
    ),
});

export default function ScreenshotEditorPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useUser();
    const { organization } = useOrganization();
    const params = useParams();
    const projectId = params?.projectId as Id<'projects'>;
    const screenshotId = params?.screenshotId as Id<'screenshots'>;

    // Get mode from URL params, null if not set
    const urlMode = searchParams.get('mode') as Mode;
    const mode: Mode = urlMode || 'edit';
    const showModeSelection = !urlMode; // Show mode selection if no mode in URL

    // State
    const [canvasImage, setCanvasImage] = useState<HTMLImageElement | null>(null);
    const [selectedContainerId, setSelectedContainerId] = useState<Id<'screenshotContainers'> | null>(null);
    const [isAddingContainer, setIsAddingContainer] = useState(false);

    // Edit mode state
    const [containerColor, setContainerColor] = useState('#3b82f6');
    const [editingDescription, setEditingDescription] = useState<Id<'screenshotContainers'> | null>(null);
    const [tempDescription, setTempDescription] = useState('');

    // Translate mode state
    const [workflow, setWorkflow] = useState<WorkflowState>({ isLocked: false });
    const [selectedKey, setSelectedKey] = useState<TranslationKey | null>(null);
    const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);

    // Value editing state
    const [editingMapping, setEditingMapping] = useState<KeyMapping | null>(null);
    const [editValue, setEditValue] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Get current workspace
    const clerkId = organization?.id || user?.id;
    const currentWorkspace = useQuery(api.workspaces.getWorkspaceWithSubscription, clerkId ? { clerkId } : 'skip');

    // Get project info
    const project = useQuery(
        api.projects.getProject,
        projectId && currentWorkspace ? { projectId, workspaceId: currentWorkspace._id } : 'skip'
    );

    // Get screenshot info (targeted query for single screenshot)
    const currentScreenshot = useQuery(
        api.screenshots.getScreenshot,
        screenshotId && currentWorkspace ? { screenshotId, workspaceId: currentWorkspace._id } : 'skip'
    );

    // Get containers
    const containers = useQuery(
        api.screenshots.getContainersForScreenshot,
        screenshotId && currentWorkspace ? { screenshotId, workspaceId: currentWorkspace._id } : 'skip'
    );

    // Get namespaces for workflow selection
    const namespaces = usePaginatedQuery(
        api.namespaces.getNamespaces,
        mode === 'translate' && projectId && currentWorkspace
            ? { projectId, workspaceId: currentWorkspace._id }
            : 'skip',
        { initialNumItems: 20 }
    );

    // Get versions for selected namespace
    const versions = usePaginatedQuery(
        api.namespaceVersions.getNamespaceVersions,
        mode === 'translate' && workflow.namespace && currentWorkspace
            ? { namespaceId: workflow.namespace._id, workspaceId: currentWorkspace._id }
            : 'skip',
        { initialNumItems: 20 }
    );

    // Get languages for selected version
    const languages = usePaginatedQuery(
        api.languages.getLanguages,
        mode === 'translate' && workflow.version && currentWorkspace
            ? { namespaceVersionId: workflow.version._id, workspaceId: currentWorkspace._id }
            : 'skip',
        { initialNumItems: 20 }
    );

    // Get container mappings (only in translate mode when container is selected)
    const containerMappings = usePaginatedQuery(
        api.screenshots.getContainerMappings,
        mode === 'translate' && selectedContainerId && workflow.version && workflow.language && currentWorkspace
            ? {
                  containerId: selectedContainerId,
                  namespaceVersionId: workflow.version._id,
                  languageId: workflow.language._id,
                  workspaceId: currentWorkspace._id,
              }
            : 'skip',
        { initialNumItems: 20 }
    );

    // Get language content for key selection
    const getLanguageContent = useAction(api.languages.getLanguageContent);
    const [languageKeys, setLanguageKeys] = useState<TranslationKey[]>([]);
    const [keySearchTerm, setKeySearchTerm] = useState('');
    const [filteredKeys, setFilteredKeys] = useState<TranslationKey[]>([]);
    const [isLoadingKeys, setIsLoadingKeys] = useState(false);
    const [orphanedMappings, setOrphanedMappings] = useState<KeyMapping[]>([]);

    // Mutations
    const createContainer = useMutation(api.screenshots.createContainer);
    const updateContainer = useMutation(api.screenshots.updateContainer);
    const deleteContainer = useMutation(api.screenshots.deleteContainer);
    const assignKeyToContainer = useMutation(api.screenshots.assignKeyToContainer);
    const removeKeyFromContainer = useMutation(api.screenshots.removeKeyFromContainer);
    const applyLanguageChanges = useAction(api.languages.applyChangeOperations);

    // Load canvas image
    useEffect(() => {
        if (currentScreenshot?.imageUrl) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                setCanvasImage(img);
            };
            img.src = currentScreenshot.imageUrl;
        }
    }, [currentScreenshot?.imageUrl]);

    const handleGoBack = () => {
        if (project) {
            router.push(`/dashboard/projects/${project._id}`);
        } else {
            router.push('/dashboard');
        }
    };

    // Edit mode handlers
    const handleAddContainer = async (x: number, y: number) => {
        if (!currentWorkspace || !screenshotId) return;

        try {
            await createContainer({
                screenshotId,
                position: {
                    x: Math.max(0, Math.min(85, x - 7.5)),
                    y: Math.max(0, Math.min(90, y - 5)),
                    width: 15,
                    height: 10,
                },
                backgroundColor: containerColor,
                workspaceId: currentWorkspace._id,
            });

            setIsAddingContainer(false);
        } catch (error) {
            console.error('Failed to create container:', error);
            alert(error instanceof Error ? error.message : 'Failed to create container');
        }
    };

    const handleEditDescription = (containerId: Id<'screenshotContainers'>, currentDescription?: string) => {
        setEditingDescription(containerId);
        setTempDescription(currentDescription || '');
    };

    const handleSaveDescription = async () => {
        if (!editingDescription || !currentWorkspace) return;

        try {
            await updateContainer({
                containerId: editingDescription,
                description: tempDescription.trim() || undefined,
                workspaceId: currentWorkspace._id,
            });

            setEditingDescription(null);
            setTempDescription('');
        } catch (error) {
            console.error('Failed to update description:', error);
            alert(error instanceof Error ? error.message : 'Failed to update description');
        }
    };

    const handleCancelDescription = () => {
        setEditingDescription(null);
        setTempDescription('');
    };

    const handleCanvasClick = (e: any) => {
        if (mode === 'edit' && isAddingContainer) {
            const stage = e.target.getStage();
            const layer = stage.findOne('Layer');
            const image = layer?.findOne('Image');

            if (!image) return;

            const pointer = stage.getPointerPosition();

            // Convert screen coordinates to image coordinates accounting for pan/zoom
            const transform = stage.getAbsoluteTransform().copy();
            transform.invert();
            const pos = transform.point(pointer);

            const imageWidth = image.width();
            const imageHeight = image.height();

            const x = (pos.x / imageWidth) * 100;
            const y = (pos.y / imageHeight) * 100;

            handleAddContainer(x, y);
        }
    };

    const handleContainerUpdate = async (containerId: Id<'screenshotContainers'>, position: Container['position']) => {
        if (!currentWorkspace) return;

        try {
            await updateContainer({
                containerId,
                position,
                workspaceId: currentWorkspace._id,
            });
        } catch (error) {
            console.error('Failed to update container:', error);
        }
    };

    const handleContainerDelete = async (containerId: Id<'screenshotContainers'>) => {
        if (!currentWorkspace || !confirm('Delete this container and all its key mappings?')) return;

        try {
            await deleteContainer({
                containerId,
                workspaceId: currentWorkspace._id,
            });
        } catch (error) {
            console.error('Failed to delete container:', error);
        }
    };

    // Workflow selection handlers
    const handleNamespaceSelect = (namespace: any) => {
        setWorkflow(prev => ({
            ...prev,
            namespace,
            version: undefined,
            language: undefined,
            isLocked: false,
        }));
    };

    const handleVersionSelect = (version: any) => {
        setWorkflow(prev => ({
            ...prev,
            version,
            language: undefined,
            isLocked: false,
        }));
    };

    const handleLanguageSelect = (language: any) => {
        setWorkflow(prev => ({
            ...prev,
            language,
            isLocked: true,
        }));
    };

    const handleUnlockWorkflow = () => {
        setWorkflow(prev => ({ ...prev, isLocked: false }));
        setSelectedContainerId(null);
    };

    // Load language keys when language is selected
    useEffect(() => {
        if (!workflow.language || !currentWorkspace) {
            setLanguageKeys([]);
            setOrphanedMappings([]);
            return;
        }

        setIsLoadingKeys(true);
        getLanguageContent({
            languageId: workflow.language._id,
            workspaceId: currentWorkspace._id,
        })
            .then(result => {
                const keys = extractPrimitiveKeys(result || {});
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
    }, [workflow.language, currentWorkspace, getLanguageContent]);

    // Memoize container mappings results to prevent infinite re-renders
    const memoizedMappings = useMemo(() => {
        return containerMappings?.results || [];
    }, [containerMappings?.results?.length, selectedContainerId]);

    // Check for orphaned mappings when language keys change
    useEffect(() => {
        if (languageKeys.length > 0 && containerMappings?.results && containerMappings.results.length > 0) {
            const validKeyPaths = new Set(languageKeys.map(k => k.key));
            const orphaned = containerMappings.results.filter(mapping => !validKeyPaths.has(mapping.translationKey));
            setOrphanedMappings(orphaned);
        } else {
            setOrphanedMappings([]);
        }
    }, [languageKeys]);

    // Filter keys based on search
    useEffect(() => {
        if (!keySearchTerm) {
            setFilteredKeys(languageKeys.slice(0, 20));
        } else {
            const filtered = languageKeys.filter(
                key =>
                    key.key.toLowerCase().includes(keySearchTerm.toLowerCase()) ||
                    String(key.value).toLowerCase().includes(keySearchTerm.toLowerCase())
            );
            setFilteredKeys(filtered.slice(0, 20));
        }
    }, [languageKeys, keySearchTerm]);

    const extractPrimitiveKeys = useCallback((obj: any, prefix = ''): TranslationKey[] => {
        const keys: TranslationKey[] = [];

        Object.entries(obj).forEach(([key, value]) => {
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                keys.push({
                    key: fullKey,
                    value,
                    type: typeof value as 'string' | 'number' | 'boolean',
                });
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                keys.push(...extractPrimitiveKeys(value, fullKey));
            }
        });

        return keys;
    }, []);

    // Track changes when mappings are edited
    const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map());

    // Translate mode handlers
    const handleAssignKey = async (key: TranslationKey) => {
        if (!selectedContainerId || !workflow.version || !workflow.language || !currentWorkspace) return;

        try {
            await assignKeyToContainer({
                containerId: selectedContainerId,
                namespaceVersionId: workflow.version._id,
                languageId: workflow.language._id,
                translationKey: key.key,
                valueType: key.type,
                currentValue: key.value,
                workspaceId: currentWorkspace._id,
            });

            setSelectedKey(null);
            setIsKeyDialogOpen(false);
        } catch (error) {
            console.error('Failed to assign key:', error);
            alert(error instanceof Error ? error.message : 'Failed to assign key');
        }
    };

    const handleEditMapping = (mapping: KeyMapping) => {
        setEditingMapping(mapping);
        setEditValue(String(mapping.currentValue || ''));
    };

    const handleSaveValue = () => {
        if (!editingMapping) return;

        let parsedValue: string | number | boolean = editValue;

        // Parse value based on type
        if (editingMapping.valueType === 'number') {
            parsedValue = parseFloat(editValue) || 0;
        } else if (editingMapping.valueType === 'boolean') {
            parsedValue = editValue.toLowerCase() === 'true';
        }

        // Track the change
        const changeKey = `${editingMapping.translationKey}`;
        setPendingChanges(prev => {
            const newChanges = new Map(prev);
            newChanges.set(changeKey, {
                key: editingMapping.translationKey,
                oldValue: editingMapping.currentValue,
                newValue: parsedValue,
                type: editingMapping.valueType,
            });
            return newChanges;
        });

        setHasChanges(true);
        setEditingMapping(null);
        setEditValue('');
    };

    const handleSaveChanges = async () => {
        if (!workflow.language || !currentWorkspace || pendingChanges.size === 0) return;

        setIsSaving(true);
        try {
            // Convert pending changes to the format expected by applyChangeOperations
            const changes: any = {};

            for (const [key, change] of pendingChanges) {
                // Build nested object structure for the key
                const keyParts = change.key.split('.');
                let current = changes;

                for (let i = 0; i < keyParts.length - 1; i++) {
                    if (!current[keyParts[i]]) {
                        current[keyParts[i]] = {};
                    }
                    current = current[keyParts[i]];
                }

                current[keyParts[keyParts.length - 1]] = change.newValue;
            }

            await applyLanguageChanges({
                languageId: workflow.language._id,
                workspaceId: currentWorkspace._id,
                languageChanges: {
                    changes,
                    timestamp: Date.now(),
                    languageId: workflow.language._id,
                    isPrimaryLanguage: false, // Assume non-primary for now
                },
            });

            // Clear pending changes
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

    const handleCleanupOrphanedMappings = async () => {
        if (!currentWorkspace || !workflow.language || orphanedMappings.length === 0) return;

        const confirmMessage = `Found ${orphanedMappings.length} orphaned mappings (keys that no longer exist in the language file). Remove them?`;
        if (!confirm(confirmMessage)) return;

        try {
            // Remove all orphaned mappings
            for (const mapping of orphanedMappings) {
                await removeKeyFromContainer({
                    containerId: mapping.containerId,
                    languageId: workflow.language._id,
                    translationKey: mapping.translationKey,
                    workspaceId: currentWorkspace._id,
                });
            }

            setOrphanedMappings([]);
            alert(`Removed ${orphanedMappings.length} orphaned mappings.`);
        } catch (error) {
            console.error('Failed to cleanup orphaned mappings:', error);
            alert('Failed to cleanup orphaned mappings. Please try again.');
        }
    };

    // Get the current value for a mapping (including pending changes)
    const getCurrentValue = (mapping: KeyMapping) => {
        const changeKey = `${mapping.translationKey}`;
        const pendingChange = pendingChanges.get(changeKey);
        return pendingChange ? pendingChange.newValue : mapping.currentValue;
    };

    // Handle mode selection
    const handleModeSelect = (selectedMode: Mode) => {
        router.push(`/dashboard/projects/${projectId}/screenshots/${screenshotId}?mode=${selectedMode}`);
    };

    if (!project || !currentWorkspace || !currentScreenshot || !canvasImage) {
        return (
            <div className='min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center'>
                <div className='text-center'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4'></div>
                    <p className='text-gray-400'>Loading screenshot editor...</p>
                </div>
            </div>
        );
    }

    // Show mode selection if no mode specified in URL
    if (showModeSelection) {
        return (
            <div className='min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800'>
                <div className='container mx-auto px-6 py-8'>
                    {/* Header */}
                    <div className='flex items-center justify-between mb-8'>
                        <div className='flex items-center space-x-4'>
                            <Button
                                onClick={handleGoBack}
                                variant='ghost'
                                size='sm'
                                className='text-gray-400 hover:text-white'>
                                <ArrowLeft className='h-4 w-4 mr-2' />
                                Back to Project
                            </Button>
                            <div>
                                <h1 className='text-2xl font-bold text-white'>
                                    Choose Editor Mode: {currentScreenshot.name}
                                </h1>
                                <p className='text-gray-400'>Select how you want to work with this screenshot</p>
                            </div>
                        </div>
                    </div>

                    {/* Mode Selection Cards */}
                    <div className='max-w-4xl mx-auto'>
                        <div className='grid md:grid-cols-2 gap-6'>
                            {/* Edit Mode Card */}
                            <button
                                onClick={() => handleModeSelect('edit')}
                                className='group bg-gray-950/50 border border-gray-800/50 rounded-2xl p-8 backdrop-blur-sm cursor-pointer transition-all duration-200 hover:border-blue-500/50 hover:bg-blue-500/5'>
                                <div className='flex items-center space-x-4 mb-6'>
                                    <div className='w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/20 transition-colors'>
                                        <Edit3 className='h-8 w-8 text-blue-400' />
                                    </div>
                                    <div>
                                        <h2 className='text-xl font-bold text-white group-hover:text-blue-300 transition-colors'>
                                            Edit Mode
                                        </h2>
                                        <p className='text-blue-400 text-sm font-medium'>Container Placement</p>
                                    </div>
                                </div>

                                <div className='space-y-4'>
                                    <p className='text-gray-300 leading-relaxed'>
                                        Place and configure translation containers on your screenshot. Perfect for
                                        setting up the visual mapping before translation work begins.
                                    </p>

                                    <div className='space-y-2'>
                                        <h3 className='text-sm font-medium text-blue-400'>What you can do:</h3>
                                        <ul className='space-y-1 text-sm text-gray-400'>
                                            <li>• Add containers to mark text elements</li>
                                            <li>• Resize and position containers precisely</li>
                                            <li>• Customize container colors</li>
                                            <li>• Add optional descriptions for context</li>
                                        </ul>
                                    </div>

                                    <div className='pt-4'>
                                        <Button className='w-full bg-blue-600 hover:bg-blue-700 text-white group-hover:bg-blue-500 transition-colors'>
                                            <Edit3 className='h-4 w-4 mr-2' />
                                            Start Editing Containers
                                        </Button>
                                    </div>
                                </div>
                            </button>

                            {/* Translate Mode Card */}
                            <button
                                onClick={() => handleModeSelect('translate')}
                                className='group bg-gray-950/50 border border-gray-800/50 rounded-2xl p-8 backdrop-blur-sm cursor-pointer transition-all duration-200 hover:border-pink-500/50 hover:bg-pink-500/5'>
                                <div className='flex items-center space-x-4 mb-6'>
                                    <div className='w-16 h-16 bg-pink-500/10 border border-pink-500/20 rounded-xl flex items-center justify-center group-hover:bg-pink-500/20 transition-colors'>
                                        <Languages className='h-8 w-8 text-pink-400' />
                                    </div>
                                    <div>
                                        <h2 className='text-xl font-bold text-white group-hover:text-pink-300 transition-colors'>
                                            Translate Mode
                                        </h2>
                                        <p className='text-pink-400 text-sm font-medium'>
                                            Key Assignment & Translation
                                        </p>
                                    </div>
                                </div>

                                <div className='space-y-4'>
                                    <p className='text-gray-300 leading-relaxed'>
                                        Work with existing containers to assign translation keys and edit values. Ideal
                                        for the actual translation workflow.
                                    </p>

                                    <div className='space-y-2'>
                                        <h3 className='text-sm font-medium text-pink-400'>What you can do:</h3>
                                        <ul className='space-y-1 text-sm text-gray-400'>
                                            <li>• Select namespace, version, and language</li>
                                            <li>• Assign translation keys to containers</li>
                                            <li>• Edit translation values inline</li>
                                            <li>• Save changes back to language files</li>
                                        </ul>
                                    </div>

                                    <div className='pt-4'>
                                        <Button className='w-full bg-pink-600 hover:bg-pink-700 text-white group-hover:bg-pink-500 transition-colors'>
                                            <Languages className='h-4 w-4 mr-2' />
                                            Start Translating
                                        </Button>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Info Section */}
                        <div className='mt-8 p-6 bg-gray-950/30 border border-gray-800/30 rounded-xl'>
                            <div className='flex items-center space-x-3 mb-3'>
                                <div className='w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center'>
                                    <span className='text-yellow-400 text-sm'>💡</span>
                                </div>
                                <h3 className='text-sm font-medium text-yellow-400'>Workflow Tip</h3>
                            </div>
                            <p className='text-sm text-gray-400 leading-relaxed'>
                                <strong className='text-white'>Recommended workflow:</strong> Start with{' '}
                                <span className='text-blue-400'>Edit Mode</span> to place and configure all your
                                containers first, then switch to <span className='text-pink-400'>Translate Mode</span>{' '}
                                to assign keys and translate content. You can switch between modes at any time.
                            </p>
                        </div>

                        {/* Screenshot Preview */}
                        <div className='mt-8'>
                            <h3 className='text-lg font-semibold text-white mb-4'>Screenshot Preview</h3>
                            <div className='bg-gray-900 rounded-xl p-4 border border-gray-700'>
                                <img
                                    src={currentScreenshot.imageUrl ?? undefined}
                                    alt={currentScreenshot.name}
                                    className='w-full max-h-64 object-contain rounded-lg'
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800'>
            <div className='container mx-auto px-6 py-8'>
                {/* Header */}
                <div className='flex items-center justify-between mb-8'>
                    <div className='flex items-center space-x-4'>
                        <Button
                            onClick={handleGoBack}
                            variant='ghost'
                            size='sm'
                            className='text-gray-400 hover:text-white'>
                            <ArrowLeft className='h-4 w-4 mr-2' />
                            Back to Project
                        </Button>
                        <div>
                            <h1 className='text-2xl font-bold text-white'>
                                {mode === 'edit' ? 'Edit Containers' : 'Translate Mode'}: {currentScreenshot.name}
                            </h1>
                            <p className='text-gray-400'>
                                {mode === 'edit'
                                    ? 'Place containers on text elements you want to translate'
                                    : 'Assign translation keys to containers'}
                            </p>
                        </div>
                    </div>

                    <div className='flex items-center space-x-3'>
                        {mode === 'edit' ? (
                            <>
                                <input
                                    type='color'
                                    value={containerColor}
                                    onChange={e => setContainerColor(e.target.value)}
                                    className='w-10 h-10 rounded-lg border border-gray-600 cursor-pointer'
                                />
                                <Button
                                    onClick={() => setIsAddingContainer(true)}
                                    disabled={isAddingContainer}
                                    className='bg-blue-600 hover:bg-blue-700 text-white'>
                                    <Plus className='h-4 w-4 mr-2' />
                                    {isAddingContainer ? 'Click to Place' : 'Add Container'}
                                </Button>
                                <Button
                                    onClick={() =>
                                        router.push(
                                            `/dashboard/projects/${projectId}/screenshots/${screenshotId}?mode=translate`
                                        )
                                    }
                                    variant='outline'
                                    className='border-pink-600 text-pink-400 hover:bg-pink-600/10'>
                                    <Languages className='h-4 w-4 mr-2' />
                                    Switch to Translate
                                </Button>
                            </>
                        ) : (
                            <>
                                {selectedContainerId && workflow.isLocked && (
                                    <Button
                                        onClick={() => setIsKeyDialogOpen(true)}
                                        className='bg-pink-600 hover:bg-pink-700 text-white'>
                                        <Plus className='h-4 w-4 mr-2' />
                                        Assign Key
                                    </Button>
                                )}
                                {hasChanges && (
                                    <div className='flex items-center space-x-2'>
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
                                        <Button
                                            onClick={handleDiscardChanges}
                                            variant='outline'
                                            className='border-red-600 text-red-400 hover:bg-red-600/10'>
                                            Discard
                                        </Button>
                                    </div>
                                )}
                                <Button
                                    onClick={() =>
                                        router.push(
                                            `/dashboard/projects/${projectId}/screenshots/${screenshotId}?mode=edit`
                                        )
                                    }
                                    variant='outline'
                                    className='border-blue-600 text-blue-400 hover:bg-blue-600/10'>
                                    <Edit3 className='h-4 w-4 mr-2' />
                                    Switch to Edit
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
                    {/* Left Sidebar - Mode specific controls */}
                    <div className='lg:col-span-1 space-y-6 min-h-0 lg:sticky lg:top-8 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1'>
                        {mode === 'translate' && (
                            <>
                                {/* Workflow Header */}
                                {workflow.isLocked && (
                                    <div className='bg-gray-950/50 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm'>
                                        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                                            <div className='flex flex-wrap items-center gap-2'>
                                                <div className='flex items-center space-x-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg min-w-0'>
                                                    <Globe className='h-4 w-4 text-cyan-400' />
                                                    <span className='text-sm font-medium text-white truncate'>
                                                        {workflow.namespace?.name}
                                                    </span>
                                                </div>
                                                <div className='flex items-center space-x-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg min-w-0'>
                                                    <GitBranch className='h-4 w-4 text-green-400' />
                                                    <span className='text-sm font-medium text-white truncate'>
                                                        {workflow.version?.version}
                                                    </span>
                                                </div>
                                                <div className='flex items-center space-x-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg min-w-0'>
                                                    <Languages className='h-4 w-4 text-purple-400' />
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
                                )}

                                {/* Workflow Selection */}
                                {!workflow.isLocked && (
                                    <div className='bg-gray-950/50 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm'>
                                        <h3 className='text-lg font-semibold text-white mb-4'>
                                            Select Translation Context
                                        </h3>
                                        <div className='bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4'>
                                            <div className='flex items-start space-x-2'>
                                                <span className='text-amber-400 text-sm'>⚠️</span>
                                                <div className='text-amber-200 text-xs'>
                                                    <strong>Required:</strong> You must select namespace, version, and
                                                    language before you can start translating containers.
                                                </div>
                                            </div>
                                        </div>

                                        <div className='space-y-4'>
                                            {/* Namespace Selection */}
                                            <div>
                                                <label className='block text-sm font-medium text-gray-300 mb-2'>
                                                    1. Select Namespace
                                                </label>
                                                {namespaces?.status === 'LoadingFirstPage' ? (
                                                    <div className='flex items-center justify-center py-4'>
                                                        <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500'></div>
                                                    </div>
                                                ) : namespaces?.results?.length && namespaces.results.length > 6 ? (
                                                    <ScrollArea className='h-48'>
                                                        <div className='space-y-1 pr-4'>
                                                            {namespaces.results.map(namespace => (
                                                                <div
                                                                    key={namespace._id}
                                                                    onClick={() => handleNamespaceSelect(namespace)}
                                                                    className={`p-2 rounded-lg border cursor-pointer transition-all ${
                                                                        workflow.namespace?._id === namespace._id
                                                                            ? 'bg-cyan-500/10 border-cyan-500/30'
                                                                            : 'bg-gray-800/30 border-gray-700/30 hover:border-gray-600/50'
                                                                    }`}>
                                                                    <div className='flex items-center justify-between'>
                                                                        <span className='text-sm text-white'>
                                                                            {namespace.name}
                                                                        </span>
                                                                        {workflow.namespace?._id === namespace._id && (
                                                                            <Check className='h-4 w-4 text-cyan-400' />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </ScrollArea>
                                                ) : (
                                                    <div className='space-y-1'>
                                                        {namespaces?.results?.map(namespace => (
                                                            <div
                                                                key={namespace._id}
                                                                onClick={() => handleNamespaceSelect(namespace)}
                                                                className={`p-2 rounded-lg border cursor-pointer transition-all ${
                                                                    workflow.namespace?._id === namespace._id
                                                                        ? 'bg-cyan-500/10 border-cyan-500/30'
                                                                        : 'bg-gray-800/30 border-gray-700/30 hover:border-gray-600/50'
                                                                }`}>
                                                                <div className='flex items-center justify-between'>
                                                                    <span className='text-sm text-white'>
                                                                        {namespace.name}
                                                                    </span>
                                                                    {workflow.namespace?._id === namespace._id && (
                                                                        <Check className='h-4 w-4 text-cyan-400' />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Version Selection */}
                                            {workflow.namespace && (
                                                <div>
                                                    <label className='block text-sm font-medium text-gray-300 mb-2'>
                                                        2. Select Version
                                                    </label>
                                                    {versions?.status === 'LoadingFirstPage' ? (
                                                        <div className='flex items-center justify-center py-4'>
                                                            <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500'></div>
                                                        </div>
                                                    ) : versions?.results?.length && versions.results.length > 6 ? (
                                                        <ScrollArea className='h-48'>
                                                            <div className='space-y-1 pr-4'>
                                                                {versions.results.map(version => (
                                                                    <div
                                                                        key={version._id}
                                                                        onClick={() => handleVersionSelect(version)}
                                                                        className={`p-2 rounded-lg border cursor-pointer transition-all ${
                                                                            workflow.version?._id === version._id
                                                                                ? 'bg-green-500/10 border-green-500/30'
                                                                                : 'bg-gray-800/30 border-gray-700/30 hover:border-gray-600/50'
                                                                        }`}>
                                                                        <div className='flex items-center justify-between'>
                                                                            <span className='text-sm text-white'>
                                                                                {version.version}
                                                                            </span>
                                                                            {workflow.version?._id === version._id && (
                                                                                <Check className='h-4 w-4 text-green-400' />
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </ScrollArea>
                                                    ) : (
                                                        <div className='space-y-1'>
                                                            {versions?.results?.map(version => (
                                                                <div
                                                                    key={version._id}
                                                                    onClick={() => handleVersionSelect(version)}
                                                                    className={`p-2 rounded-lg border cursor-pointer transition-all ${
                                                                        workflow.version?._id === version._id
                                                                            ? 'bg-green-500/10 border-green-500/30'
                                                                            : 'bg-gray-800/30 border-gray-700/30 hover:border-gray-600/50'
                                                                    }`}>
                                                                    <div className='flex items-center justify-between'>
                                                                        <span className='text-sm text-white'>
                                                                            {version.version}
                                                                        </span>
                                                                        {workflow.version?._id === version._id && (
                                                                            <Check className='h-4 w-4 text-green-400' />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Language Selection */}
                                            {workflow.version && (
                                                <div>
                                                    <label className='block text-sm font-medium text-gray-300 mb-2'>
                                                        3. Select Language
                                                    </label>
                                                    {languages?.status === 'LoadingFirstPage' ? (
                                                        <div className='flex items-center justify-center py-4'>
                                                            <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500'></div>
                                                        </div>
                                                    ) : languages?.results?.length && languages.results.length > 6 ? (
                                                        <ScrollArea className='h-48'>
                                                            <div className='space-y-1 pr-4'>
                                                                {languages.results.map(language => (
                                                                    <div
                                                                        key={language._id}
                                                                        onClick={() => handleLanguageSelect(language)}
                                                                        className={`p-2 rounded-lg border cursor-pointer transition-all ${
                                                                            workflow.language?._id === language._id
                                                                                ? 'bg-purple-500/10 border-purple-500/30'
                                                                                : 'bg-gray-800/30 border-gray-700/30 hover:border-gray-600/50'
                                                                        }`}>
                                                                        <div className='flex items-center justify-between'>
                                                                            <span className='text-sm text-white'>
                                                                                {language.languageCode}
                                                                            </span>
                                                                            {workflow.language?._id ===
                                                                                language._id && (
                                                                                <Check className='h-4 w-4 text-purple-400' />
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </ScrollArea>
                                                    ) : (
                                                        <div className='space-y-1'>
                                                            {languages?.results?.map(language => (
                                                                <div
                                                                    key={language._id}
                                                                    onClick={() => handleLanguageSelect(language)}
                                                                    className={`p-2 rounded-lg border cursor-pointer transition-all ${
                                                                        workflow.language?._id === language._id
                                                                            ? 'bg-purple-500/10 border-purple-500/30'
                                                                            : 'bg-gray-800/30 border-gray-700/30 hover:border-gray-600/50'
                                                                    }`}>
                                                                    <div className='flex items-center justify-between'>
                                                                        <span className='text-sm text-white'>
                                                                            {language.languageCode}
                                                                        </span>
                                                                        {workflow.language?._id === language._id && (
                                                                            <Check className='h-4 w-4 text-purple-400' />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Selected Container Info */}
                                {selectedContainerId && workflow.isLocked && (
                                    <div className='bg-gray-950/50 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm flex flex-col min-h-0'>
                                        <h3 className='text-lg font-semibold text-white mb-4'>Container Details</h3>

                                        {/* Container Description */}
                                        {(() => {
                                            const selectedContainer = containers?.find(
                                                c => c._id === selectedContainerId
                                            );
                                            if (selectedContainer?.description) {
                                                return (
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
                                                );
                                            }
                                            return null;
                                        })()}

                                        <div className='flex items-center justify-between mb-3'>
                                            <h4 className='text-md font-medium text-white'>Translation Keys</h4>
                                            {memoizedMappings.length > 0 && (
                                                <span className='text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded'>
                                                    {memoizedMappings.length} keys
                                                </span>
                                            )}
                                        </div>
                                        {memoizedMappings.length > 0 ? (
                                            <>
                                                <div className='flex-1 min-h-0'>
                                                    <ScrollArea className='h-full'>
                                                        <div className='space-y-2 pr-4'>
                                                            {memoizedMappings.map(mapping => {
                                                                const currentValue = getCurrentValue(mapping);
                                                                const hasChange = pendingChanges.has(
                                                                    `${mapping.translationKey}`
                                                                );
                                                                const isEditing = editingMapping?._id === mapping._id;

                                                                return (
                                                                    <div
                                                                        key={mapping._id}
                                                                        className={`p-3 rounded-lg border ${
                                                                            hasChange
                                                                                ? 'bg-yellow-500/10 border-yellow-500/30'
                                                                                : 'bg-gray-800/50 border-gray-700/50'
                                                                        }`}>
                                                                        {isEditing ? (
                                                                            <div className='space-y-2'>
                                                                                <p className='text-sm font-medium text-white'>
                                                                                    {mapping.translationKey}
                                                                                </p>
                                                                                <div className='flex items-center space-x-2'>
                                                                                    <Input
                                                                                        value={editValue}
                                                                                        onChange={e =>
                                                                                            setEditValue(e.target.value)
                                                                                        }
                                                                                        className='flex-1 bg-gray-700 border-gray-600 text-white'
                                                                                        placeholder={`Enter ${mapping.valueType} value`}
                                                                                    />
                                                                                    <Button
                                                                                        size='sm'
                                                                                        onClick={handleSaveValue}
                                                                                        className='bg-green-600 hover:bg-green-700'>
                                                                                        <Check className='h-3 w-3' />
                                                                                    </Button>
                                                                                    <Button
                                                                                        size='sm'
                                                                                        variant='outline'
                                                                                        onClick={() => {
                                                                                            setEditingMapping(null);
                                                                                            setEditValue('');
                                                                                        }}>
                                                                                        ×
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className='flex items-center justify-between'>
                                                                                <div
                                                                                    className='flex-1'
                                                                                    onClick={() =>
                                                                                        handleEditMapping(mapping)
                                                                                    }
                                                                                    style={{ cursor: 'pointer' }}>
                                                                                    <p className='text-sm font-medium text-white'>
                                                                                        {mapping.translationKey}
                                                                                    </p>
                                                                                    <div className='flex items-center space-x-2'>
                                                                                        <p
                                                                                            className={`text-xs ${
                                                                                                hasChange
                                                                                                    ? 'text-yellow-400'
                                                                                                    : 'text-gray-400'
                                                                                            }`}>
                                                                                            {String(currentValue)}
                                                                                        </p>
                                                                                        {hasChange && (
                                                                                            <span className='text-xs text-yellow-400 font-medium'>
                                                                                                • Modified
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <div className='flex items-center space-x-1'>
                                                                                    <Button
                                                                                        size='sm'
                                                                                        variant='ghost'
                                                                                        onClick={() =>
                                                                                            handleEditMapping(mapping)
                                                                                        }
                                                                                        className='text-blue-400 hover:text-blue-300 hover:bg-blue-400/10'>
                                                                                        <Edit3 className='h-3 w-3' />
                                                                                    </Button>
                                                                                    <Button
                                                                                        size='sm'
                                                                                        variant='destructive'
                                                                                        onClick={() => {
                                                                                            if (
                                                                                                currentWorkspace &&
                                                                                                workflow.language
                                                                                            ) {
                                                                                                removeKeyFromContainer({
                                                                                                    containerId:
                                                                                                        selectedContainerId,
                                                                                                    languageId:
                                                                                                        workflow
                                                                                                            .language
                                                                                                            ._id,
                                                                                                    translationKey:
                                                                                                        mapping.translationKey,
                                                                                                    workspaceId:
                                                                                                        currentWorkspace._id,
                                                                                                });
                                                                                            }
                                                                                        }}>
                                                                                        <Trash2 className='h-3 w-3' />
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </ScrollArea>
                                                </div>
                                                {containerMappings.status === 'CanLoadMore' && (
                                                    <div className='mt-4 pt-3 border-t border-gray-800'>
                                                        <Button
                                                            size='sm'
                                                            variant='outline'
                                                            onClick={() => containerMappings.loadMore(10)}
                                                            className='w-full border-gray-600 text-gray-300 hover:bg-gray-800'>
                                                            Load More Keys
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <p className='text-gray-400 text-sm'>No keys assigned to this container</p>
                                        )}

                                        {selectedContainerId && workflow.isLocked && (
                                            <div className='pt-4 border-t border-gray-800'>
                                                <p className='text-xs text-gray-500 mb-2'>
                                                    Click on a mapping to edit its value
                                                </p>
                                                <p className='text-xs text-gray-500'>
                                                    Yellow highlighting indicates unsaved changes
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {mode === 'edit' && (
                            <>
                                <div className='bg-gray-950/50 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm'>
                                    <h3 className='text-lg font-semibold text-white mb-4'>Container Tools</h3>
                                    <div className='space-y-4'>
                                        <div>
                                            <label className='block text-sm font-medium text-gray-300 mb-2'>
                                                Container Color
                                            </label>
                                            <div className='flex items-center space-x-2'>
                                                <input
                                                    type='color'
                                                    value={containerColor}
                                                    onChange={e => setContainerColor(e.target.value)}
                                                    className='w-8 h-8 rounded border border-gray-600 cursor-pointer'
                                                />
                                                <span className='text-sm text-gray-400'>{containerColor}</span>
                                            </div>
                                        </div>

                                        <div className='pt-4 border-t border-gray-800'>
                                            <p className='text-sm text-gray-400 mb-2'>Instructions:</p>
                                            <ol className='text-xs text-gray-500 space-y-1'>
                                                <li>1. Click "Add Container" button</li>
                                                <li>2. Click on screenshot to place</li>
                                                <li>3. Select and resize as needed</li>
                                                <li>4. Click containers to add descriptions</li>
                                                <li>5. Switch to Translate mode when done</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>

                                {/* Selected Container Details */}
                                {selectedContainerId && (
                                    <div className='bg-gray-950/50 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm'>
                                        <h3 className='text-lg font-semibold text-white mb-4'>Container Details</h3>
                                        {(() => {
                                            const selectedContainer = containers?.find(
                                                c => c._id === selectedContainerId
                                            );
                                            if (!selectedContainer) return null;

                                            return (
                                                <div className='space-y-4'>
                                                    <div>
                                                        <label className='block text-sm font-medium text-gray-300 mb-2'>
                                                            Description (Optional)
                                                        </label>
                                                        {editingDescription === selectedContainerId ? (
                                                            <div className='space-y-2'>
                                                                <Input
                                                                    value={tempDescription}
                                                                    onChange={e => setTempDescription(e.target.value)}
                                                                    placeholder='Enter container description...'
                                                                    className='bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter') handleSaveDescription();
                                                                        if (e.key === 'Escape')
                                                                            handleCancelDescription();
                                                                    }}
                                                                    autoFocus
                                                                />
                                                                <div className='flex items-center space-x-2'>
                                                                    <Button
                                                                        size='sm'
                                                                        onClick={handleSaveDescription}
                                                                        className='bg-green-600 hover:bg-green-700'>
                                                                        Save
                                                                    </Button>
                                                                    <Button
                                                                        size='sm'
                                                                        variant='outline'
                                                                        onClick={handleCancelDescription}
                                                                        className='border-gray-600 text-gray-300 hover:bg-gray-800'>
                                                                        Cancel
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                onClick={() =>
                                                                    handleEditDescription(
                                                                        selectedContainerId,
                                                                        selectedContainer.description
                                                                    )
                                                                }
                                                                className='p-3 bg-gray-800/50 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors'>
                                                                {selectedContainer.description ? (
                                                                    <p className='text-sm text-white'>
                                                                        {selectedContainer.description}
                                                                    </p>
                                                                ) : (
                                                                    <p className='text-sm text-gray-400 italic'>
                                                                        Click to add description...
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className='text-xs text-gray-500'>
                                                        <p>ID: {selectedContainer._id}</p>
                                                        <p>Color: {selectedContainer.backgroundColor || '#3b82f6'}</p>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Center - Canvas */}
                    <div className='lg:col-span-3'>
                        <ScreenshotCanvas
                            canvasImage={canvasImage}
                            mode={mode}
                            isAddingContainer={mode === 'edit' ? isAddingContainer : false}
                            onCanvasClick={handleCanvasClick}
                            containers={containers || []}
                            selectedContainerId={selectedContainerId}
                            onContainerSelect={setSelectedContainerId}
                            onContainerUpdate={handleContainerUpdate}
                            onContainerDelete={handleContainerDelete}
                            keyMappings={memoizedMappings}
                            onClearSelection={() => setSelectedContainerId(null)}
                        />
                    </div>
                </div>

                {/* Key Selection Dialog */}
                <Dialog open={isKeyDialogOpen} onOpenChange={setIsKeyDialogOpen}>
                    <DialogContent className='bg-gray-900 border-gray-800 text-white w-[95vw] sm:w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col'>
                        <DialogHeader className='shrink-0 border-b border-gray-800 pb-2'>
                            <DialogTitle className='flex items-center text-white'>
                                <Languages className='h-5 w-5 mr-2 text-pink-400' />
                                Select Translation Key
                            </DialogTitle>
                        </DialogHeader>
                        <div className='flex-1 min-h-0 pt-4'>
                            <ScrollArea className='h-full pr-2'>
                                <div className='space-y-4'>
                                    {/* Search */}
                                    <div className='relative'>
                                        <Search className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
                                        <Input
                                            placeholder='Search keys...'
                                            value={keySearchTerm}
                                            onChange={e => setKeySearchTerm(e.target.value)}
                                            className='pl-10 bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-400'
                                        />
                                    </div>

                                    {/* Performance hint */}
                                    <div className='bg-amber-500/10 border border-amber-500/30 rounded-lg p-3'>
                                        <div className='flex items-start space-x-2'>
                                            <span className='text-amber-400 text-sm'>💡</span>
                                            <div className='text-amber-200 text-xs'>
                                                <strong>Performance:</strong> Showing first 20 keys. Use search to find
                                                specific keys.
                                            </div>
                                        </div>
                                    </div>

                                    {/* Key List */}
                                    <div>
                                        {isLoadingKeys ? (
                                            <div className='flex items-center justify-center py-12'>
                                                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className='space-y-3 pr-1'>
                                                    {filteredKeys.map(key => (
                                                        <div
                                                            key={key.key}
                                                            onClick={() => handleAssignKey(key)}
                                                            className='p-4 rounded-xl border cursor-pointer transition-all duration-200 bg-gray-800/30 border-gray-700/30 hover:border-gray-600/50 hover:bg-gray-800/50'>
                                                            <div className='flex items-start justify-between gap-3'>
                                                                <div className='flex-1 min-w-0'>
                                                                    <h4 className='font-medium text-white text-sm truncate'>
                                                                        {key.key}
                                                                    </h4>
                                                                    <p className='text-xs text-gray-400 mt-1 break-words'>
                                                                        {String(key.value)}
                                                                    </p>
                                                                </div>
                                                                <div
                                                                    className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${
                                                                        key.type === 'string'
                                                                            ? 'bg-green-500/10 text-green-400'
                                                                            : key.type === 'number'
                                                                              ? 'bg-blue-500/10 text-blue-400'
                                                                              : 'bg-purple-500/10 text-purple-400'
                                                                    }`}>
                                                                    {key.type}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {filteredKeys.length === 0 && (
                                                    <div className='text-center py-8 text-gray-400'>
                                                        {keySearchTerm
                                                            ? 'No keys found matching your search'
                                                            : 'No primitive keys available'}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </ScrollArea>
                        </div>
                        {/* Footer removed intentionally to keep dialog minimal */}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
