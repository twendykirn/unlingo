'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, usePaginatedQuery, useAction } from 'convex/react';
import { useOrganization } from '@clerk/nextjs';
import { ArrowLeft, Plus, MoreVertical, GitBranch, Trash2, Save } from 'lucide-react';
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
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/convex/_generated/api';
import { Doc, Id } from '@/convex/_generated/dataModel';

export default function NamespaceVersionsPage() {
    const { organization } = useOrganization();
    const router = useRouter();
    const params = useParams();
    const projectId = params?.projectId as Id<'projects'>;
    const namespaceId = params?.namespaceId as Id<'namespaces'>;

    const clerkId = organization?.id;

    const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<Id<'namespaceVersions'> | null>(null);
    const [newVersionNumber, setNewVersionNumber] = useState('');
    const [copyFromVersion, setCopyFromVersion] = useState('');
    const [isEditVersionOpen, setIsEditVersionOpen] = useState(false);
    const [isDeleteVersionOpen, setIsDeleteVersionOpen] = useState(false);
    const [editVersionNumber, setEditVersionNumber] = useState('');
    const [selectedVersionName, setSelectedVersionName] = useState('');

    const createVersion = useAction(api.namespaceVersions.createNamespaceVersion);
    const updateVersion = useMutation(api.namespaceVersions.updateNamespaceVersion);
    const deleteVersion = useMutation(api.namespaceVersions.deleteNamespaceVersion);

    const workspaceQuery = useQuery(api.workspaces.getWorkspaceWithSubscription, clerkId ? { clerkId } : 'skip');

    const projectQuery = useQuery(
        api.projects.getProject,
        workspaceQuery && projectId
            ? {
                  projectId,
                  workspaceId: workspaceQuery._id,
              }
            : 'skip'
    );

    const namespaceQuery = useQuery(
        api.namespaces.getNamespace,
        workspaceQuery && projectQuery && namespaceId
            ? {
                  namespaceId,
                  projectId: projectQuery._id,
                  workspaceId: workspaceQuery._id,
              }
            : 'skip'
    );

    const {
        results: versions,
        status,
        loadMore,
    } = usePaginatedQuery(
        api.namespaceVersions.getNamespaceVersions,
        workspaceQuery && namespaceId
            ? {
                  namespaceId,
                  workspaceId: workspaceQuery._id,
              }
            : 'skip',
        { initialNumItems: 20 }
    );

    // Loading states
    if (
        !workspaceQuery ||
        !projectQuery ||
        !namespaceQuery ||
        status === 'LoadingFirstPage' ||
        status === 'LoadingMore'
    ) {
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
    const handleCreateVersion = async () => {
        if (!newVersionNumber.trim() || !namespaceId || !workspaceQuery) return;

        try {
            await createVersion({
                namespaceId,
                workspaceId: workspaceQuery._id,
                version: newVersionNumber.trim(),
                copyFromVersionId: copyFromVersion ? (copyFromVersion as Id<'namespaceVersions'>) : undefined,
            });
            setNewVersionNumber('');
            setCopyFromVersion('');
            setIsCreateVersionOpen(false);
        } catch (error) {
            console.error('Failed to create version:', error);
        }
    };

    const handleUpdateVersion = async () => {
        if (!selectedVersion || !workspaceQuery || !editVersionNumber.trim()) return;

        try {
            await updateVersion({
                versionId: selectedVersion,
                workspaceId: workspaceQuery._id,
                version: editVersionNumber.trim(),
            });
            setSelectedVersion(null);
            setEditVersionNumber('');
            setSelectedVersionName('');
            setIsEditVersionOpen(false);
        } catch (error) {
            console.error('Failed to update version:', error);
        }
    };

    const handleDeleteVersion = async () => {
        if (!selectedVersion || !workspaceQuery) return;

        try {
            await deleteVersion({
                versionId: selectedVersion,
                workspaceId: workspaceQuery._id,
            });
            setSelectedVersion(null);
            setIsDeleteVersionOpen(false);
        } catch (error) {
            console.error('Failed to delete version:', error);
        }
    };

    const handleVersionCardClick = (versionId: Id<'namespaceVersions'>) => {
        router.push(`/dashboard/projects/${projectId}/namespaces/${namespaceId}/versions/${versionId}`);
    };

    const handleMoreVerticalClick = (e: React.MouseEvent, version: Doc<'namespaceVersions'>) => {
        e.stopPropagation();
        setSelectedVersion(version._id);
        setEditVersionNumber(version.version);
        setSelectedVersionName(version.version);
        setIsEditVersionOpen(true);
    };

    return (
        <div className='p-6 space-y-6'>
            <div className='bg-gray-950/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                        <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => {
                                router.push(`/dashboard/projects/${projectId}`);
                            }}
                            className='w-10 h-10 p-0 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg'>
                            <ArrowLeft className='h-4 w-4' />
                        </Button>
                        <div className='flex items-center space-x-3'>
                            <div className='w-12 h-12 bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-xl flex items-center justify-center border border-gray-700/30'>
                                <GitBranch className='h-6 w-6 text-pink-400' />
                            </div>
                            <div>
                                <h1 className='text-2xl font-semibold text-white'>{namespaceQuery.name}</h1>
                                <p className='text-gray-400 text-sm'>
                                    Manage versions and languages for this namespace
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className='flex items-center space-x-3'>
                        <div className='flex items-center space-x-2 text-xs text-gray-400'>
                            <span>
                                {versions?.length || 0} / {workspaceQuery.limits.versionsPerNamespace}
                            </span>
                            <span>versions</span>
                        </div>
                        <Button
                            className='bg-white text-black hover:bg-gray-200 transition-all'
                            disabled={versions.length >= workspaceQuery.limits.versionsPerNamespace}
                            onClick={() => setIsCreateVersionOpen(true)}>
                            <Plus className='h-4 w-4 mr-2' />
                            Create Version
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={isCreateVersionOpen} onOpenChange={setIsCreateVersionOpen}>
                <DialogContent className='bg-gray-950 border-gray-800 text-white'>
                    <DialogHeader>
                        <DialogTitle>Create New Version</DialogTitle>
                        <DialogDescription className='text-gray-400'>
                            Create a new version for this namespace. Use semantic versioning (e.g., 1.0.0).
                        </DialogDescription>
                    </DialogHeader>

                    <div className='space-y-4'>
                        <div>
                            <Label htmlFor='version-number'>Version Number</Label>
                            <Input
                                id='version-number'
                                placeholder='e.g., 1.0.0, 1.2.3-beta'
                                value={newVersionNumber}
                                onChange={e => setNewVersionNumber(e.target.value)}
                                className='bg-gray-900 border-gray-700 text-white mt-2'
                            />
                        </div>

                        {versions && versions.length > 0 ? (
                            <div>
                                <Label htmlFor='copy-from'>Copy from existing version (optional)</Label>
                                <Select value={copyFromVersion} onValueChange={setCopyFromVersion}>
                                    <SelectTrigger className='bg-gray-900 border-gray-700 text-white'>
                                        <SelectValue placeholder='Select version to copy from' />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {versions.map(version => (
                                            <SelectItem key={version._id} value={version._id}>
                                                {version.version}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : null}
                    </div>

                    <DialogFooter>
                        <Button
                            variant='outline'
                            onClick={() => {
                                setIsCreateVersionOpen(false);
                                setNewVersionNumber('');
                                setCopyFromVersion('');
                            }}
                            className='border-gray-700 text-gray-300 hover:bg-gray-800'>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateVersion}
                            disabled={!newVersionNumber.trim()}
                            className='bg-blue-500 text-white hover:bg-blue-600'>
                            Create Version
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {versions && versions.length > 0 ? (
                <div className='space-y-6'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                        {versions.map(version => (
                            <div
                                key={version._id}
                                className='group bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:border-gray-600/50 hover:bg-gray-900/70 backdrop-blur-sm'
                                onClick={() => handleVersionCardClick(version._id)}>
                                <div className='flex items-center justify-between mb-4'>
                                    <div className='flex items-center space-x-3'>
                                        <div className='w-12 h-12 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-xl flex items-center justify-center border border-pink-500/30 group-hover:border-pink-500/50 transition-all'>
                                            <GitBranch className='h-6 w-6 text-pink-400' />
                                        </div>
                                        <div>
                                            <h4 className='text-lg font-semibold text-white group-hover:text-pink-400 transition-colors mb-1'>
                                                {version.version}
                                            </h4>
                                            <p className='text-xs text-gray-400 font-medium'>Version</p>
                                        </div>
                                    </div>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        className='p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all'
                                        onClick={e => handleMoreVerticalClick(e, version)}>
                                        <MoreVertical className='h-4 w-4' />
                                    </Button>
                                </div>

                                <div className='space-y-3'>
                                    <div className='flex items-center justify-between text-xs'>
                                        <span className='text-gray-400'>Languages</span>
                                        <div className='flex items-center space-x-1'>
                                            <div className='w-2 h-2 bg-green-400 rounded-full'></div>
                                            <span className='text-gray-300 font-medium'>
                                                {version.usage?.languages || 0}
                                            </span>
                                        </div>
                                    </div>
                                    <div className='flex items-center justify-between text-xs'>
                                        <span className='text-gray-400'>Created</span>
                                        <span className='text-gray-300 font-medium'>
                                            {new Date(version._creationTime).toLocaleDateString()}
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
                                Load More Versions
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className='text-center py-16 bg-gray-900/30 border border-gray-800/50 rounded-xl backdrop-blur-sm'>
                    <div className='w-16 h-16 bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-xl flex items-center justify-center border border-gray-700/30 mx-auto mb-6'>
                        <GitBranch className='h-8 w-8 text-pink-400' />
                    </div>
                    <h3 className='text-xl font-semibold text-white mb-2'>No versions yet</h3>
                    <p className='text-gray-400 mb-6'>
                        Create your first version to start managing translations for this namespace.
                    </p>
                </div>
            )}

            <Dialog open={isEditVersionOpen} onOpenChange={setIsEditVersionOpen}>
                <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-lg backdrop-blur-md'>
                    <div className='flex items-center space-x-4 pb-6 border-b border-gray-800/50'>
                        <div className='w-12 h-12 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-xl flex items-center justify-center border border-pink-500/30'>
                            <GitBranch className='h-6 w-6 text-pink-400' />
                        </div>
                        <div>
                            <DialogTitle className='text-xl font-semibold text-white mb-1'>Edit Version</DialogTitle>
                            <DialogDescription className='text-gray-400 text-sm'>
                                Update the version name for {namespaceQuery.name}
                            </DialogDescription>
                        </div>
                    </div>

                    <div className='space-y-6 py-6'>
                        <div className='space-y-3'>
                            <Label htmlFor='edit-version-number' className='text-sm font-medium text-gray-300'>
                                Version Name
                            </Label>
                            <div className='relative'>
                                <Input
                                    id='edit-version-number'
                                    placeholder='e.g., 1.0.0, 1.2.3-beta'
                                    value={editVersionNumber}
                                    onChange={e => setEditVersionNumber(e.target.value)}
                                    className='bg-black/30 border-gray-700/50 text-white h-12 px-4 text-lg focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500/50 transition-all'
                                />
                                <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                                    <GitBranch className='h-4 w-4 text-gray-500' />
                                </div>
                            </div>
                            <div className='bg-gray-900/30 border border-gray-700/30 rounded-lg p-3'>
                                <p className='text-xs text-gray-400 font-medium mb-1'>📝 Versioning Examples:</p>
                                <div className='flex flex-wrap gap-2 mt-2'>
                                    {['main', 'develop', '1.0.0', '1.2.3', '2.0.0-beta', '1.0.1-alpha', '3.1.4'].map(
                                        version => (
                                            <button
                                                key={version}
                                                onClick={() => setEditVersionNumber(version)}
                                                className='px-2 py-1 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/30 rounded text-xs text-gray-300 hover:text-white transition-all cursor-pointer'>
                                                {version}
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className='bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4'>
                            <div className='flex items-center space-x-1 mb-2'>
                                <div className='w-5 h-5 flex items-center justify-center'>
                                    <span className='text-amber-400 text-xs'>⚠️</span>
                                </div>
                                <p className='text-sm font-medium text-amber-400'>Version Update</p>
                            </div>
                            <p className='text-xs text-gray-400 leading-relaxed'>
                                Changing the version number will not affect existing languages or translations in this
                                version. But it might break your releases.
                            </p>
                        </div>
                    </div>

                    <div className='flex items-center justify-between pt-6 border-t border-gray-800/50'>
                        <Button
                            variant='outline'
                            onClick={() => {
                                setIsDeleteVersionOpen(true);
                                setIsEditVersionOpen(false);
                            }}
                            className='border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all'>
                            <Trash2 className='h-4 w-4 mr-2' />
                            Delete Version
                        </Button>
                        <div className='flex space-x-3'>
                            <Button
                                variant='ghost'
                                onClick={() => setIsEditVersionOpen(false)}
                                className='text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpdateVersion}
                                disabled={!editVersionNumber.trim() || selectedVersionName === editVersionNumber.trim()}
                                className='bg-white text-black hover:bg-gray-200 transition-all px-6'>
                                <Save className='h-4 w-4 mr-2' />
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteVersionOpen} onOpenChange={setIsDeleteVersionOpen}>
                <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-lg backdrop-blur-md'>
                    <div className='flex items-center space-x-4 pb-6 border-b border-gray-800/50'>
                        <div className='w-12 h-12 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl flex items-center justify-center border border-red-500/30'>
                            <Trash2 className='h-6 w-6 text-red-400' />
                        </div>
                        <div>
                            <DialogTitle className='text-xl font-semibold text-white mb-1'>Delete Version</DialogTitle>
                            <DialogDescription className='text-gray-400 text-sm'>
                                This action cannot be undone
                            </DialogDescription>
                        </div>
                    </div>

                    <div className='py-6 space-y-4'>
                        <div className='bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl p-4'>
                            <div className='flex items-center space-x-2 mb-3'>
                                <div className='w-5 h-5 bg-red-400/20 rounded-full flex items-center justify-center'>
                                    <span className='text-red-400 text-xs'>⚠️</span>
                                </div>
                                <p className='text-sm font-medium text-red-400'>Permanent Deletion</p>
                            </div>
                            <div className='space-y-2'>
                                <p className='text-sm text-gray-300'>
                                    Are you sure you want to delete version{' '}
                                    <span className='font-semibold text-white'>{selectedVersionName}</span>?
                                </p>
                                <p className='text-xs text-gray-400 leading-relaxed'>This will permanently delete:</p>
                                <ul className='text-xs text-gray-400 space-y-1 ml-4'>
                                    <li>• All languages in this version</li>
                                    <li>• All translation data</li>
                                    <li>• Version history and metadata</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className='flex items-center justify-end space-x-3 pt-6 border-t border-gray-800/50'>
                        <Button
                            variant='ghost'
                            onClick={() => setIsDeleteVersionOpen(false)}
                            className='text-gray-400 hover:text-white hover:bg-gray-800/50 transition-all'>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteVersion}
                            className='bg-red-600 text-white hover:bg-red-700 transition-all px-6'>
                            <Trash2 className='h-4 w-4 mr-2' />
                            Delete Version
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
