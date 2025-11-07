'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Image as ImageIcon, Trash2, Edit3, Calendar, HardDrive, Languages, Loader2 } from 'lucide-react';
import { usePaginatedQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';

interface ScreenshotsTabProps {
    project: Doc<'projects'>;
    workspace: Doc<'workspaces'>;
}

export function ScreenshotsTab({ project, workspace }: ScreenshotsTabProps) {
    const router = useRouter();

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

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (file && file.type.startsWith('image/')) {
            // Check file size limit (10MB)
            const MAX_FILE_SIZE = 10 * 1024 * 1024;
            if (file.size > MAX_FILE_SIZE) {
                alert('Image file size cannot exceed 10MB. Please compress your image and try again.');
                event.target.value = '';
                return;
            }

            setSelectedFile(file);
            if (!uploadForm.name) {
                const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
                setUploadForm(prev => ({ ...prev, name: nameWithoutExtension }));
            }
        } else {
            alert('Please select a valid image file');
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !workspace || !uploadForm.name.trim()) {
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
            alert(error instanceof Error ? error.message : 'Upload failed. Please try again.');
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
            alert(error instanceof Error ? error.message : 'Failed to delete screenshot');
        } finally {
            setIsDeleting(false);
        }
    };

    const openScreenshotEditor = (screenshotId: Id<'screenshots'>, mode: 'edit' | 'translate') => {
        router.push(`/dashboard/projects/${project._id}/screenshots/${screenshotId}?mode=${mode}`);
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

    if (status === 'LoadingFirstPage') {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                <div className='flex items-center justify-between'>
                    <div>
                        <h3 className='text-lg font-semibold text-white'>Screenshots</h3>
                        <p className='text-sm text-gray-400 mt-1'>
                            Create visual translation mappings for your UI elements
                        </p>
                    </div>
                    <Button
                        className='bg-white text-black hover:bg-gray-200'
                        onClick={() => setIsUploadDialogOpen(true)}>
                        <Plus className='h-4 w-4 mr-2' />
                        Add Screenshot
                    </Button>
                </div>
            </div>

            {screenshots && screenshots.length > 0 ? (
                <div className='space-y-6'>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                        {screenshots.map(screenshot => (
                            <div
                                key={screenshot._id}
                                className='group bg-gray-900/50 border border-gray-800/50 rounded-xl overflow-hidden hover:border-gray-700 transition-all backdrop-blur-sm'>
                                <div className='aspect-video bg-gray-950/50 flex items-center justify-center relative overflow-hidden'>
                                    {screenshot.imageUrl ? (
                                        <NextImage
                                            src={screenshot.imageUrl}
                                            alt={screenshot.name}
                                            width={400}
                                            height={225}
                                            className='w-full h-full object-cover'
                                        />
                                    ) : (
                                        <ImageIcon className='h-12 w-12 text-gray-600' />
                                    )}

                                    <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2'>
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            onClick={() => openScreenshotEditor(screenshot._id, 'edit')}
                                            className='border-gray-600 text-white hover:bg-gray-800'>
                                            <Edit3 className='h-4 w-4 mr-1' />
                                            Edit
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            onClick={() => openScreenshotEditor(screenshot._id, 'translate')}
                                            className='border-gray-600 text-white hover:bg-gray-800'>
                                            <Languages className='h-4 w-4 mr-1' />
                                            Translate
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            onClick={e => {
                                                e.stopPropagation();
                                                setScreenshotToDelete(screenshot._id);
                                                setDeleteConfirmOpen(true);
                                            }}
                                            className='border-gray-600 text-white hover:bg-gray-800'>
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>

                                <div className='p-4'>
                                    <h3 className='font-medium text-white mb-2 truncate'>
                                        {screenshot.name}
                                    </h3>

                                    {screenshot.description && (
                                        <p className='text-sm text-gray-400 mb-3 line-clamp-2'>
                                            {screenshot.description}
                                        </p>
                                    )}

                                    <div className='space-y-1.5'>
                                        <div className='flex items-center justify-between text-xs text-gray-500'>
                                            <span className='flex items-center gap-1'>
                                                <ImageIcon className='h-3 w-3' />
                                                {screenshot.dimensions.width} × {screenshot.dimensions.height}
                                            </span>
                                            <span className='flex items-center gap-1'>
                                                <HardDrive className='h-3 w-3' />
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
                        <div className='flex justify-center'>
                            <Button
                                onClick={() => loadMore(12)}
                                variant='outline'
                                className='border-gray-800 text-white hover:bg-gray-800'>
                                {status === 'LoadingMore' ? (
                                    <>
                                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                                        Loading...
                                    </>
                                ) : (
                                    'Load More'
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className='text-center py-16 bg-gray-900/50 border border-gray-800/50 rounded-xl backdrop-blur-sm'>
                    <ImageIcon className='h-12 w-12 text-gray-600 mx-auto mb-4' />
                    <h3 className='text-lg font-semibold text-white mb-2'>No screenshots yet</h3>
                    <p className='text-sm text-gray-400 mb-6'>
                        Upload your first screenshot to start creating visual translation mappings.
                    </p>
                    <Button
                        className='bg-white text-black hover:bg-gray-200'
                        onClick={() => setIsUploadDialogOpen(true)}>
                        <Plus className='h-4 w-4 mr-2' />
                        Add Screenshot
                    </Button>
                </div>
            )}

            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogContent className='bg-gray-900 border-gray-800 text-white'>
                    <DialogHeader>
                        <DialogTitle className='text-white'>Upload Screenshot</DialogTitle>
                    </DialogHeader>
                    <div className='space-y-4 pt-4'>
                        <div>
                            <Label className='text-sm font-medium text-gray-300'>Select Image File</Label>
                            <div className='relative mt-2'>
                                <input
                                    type='file'
                                    accept='image/*'
                                    onChange={handleFileSelect}
                                    className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
                                    id='screenshot-upload'
                                />
                                <div className='border-2 border-dashed border-gray-800 hover:border-gray-700 rounded-lg p-6 text-center transition-colors'>
                                    {selectedFile ? (
                                        <div className='space-y-2'>
                                            <ImageIcon className='h-8 w-8 text-gray-400 mx-auto' />
                                            <p className='text-sm text-white font-medium'>{selectedFile.name}</p>
                                            <p className='text-xs text-gray-500'>{formatFileSize(selectedFile.size)}</p>
                                        </div>
                                    ) : (
                                        <div className='space-y-2'>
                                            <Upload className='h-8 w-8 text-gray-600 mx-auto' />
                                            <p className='text-sm text-gray-400'>Click to select an image file</p>
                                            <p className='text-xs text-gray-500'>PNG, JPG, JPEG up to 10MB</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label className='text-sm font-medium text-gray-300'>Name *</Label>
                            <Input
                                value={uploadForm.name}
                                onChange={e => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder='Enter screenshot name'
                                className='mt-2 bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:border-white focus:ring-white'
                            />
                        </div>

                        <div>
                            <Label className='text-sm font-medium text-gray-300'>Description</Label>
                            <Textarea
                                value={uploadForm.description}
                                onChange={e => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder='Optional description'
                                className='mt-2 bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:border-white focus:ring-white resize-none h-20'
                            />
                        </div>

                        <div className='flex justify-end gap-3 pt-4'>
                            <Button
                                variant='outline'
                                onClick={() => setIsUploadDialogOpen(false)}
                                disabled={isUploading}
                                className='border-gray-800 text-white hover:bg-gray-800'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpload}
                                disabled={!selectedFile || !uploadForm.name.trim() || isUploading}
                                className='bg-white text-black hover:bg-gray-200 disabled:opacity-50'>
                                {isUploading ? (
                                    <>
                                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className='h-4 w-4 mr-2' />
                                        Upload
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className='bg-gray-900 border-gray-800 text-white'>
                    <DialogHeader>
                        <DialogTitle className='text-white'>Delete Screenshot</DialogTitle>
                    </DialogHeader>
                    <div className='pt-4'>
                        <p className='text-sm text-gray-400 mb-6'>
                            Are you sure you want to delete this screenshot? This will also remove all associated key
                            mappings. This action cannot be undone.
                        </p>
                        <div className='flex justify-end gap-3'>
                            <Button
                                variant='outline'
                                onClick={() => setDeleteConfirmOpen(false)}
                                disabled={isDeleting}
                                className='border-gray-800 text-white hover:bg-gray-800'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                variant='destructive'>
                                {isDeleting ? (
                                    <>
                                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className='h-4 w-4 mr-2' />
                                        Delete
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
