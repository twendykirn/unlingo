'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isAddingContainer$, selectedContainerId$ } from '../store';
import { use$ } from '@legendapp/state/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/field';
import { TextField } from '@/components/ui/text-field';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';

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
        <div className='flex flex-col gap-6 p-6'>
            <Card>
                <CardHeader>
                    <div className='flex items-center justify-between'>
                        <div className='flex flex-col gap-1'>
                            <CardTitle>Edit Mode</CardTitle>
                            <CardDescription>{screenshotName}</CardDescription>
                        </div>
                        <div className='flex items-center gap-2'>
                            <div>
                                <Select
                                    value={0}
                                    aria-label='namespaces-selector'
                                    placeholder='namespace'
                                    onChange={() => onSwitchToTranslate()}
                                    defaultValue={0}>
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
                            {isAddingContainer ? (
                                <Button onClick={() => isAddingContainer$.set(false)} intent='danger'>
                                    Cancel
                                </Button>
                            ) : null}
                            <Button onClick={() => isAddingContainer$.set(true)} isDisabled={isAddingContainer}>
                                <PlusIcon />
                                {isAddingContainer ? 'Click to Place' : 'Add Container'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
                <div className='lg:col-span-1 space-y-6'>
                    <Card>
                        <CardHeader>
                            <CardTitle>Instructions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ol className='text-sm space-y-2 list-decimal list-inside'>
                                <li>Click "Add Container" button</li>
                                <li>Click on screenshot to place</li>
                                <li>Select and resize as needed</li>
                                <li>Edit details and color</li>
                                <li>Switch to Translate mode when done</li>
                            </ol>
                        </CardContent>
                    </Card>

                    {selectedContainerId && selectedContainer ? (
                        <Card>
                            <CardHeader>
                                <div className='flex items-center justify-between'>
                                    <CardTitle>Container Details</CardTitle>
                                    {!isEditingDetails ? (
                                        <Button intent='plain' onClick={() => setIsEditingDetails(true)}>
                                            <PencilSquareIcon />
                                        </Button>
                                    ) : (
                                        <div className='flex items-center gap-2'>
                                            <Button
                                                onClick={handleSaveDetails}
                                                isDisabled={
                                                    detailsColor === (selectedContainer.backgroundColor || '#3b82f6') &&
                                                    detailsDescription.trim() === (selectedContainer.description || '')
                                                }>
                                                Save
                                            </Button>
                                            <Button intent='outline' onClick={handleCancelDetails}>
                                                Cancel
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className='space-y-4'>
                                    {!isEditingDetails ? (
                                        <>
                                            <div>
                                                <Label>Color</Label>
                                                <div className='flex items-center gap-2 mt-2'>
                                                    <div
                                                        className='w-6 h-6 rounded border'
                                                        style={{
                                                            background: selectedContainer.backgroundColor || '#3b82f6',
                                                        }}
                                                    />
                                                    <span className='text-sm text-muted-fg'>
                                                        {selectedContainer.backgroundColor || '#3b82f6'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div>
                                                <Label>Description</Label>
                                                <div className='p-3 border rounded-lg mt-2'>
                                                    {selectedContainer.description ? (
                                                        <p className='text-sm break-words'>
                                                            {selectedContainer.description}
                                                        </p>
                                                    ) : (
                                                        <p className='text-sm text-muted-fg italic'>No description</p>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <TextField value={detailsColor} onChange={value => setDetailsColor(value)}>
                                                <Label>Container Color</Label>
                                                <div className='flex items-center gap-2 mt-2'>
                                                    <input
                                                        type='color'
                                                        value={detailsColor}
                                                        onChange={e => setDetailsColor(e.target.value)}
                                                        className='w-8 h-8 rounded border cursor-pointer'
                                                    />
                                                    <span className='text-sm text-muted-fg'>{detailsColor}</span>
                                                </div>
                                            </TextField>
                                            <TextField
                                                value={detailsDescription}
                                                onChange={value => setDetailsDescription(value)}>
                                                <Label>Description (Optional)</Label>
                                                <Input placeholder='Enter container description...' />
                                            </TextField>
                                        </>
                                    )}

                                    <div className='pt-3 border-t'>
                                        <Button
                                            intent='danger'
                                            onClick={() => handleContainerDelete(selectedContainerId)}
                                            className='w-full'>
                                            <TrashIcon /> Delete Container
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>
                <div className='lg:col-span-3'>{children}</div>
            </div>
        </div>
    );
}
