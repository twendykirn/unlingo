'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Plus, Trash2, Edit3, Languages, MoreVertical } from 'lucide-react';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isAddingContainer$, selectedContainerId$ } from '../store';
import { use$ } from '@legendapp/state/react';

interface EditModeViewProps extends PropsWithChildren {
    projectId: Id<'projects'>;
    workspaceId: Id<'workspaces'>;
    screenshotName: string;
    containers: Doc<'screenshotContainers'>[] | undefined;
    onSwitchToTranslate: () => void;
}

export default function EditModeView({
    projectId,
    workspaceId,
    screenshotName,
    containers,
    onSwitchToTranslate,
    children,
}: EditModeViewProps) {
    const router = useRouter();

    const selectedContainerId = use$(selectedContainerId$);
    const isAddingContainer = use$(isAddingContainer$);

    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [detailsColor, setDetailsColor] = useState('#3b82f6');
    const [detailsDescription, setDetailsDescription] = useState('');

    const updateContainer = useMutation(api.screenshots.updateContainer);
    const deleteContainer = useMutation(api.screenshots.deleteContainer);

    const selectedContainer = useMemo(() => {
        if (!containers) return null;

        const container = containers.find(c => c._id === selectedContainerId);
        return container ?? null;
    }, [containers, selectedContainerId]);

    const handleSaveDetails = async () => {
        if (!selectedContainerId) return;

        try {
            await updateContainer({
                containerId: selectedContainerId,
                description: detailsDescription.trim() || undefined,
                backgroundColor: detailsColor,
                workspaceId,
            });
            setIsEditingDetails(false);
        } catch (error) {
            console.error('Failed to save container details:', error);
            alert(error instanceof Error ? error.message : 'Failed to save container details');
        }
    };

    const handleCancelDetails = () => {
        if (!selectedContainerId) return;
        const selected = containers?.find(c => c._id === selectedContainerId);
        setDetailsColor(selected?.backgroundColor || '#3b82f6');
        setDetailsDescription(selected?.description || '');
        setIsEditingDetails(false);
    };

    const handleContainerDelete = async (containerId: Id<'screenshotContainers'>) => {
        if (!confirm('Delete this container and all its key mappings?')) return;

        try {
            await deleteContainer({
                containerId,
                workspaceId,
            });

            if (selectedContainerId === containerId) {
                selectedContainerId$.set(null);
            }
        } catch (error) {
            console.error('Failed to delete container:', error);
        }
    };

    useEffect(() => {
        if (!selectedContainerId) {
            setIsEditingDetails(false);
            return;
        }
        const selected = containers?.find(c => c._id === selectedContainerId);
        setDetailsColor(selected?.backgroundColor || '#3b82f6');
        setDetailsDescription(selected?.description || '');
        setIsEditingDetails(false);
    }, [selectedContainerId, containers]);

    return (
        <div className='min-h-screen bg-black text-white overflow-hidden h-screen flex flex-col'>
            <header className='bg-black border-b border-gray-800 px-6 py-4 backdrop-blur-sm'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                        <Button
                            onClick={() => router.push(`/dashboard/projects/${projectId}`)}
                            variant='ghost'
                            size='icon'
                            className='text-gray-400 hover:text-white'>
                            <ArrowLeft className='h-4 w-4' />
                        </Button>
                        <h1 className='text-2xl font-bold'>
                            <span className='bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent'>
                                Unlingo
                            </span>
                        </h1>
                        <div className='h-6 w-px bg-gray-600' />
                        <div className='flex items-center space-x-2'>
                            <Edit3 className='h-5 w-5 text-gray-400' />
                            <h2 className='text-xl font-semibold text-white'>Edit Mode</h2>
                        </div>
                        <span className='text-gray-400'>•</span>
                        <p className='text-gray-400 text-sm'>{screenshotName}</p>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Button
                            onClick={() => isAddingContainer$.set(true)}
                            disabled={isAddingContainer}
                            size='sm'>
                            <Plus className='h-4 w-4 mr-2' />
                            {isAddingContainer ? 'Click to Place' : 'Add Container'}
                        </Button>
                        {isAddingContainer ? (
                            <Button
                                onClick={() => isAddingContainer$.set(false)}
                                variant='outline'
                                size='sm'>
                                Cancel
                            </Button>
                        ) : null}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant='ghost' size='icon' className='text-gray-400 hover:text-white'>
                                    <MoreVertical className='h-4 w-4' />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align='end' className='w-56 bg-gray-900 border-gray-800 p-1'>
                                <div className='flex flex-col'>
                                    {isAddingContainer ? (
                                        <Button
                                            variant='ghost'
                                            className='justify-start text-gray-300 hover:text-white hover:bg-gray-800'
                                            onClick={() => isAddingContainer$.set(false)}>
                                            Cancel Placing
                                        </Button>
                                    ) : null}
                                    <Button
                                        variant='ghost'
                                        className='justify-start text-gray-300 hover:text-white hover:bg-gray-800'
                                        onClick={onSwitchToTranslate}>
                                        <Languages className='h-4 w-4 mr-2' /> Switch to Translate
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </header>

            <div className='flex-1 flex gap-6 p-6 min-h-0 overflow-hidden'>
                <div className='w-80 space-y-6 overflow-y-auto'>
                    <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                        <h3 className='text-lg font-semibold text-white mb-4'>Instructions</h3>
                        <ol className='text-sm text-gray-400 space-y-2'>
                            <li>1. Click "Add Container" button</li>
                            <li>2. Click on screenshot to place</li>
                            <li>3. Select and resize as needed</li>
                            <li>4. Select a container to edit details</li>
                            <li>5. Switch to Translate mode when done</li>
                        </ol>
                    </div>

                    {selectedContainerId && selectedContainer ? (
                        <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                            <div className='flex items-center justify-between mb-4'>
                                <h3 className='text-lg font-semibold text-white'>Container Details</h3>
                                {!isEditingDetails ? (
                                    <Button
                                        size='icon'
                                        variant='ghost'
                                        onClick={() => setIsEditingDetails(true)}
                                        className='text-gray-400 hover:text-white'>
                                        <Edit3 className='h-4 w-4' />
                                    </Button>
                                ) : (
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            size='sm'
                                            onClick={handleSaveDetails}
                                            disabled={
                                                selectedContainer
                                                    ? detailsColor === (selectedContainer.backgroundColor || '#3b82f6') &&
                                                      detailsDescription.trim() === (selectedContainer.description || '')
                                                    : true
                                            }>
                                            Save
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            onClick={handleCancelDetails}>
                                            Cancel
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <div className='space-y-4'>
                                {!isEditingDetails ? (
                                    <>
                                        <div>
                                            <label className='block text-sm font-medium text-gray-300 mb-2'>
                                                Color
                                            </label>
                                            <div className='flex items-center gap-2'>
                                                <div
                                                    className='w-6 h-6 rounded border border-gray-600'
                                                    style={{
                                                        background: selectedContainer.backgroundColor || '#3b82f6',
                                                    }}
                                                />
                                                <span className='text-sm text-gray-400'>
                                                    {selectedContainer.backgroundColor || '#3b82f6'}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className='block text-sm font-medium text-gray-300 mb-2'>
                                                Description
                                            </label>
                                            <div className='p-3 bg-gray-800/50 border border-gray-700 rounded-lg'>
                                                {selectedContainer.description ? (
                                                    <p className='text-sm text-white break-words'>
                                                        {selectedContainer.description}
                                                    </p>
                                                ) : (
                                                    <p className='text-sm text-gray-400 italic'>No description</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className='block text-sm font-medium text-gray-300 mb-2'>
                                                Container Color
                                            </label>
                                            <div className='flex items-center space-x-2'>
                                                <input
                                                    type='color'
                                                    value={detailsColor}
                                                    onChange={e => setDetailsColor(e.target.value)}
                                                    className='w-8 h-8 rounded border border-gray-600 cursor-pointer'
                                                />
                                                <span className='text-sm text-gray-400'>{detailsColor}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className='block text-sm font-medium text-gray-300 mb-2'>
                                                Description (Optional)
                                            </label>
                                            <Input
                                                value={detailsDescription}
                                                onChange={e => setDetailsDescription(e.target.value)}
                                                placeholder='Enter container description...'
                                                className='bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                                            />
                                        </div>
                                    </>
                                )}

                                <div className='text-xs text-gray-500'>
                                    <p>ID: {selectedContainer._id}</p>
                                </div>

                                <div className='pt-3 border-t border-gray-800'>
                                    <Button
                                        variant='destructive'
                                        onClick={() => handleContainerDelete(selectedContainerId)}
                                        className='w-full'
                                        size='sm'>
                                        <Trash2 className='h-4 w-4 mr-2' /> Delete Container
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
                <div className='flex-1 min-h-0 overflow-hidden'>{children}</div>
            </div>
        </div>
    );
}
