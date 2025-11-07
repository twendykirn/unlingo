'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Image as ImageIcon, Trash2, Edit3, Calendar, HardDrive, Languages } from 'lucide-react';
import { usePaginatedQuery, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useRouter, useSearchParams } from 'next/navigation';
import NextImage from 'next/image';
import { PlusIcon } from '@heroicons/react/24/outline';
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
import { Heading } from '@/components/ui/heading';
import { Description, Label } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import { FileTrigger } from '@/components/ui/file-trigger';
import { toast } from 'sonner';
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/ui/description-list';
import { TextField } from '@/components/ui/text-field';

export default function ScreenshotsPage() {
    const searchParams = useSearchParams();
    const searchParamProjectId = searchParams.get('projectId');

    const router = useRouter();

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

    const generateUploadUrl = useMutation(api.screenshots.generateUploadUrl);
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
            const uploadUrl = await generateUploadUrl();

            const result = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': selectedFile.type },
                body: selectedFile,
            });

            if (!result.ok) {
                throw new Error('Failed to upload file');
            }

            const { storageId } = await result.json();

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

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <DashboardSidebar activeItem='screenshots' onWorkspaceChange={setWorkspace}>
            {workspace ? (
                <Card>
                    <CardHeader>
                        <div className='flex items-center justify-between mb-4'>
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
                                <Button isDisabled={!project} onClick={() => setIsUploadDialogOpen(true)}>
                                    <PlusIcon />
                                </Button>
                            </div>
                        </div>
                        <Separator />
                    </CardHeader>
                    <CardContent className='space-y-6'>
                        {screenshots && screenshots.length > 0 ? (
                            <div className='space-y-6'>
                                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                                    {screenshots.map(screenshot => (
                                        <div
                                            key={screenshot._id}
                                            className='group bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50 transition-all duration-200'>
                                            <div className='aspect-video bg-gray-900/50 flex items-center justify-center relative overflow-hidden'>
                                                {screenshot.imageUrl ? (
                                                    <NextImage
                                                        src={screenshot.imageUrl}
                                                        alt={screenshot.name}
                                                        width={320}
                                                        height={180}
                                                        className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-200'
                                                    />
                                                ) : (
                                                    <ImageIcon className='h-12 w-12 text-gray-600' />
                                                )}

                                                <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2'>
                                                    <Button
                                                        size='sm'
                                                        intent='warning'
                                                        onClick={() => openScreenshotEditor(screenshot._id, 'edit')}>
                                                        <Edit3 className='h-4 w-4 mr-1' />
                                                        Mappings
                                                    </Button>
                                                    <Button
                                                        size='sm'
                                                        onClick={() =>
                                                            openScreenshotEditor(screenshot._id, 'translate')
                                                        }>
                                                        <Languages className='h-4 w-4 mr-1' />
                                                        Translate
                                                    </Button>
                                                    <Button
                                                        size='sm'
                                                        intent='danger'
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setScreenshotToDelete(screenshot._id);
                                                            setDeleteConfirmOpen(true);
                                                        }}>
                                                        <Trash2 className='h-4 w-4' />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className='p-4'>
                                                <Heading level={4} className='mb-2'>
                                                    {screenshot.name}
                                                </Heading>
                                                {screenshot.description ? (
                                                    <Description className='mb-2'>{screenshot.description}</Description>
                                                ) : null}
                                                <div className='space-y-2'>
                                                    <div className='flex items-center justify-between text-xs text-gray-500'>
                                                        <span className='flex items-center'>
                                                            <ImageIcon className='h-3 w-3 mr-1' />
                                                            {screenshot.dimensions.width} ×{' '}
                                                            {screenshot.dimensions.height}
                                                        </span>
                                                        <span className='flex items-center'>
                                                            <HardDrive className='h-3 w-3 mr-1' />
                                                            {formatFileSize(screenshot.imageSize)}
                                                        </span>
                                                    </div>
                                                    <div className='flex items-center text-xs text-gray-500'>
                                                        <Calendar className='h-3 w-3 mr-1' />
                                                        {formatDate(screenshot._creationTime)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {status === 'CanLoadMore' && (
                                    <div className='flex justify-center pt-6'>
                                        <Button
                                            onClick={() => loadMore(12)}
                                            intent='outline'
                                            className='border-gray-700 text-gray-300 hover:bg-gray-800'>
                                            Load More Screenshots
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className='text-center py-16 space-y-2'>
                                <Heading level={3}>No screenshots yet</Heading>
                                <Description>
                                    Upload your first screenshot to start creating visual translation mappings.
                                </Description>
                            </div>
                        )}

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
                                    Are you sure you want to delete this screenshot? This will also remove all
                                    associated key mappings. This action cannot be undone.
                                </ModalDescription>
                            </ModalHeader>
                            <ModalBody>
                                <div className='prose prose-zinc dark:prose-invert prose-h3:text-sm/6 prose-h4:text-sm/6 prose-p:text-muted-fg flex flex-col gap-4'>
                                    <div className='flex flex-col gap-2'>
                                        <Label>Select Image File:</Label>
                                        <FileTrigger onSelect={handleFileSelect} />
                                    </div>
                                    {selectedFile ? (
                                        <DescriptionList>
                                            <DescriptionTerm>File Name</DescriptionTerm>
                                            <DescriptionDetails>{selectedFile.name}</DescriptionDetails>
                                            <DescriptionTerm>File Size</DescriptionTerm>
                                            <DescriptionDetails>
                                                {' '}
                                                {formatFileSize(selectedFile.size)}
                                            </DescriptionDetails>
                                        </DescriptionList>
                                    ) : null}
                                    <TextField
                                        value={uploadForm.name}
                                        onChange={value => setUploadForm(prev => ({ ...prev, name: value }))}>
                                        <Label>Name:</Label>
                                        <Input placeholder='Enter screenshot name' />
                                    </TextField>
                                    <TextField
                                        value={uploadForm.description}
                                        onChange={value => setUploadForm(prev => ({ ...prev, description: value }))}>
                                        <Label>Description:</Label>
                                        <Textarea placeholder='Optional description' />
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
                                    Are you sure you want to delete this screenshot? This will also remove all
                                    associated key mappings. This action cannot be undone.
                                </ModalDescription>
                            </ModalHeader>
                            <ModalFooter>
                                <ModalClose>Cancel</ModalClose>
                                <Button onClick={handleDeleteConfirm} isPending={isDeleting} intent='danger'>
                                    {isDeleting ? <Loader /> : 'Delete'}
                                </Button>
                            </ModalFooter>
                        </ModalContent>
                    </CardContent>
                </Card>
            ) : (
                <Loader />
            )}
        </DashboardSidebar>
    );
}
