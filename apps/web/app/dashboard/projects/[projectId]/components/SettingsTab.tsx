'use client';

import { Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import * as React from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { useRouter } from 'next/navigation';

interface Project {
    _id: string;
    _creationTime: number;
    name: string;
    description?: string;
}

interface Workspace {
    _id: string;
}

interface SettingsTabProps {
    project: Project;
    workspace: Workspace;
}

export function SettingsTab({ project, workspace }: SettingsTabProps) {
    const router = useRouter();

    // Edit modal state
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Delete modal state
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [deleteVerification, setDeleteVerification] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Mutations
    const updateProject = useMutation(api.projects.updateProject);
    const deleteProject = useMutation(api.projects.deleteProject);

    // Initialize edit form when project data is available
    React.useEffect(() => {
        if (project && !editName && !editDescription) {
            setEditName(project.name);
            setEditDescription(project.description || '');
        }
    }, [project, editName, editDescription]);

    // Handle edit project
    const handleEditProject = async () => {
        if (!project || !workspace || !editName.trim()) return;

        setIsUpdating(true);
        try {
            await updateProject({
                projectId: project._id as any,
                workspaceId: workspace._id as any,
                name: editName.trim(),
                description: editDescription.trim() || undefined,
            });
            setIsEditOpen(false);
        } catch (error) {
            console.error('Failed to update project:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    // Handle delete project
    const handleDeleteProject = async () => {
        if (!project || !workspace) return;

        setIsDeleting(true);
        try {
            await deleteProject({
                projectId: project._id as any,
                workspaceId: workspace._id as any,
            });
            router.push('/dashboard');
        } catch (error) {
            console.error('Failed to delete project:', error);
            setIsDeleting(false);
        }
    };

    const canDelete = deleteConfirmation === project?.name && deleteVerification === 'delete this project';
    
    // Check if values have changed from original project data
    const hasChanges = project && (
        editName.trim() !== project.name ||
        editDescription.trim() !== (project.description || '')
    );

    return (
        <div className='max-w-2xl space-y-6'>
            <div className='bg-gray-900 border border-gray-800 rounded-lg p-6'>
                <h3 className='text-lg font-semibold mb-4'>Project Settings</h3>

                <div className='space-y-6'>
                    <div>
                        <label className='block text-sm font-medium text-gray-400 mb-2'>
                            Project Name
                        </label>
                        <input
                            type='text'
                            value={project.name}
                            readOnly
                            className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                        />
                    </div>

                    <div>
                        <label className='block text-sm font-medium text-gray-400 mb-2'>
                            Description
                        </label>
                        <textarea
                            value={project.description || ''}
                            readOnly
                            rows={3}
                            className='w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none'
                            placeholder='No description provided'
                        />
                    </div>

                    <div>
                        <label className='block text-sm font-medium text-gray-400 mb-2'>Created</label>
                        <div className='text-gray-300'>
                            {new Date(project._creationTime).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Project Actions */}
            <div className='bg-gray-900 border border-gray-800 rounded-lg p-6'>
                <h3 className='text-lg font-semibold mb-4'>Project Actions</h3>

                <div className='space-y-4'>
                    <div className='flex items-center justify-between p-4 bg-gray-800 rounded-lg'>
                        <div>
                            <h4 className='font-medium text-white'>Edit Project</h4>
                            <p className='text-sm text-gray-400 mt-1'>
                                Update project name, description, and other settings
                            </p>
                        </div>
                        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                            <DialogTrigger asChild>
                                <Button variant='outline' size='sm' className='cursor-pointer'>
                                    <Edit className='h-4 w-4 mr-2' />
                                    Edit
                                </Button>
                            </DialogTrigger>
                            <DialogContent className='sm:max-w-[425px] bg-gray-900 border-gray-700'>
                                <DialogHeader>
                                    <DialogTitle className='text-white'>Edit Project</DialogTitle>
                                    <DialogDescription className='text-gray-400'>
                                        Update your project details below.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className='grid gap-4 py-4'>
                                    <div className='grid grid-cols-4 items-center gap-4'>
                                        <Label htmlFor='name' className='text-right'>
                                            Name
                                        </Label>
                                        <Input
                                            id='name'
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className='col-span-3'
                                            placeholder='Project name'
                                        />
                                    </div>
                                    <div className='grid grid-cols-4 items-center gap-4'>
                                        <Label htmlFor='description' className='text-right'>
                                            Description
                                        </Label>
                                        <Textarea
                                            id='description'
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            className='col-span-3'
                                            placeholder='Project description (optional)'
                                            rows={3}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        onClick={() => setIsEditOpen(false)}
                                        disabled={isUpdating}
                                        className='cursor-pointer'>
                                        Cancel
                                    </Button>
                                    <Button
                                        type='button'
                                        onClick={handleEditProject}
                                        disabled={isUpdating || !editName.trim() || !hasChanges}
                                        className='cursor-pointer'>
                                        {isUpdating ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className='flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-red-900/20'>
                        <div>
                            <h4 className='font-medium text-red-400'>Delete Project</h4>
                            <p className='text-sm text-gray-400 mt-1'>
                                Permanently delete this project and all its data
                            </p>
                        </div>
                        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='text-red-400 border-red-400 hover:bg-red-400 hover:text-white cursor-pointer'>
                                    <Trash2 className='h-4 w-4 mr-2' />
                                    Delete
                                </Button>
                            </DialogTrigger>
                            <DialogContent className='sm:max-w-[425px] bg-gray-900 border-gray-700'>
                                <DialogHeader>
                                    <div className='flex items-center gap-3'>
                                        <AlertTriangle className='h-6 w-6 text-red-400' />
                                        <div>
                                            <DialogTitle className='text-white'>
                                                Delete Project
                                            </DialogTitle>
                                            <DialogDescription className='text-gray-400'>
                                                This action cannot be undone. This will permanently
                                                delete your project and all its data.
                                            </DialogDescription>
                                        </div>
                                    </div>
                                </DialogHeader>
                                <div className='grid gap-4 py-4'>
                                    <div className='space-y-4'>
                                        <p className='text-sm text-gray-300'>
                                            To confirm deletion, please type the project name and
                                            "delete this project" below:
                                        </p>
                                        <div className='space-y-2'>
                                            <Label htmlFor='project-name' className='text-gray-300'>
                                                Project Name:{' '}
                                                <span className='font-mono text-white'>
                                                    {project?.name}
                                                </span>
                                            </Label>
                                            <Input
                                                id='project-name'
                                                value={deleteConfirmation}
                                                onChange={(e) => setDeleteConfirmation(e.target.value)}
                                                placeholder='Enter project name'
                                                className='font-mono'
                                            />
                                        </div>
                                        <div className='space-y-2'>
                                            <Label htmlFor='delete-phrase' className='text-gray-300'>
                                                Type:{' '}
                                                <span className='font-mono text-white'>
                                                    delete this project
                                                </span>
                                            </Label>
                                            <Input
                                                id='delete-phrase'
                                                value={deleteVerification}
                                                onChange={(e) => setDeleteVerification(e.target.value)}
                                                placeholder='delete this project'
                                                className='font-mono'
                                            />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        onClick={() => {
                                            setIsDeleteOpen(false);
                                            setDeleteConfirmation('');
                                            setDeleteVerification('');
                                        }}
                                        disabled={isDeleting}
                                        className='cursor-pointer'>
                                        Cancel
                                    </Button>
                                    <Button
                                        type='button'
                                        onClick={handleDeleteProject}
                                        disabled={!canDelete || isDeleting}
                                        className='bg-red-600 hover:bg-red-700 cursor-pointer'>
                                        {isDeleting ? 'Deleting...' : 'Delete Project'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>
        </div>
    );
}