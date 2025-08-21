'use client';

import { Trash2, Settings, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { Doc } from '@/convex/_generated/dataModel';

interface SettingsTabProps {
    project: Doc<'projects'>;
    workspace: Doc<'workspaces'>;
}

export function SettingsTab({ project, workspace }: SettingsTabProps) {
    const router = useRouter();

    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const updateProject = useMutation(api.projects.updateProject);
    const deleteProject = useMutation(api.projects.deleteProject);

    useEffect(() => {
        if (project) {
            setEditName(project.name);
            setEditDescription(project.description || '');
        }
    }, [project]);

    const handleUpdateProject = async () => {
        if (!project || !workspace || !editName.trim()) return;

        setIsUpdating(true);
        try {
            await updateProject({
                projectId: project._id,
                workspaceId: workspace._id,
                name: editName.trim(),
                description: editDescription.trim() || undefined,
            });
        } catch (error) {
            console.error('Failed to update project:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteProject = async () => {
        if (!project || !workspace) return;

        setIsDeleting(true);
        try {
            await deleteProject({
                projectId: project._id,
                workspaceId: workspace._id,
            });
            router.push('/dashboard');
        } catch (error) {
            console.error('Failed to delete project:', error);
            setIsDeleting(false);
        }
    };

    const canDelete = deleteConfirmation === project?.name;
    const hasChanges =
        project && (editName.trim() !== project.name || editDescription.trim() !== (project.description || ''));

    return (
        <div className='space-y-6'>
            <div className='bg-gray-950/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                        <div className='w-12 h-12 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl flex items-center justify-center border border-gray-700/30'>
                            <Settings className='h-6 w-6 text-orange-400' />
                        </div>
                        <div>
                            <h3 className='text-2xl font-semibold text-white'>Project Settings</h3>
                            <p className='text-gray-400 text-sm'>Manage your project details and actions</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                <div className='lg:col-span-2 space-y-6'>
                    <div className='bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                        <h4 className='text-lg font-semibold text-white mb-4'>Project Information</h4>
                        <div className='space-y-4'>
                            <div>
                                <Label htmlFor='projectName' className='text-sm font-medium text-gray-300'>
                                    Project Name
                                </Label>
                                <Input
                                    id='projectName'
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className='bg-black/30 border-gray-700/50 text-white h-11 px-4 mt-2 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all'
                                />
                            </div>
                            <div>
                                <Label htmlFor='projectDescription' className='text-sm font-medium text-gray-300'>
                                    Description (optional)
                                </Label>
                                <Textarea
                                    id='projectDescription'
                                    value={editDescription}
                                    onChange={e => setEditDescription(e.target.value)}
                                    rows={4}
                                    className='bg-black/30 border-gray-700/50 text-white p-4 mt-2 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all'
                                    placeholder='A brief description of your project.'
                                />
                            </div>
                        </div>
                        <div className='flex justify-end pt-6 border-t border-gray-800/50 mt-6'>
                            <Button
                                onClick={handleUpdateProject}
                                disabled={!hasChanges || isUpdating}
                                className='bg-white text-black hover:bg-gray-200 transition-all px-6'>
                                <Save className='h-4 w-4 mr-2' />
                                {isUpdating ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className='space-y-6'>
                    <div className='bg-gray-900/50 border border-red-800/50 rounded-xl p-6 backdrop-blur-sm'>
                        <h4 className='text-lg font-semibold text-red-400 mb-2'>Danger Zone</h4>
                        <p className='text-sm text-gray-400 mb-4'>These actions are permanent and cannot be undone.</p>
                        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant='outline'
                                    className='w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all'>
                                    <Trash2 className='h-4 w-4 mr-2' />
                                    Delete Project
                                </Button>
                            </DialogTrigger>
                            <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-lg backdrop-blur-md'>
                                <div className='flex items-center space-x-4 pb-6 border-b border-gray-800/50'>
                                    <div className='w-12 h-12 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl flex items-center justify-center border border-red-500/30'>
                                        <Trash2 className='h-6 w-6 text-red-400' />
                                    </div>
                                    <div>
                                        <DialogTitle className='text-xl font-semibold text-white mb-1'>
                                            Delete Project
                                        </DialogTitle>
                                        <DialogDescription className='text-gray-400 text-sm'>
                                            This action is permanent and cannot be undone.
                                        </DialogDescription>
                                    </div>
                                </div>
                                <div className='py-6 space-y-4'>
                                    <p className='text-sm text-gray-300'>
                                        To confirm, please type the project name below:
                                    </p>
                                    <div className='space-y-2'>
                                        <Label htmlFor='delete-confirm' className='text-sm font-medium text-gray-400'>
                                            Project Name: <span className='font-bold text-white'>{project.name}</span>
                                        </Label>
                                        <Input
                                            id='delete-confirm'
                                            value={deleteConfirmation}
                                            onChange={e => setDeleteConfirmation(e.target.value)}
                                            className='bg-black/30 border-gray-700/50 text-white h-12 px-4 text-lg focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-all font-mono'
                                            placeholder='Enter project name'
                                        />
                                    </div>
                                    <div className='bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl p-4'>
                                        <div className='flex items-center space-x-2 mb-2'>
                                            <div className='w-5 h-5 flex items-center justify-center'>
                                                <span className='text-red-400 text-xs'>⚠️</span>
                                            </div>
                                            <p className='text-sm font-medium text-red-400'>Permanent Deletion</p>
                                        </div>
                                        <p className='text-xs text-gray-400 leading-relaxed'>
                                            This will delete the project, all namespaces, versions, and translations.
                                        </p>
                                    </div>
                                </div>
                                <div className='flex items-center justify-end space-x-3 pt-6 border-t border-gray-800/50'>
                                    <Button
                                        variant='ghost'
                                        onClick={() => setIsDeleteOpen(false)}
                                        disabled={isDeleting}
                                        className='text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all'>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleDeleteProject}
                                        disabled={!canDelete || isDeleting}
                                        className='bg-red-600 text-white hover:bg-red-700 transition-all px-6'>
                                        {isDeleting ? 'Deleting...' : 'Delete Project'}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>
        </div>
    );
}
