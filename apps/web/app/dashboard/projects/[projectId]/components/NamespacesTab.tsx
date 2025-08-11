'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, usePaginatedQuery } from 'convex/react';
import { useUser, useOrganization } from '@clerk/nextjs';
import { Globe, Plus, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';

interface NamespacesTabProps {
    project?: {
        _id: Id<'projects'>;
        name: string;
        description?: string;
        workspaceId: Id<'workspaces'>;
    };
    workspace?: {
        _id: Id<'workspaces'>;
        limits: {
            namespacesPerProject: number;
            versionsPerNamespace: number;
            languagesPerNamespace: number;
        };
    };
}

export function NamespacesTab({ project, workspace }: NamespacesTabProps) {
    const { user } = useUser();
    const { organization } = useOrganization();
    const router = useRouter();
    const params = useParams();
    const projectId = params?.projectId as Id<'projects'>;

    // Get the current workspace identifier (user or organization)
    const clerkId = organization?.id || user?.id;

    // Local state
    const [isCreateNamespaceOpen, setIsCreateNamespaceOpen] = useState(false);
    const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);
    const [newNamespaceName, setNewNamespaceName] = useState('');
    const [isEditNamespaceOpen, setIsEditNamespaceOpen] = useState(false);
    const [isDeleteNamespaceOpen, setIsDeleteNamespaceOpen] = useState(false);
    const [editNamespaceName, setEditNamespaceName] = useState('');
    // Removed newLanguageFile state as we no longer upload files initially
    // Removed primaryLanguage state - now managed automatically

    // Mutations
    const createNamespace = useMutation(api.namespaces.createNamespace);
    const updateNamespace = useMutation(api.namespaces.updateNamespace);
    const deleteNamespace = useMutation(api.namespaces.deleteNamespace);

    // Queries - using provided props or fallback to queries
    const workspaceQuery = useQuery(
        api.workspaces.getWorkspaceWithSubscription,
        clerkId && !workspace ? { clerkId } : 'skip'
    );

    const projectQuery = useQuery(
        api.projects.getProject,
        workspaceQuery && projectId && !project
            ? {
                  projectId,
                  workspaceId: workspaceQuery._id,
              }
            : 'skip'
    );

    const currentWorkspace = workspace || workspaceQuery;
    const currentProject = project || projectQuery;

    // Paginated query for namespaces
    const {
        results: namespaces,
        status,
        loadMore,
    } = usePaginatedQuery(
        api.namespaces.getNamespaces,
        currentWorkspace && currentProject
            ? {
                  projectId: currentProject._id,
                  workspaceId: currentWorkspace._id,
              }
            : 'skip',
        { initialNumItems: 20 }
    );

    // Loading states
    if (!currentWorkspace || !currentProject) {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='text-center'>
                    <div className='w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
                    <p className='text-gray-400'>Loading...</p>
                </div>
            </div>
        );
    }

    // Handlers
    const handleCreateNamespace = async () => {
        if (!newNamespaceName.trim() || !currentProject || !currentWorkspace) return;

        try {
            await createNamespace({
                projectId: currentProject._id,
                workspaceId: currentWorkspace._id,
                name: newNamespaceName.trim(),
            });
            setNewNamespaceName('');
            setIsCreateNamespaceOpen(false);
        } catch (error) {
            console.error('Failed to create namespace:', error);
        }
    };

    const handleEditNamespace = async () => {
        if (!editNamespaceName.trim() || !selectedNamespace || !currentProject || !currentWorkspace) return;

        try {
            await updateNamespace({
                namespaceId: selectedNamespace as Id<'namespaces'>,
                projectId: currentProject._id,
                workspaceId: currentWorkspace._id,
                name: editNamespaceName.trim(),
            });
            setEditNamespaceName('');
            setIsEditNamespaceOpen(false);
        } catch (error) {
            console.error('Failed to update namespace:', error);
        }
    };

    const handleDeleteNamespace = async () => {
        if (!selectedNamespace || !currentProject || !currentWorkspace) return;

        try {
            await deleteNamespace({
                namespaceId: selectedNamespace as Id<'namespaces'>,
                projectId: currentProject._id,
                workspaceId: currentWorkspace._id,
            });
            setSelectedNamespace(null);
            setIsDeleteNamespaceOpen(false);
        } catch (error) {
            console.error('Failed to delete namespace:', error);
        }
    };

    const handleNamespaceCardClick = (namespace: any) => {
        router.push(`/dashboard/projects/${projectId}/namespaces/${namespace._id}`);
    };

    const handleMoreVerticalClick = (e: React.MouseEvent, namespace: any) => {
        e.stopPropagation();
        setSelectedNamespace(namespace._id);
        setEditNamespaceName(namespace.name);
        setIsEditNamespaceOpen(true);
    };

    // If no namespaces exist, show the empty state
    if (!namespaces || namespaces.length === 0) {
        return (
            <div className='text-center py-12'>
                <Globe className='h-12 w-12 text-gray-600 mx-auto mb-4' />
                <h3 className='text-xl font-medium text-gray-400 mb-2'>No namespaces yet</h3>
                <p className='text-gray-500 mb-6'>Create your first namespace to organize your translations.</p>

                <Dialog open={isCreateNamespaceOpen} onOpenChange={setIsCreateNamespaceOpen}>
                    <DialogTrigger asChild>
                        <Button className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                            <Plus className='h-4 w-4 mr-2' />
                            Create Namespace
                        </Button>
                    </DialogTrigger>
                    <DialogContent className='bg-gray-950 border-gray-800 text-white'>
                        <DialogHeader>
                            <DialogTitle>Create New Namespace</DialogTitle>
                            <DialogDescription className='text-gray-400'>
                                Namespaces help organize your translations by feature or section.
                            </DialogDescription>
                        </DialogHeader>

                        <div className='space-y-4'>
                            <div>
                                <Label htmlFor='namespace-name'>Namespace Name</Label>
                                <Input
                                    id='namespace-name'
                                    placeholder='e.g., common, auth, dashboard'
                                    value={newNamespaceName}
                                    onChange={e => setNewNamespaceName(e.target.value)}
                                    className='bg-gray-900 border-gray-700 text-white mt-2'
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant='outline'
                                onClick={() => setIsCreateNamespaceOpen(false)}
                                className='border-gray-700 text-gray-300 hover:bg-gray-800 cursor-pointer'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateNamespace}
                                disabled={!newNamespaceName.trim()}
                                className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                                Create Namespace
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            {/* Header with Create Namespace Button */}
            <div className='flex items-center justify-between'>
                <div>
                    <h3 className='text-lg font-semibold text-white'>Namespaces ({namespaces.length})</h3>
                    <p className='text-sm text-gray-400'>
                        Limit: {namespaces.length}/{currentWorkspace.limits.namespacesPerProject}
                    </p>
                </div>

                <Dialog open={isCreateNamespaceOpen} onOpenChange={setIsCreateNamespaceOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className='bg-white text-black hover:bg-gray-200 cursor-pointer'
                            disabled={namespaces.length >= currentWorkspace.limits.namespacesPerProject}>
                            <Plus className='h-4 w-4 mr-2' />
                            Create Namespace
                        </Button>
                    </DialogTrigger>
                    <DialogContent className='bg-gray-950 border-gray-800 text-white'>
                        <DialogHeader>
                            <DialogTitle>Create New Namespace</DialogTitle>
                            <DialogDescription className='text-gray-400'>
                                Namespaces help organize your translations by feature or section.
                            </DialogDescription>
                        </DialogHeader>

                        <div className='space-y-4'>
                            <div>
                                <Label htmlFor='namespace-name'>Namespace Name</Label>
                                <Input
                                    id='namespace-name'
                                    placeholder='e.g., common, auth, dashboard'
                                    value={newNamespaceName}
                                    onChange={e => setNewNamespaceName(e.target.value)}
                                    className='bg-gray-900 border-gray-700 text-white mt-2'
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant='outline'
                                onClick={() => setIsCreateNamespaceOpen(false)}
                                className='border-gray-700 text-gray-300 hover:bg-gray-800 cursor-pointer'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateNamespace}
                                disabled={!newNamespaceName.trim()}
                                className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                                Create Namespace
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Namespaces Grid */}
            <div className='space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {namespaces.map((namespace: any) => (
                        <div
                            key={namespace._id}
                            className='bg-gray-900 border border-gray-800 rounded-lg p-6 cursor-pointer transition-all hover:border-gray-700'
                            onClick={() => handleNamespaceCardClick(namespace)}>
                            <div className='flex items-center justify-between mb-4'>
                                <div className='flex items-center space-x-3'>
                                    <div className='w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center'>
                                        <Globe className='h-5 w-5 text-white' />
                                    </div>
                                    <h4 className='font-semibold text-white'>{namespace.name}</h4>
                                </div>
                                <Button
                                    variant='outline'
                                    className='text-gray-400 hover:text-white cursor-pointer'
                                    onClick={e => handleMoreVerticalClick(e, namespace)}>
                                    <MoreVertical className='h-4 w-4' />
                                </Button>
                            </div>

                            <div className='space-y-2 text-sm text-gray-400'>
                                <div className='flex items-center justify-between'>
                                    <span>Versions:</span>
                                    <span>{namespace.usage?.versions || 0}</span>
                                </div>
                                <div className='flex items-center justify-between'>
                                    <span>Languages:</span>
                                    <span>{namespace.usage?.languages || 0}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Load More Button */}
                {status === 'CanLoadMore' && (
                    <div className='flex justify-center'>
                        <Button
                            onClick={() => loadMore(20)}
                            variant='outline'
                            className='border-gray-700 text-gray-300 hover:bg-gray-800 cursor-pointer'>
                            Load More Namespaces
                        </Button>
                    </div>
                )}
                {status === 'LoadingMore' && (
                    <div className='flex justify-center'>
                        <Button disabled variant='outline' className='border-gray-700 text-gray-300'>
                            Loading...
                        </Button>
                    </div>
                )}
            </div>

            {/* Edit Namespace Dialog */}
            <Dialog open={isEditNamespaceOpen} onOpenChange={setIsEditNamespaceOpen}>
                <DialogContent className='bg-gray-950 border-gray-800 text-white'>
                    <DialogHeader>
                        <DialogTitle>Edit Namespace</DialogTitle>
                        <DialogDescription className='text-gray-400'>Update the namespace name.</DialogDescription>
                    </DialogHeader>

                    <div className='space-y-4'>
                        <div>
                            <Label htmlFor='edit-namespace-name'>Namespace Name</Label>
                            <Input
                                id='edit-namespace-name'
                                placeholder='e.g., common, auth, dashboard'
                                value={editNamespaceName}
                                onChange={e => setEditNamespaceName(e.target.value)}
                                className='bg-gray-900 border-gray-700 text-white mt-2'
                            />
                        </div>
                    </div>

                    <DialogFooter className='flex justify-between'>
                        <Button
                            variant='outline'
                            onClick={() => {
                                setIsDeleteNamespaceOpen(true);
                                setIsEditNamespaceOpen(false);
                            }}
                            className='border-red-700 text-red-400 hover:bg-red-900/20 cursor-pointer'>
                            <Trash2 className='h-4 w-4 mr-2' />
                            Delete
                        </Button>
                        <div className='flex gap-2'>
                            <Button
                                onClick={handleEditNamespace}
                                disabled={!editNamespaceName.trim()}
                                className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                                Save Changes
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Namespace Confirmation Dialog */}
            <Dialog open={isDeleteNamespaceOpen} onOpenChange={setIsDeleteNamespaceOpen}>
                <DialogContent className='bg-gray-950 border-gray-800 text-white'>
                    <DialogHeader>
                        <DialogTitle>Delete Namespace</DialogTitle>
                        <DialogDescription className='text-gray-400'>
                            Are you sure you want to delete this namespace? This will permanently delete all versions,
                            languages, and translation data. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            variant='outline'
                            onClick={() => setIsDeleteNamespaceOpen(false)}
                            className='border-gray-700 text-gray-300 hover:bg-gray-800 cursor-pointer'>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteNamespace}
                            className='bg-red-600 text-white hover:bg-red-700 cursor-pointer'>
                            Delete Namespace
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
