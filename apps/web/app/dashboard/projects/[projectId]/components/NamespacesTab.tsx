'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, usePaginatedQuery } from 'convex/react';
import { Globe, Plus, MoreVertical, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/convex/_generated/api';
import { Id, Doc } from '@/convex/_generated/dataModel';

interface NamespacesTabProps {
    project: Doc<'projects'>;
    workspace: Doc<'workspaces'>;
}

export function NamespacesTab({ project, workspace }: NamespacesTabProps) {
    const router = useRouter();

    const [isCreateNamespaceOpen, setIsCreateNamespaceOpen] = useState(false);
    const [selectedNamespace, setSelectedNamespace] = useState<Id<'namespaces'> | null>(null);
    const [newNamespaceName, setNewNamespaceName] = useState('');
    const [isEditNamespaceOpen, setIsEditNamespaceOpen] = useState(false);
    const [isDeleteNamespaceOpen, setIsDeleteNamespaceOpen] = useState(false);
    const [editNamespaceName, setEditNamespaceName] = useState('');
    const [selectedNamespaceName, setSelectedNamespaceName] = useState('');

    const createNamespace = useMutation(api.namespaces.createNamespace);
    const updateNamespace = useMutation(api.namespaces.updateNamespace);
    const deleteNamespace = useMutation(api.namespaces.deleteNamespace);

    const {
        results: namespaces,
        status,
        loadMore,
    } = usePaginatedQuery(
        api.namespaces.getNamespaces,
        {
            projectId: project._id,
            workspaceId: workspace._id,
        },
        { initialNumItems: 20 }
    );

    const handleCreateNamespace = async () => {
        if (!newNamespaceName.trim()) return;

        try {
            await createNamespace({
                projectId: project._id,
                workspaceId: workspace._id,
                name: newNamespaceName.trim(),
            });
            setNewNamespaceName('');
            setIsCreateNamespaceOpen(false);
        } catch (error) {
            console.error('Failed to create namespace:', error);
        }
    };

    const handleEditNamespace = async () => {
        if (!editNamespaceName.trim() || !selectedNamespace) return;

        try {
            await updateNamespace({
                namespaceId: selectedNamespace,
                projectId: project._id,
                workspaceId: workspace._id,
                name: editNamespaceName.trim(),
            });
            setEditNamespaceName('');
            setSelectedNamespaceName('');
            setIsEditNamespaceOpen(false);
        } catch (error) {
            console.error('Failed to update namespace:', error);
        }
    };

    const handleDeleteNamespace = async () => {
        if (!selectedNamespace) return;

        try {
            await deleteNamespace({
                namespaceId: selectedNamespace,
                projectId: project._id,
                workspaceId: workspace._id,
            });
            setSelectedNamespace(null);
            setIsDeleteNamespaceOpen(false);
        } catch (error) {
            console.error('Failed to delete namespace:', error);
        }
    };

    const handleNamespaceCardClick = (namespace: Doc<'namespaces'>) => {
        router.push(`/dashboard/projects/${project._id}/namespaces/${namespace._id}`);
    };

    const handleMoreVerticalClick = (e: React.MouseEvent, namespace: Doc<'namespaces'>) => {
        e.stopPropagation();
        setSelectedNamespace(namespace._id);
        setEditNamespaceName(namespace.name);
        setSelectedNamespaceName(namespace.name);
        setIsEditNamespaceOpen(true);
    };

    if (status === 'LoadingFirstPage' || status === 'LoadingMore') {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin'></div>
            </div>
        );
    }

    if (!namespaces || namespaces.length === 0) {
        return (
            <div className='space-y-6'>
                <div className='bg-gray-950/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-4'>
                            <div className='w-12 h-12 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl flex items-center justify-center border border-gray-700/30'>
                                <Globe className='h-6 w-6 text-cyan-400' />
                            </div>
                            <div>
                                <h3 className='text-2xl font-semibold text-white'>Namespaces</h3>
                                <p className='text-gray-400 text-sm'>Organize translations by feature or section</p>
                            </div>
                        </div>
                        <div className='flex items-center space-x-3'>
                            <div className='flex items-center space-x-2 text-xs text-gray-400'>
                                <span>0 / {workspace.limits.namespacesPerProject}</span>
                                <span>namespaces</span>
                            </div>
                            <Button
                                className='bg-white text-black hover:bg-gray-200 transition-all'
                                onClick={() => setIsCreateNamespaceOpen(true)}>
                                <Plus className='h-4 w-4 mr-2' />
                                Create Namespace
                            </Button>
                        </div>
                    </div>
                </div>

                <div className='text-center py-16 bg-gray-900/30 border border-gray-800/50 rounded-xl backdrop-blur-sm'>
                    <div className='w-16 h-16 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl flex items-center justify-center border border-gray-700/30 mx-auto mb-6'>
                        <Globe className='h-8 w-8 text-cyan-400' />
                    </div>
                    <h3 className='text-xl font-semibold text-white mb-2'>No namespaces yet</h3>
                    <p className='text-gray-400 mb-6'>
                        Create your first namespace to organize translations for {project.name}.
                    </p>
                </div>

                <Dialog open={isCreateNamespaceOpen} onOpenChange={setIsCreateNamespaceOpen}>
                    <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-lg backdrop-blur-md'>
                        <div className='flex items-center space-x-4 pb-6 border-b border-gray-800/50'>
                            <div className='w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30'>
                                <Globe className='h-6 w-6 text-cyan-400' />
                            </div>
                            <div>
                                <DialogTitle className='text-xl font-semibold text-white mb-1'>
                                    Create New Namespace
                                </DialogTitle>
                                <DialogDescription className='text-gray-400 text-sm'>
                                    Organize translations for {project.name}
                                </DialogDescription>
                            </div>
                        </div>

                        <div className='space-y-6 py-6'>
                            <div className='space-y-3'>
                                <Label htmlFor='namespace-name' className='text-sm font-medium text-gray-300'>
                                    Namespace Name
                                </Label>
                                <div className='relative'>
                                    <Input
                                        id='namespace-name'
                                        placeholder='e.g., common, auth, dashboard'
                                        value={newNamespaceName}
                                        onChange={e => setNewNamespaceName(e.target.value)}
                                        className='bg-black/30 border-gray-700/50 text-white h-12 px-4 text-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all'
                                    />
                                    <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                                        <Globe className='h-4 w-4 text-gray-500' />
                                    </div>
                                </div>
                                <div className='bg-gray-900/30 border border-gray-700/30 rounded-lg p-3'>
                                    <p className='text-xs text-gray-400 font-medium mb-1'>💡 Naming Examples:</p>
                                    <div className='flex flex-wrap gap-2 mt-2'>
                                        {['common', 'auth', 'dashboard', 'components', 'pages', 'errors'].map(name => (
                                            <button
                                                key={name}
                                                onClick={() => setNewNamespaceName(name)}
                                                className='px-2 py-1 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/30 rounded text-xs text-gray-300 hover:text-white transition-all cursor-pointer'>
                                                {name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='flex items-center justify-between pt-6 border-t border-gray-800/50'>
                            <div className='text-xs text-gray-500'>
                                0 / {workspace.limits.namespacesPerProject} namespaces
                            </div>
                            <div className='flex space-x-3'>
                                <Button
                                    variant='ghost'
                                    onClick={() => setIsCreateNamespaceOpen(false)}
                                    className='text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all'>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreateNamespace}
                                    disabled={!newNamespaceName.trim()}
                                    className='bg-white text-black hover:bg-gray-200 transition-all px-6'>
                                    <Plus className='h-4 w-4 mr-2' />
                                    Create Namespace
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <div className='bg-gray-950/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                        <div className='w-12 h-12 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl flex items-center justify-center border border-gray-700/30'>
                            <Globe className='h-6 w-6 text-cyan-400' />
                        </div>
                        <div>
                            <h3 className='text-2xl font-semibold text-white'>Namespaces</h3>
                            <p className='text-gray-400 text-sm'>Organize translations by feature or section</p>
                        </div>
                    </div>
                    <div className='flex items-center space-x-3'>
                        <div className='flex items-center space-x-2 text-xs text-gray-400'>
                            <span>
                                {namespaces.length} / {workspace.limits.namespacesPerProject}
                            </span>
                            <span>namespaces</span>
                        </div>
                        <Button
                            className='bg-white text-black hover:bg-gray-200 transition-all'
                            disabled={namespaces.length >= workspace.limits.namespacesPerProject}
                            onClick={() => setIsCreateNamespaceOpen(true)}>
                            <Plus className='h-4 w-4 mr-2' />
                            Create Namespace
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={isCreateNamespaceOpen} onOpenChange={setIsCreateNamespaceOpen}>
                <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-lg backdrop-blur-md'>
                    <div className='flex items-center space-x-4 pb-6 border-b border-gray-800/50'>
                        <div className='w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30'>
                            <Globe className='h-6 w-6 text-cyan-400' />
                        </div>
                        <div>
                            <DialogTitle className='text-xl font-semibold text-white mb-1'>
                                Create New Namespace
                            </DialogTitle>
                            <DialogDescription className='text-gray-400 text-sm'>
                                Organize translations for {project.name}
                            </DialogDescription>
                        </div>
                    </div>

                    <div className='space-y-6 py-6'>
                        <div className='space-y-3'>
                            <Label htmlFor='namespace-name' className='text-sm font-medium text-gray-300'>
                                Namespace Name
                            </Label>
                            <div className='relative'>
                                <Input
                                    id='namespace-name'
                                    placeholder='e.g., common, auth, dashboard'
                                    value={newNamespaceName}
                                    onChange={e => setNewNamespaceName(e.target.value)}
                                    className='bg-black/30 border-gray-700/50 text-white h-12 px-4 text-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all'
                                />
                                <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                                    <Globe className='h-4 w-4 text-gray-500' />
                                </div>
                            </div>
                            <div className='bg-gray-900/30 border border-gray-700/30 rounded-lg p-3'>
                                <p className='text-xs text-gray-400 font-medium mb-1'>💡 Naming Examples:</p>
                                <div className='flex flex-wrap gap-2 mt-2'>
                                    {['common', 'auth', 'dashboard', 'components', 'pages', 'errors'].map(name => (
                                        <button
                                            key={name}
                                            onClick={() => setNewNamespaceName(name)}
                                            className='px-2 py-1 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/30 rounded text-xs text-gray-300 hover:text-white transition-all cursor-pointer'>
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className='bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4'>
                            <div className='flex items-center space-x-2 mb-2'>
                                <div className='w-6 h-6 flex items-center justify-center'>
                                    <span className='text-cyan-400 text-sm'>ℹ️</span>
                                </div>
                                <p className='text-sm font-medium text-cyan-400'>Organization</p>
                            </div>
                            <p className='text-xs text-gray-400 leading-relaxed'>
                                Namespaces help organize your translations by feature, section, or component. You can
                                create versions and languages within each namespace.
                            </p>
                        </div>
                    </div>

                    <div className='flex items-center justify-between pt-6 border-t border-gray-800/50'>
                        <div className='text-xs text-gray-500'>
                            {namespaces?.length || 0} / {workspace.limits.namespacesPerProject} namespaces
                        </div>
                        <div className='flex space-x-3'>
                            <Button
                                variant='ghost'
                                onClick={() => setIsCreateNamespaceOpen(false)}
                                className='text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateNamespace}
                                disabled={!newNamespaceName.trim()}
                                className='bg-white text-black hover:bg-gray-200 transition-all px-6'>
                                <Plus className='h-4 w-4 mr-2' />
                                Create Namespace
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <div className='space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {namespaces.map(namespace => (
                        <div
                            key={namespace._id}
                            className='group bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:border-gray-600/50 hover:bg-gray-900/70 backdrop-blur-sm'
                            onClick={() => handleNamespaceCardClick(namespace)}>
                            <div className='flex items-center justify-between mb-6'>
                                <div className='flex items-center space-x-3'>
                                    <div className='w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30 group-hover:border-cyan-500/50 transition-all'>
                                        <Globe className='h-6 w-6 text-cyan-400' />
                                    </div>
                                    <div>
                                        <h4 className='text-lg font-semibold text-white transition-colors mb-1'>
                                            {namespace.name}
                                        </h4>
                                        <p className='text-xs text-gray-400 font-medium'>Namespace</p>
                                    </div>
                                </div>
                                <Button
                                    size='sm'
                                    variant='ghost'
                                    className='p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all'
                                    onClick={e => handleMoreVerticalClick(e, namespace)}>
                                    <MoreVertical className='h-4 w-4' />
                                </Button>
                            </div>

                            <div className='space-y-3 mb-4'>
                                <div className='flex items-center justify-between text-xs'>
                                    <span className='text-gray-400'>Versions</span>
                                    <div className='flex items-center space-x-1'>
                                        <div className='w-2 h-2 bg-pink-400 rounded-full'></div>
                                        <span className='text-gray-300 font-medium'>
                                            {namespace.usage?.versions || 0}
                                        </span>
                                    </div>
                                </div>
                                <div className='flex items-center justify-between text-xs'>
                                    <span className='text-gray-400'>Created</span>
                                    <span className='text-gray-300 font-medium'>
                                        {new Date(namespace._creationTime).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {status === 'CanLoadMore' && (
                    <div className='flex justify-center'>
                        <Button
                            onClick={() => loadMore(20)}
                            variant='outline'
                            className='border-gray-700 text-gray-300 hover:bg-gray-800'>
                            Load More Namespaces
                        </Button>
                    </div>
                )}
            </div>

            <Dialog open={isEditNamespaceOpen} onOpenChange={setIsEditNamespaceOpen}>
                <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-lg backdrop-blur-md'>
                    <div className='flex items-center space-x-4 pb-6 border-b border-gray-800/50'>
                        <div className='w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30'>
                            <Globe className='h-6 w-6 text-cyan-400' />
                        </div>
                        <div>
                            <DialogTitle className='text-xl font-semibold text-white mb-1'>Edit Namespace</DialogTitle>
                            <DialogDescription className='text-gray-400 text-sm'>
                                Update the namespace name for {project.name}
                            </DialogDescription>
                        </div>
                    </div>

                    <div className='space-y-6 py-6'>
                        <div className='space-y-3'>
                            <Label htmlFor='edit-namespace-name' className='text-sm font-medium text-gray-300'>
                                Namespace Name
                            </Label>
                            <div className='relative'>
                                <Input
                                    id='edit-namespace-name'
                                    placeholder='e.g., common, auth, dashboard'
                                    value={editNamespaceName}
                                    onChange={e => setEditNamespaceName(e.target.value)}
                                    className='bg-black/30 border-gray-700/50 text-white h-12 px-4 text-lg focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all'
                                />
                                <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                                    <Globe className='h-4 w-4 text-gray-500' />
                                </div>
                            </div>
                        </div>

                        <div className='bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4'>
                            <div className='flex items-center space-x-2 mb-2'>
                                <div className='w-5 h-5 flex items-center justify-center'>
                                    <span className='text-amber-400 text-xs'>⚠️</span>
                                </div>
                                <p className='text-sm font-medium text-amber-400'>Namespace Update</p>
                            </div>
                            <p className='text-xs text-gray-400 leading-relaxed'>
                                Changing the namespace name will not affect existing versions, languages, or
                                translations.
                            </p>
                        </div>
                    </div>

                    <div className='flex items-center justify-between pt-6 border-t border-gray-800/50'>
                        <Button
                            variant='outline'
                            onClick={() => {
                                setIsDeleteNamespaceOpen(true);
                                setIsEditNamespaceOpen(false);
                            }}
                            className='border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all'>
                            <Trash2 className='h-4 w-4 mr-2' />
                            Delete Namespace
                        </Button>
                        <div className='flex space-x-3'>
                            <Button
                                variant='ghost'
                                onClick={() => setIsEditNamespaceOpen(false)}
                                className='text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleEditNamespace}
                                disabled={
                                    !editNamespaceName.trim() || selectedNamespaceName === editNamespaceName.trim()
                                }
                                className='bg-white text-black hover:bg-gray-200 transition-all px-6'>
                                <Save className='h-4 w-4 mr-2' />
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteNamespaceOpen} onOpenChange={setIsDeleteNamespaceOpen}>
                <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-lg backdrop-blur-md'>
                    <div className='flex items-center space-x-4 pb-6 border-b border-gray-800/50'>
                        <div className='w-12 h-12 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl flex items-center justify-center border border-red-500/30'>
                            <Trash2 className='h-6 w-6 text-red-400' />
                        </div>
                        <div>
                            <DialogTitle className='text-xl font-semibold text-white mb-1'>
                                Delete Namespace
                            </DialogTitle>
                            <DialogDescription className='text-gray-400 text-sm'>
                                This action cannot be undone
                            </DialogDescription>
                        </div>
                    </div>

                    <div className='py-6 space-y-4'>
                        <div className='bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl p-4'>
                            <div className='flex items-center space-x-2 mb-3'>
                                <div className='w-5 h-5 flex items-center justify-center'>
                                    <span className='text-red-400 text-xs'>⚠️</span>
                                </div>
                                <p className='text-sm font-medium text-red-400'>Permanent Deletion</p>
                            </div>
                            <div className='space-y-2'>
                                <p className='text-sm text-gray-300'>
                                    Are you sure you want to delete namespace{' '}
                                    <span className='font-semibold text-white'>{selectedNamespaceName}</span>?
                                </p>
                                <p className='text-xs text-gray-400 leading-relaxed'>This will permanently delete:</p>
                                <ul className='text-xs text-gray-400 space-y-1 ml-4'>
                                    <li>• All versions in this namespace</li>
                                    <li>• All languages and translations</li>
                                    <li>• All associated files and metadata</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className='flex items-center justify-end space-x-3 pt-6 border-t border-gray-800/50'>
                        <Button
                            variant='ghost'
                            onClick={() => setIsDeleteNamespaceOpen(false)}
                            className='text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all'>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteNamespace}
                            className='bg-red-600 text-white hover:bg-red-700 transition-all px-6'>
                            <Trash2 className='h-4 w-4 mr-2' />
                            Delete Namespace
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
