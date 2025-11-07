'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Trash2, Edit3, Languages, MoreVertical } from 'lucide-react';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isAddingContainer$, selectedContainerId$ } from '../store';
import { use$ } from '@legendapp/state/react';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';

interface EditModeViewProps extends PropsWithChildren {
    workspaceId: Id<'workspaces'>;
    screenshotName: string;
    containers: Doc<'screenshotContainers'>[] | undefined;
    onSwitchToTranslate: () => void;
}

export default function EditModeView({
    workspaceId,
    screenshotName,
    containers,
    onSwitchToTranslate,
    children,
}: EditModeViewProps) {
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
        <div className='h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800'>
            <div className='container mx-auto h-full flex flex-col px-4 sm:px-6 py-4 sm:py-6'>
                <div className='bg-gray-950/50 border border-gray-800/50 rounded-xl p-4 sm:p-6 backdrop-blur-sm mb-4 sm:mb-6'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-3 sm:space-x-4'>
                            <div className='w-12 h-12 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl flex items-center justify-center border border-blue-500/20'>
                                <Edit3 className='h-6 w-6 text-blue-400' />
                            </div>
                            <div>
                                <h3 className='text-2xl font-semibold text-white'>Screenshot Editor</h3>
                                <p className='text-gray-400 text-sm'>{screenshotName}</p>
                            </div>
                        </div>
                        <div className='flex flex-wrap items-center gap-2'>
                            <Button
                                onClick={() => isAddingContainer$.set(true)}
                                isDisabled={isAddingContainer}
                                className='bg-blue-600 hover:bg-blue-700 text-white'>
                                <Plus className='h-4 w-4 mr-2' />
                                {isAddingContainer ? 'Click to Place' : 'Add Container'}
                            </Button>
                            {isAddingContainer ? (
                                <Button
                                    onClick={() => isAddingContainer$.set(false)}
                                    intent='outline'
                                    className='border-gray-600 text-gray-300 hover:bg-gray-800'>
                                    Cancel Placing
                                </Button>
                            ) : null}
                            <Menu>
                                <MenuTrigger>
                                    <MoreVertical className='h-4 w-4' />
                                </MenuTrigger>
                                <MenuContent popover={{ placement: 'bottom' }}>
                                    {isAddingContainer ? (
                                        <MenuItem onClick={() => isAddingContainer$.set(false)}>
                                            Cancel Placing
                                        </MenuItem>
                                    ) : null}
                                    <MenuItem onClick={onSwitchToTranslate}>Switch to Translate</MenuItem>
                                </MenuContent>
                            </Menu>
                        </div>
                    </div>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0'>
                    <div className='order-2 lg:order-1 lg:col-span-1 space-y-6 min-h-0 lg:overflow-y-auto lg:pr-1'>
                        <div className='bg-gray-950/50 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm'>
                            <h3 className='text-lg font-semibold text-white mb-2'>Container Tools</h3>
                            <div className='space-y-4'>
                                <div className='pt-0'>
                                    <p className='text-sm text-gray-400 mb-2'>Instructions:</p>
                                    <ol className='text-xs text-gray-500 space-y-1'>
                                        <li>1. Click "Add Container" button</li>
                                        <li>2. Click on screenshot to place</li>
                                        <li>3. Select and resize as needed</li>
                                        <li>4. Select a container to edit details and color</li>
                                        <li>5. Switch to Translate mode when done</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        {selectedContainerId ? (
                            <div className='bg-gray-950/50 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm'>
                                <div className='flex items-center justify-between mb-4'>
                                    <h3 className='text-lg font-semibold text-white'>Container Details</h3>
                                    {!isEditingDetails ? (
                                        <Button
                                            size='sm'
                                            intent='plain'
                                            onClick={() => setIsEditingDetails(true)}
                                            className='text-blue-400 hover:text-white hover:bg-blue-600/20'>
                                            <Edit3 className='h-4 w-4' />
                                        </Button>
                                    ) : (
                                        <div className='flex items-center gap-2'>
                                            <Button
                                                size='sm'
                                                className='bg-white text-black hover:bg-gray-200'
                                                onClick={handleSaveDetails}
                                                isDisabled={
                                                    selectedContainer
                                                        ? detailsColor ===
                                                              (selectedContainer.backgroundColor || '#3b82f6') &&
                                                          detailsDescription.trim() ===
                                                              (selectedContainer.description || '')
                                                        : true
                                                }>
                                                Save
                                            </Button>
                                            <Button
                                                size='sm'
                                                intent='plain'
                                                onClick={handleCancelDetails}
                                                className='text-gray-400 hover:text-white hover:bg-gray-800/50'>
                                                Cancel
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {selectedContainer ? (
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
                                                                background:
                                                                    selectedContainer.backgroundColor || '#3b82f6',
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
                                                            <p className='text-sm text-gray-400 italic'>
                                                                No description
                                                            </p>
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
                                                intent='danger'
                                                onClick={() => handleContainerDelete(selectedContainerId)}
                                                className='w-full'>
                                                <Trash2 className='h-4 w-4 mr-2' /> Delete Container
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                    <div className='order-1 lg:order-2 lg:col-span-3 min-h-0'>{children}</div>
                </div>
            </div>
        </div>
    );
}
