'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, usePaginatedQuery, useAction } from 'convex/react';
import { useUser, useOrganization } from '@clerk/nextjs';
import { ArrowLeft, Plus, MoreVertical, GitBranch, Tag, Trash2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

export default function NamespaceVersionsPage() {
    const { user } = useUser();
    const { organization } = useOrganization();
    const router = useRouter();
    const params = useParams();
    const projectId = params?.projectId as Id<'projects'>;
    const namespaceId = params?.namespaceId as Id<'namespaces'>;

    // Get the current workspace identifier (user or organization)
    const clerkId = organization?.id || user?.id;

    // Local state
    const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
    const [newVersionNumber, setNewVersionNumber] = useState('');
    const [copyFromVersion, setCopyFromVersion] = useState('');
    const [isEditVersionOpen, setIsEditVersionOpen] = useState(false);
    const [isDeleteVersionOpen, setIsDeleteVersionOpen] = useState(false);
    const [editVersionNumber, setEditVersionNumber] = useState('');

    // Mutations
    const createVersion = useAction(api.namespaceVersions.createNamespaceVersion);
    const deleteVersion = useMutation(api.namespaceVersions.deleteNamespaceVersion);

    // Queries
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

    // Paginated query for versions
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
    if (!workspaceQuery || !projectQuery || !namespaceQuery) {
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

    const handleDeleteVersion = async () => {
        if (!selectedVersion || !workspaceQuery) return;

        try {
            await deleteVersion({
                versionId: selectedVersion as Id<'namespaceVersions'>,
                workspaceId: workspaceQuery._id,
            });
            setSelectedVersion(null);
            setIsDeleteVersionOpen(false);
        } catch (error) {
            console.error('Failed to delete version:', error);
        }
    };

    const handleVersionCardClick = (version: any) => {
        router.push(`/dashboard/projects/${projectId}/namespaces/${namespaceId}/versions/${version._id}`);
    };

    const handleMoreVerticalClick = (e: React.MouseEvent, version: any) => {
        e.stopPropagation();
        setSelectedVersion(version._id);
        setEditVersionNumber(version.version);
        setIsEditVersionOpen(true);
    };

    return (
        <div className='p-6 space-y-6'>
            {/* Header */}
            <div className='flex items-center space-x-4'>
                <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                        router.push(`/dashboard/projects/${projectId}`);
                    }}
                    className='text-gray-400 hover:text-white cursor-pointer'>
                    <ArrowLeft className='h-4 w-4 mr-2' />
                    Back
                </Button>
                <div>
                    <h1 className='text-2xl font-bold text-white'>{namespaceQuery.name}</h1>
                    <p className='text-gray-400'>Manage versions and languages for this namespace</p>
                </div>
            </div>

            {/* Create Version Button */}
            <div className='flex justify-end'>
                <Dialog open={isCreateVersionOpen} onOpenChange={setIsCreateVersionOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className='bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
                            disabled={versions.length >= workspaceQuery.limits.versionsPerNamespace}>
                            <Plus className='h-4 w-4 mr-2' />
                            Create Version
                        </Button>
                    </DialogTrigger>
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

                            {versions && versions.length > 0 && (
                                <div>
                                    <Label htmlFor='copy-from'>Copy from existing version (optional)</Label>
                                    <Select value={copyFromVersion} onValueChange={setCopyFromVersion}>
                                        <SelectTrigger className='bg-gray-900 border-gray-700 text-white'>
                                            <SelectValue placeholder='Select version to copy from' />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {versions.map((version: any) => (
                                                <SelectItem key={version._id} value={version._id}>
                                                    {version.version}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                variant='outline'
                                onClick={() => {
                                    setIsCreateVersionOpen(false);
                                    setNewVersionNumber('');
                                    setCopyFromVersion('');
                                }}
                                className='border-gray-700 text-gray-300 hover:bg-gray-800 cursor-pointer'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateVersion}
                                disabled={!newVersionNumber.trim()}
                                className='bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'>
                                Create Version
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Versions List */}
            {versions && versions.length > 0 ? (
                <div className='space-y-6'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
                        {versions.map(version => (
                            <div
                                key={version._id}
                                className='bg-gray-900 border border-gray-800 rounded-lg p-6 cursor-pointer transition-all hover:border-gray-700'
                                onClick={() => handleVersionCardClick(version)}>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center space-x-3'>
                                        <div className='w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center'>
                                            <GitBranch className='h-5 w-5 text-white' />
                                        </div>
                                        <h4 className='font-semibold text-white'>{version.version}</h4>
                                    </div>
                                    <Button
                                        variant='outline'
                                        className='text-gray-400 hover:text-white cursor-pointer'
                                        onClick={e => handleMoreVerticalClick(e, version)}>
                                        <MoreVertical className='h-4 w-4' />
                                    </Button>
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
                                Load More Versions
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
            ) : (
                <div className='text-center py-12 border border-gray-800 rounded-lg'>
                    <Tag className='h-12 w-12 text-gray-600 mx-auto mb-4' />
                    <h3 className='text-xl font-medium text-gray-400 mb-2'>No versions yet</h3>
                    <p className='text-gray-500 mb-6'>Create your first version to start managing translations.</p>
                </div>
            )}

            {/* Edit Version Dialog */}
            <Dialog open={isEditVersionOpen} onOpenChange={setIsEditVersionOpen}>
                <DialogContent className='bg-gray-950 border-gray-800 text-white'>
                    <DialogHeader>
                        <DialogTitle>Edit Version</DialogTitle>
                        <DialogDescription className='text-gray-400'>Update the version number.</DialogDescription>
                    </DialogHeader>

                    <div className='space-y-4'>
                        <div>
                            <Label htmlFor='edit-version-number'>Version Number</Label>
                            <Input
                                id='edit-version-number'
                                placeholder='e.g., 1.0.0, 1.2.3-beta'
                                value={editVersionNumber}
                                onChange={e => setEditVersionNumber(e.target.value)}
                                className='bg-gray-900 border-gray-700 text-white mt-2'
                            />
                        </div>
                    </div>

                    <DialogFooter className='flex justify-between'>
                        <Button
                            variant='outline'
                            onClick={() => {
                                setIsDeleteVersionOpen(true);
                                setIsEditVersionOpen(false);
                            }}
                            className='border-red-700 text-red-400 hover:bg-red-900/20 cursor-pointer'>
                            <Trash2 className='h-4 w-4 mr-2' />
                            Delete
                        </Button>
                        <div className='flex gap-2'>
                            <Button
                                onClick={() => {
                                    /* TODO: Add update version handler */
                                }}
                                disabled={!editVersionNumber.trim()}
                                className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                                Save Changes
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Version Confirmation Dialog */}
            <Dialog open={isDeleteVersionOpen} onOpenChange={setIsDeleteVersionOpen}>
                <DialogContent className='bg-gray-950 border-gray-800 text-white'>
                    <DialogHeader>
                        <DialogTitle>Delete Version</DialogTitle>
                        <DialogDescription className='text-gray-400'>
                            Are you sure you want to delete this version? This will permanently delete all languages and
                            translation data for this version. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            variant='outline'
                            onClick={() => setIsDeleteVersionOpen(false)}
                            className='border-gray-700 text-gray-300 hover:bg-gray-800 cursor-pointer'>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteVersion}
                            className='bg-red-600 text-white hover:bg-red-700 cursor-pointer'>
                            Delete Version
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
