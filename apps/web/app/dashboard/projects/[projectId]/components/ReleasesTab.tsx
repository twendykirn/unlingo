'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, usePaginatedQuery } from 'convex/react';
import { useUser, useOrganization } from '@clerk/nextjs';
import { GitBranch, Plus, MoreVertical, Trash2, Package, Tag, Clock, CheckCircle2, Copy, Check } from 'lucide-react';
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
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { NamespaceVersion } from '../types';
import NamespaceVersionSelector from './NamespaceVersionSelector';

interface ReleasesTabProps {
    project?: {
        _id: Id<'projects'>;
        name: string;
        description?: string;
        workspaceId: Id<'workspaces'>;
    };
    workspace?: {
        _id: Id<'workspaces'>;
    };
}

export function ReleasesTab({ project, workspace }: ReleasesTabProps) {
    const { user } = useUser();
    const { organization } = useOrganization();
    const params = useParams();
    const projectId = params?.projectId as Id<'projects'>;

    // Get the current workspace identifier (user or organization)
    const clerkId = organization?.id || user?.id;

    // Local state
    const [isCreateReleaseOpen, setIsCreateReleaseOpen] = useState(false);
    const [selectedRelease, setSelectedRelease] = useState<string | null>(null);
    const [newReleaseName, setNewReleaseName] = useState('');
    const [newReleaseVersion, setNewReleaseVersion] = useState('');
    const [selectedNamespaceVersions, setSelectedNamespaceVersions] = useState<NamespaceVersion[]>([]);
    const [isEditReleaseOpen, setIsEditReleaseOpen] = useState(false);
    const [isDeleteReleaseOpen, setIsDeleteReleaseOpen] = useState(false);
    const [editReleaseName, setEditReleaseName] = useState('');
    const [editReleaseVersion, setEditReleaseVersion] = useState('');
    const [editNamespaceVersions, setEditNamespaceVersions] = useState<NamespaceVersion[]>([]);
    const [copiedVersionId, setCopiedVersionId] = useState<string | null>(null);

    // Mutations
    const createRelease = useMutation(api.releases.createRelease);
    const updateRelease = useMutation(api.releases.updateRelease);
    const deleteRelease = useMutation(api.releases.deleteRelease);

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

    // Paginated query for releases
    const {
        results: releases,
        status,
        loadMore,
    } = usePaginatedQuery(
        api.releases.getReleases,
        currentWorkspace && currentProject
            ? {
                  projectId: currentProject._id,
                  workspaceId: currentWorkspace._id,
              }
            : 'skip',
        { initialNumItems: 20 }
    );

    const {
        results: namespaces,
        status: namespacesStatus,
        loadMore: loadMoreNamespaces,
    } = usePaginatedQuery(
        api.namespaces.getNamespaces,
        currentWorkspace && currentProject
            ? {
                  projectId: currentProject._id,
                  workspaceId: currentWorkspace._id,
              }
            : 'skip',
        { initialNumItems: 50 }
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
    const handleCreateRelease = async () => {
        if (!newReleaseName.trim() || !newReleaseVersion.trim() || !currentProject || !currentWorkspace) return;

        try {
            await createRelease({
                projectId: currentProject._id,
                workspaceId: currentWorkspace._id,
                name: newReleaseName.trim(),
                version: newReleaseVersion.trim(),
                namespaceVersions: selectedNamespaceVersions.map(nv => ({
                    namespaceId: nv.namespaceId,
                    versionId: nv.versionId,
                })),
            });
            resetCreateForm();
            setIsCreateReleaseOpen(false);
        } catch (error) {
            console.error('Failed to create release:', error);
        }
    };

    const handleEditRelease = async () => {
        if (
            !editReleaseName.trim() ||
            !editReleaseVersion.trim() ||
            !selectedRelease ||
            !currentProject ||
            !currentWorkspace
        )
            return;

        try {
            await updateRelease({
                releaseId: selectedRelease as Id<'releases'>,
                workspaceId: currentWorkspace._id,
                name: editReleaseName.trim(),
                version: editReleaseVersion.trim(),
                namespaceVersions: editNamespaceVersions.map(nv => ({
                    namespaceId: nv.namespaceId,
                    versionId: nv.versionId,
                })),
            });
            setEditReleaseName('');
            setEditReleaseVersion('');
            setEditNamespaceVersions([]);
            setIsEditReleaseOpen(false);
        } catch (error) {
            console.error('Failed to update release:', error);
        }
    };

    const handleDeleteRelease = async () => {
        if (!selectedRelease || !currentWorkspace) return;

        try {
            await deleteRelease({
                releaseId: selectedRelease as Id<'releases'>,
                workspaceId: currentWorkspace._id,
            });
            setSelectedRelease(null);
            setIsDeleteReleaseOpen(false);
        } catch (error) {
            console.error('Failed to delete release:', error);
        }
    };

    const resetCreateForm = () => {
        setNewReleaseName('');
        setNewReleaseVersion('');
        setSelectedNamespaceVersions([]);
    };

    const handleCopyVersion = async (version: string, releaseId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(version);
            setCopiedVersionId(releaseId);
            setTimeout(() => setCopiedVersionId(null), 600); // Show checkmark for 2 seconds
        } catch (err) {
            console.error('Failed to copy version:', err);
        }
    };

    const handleMoreVerticalClick = async (e: React.MouseEvent, release: any) => {
        e.stopPropagation();
        setSelectedRelease(release._id);
        setEditReleaseName(release.name);
        setEditReleaseVersion(release.version);

        // We need to fetch version names for each namespace version
        const namespaceVersionsWithNames: NamespaceVersion[] = [];

        for (const nv of release.namespaceVersions || []) {
            const namespace = namespaces?.find(ns => ns._id === nv.namespaceId);

            // We'll set a loading state initially and then fetch the actual version
            namespaceVersionsWithNames.push({
                namespaceId: nv.namespaceId,
                versionId: nv.versionId,
                namespaceName: namespace?.name || 'Unknown',
                versionName: 'Loading...', // We'll update this below
            });
        }

        setEditNamespaceVersions(namespaceVersionsWithNames);
        setIsEditReleaseOpen(true);
    };

    // If no releases exist, show the empty state
    if (!releases || releases.length === 0) {
        return (
            <div className='text-center py-12'>
                <GitBranch className='h-12 w-12 text-gray-600 mx-auto mb-4' />
                <h3 className='text-xl font-medium text-gray-400 mb-2'>No releases yet</h3>
                <p className='text-gray-500 mb-6'>Create releases to version your translations across environments.</p>

                <Dialog open={isCreateReleaseOpen} onOpenChange={setIsCreateReleaseOpen}>
                    <DialogTrigger asChild>
                        <Button className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                            <Plus className='h-4 w-4 mr-2' />
                            Create Release
                        </Button>
                    </DialogTrigger>
                    <DialogContent className='bg-gray-950 border-gray-800 text-white max-w-2xl'>
                        <DialogHeader>
                            <DialogTitle>Create New Release</DialogTitle>
                            <DialogDescription className='text-gray-400'>
                                Create a release by selecting namespace versions to include.
                            </DialogDescription>
                        </DialogHeader>

                        <div className='space-y-4'>
                            <div className='grid grid-cols-2 gap-4'>
                                <div>
                                    <Label htmlFor='release-name'>Release Name</Label>
                                    <Input
                                        id='release-name'
                                        placeholder='e.g., Spring Release, v2.1'
                                        value={newReleaseName}
                                        onChange={e => setNewReleaseName(e.target.value)}
                                        className='bg-gray-900 border-gray-700 text-white mt-2'
                                    />
                                </div>
                                <div>
                                    <Label htmlFor='release-version'>Version</Label>
                                    <Input
                                        id='release-version'
                                        placeholder='e.g., 1.0.0, beta, staging'
                                        value={newReleaseVersion}
                                        onChange={e => setNewReleaseVersion(e.target.value)}
                                        className='bg-gray-900 border-gray-700 text-white mt-2'
                                    />
                                </div>
                            </div>

                            <NamespaceVersionSelector
                                selectedVersions={selectedNamespaceVersions}
                                setSelectedVersions={setSelectedNamespaceVersions}
                                workspaceId={currentWorkspace._id}
                                namespaces={namespaces}
                                loadMoreNamespaces={loadMoreNamespaces}
                                namespacesStatus={namespacesStatus}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                variant='outline'
                                onClick={() => {
                                    resetCreateForm();
                                    setIsCreateReleaseOpen(false);
                                }}
                                className='border-gray-700 text-gray-300 hover:bg-gray-800 cursor-pointer'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateRelease}
                                disabled={!newReleaseName.trim() || !newReleaseVersion.trim()}
                                className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                                Create Release
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            {/* Header with Create Release Button */}
            <div className='flex items-center justify-between'>
                <div>
                    <h3 className='text-lg font-semibold text-white'>Releases ({releases.length})</h3>
                    <p className='text-sm text-gray-400'>Manage your translation releases and versions</p>
                </div>

                <Dialog open={isCreateReleaseOpen} onOpenChange={setIsCreateReleaseOpen}>
                    <DialogTrigger asChild>
                        <Button className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                            <Plus className='h-4 w-4 mr-2' />
                            Create Release
                        </Button>
                    </DialogTrigger>
                    <DialogContent className='bg-gray-950 border-gray-800 text-white max-w-2xl'>
                        <DialogHeader>
                            <DialogTitle>Create New Release</DialogTitle>
                            <DialogDescription className='text-gray-400'>
                                Create a release by selecting namespace versions to include.
                            </DialogDescription>
                        </DialogHeader>

                        <div className='space-y-4'>
                            <div className='grid grid-cols-2 gap-4'>
                                <div>
                                    <Label htmlFor='release-name'>Release Name</Label>
                                    <Input
                                        id='release-name'
                                        placeholder='e.g., Spring Release, v2.1'
                                        value={newReleaseName}
                                        onChange={e => setNewReleaseName(e.target.value)}
                                        className='bg-gray-900 border-gray-700 text-white mt-2'
                                    />
                                </div>
                                <div>
                                    <Label htmlFor='release-version'>Version</Label>
                                    <Input
                                        id='release-version'
                                        placeholder='e.g., 1.0.0, beta, staging'
                                        value={newReleaseVersion}
                                        onChange={e => setNewReleaseVersion(e.target.value)}
                                        className='bg-gray-900 border-gray-700 text-white mt-2'
                                    />
                                </div>
                            </div>

                            <NamespaceVersionSelector
                                selectedVersions={selectedNamespaceVersions}
                                setSelectedVersions={setSelectedNamespaceVersions}
                                workspaceId={currentWorkspace._id}
                                namespaces={namespaces}
                                loadMoreNamespaces={loadMoreNamespaces}
                                namespacesStatus={namespacesStatus}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                variant='outline'
                                onClick={() => {
                                    resetCreateForm();
                                    setIsCreateReleaseOpen(false);
                                }}
                                className='border-gray-700 text-gray-300 hover:bg-gray-800 cursor-pointer'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateRelease}
                                disabled={!newReleaseName.trim() || !newReleaseVersion.trim()}
                                className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                                Create Release
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Releases Grid */}
            <div className='space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {releases.map((release: any) => (
                        <div
                            key={release._id}
                            className='bg-gray-900 border border-gray-800 rounded-lg p-6 transition-all hover:border-gray-700'>
                            <div className='flex items-center justify-between mb-4'>
                                <div className='flex items-center space-x-3'>
                                    <div className='w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center'>
                                        <GitBranch className='h-5 w-5 text-white' />
                                    </div>
                                    <div>
                                        <h4 className='font-semibold text-white'>{release.name}</h4>
                                        <div className='flex items-center gap-1'>
                                            <p className='text-sm text-gray-400'>{release.version}</p>
                                            <Button
                                                variant='ghost'
                                                size='sm'
                                                onClick={e => handleCopyVersion(release.version, release._id, e)}
                                                className='h-5 w-5 p-0 text-gray-400 hover:text-white cursor-pointer'>
                                                {copiedVersionId === release._id ? (
                                                    <Check className='h-3 w-3 text-green-400' />
                                                ) : (
                                                    <Copy className='h-3 w-3' />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant='outline'
                                    className='text-gray-400 hover:text-white cursor-pointer'
                                    onClick={e => handleMoreVerticalClick(e, release)}>
                                    <MoreVertical className='h-4 w-4' />
                                </Button>
                            </div>

                            <div className='space-y-3'>
                                <div className='flex items-center gap-2 text-sm text-gray-400'>
                                    <Package className='h-4 w-4' />
                                    <span>{release.namespaceVersions?.length || 0} namespace versions</span>
                                </div>

                                <div className='flex items-center gap-2 text-sm text-gray-400'>
                                    <Clock className='h-4 w-4' />
                                    <span>Created {new Date(release._creationTime).toLocaleDateString()}</span>
                                </div>

                                <div className='flex items-center gap-2 text-sm text-green-400'>
                                    <CheckCircle2 className='h-4 w-4' />
                                    <span>Ready to deploy</span>
                                </div>
                            </div>

                            {/* Namespace versions preview */}
                            {release.namespaceVersions && release.namespaceVersions.length > 0 && (
                                <div className='mt-4 pt-4 border-t border-gray-800'>
                                    <p className='text-xs text-gray-400 mb-2'>Includes:</p>
                                    <div className='space-y-1'>
                                        {release.namespaceVersions.slice(0, 3).map((nv: any, index: number) => {
                                            const namespace = namespaces?.find(ns => ns._id === nv.namespaceId);
                                            return (
                                                <div
                                                    key={index}
                                                    className='text-xs text-gray-300 flex items-center gap-1'>
                                                    <span className='w-1.5 h-1.5 bg-blue-400 rounded-full'></span>
                                                    {namespace?.name || 'Loading...'}
                                                </div>
                                            );
                                        })}
                                        {release.namespaceVersions.length > 3 && (
                                            <div className='text-xs text-gray-400'>
                                                +{release.namespaceVersions.length - 3} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
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
                            Load More Releases
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

            {/* Edit Release Dialog */}
            <Dialog open={isEditReleaseOpen} onOpenChange={setIsEditReleaseOpen}>
                <DialogContent className='bg-gray-950 border-gray-800 text-white max-w-2xl'>
                    <DialogHeader>
                        <DialogTitle>Edit Release</DialogTitle>
                        <DialogDescription className='text-gray-400'>
                            Update the release details and namespace versions.
                        </DialogDescription>
                    </DialogHeader>

                    <div className='space-y-4'>
                        <div className='grid grid-cols-2 gap-4'>
                            <div>
                                <Label htmlFor='edit-release-name'>Release Name</Label>
                                <Input
                                    id='edit-release-name'
                                    placeholder='e.g., Spring Release, v2.1'
                                    value={editReleaseName}
                                    onChange={e => setEditReleaseName(e.target.value)}
                                    className='bg-gray-900 border-gray-700 text-white mt-2'
                                />
                            </div>
                            <div>
                                <Label htmlFor='edit-release-version'>Version</Label>
                                <Input
                                    id='edit-release-version'
                                    placeholder='e.g., 1.0.0, beta, staging'
                                    value={editReleaseVersion}
                                    onChange={e => setEditReleaseVersion(e.target.value)}
                                    className='bg-gray-900 border-gray-700 text-white mt-2'
                                />
                            </div>
                        </div>

                        <NamespaceVersionSelector
                            selectedVersions={editNamespaceVersions}
                            setSelectedVersions={setEditNamespaceVersions}
                            workspaceId={currentWorkspace._id}
                            namespaces={namespaces}
                            loadMoreNamespaces={loadMoreNamespaces}
                            namespacesStatus={namespacesStatus}
                        />
                    </div>

                    <DialogFooter className='flex justify-between'>
                        <Button
                            variant='outline'
                            onClick={() => {
                                setIsDeleteReleaseOpen(true);
                                setIsEditReleaseOpen(false);
                            }}
                            className='border-red-700 text-red-400 hover:bg-red-900/20 cursor-pointer'>
                            <Trash2 className='h-4 w-4 mr-2' />
                            Delete
                        </Button>
                        <div className='flex gap-2'>
                            <Button
                                variant='outline'
                                onClick={() => setIsEditReleaseOpen(false)}
                                className='border-gray-700 text-gray-300 hover:bg-gray-800 cursor-pointer'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleEditRelease}
                                disabled={!editReleaseName.trim() || !editReleaseVersion.trim()}
                                className='bg-white text-black hover:bg-gray-200 cursor-pointer'>
                                Save Changes
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Release Confirmation Dialog */}
            <Dialog open={isDeleteReleaseOpen} onOpenChange={setIsDeleteReleaseOpen}>
                <DialogContent className='bg-gray-950 border-gray-800 text-white'>
                    <DialogHeader>
                        <DialogTitle>Delete Release</DialogTitle>
                        <DialogDescription className='text-gray-400'>
                            Are you sure you want to delete this release? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button
                            variant='outline'
                            onClick={() => setIsDeleteReleaseOpen(false)}
                            className='border-gray-700 text-gray-300 hover:bg-gray-800 cursor-pointer'>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteRelease}
                            className='bg-red-600 text-white hover:bg-red-700 cursor-pointer'>
                            Delete Release
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
