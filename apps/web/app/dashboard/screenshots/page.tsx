'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePaginatedQuery, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useRouter, useSearchParams } from 'next/navigation';
import NextImage from 'next/image';
import { PlusIcon, TrashIcon, PencilSquareIcon, EllipsisVerticalIcon, LanguageIcon } from '@heroicons/react/24/outline';
import DashboardSidebar, { WorkspaceWithPremium } from '../components/dashboard-sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ProjectsSelector from '../components/projects-selector';
import { Loader } from '@/components/ui/loader';
import {
    ModalBody,
    ModalClose,
    ModalContent,
    ModalDescription,
    ModalFooter,
    ModalHeader,
    ModalTitle,
} from '@/components/ui/modal';
import { Label } from '@/components/ui/field';
import { FileTrigger } from '@/components/ui/file-trigger';
import { toast } from 'sonner';
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/ui/description-list';
import { TextField } from '@/components/ui/text-field';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/components/ui/table';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Collection, TableLoadMoreItem } from 'react-aria-components';
import { useDateFormatter } from '@react-aria/i18n';
import { useUploadFile } from '@convex-dev/r2/react';

export default function ScreenshotsPage() {
    const searchParams = useSearchParams();
    const searchParamProjectId = searchParams.get('projectId');

    const router = useRouter();
    const formatter = useDateFormatter({ dateStyle: 'long' });

    const uploadFile = useUploadFile(api.files);

    const [workspace, setWorkspace] = useState<WorkspaceWithPremium | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<Id<'projects'> | null>(null);

    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadForm, setUploadForm] = useState({
        name: '',
        description: '',
    });

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [screenshotToDelete, setScreenshotToDelete] = useState<Id<'screenshots'> | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const project = useQuery(
        api.projects.getProject,
        workspace && selectedProjectId
            ? {
                  projectId: selectedProjectId,
                  workspaceId: workspace._id,
              }
            : 'skip'
    );

    const {
        results: screenshots,
        status,
        loadMore,
    } = usePaginatedQuery(
        api.screenshots.getScreenshotsForProject,
        project && workspace
            ? {
                  projectId: project._id,
                  workspaceId: workspace._id,
              }
            : 'skip',
        { initialNumItems: 12 }
    );

    const createScreenshot = useMutation(api.screenshots.createScreenshot);
    const deleteScreenshot = useMutation(api.screenshots.deleteScreenshot);

    const handleFileSelect = (e: FileList | null) => {
        const file = Array.from(e ?? [])[0];

        if (file && file.type.startsWith('image/')) {
            // Check file size limit (10MB)
            const MAX_FILE_SIZE = 10 * 1024 * 1024;
            if (file.size > MAX_FILE_SIZE) {
                toast.error('Image file size cannot exceed 10MB. Please compress your image and try again.');
                return;
            }

            setSelectedFile(file);
            if (!uploadForm.name) {
                const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
                setUploadForm(prev => ({ ...prev, name: nameWithoutExtension }));
            }
        } else {
            toast.error('Please select a valid image file.');
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !workspace || !uploadForm.name.trim() || !project) {
            return;
        }

        setIsUploading(true);
        try {
            const storageId = await uploadFile(selectedFile);

            const dimensions = await new Promise<{ width: number; height: number }>(resolve => {
                const img = new Image();
                img.onload = () => {
                    resolve({ width: img.naturalWidth, height: img.naturalHeight });
                };
                img.src = URL.createObjectURL(selectedFile);
            });

            await createScreenshot({
                projectId: project._id,
                workspaceId: workspace._id,
                name: uploadForm.name.trim(),
                description: uploadForm.description.trim() || undefined,
                imageFileId: storageId,
                imageSize: selectedFile.size,
                imageMimeType: selectedFile.type,
                dimensions,
            });

            setUploadForm({ name: '', description: '' });
            setSelectedFile(null);
            setIsUploadDialogOpen(false);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error instanceof Error ? error.message : 'Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!screenshotToDelete || !workspace) return;

        setIsDeleting(true);
        try {
            await deleteScreenshot({
                screenshotId: screenshotToDelete,
                workspaceId: workspace._id,
            });

            setDeleteConfirmOpen(false);
            setScreenshotToDelete(null);
        } catch (error) {
            console.error('Delete error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to delete screenshot');
        } finally {
            setIsDeleting(false);
        }
    };

    const openScreenshotEditor = (screenshotId: Id<'screenshots'>, mode: 'edit' | 'translate') => {
        router.push(`/dashboard/screenshots/${screenshotId}?mode=${mode}`);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleLoadingMore = () => {
        if (status === 'CanLoadMore') {
            loadMore(12);
        }
    };

    return (
        <DashboardSidebar activeItem='screenshots' onWorkspaceChange={setWorkspace}>
            {workspace ? (
                <>
                    <Card>
                        <CardHeader>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col gap-1'>
                                    <CardTitle>Screenshots</CardTitle>
                                    <CardDescription>
                                        Create visual translation mappings for your UI elements
                                    </CardDescription>
                                </div>
                                <div className='flex items-end gap-2'>
                                    <ProjectsSelector
                                        workspace={workspace}
                                        selectedProjectId={selectedProjectId}
                                        defaultProjectId={(searchParamProjectId as Id<'projects'>) || undefined}
                                        setSelectedProjectId={setSelectedProjectId}
                                        label='Project'
                                        isPreSelectLonelyItem
                                    />
                                    <Button
                                        intent='plain'
                                        isDisabled={!project}
                                        onClick={() => setIsUploadDialogOpen(true)}>
                                        <PlusIcon />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table
                                bleed
                                className='[--gutter:var(--card-spacing)] sm:[--gutter:var(--card-spacing)]'
                                aria-label='Screenshots'>
                                <TableHeader>
                                    <TableColumn className='w-0'>Preview</TableColumn>
                                    <TableColumn isRowHeader>Name</TableColumn>
                                    <TableColumn>Dimensions</TableColumn>
                                    <TableColumn>Size</TableColumn>
                                    <TableColumn>Created At</TableColumn>
                                    <TableColumn />
                                </TableHeader>
                                <TableBody>
                                    <Collection items={screenshots}>
                                        {screenshot => (
                                            <TableRow id={screenshot._id}>
                                                <TableCell>
                                                    <div className='size-16 flex items-center justify-center rounded overflow-hidden border'>
                                                        {screenshot.imageUrl ? (
                                                            <NextImage
                                                                src={screenshot.imageUrl}
                                                                alt={screenshot.name}
                                                                width={64}
                                                                height={64}
                                                                className='size-full object-cover'
                                                            />
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className='flex flex-col gap-1'>
                                                        <div className='font-medium'>{screenshot.name}</div>
                                                        {screenshot.description ? (
                                                            <div className='text-xs text-muted-fg'>
                                                                {screenshot.description}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {screenshot.dimensions.width} × {screenshot.dimensions.height}
                                                </TableCell>
                                                <TableCell>{formatFileSize(screenshot.imageSize)}</TableCell>
                                                <TableCell>
                                                    {formatter.format(new Date(screenshot._creationTime))}
                                                </TableCell>
                                                <TableCell>
                                                    <div className='flex justify-end'>
                                                        <Menu>
                                                            <MenuTrigger className='size-6'>
                                                                <EllipsisVerticalIcon />
                                                            </MenuTrigger>
                                                            <MenuContent placement='left top'>
                                                                <MenuItem
                                                                    onAction={() =>
                                                                        openScreenshotEditor(screenshot._id, 'edit')
                                                                    }>
                                                                    <PencilSquareIcon /> Edit Mappings
                                                                </MenuItem>
                                                                <MenuItem
                                                                    onAction={() =>
                                                                        openScreenshotEditor(
                                                                            screenshot._id,
                                                                            'translate'
                                                                        )
                                                                    }>
                                                                    <LanguageIcon /> Translate
                                                                </MenuItem>
                                                                <MenuSeparator />
                                                                <MenuItem
                                                                    intent='danger'
                                                                    onAction={() => {
                                                                        setScreenshotToDelete(screenshot._id);
                                                                        setDeleteConfirmOpen(true);
                                                                    }}>
                                                                    <TrashIcon /> Delete
                                                                </MenuItem>
                                                            </MenuContent>
                                                        </Menu>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Collection>
                                    {status !== 'Exhausted' ? (
                                        <TableLoadMoreItem
                                            className='sticky inset-x-0 bottom-0 h-16'
                                            onLoadMore={handleLoadingMore}
                                            isLoading={status === 'LoadingMore'}>
                                            <Loader className='mx-auto' isIndeterminate aria-label='Loading more...' />
                                        </TableLoadMoreItem>
                                    ) : null}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <ModalContent
                        isBlurred
                        isOpen={isUploadDialogOpen}
                        onOpenChange={isOpen => {
                            if (!isOpen) {
                                setUploadForm({ name: '', description: '' });
                                setSelectedFile(null);
                            }
                            setIsUploadDialogOpen(isOpen);
                        }}>
                        <ModalHeader>
                            <ModalTitle>Upload Screenshot</ModalTitle>
                            <ModalDescription>
                                Upload a new screenshot to create visual translation mappings.
                            </ModalDescription>
                        </ModalHeader>
                        <ModalBody>
                            <div className='flex flex-col gap-4'>
                                <div className='flex flex-col gap-2'>
                                    <Label>Select Image File</Label>
                                    <FileTrigger onSelect={handleFileSelect} />
                                </div>
                                {selectedFile ? (
                                    <DescriptionList>
                                        <DescriptionTerm>File Name</DescriptionTerm>
                                        <DescriptionDetails>{selectedFile.name}</DescriptionDetails>
                                        <DescriptionTerm>File Size</DescriptionTerm>
                                        <DescriptionDetails>{formatFileSize(selectedFile.size)}</DescriptionDetails>
                                    </DescriptionList>
                                ) : null}
                                <TextField
                                    value={uploadForm.name}
                                    onChange={value => setUploadForm(prev => ({ ...prev, name: value }))}>
                                    <Label>Name</Label>
                                    <Input placeholder='Enter screenshot name' />
                                </TextField>
                                <TextField
                                    value={uploadForm.description}
                                    onChange={value => setUploadForm(prev => ({ ...prev, description: value }))}>
                                    <Label>Description (Optional)</Label>
                                    <Textarea placeholder='Enter description' />
                                </TextField>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <ModalClose>Cancel</ModalClose>
                            <Button
                                onClick={handleUpload}
                                isPending={isUploading}
                                isDisabled={!selectedFile || !uploadForm.name.trim() || isUploading}>
                                {isUploading ? <Loader /> : 'Upload'}
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                    <ModalContent
                        role='alertdialog'
                        isBlurred
                        isOpen={deleteConfirmOpen}
                        onOpenChange={setDeleteConfirmOpen}>
                        <ModalHeader>
                            <ModalTitle>Delete Screenshot</ModalTitle>
                            <ModalDescription>
                                Are you sure you want to delete this screenshot? This will also remove all associated
                                key mappings. This action cannot be undone.
                            </ModalDescription>
                        </ModalHeader>
                        <ModalFooter>
                            <ModalClose>Cancel</ModalClose>
                            <Button onClick={handleDeleteConfirm} isPending={isDeleting} intent='danger'>
                                {isDeleting ? <Loader /> : 'Delete'}
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </>
            ) : (
                <Loader />
            )}
        </DashboardSidebar>
    );
}
