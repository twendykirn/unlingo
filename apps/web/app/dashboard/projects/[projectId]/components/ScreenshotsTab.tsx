'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Image as ImageIcon, Trash2, Edit3, Calendar, HardDrive, Languages } from 'lucide-react';
import { usePaginatedQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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

    if (status === 'LoadingFirstPage' || status === 'LoadingMore') {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin'></div>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <div className='bg-gray-950/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                        <div className='w-12 h-12 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-xl flex items-center justify-center border border-gray-700/30'>
                            <ImageIcon className='h-6 w-6 text-pink-400' />
                        </div>
                        <div>
                            <h3 className='text-2xl font-semibold text-white'>Screenshots</h3>
                            <p className='text-gray-400 text-sm'>
                                Create visual translation mappings for your UI elements
                            </p>
                        </div>
                    </div>
                    <div className='flex items-center space-x-3'>
                        <Button
                            className='bg-white text-black hover:bg-gray-200 transition-all'
                            onClick={() => setIsUploadDialogOpen(true)}>
                            <Plus className='h-4 w-4 mr-2' />
                            Add Screenshot
                        </Button>
                    </div>
                </div>
            </div>

            {screenshots && screenshots.length > 0 ? (
                <div className='space-y-6'>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                        {screenshots.map(screenshot => (
                            <div
                                key={screenshot._id}
                                className='group bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50 hover:border-pink-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-pink-500/10'>
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
                                            onClick={() => openScreenshotEditor(screenshot._id, 'edit')}
                                            className='bg-blue-600 hover:bg-blue-700 text-white'>
                                            <Edit3 className='h-4 w-4 mr-1' />
                                            Edit
                                        </Button>
                                        <Button
                                            size='sm'
                                            onClick={() => openScreenshotEditor(screenshot._id, 'translate')}
                                            className='bg-pink-600 hover:bg-pink-700 text-white'>
                                            <Languages className='h-4 w-4 mr-1' />
                                            Translate
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='destructive'
                                            onClick={e => {
                                                e.stopPropagation();
                                                setScreenshotToDelete(screenshot._id);
                                                setDeleteConfirmOpen(true);
                                            }}
                                            className='bg-red-600 hover:bg-red-700 text-white'>
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>

                                <div className='p-4'>
                                    <h3 className='font-semibold text-white mb-2 truncate group-hover:text-pink-300 transition-colors'>
                                        {screenshot.name}
                                    </h3>

                                    {screenshot.description && (
                                        <p className='text-sm text-gray-400 mb-3 line-clamp-2'>
                                            {screenshot.description}
                                        </p>
                                    )}

                                    <div className='space-y-2'>
                                        <div className='flex items-center justify-between text-xs text-gray-500'>
                                            <span className='flex items-center'>
                                                <ImageIcon className='h-3 w-3 mr-1' />
                                                {screenshot.dimensions.width} × {screenshot.dimensions.height}
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
                                variant='outline'
                                className='border-gray-700 text-gray-300 hover:bg-gray-800'>
                                Load More Screenshots
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className='text-center py-16 bg-gray-900/30 border border-gray-800/50 rounded-xl backdrop-blur-sm'>
                    <div className='w-16 h-16 bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-xl flex items-center justify-center border border-gray-700/30 mx-auto mb-6'>
                        <ImageIcon className='h-8 w-8 text-pink-400' />
                    </div>
                    <h3 className='text-xl font-semibold text-white mb-2'>No screenshots yet</h3>
                    <p className='text-gray-400 mb-6'>
                        Upload your first screenshot to start creating visual translation mappings.
                    </p>
                </div>
            )}

            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogContent className='bg-gray-900 border-gray-800 text-white max-w-md'>
                    <DialogHeader>
                        <DialogTitle className='flex items-center text-white'>
                            <Upload className='h-5 w-5 mr-2 text-pink-400' />
                            Upload Screenshot
                        </DialogTitle>
                    </DialogHeader>
                    <div className='space-y-4 pt-4'>
                        <div>
                            <label className='block text-sm font-medium text-gray-300 mb-3'>Select Image File</label>
                            <div className='relative'>
                                <input
                                    type='file'
                                    accept='image/*'
                                    onChange={handleFileSelect}
                                    className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
                                    id='screenshot-upload'
                                />
                                <div className='border-2 border-dashed border-gray-700 hover:border-pink-500/50 rounded-lg p-6 text-center transition-colors'>
                                    {selectedFile ? (
                                        <div className='space-y-2'>
                                            <ImageIcon className='h-8 w-8 text-pink-400 mx-auto' />
                                            <p className='text-sm text-white font-medium'>{selectedFile.name}</p>
                                            <p className='text-xs text-gray-400'>{formatFileSize(selectedFile.size)}</p>
                                        </div>
                                    ) : (
                                        <div className='space-y-2'>
                                            <Upload className='h-8 w-8 text-gray-500 mx-auto' />
                                            <p className='text-sm text-gray-400'>Click to select an image file</p>
                                            <p className='text-xs text-gray-500'>PNG, JPG, JPEG up to 10MB</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className='block text-sm font-medium text-gray-300 mb-2'>Name *</label>
                            <Input
                                value={uploadForm.name}
                                onChange={e => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder='Enter screenshot name'
                                className='bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-pink-500'
                            />
                        </div>

                        <div>
                            <label className='block text-sm font-medium text-gray-300 mb-2'>Description</label>
                            <Textarea
                                value={uploadForm.description}
                                onChange={e => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder='Optional description'
                                className='bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-pink-500 resize-none h-20'
                            />
                        </div>

                        <div className='flex justify-end space-x-3 pt-4'>
                            <Button
                                variant='outline'
                                onClick={() => setIsUploadDialogOpen(false)}
                                disabled={isUploading}
                                className='border-gray-700 text-gray-300 hover:bg-gray-800'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpload}
                                disabled={!selectedFile || !uploadForm.name.trim() || isUploading}
                                className='bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-50'>
                                {isUploading ? (
                                    <>
                                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
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
                <DialogContent className='bg-gray-900 border-gray-800 text-white max-w-md'>
                    <DialogHeader>
                        <DialogTitle className='flex items-center text-white'>
                            <Trash2 className='h-5 w-5 mr-2 text-red-400' />
                            Delete Screenshot
                        </DialogTitle>
                    </DialogHeader>
                    <div className='pt-4'>
                        <p className='text-gray-300 mb-6'>
                            Are you sure you want to delete this screenshot? This will also remove all associated key
                            mappings. This action cannot be undone.
                        </p>
                        <div className='flex justify-end space-x-3'>
                            <Button
                                variant='outline'
                                onClick={() => setDeleteConfirmOpen(false)}
                                disabled={isDeleting}
                                className='border-gray-700 text-gray-300 hover:bg-gray-800'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className='bg-red-600 hover:bg-red-700 text-white'>
                                {isDeleting ? (
                                    <>
                                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
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
