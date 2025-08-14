'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, usePaginatedQuery } from 'convex/react';
import { useUser, useOrganization } from '@clerk/nextjs';
import {
    GitBranch,
    Plus,
    MoreVertical,
    Trash2,
    Package,
    Tag,
    Clock,
    CheckCircle2,
    Copy,
    Check,
    Save,
} from 'lucide-react';
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
        limits: {
            releasesPerProject: number;
        };
    };
}

export function ReleasesTab({ project, workspace }: ReleasesTabProps) {
    const { user } = useUser();
    const { organization } = useOrganization();
    const params = useParams();
    const projectId = params?.projectId as Id<'projects'>;

    const clerkId = organization?.id || user?.id;

    const [isCreateReleaseOpen, setIsCreateReleaseOpen] = useState(false);
    const [selectedRelease, setSelectedRelease] = useState<any | null>(null);
    const [newReleaseName, setNewReleaseName] = useState('');
    const [newReleaseVersion, setNewReleaseVersion] = useState('');
    const [selectedNamespaceVersions, setSelectedNamespaceVersions] = useState<NamespaceVersion[]>([]);
    const [isEditReleaseOpen, setIsEditReleaseOpen] = useState(false);
    const [isDeleteReleaseOpen, setIsDeleteReleaseOpen] = useState(false);
    const [editReleaseName, setEditReleaseName] = useState('');
    const [editReleaseVersion, setEditReleaseVersion] = useState('');
    const [editNamespaceVersions, setEditNamespaceVersions] = useState<NamespaceVersion[]>([]);
    const [copiedVersionId, setCopiedVersionId] = useState<string | null>(null);

    const createRelease = useMutation(api.releases.createRelease);
    const updateRelease = useMutation(api.releases.updateRelease);
    const deleteRelease = useMutation(api.releases.deleteRelease);

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
                releaseId: selectedRelease._id as Id<'releases'>,
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
                releaseId: selectedRelease._id as Id<'releases'>,
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
            setTimeout(() => setCopiedVersionId(null), 1500);
        } catch (err) {
            console.error('Failed to copy version:', err);
        }
    };

    const handleMoreVerticalClick = (e: React.MouseEvent, release: any) => {
        e.stopPropagation();
        setSelectedRelease(release);
        setEditReleaseName(release.name);
        setEditReleaseVersion(release.version);

        const namespaceVersionsWithNames: NamespaceVersion[] = (release.namespaceVersions || []).map((nv: any) => {
            const namespace = namespaces?.find(ns => ns._id === nv.namespaceId);
            return {
                namespaceId: nv.namespaceId,
                versionId: nv.versionId,
                namespaceName: namespace?.name || 'Unknown',
                versionName: 'Loading...',
            };
        });

        setEditNamespaceVersions(namespaceVersionsWithNames);
        setIsEditReleaseOpen(true);
    };

    if (!releases || releases.length === 0) {
        return (
            <div className='space-y-6'>
                <div className='bg-gray-950/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-4'>
                            <div className='w-12 h-12 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl flex items-center justify-center border border-gray-700/30'>
                                <GitBranch className='h-6 w-6 text-green-400' />
                            </div>
                            <div>
                                <h3 className='text-2xl font-semibold text-white'>Releases</h3>
                                <p className='text-gray-400 text-sm'>Bundle and version your translations</p>
                            </div>
                        </div>
                        <div className='flex items-center space-x-3'>
                            <div className='flex items-center space-x-2 text-xs text-gray-400'>
                                <span>0 / {currentWorkspace.limits.releasesPerProject}</span>
                                <span>releases</span>
                            </div>
                            <Dialog open={isCreateReleaseOpen} onOpenChange={setIsCreateReleaseOpen}>
                                <DialogTrigger asChild>
                                    <Button className='bg-white text-black hover:bg-gray-200 cursor-pointer transition-all'>
                                        <Plus className='h-4 w-4 mr-2' />
                                        Create Release
                                    </Button>
                                </DialogTrigger>
                            </Dialog>
                        </div>
                    </div>
                </div>

                <div className='text-center py-16 bg-gray-900/30 border border-gray-800/50 rounded-xl backdrop-blur-sm'>
                    <div className='w-16 h-16 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl flex items-center justify-center border border-gray-700/30 mx-auto mb-6'>
                        <GitBranch className='h-8 w-8 text-green-400' />
                    </div>
                    <h3 className='text-xl font-semibold text-white mb-2'>No releases yet</h3>
                    <p className='text-gray-400 mb-6'>
                        Create your first release to bundle translations for {currentProject.name}.
                    </p>
                </div>

                <Dialog open={isCreateReleaseOpen} onOpenChange={setIsCreateReleaseOpen}>
                    <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-2xl backdrop-blur-md'>
                        <DialogHeader>
                            <DialogTitle>Create New Release</DialogTitle>
                            <DialogDescription className='text-gray-400'>
                                Create a release by selecting namespace versions to include.
                            </DialogDescription>
                        </DialogHeader>
                        <div className='space-y-4 py-4'>
                            <div className='grid grid-cols-2 gap-4'>
                                <div>
                                    <Label htmlFor='release-name'>Release Name</Label>
                                    <Input
                                        id='release-name'
                                        placeholder='e.g., Spring Release, v2.1'
                                        value={newReleaseName}
                                        onChange={e => setNewReleaseName(e.target.value)}
                                        className='bg-black/30 border-gray-700/50 text-white mt-2'
                                    />
                                </div>
                                <div>
                                    <Label htmlFor='release-version'>Version</Label>
                                    <Input
                                        id='release-version'
                                        placeholder='e.g., 1.0.0, beta, staging'
                                        value={newReleaseVersion}
                                        onChange={e => setNewReleaseVersion(e.target.value)}
                                        className='bg-black/30 border-gray-700/50 text-white mt-2'
                                    />
                                </div>
                            </div>
                            <NamespaceVersionSelector
                                selectedVersions={selectedNamespaceVersions}
                                setSelectedVersions={setSelectedNamespaceVersions}
                                workspaceId={currentWorkspace._id}
                                namespaces={namespaces || []}
                                loadMoreNamespaces={loadMoreNamespaces}
                                namespacesStatus={namespacesStatus}
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                variant='ghost'
                                onClick={() => {
                                    resetCreateForm();
                                    setIsCreateReleaseOpen(false);
                                }}
                                className='text-gray-400 hover:text-white hover:bg-gray-800/50'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateRelease}
                                disabled={!newReleaseName.trim() || !newReleaseVersion.trim()}
                                className='bg-white text-black hover:bg-gray-200'>
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
            <div className='bg-gray-950/50 border border-gray-800/50 rounded-xl p-6 backdrop-blur-sm'>
                <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-4'>
                        <div className='w-12 h-12 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl flex items-center justify-center border border-gray-700/30'>
                            <GitBranch className='h-6 w-6 text-green-400' />
                        </div>
                        <div>
                            <h3 className='text-2xl font-semibold text-white'>Releases</h3>
                            <p className='text-gray-400 text-sm'>Bundle and version your translations</p>
                        </div>
                    </div>
                    <div className='flex items-center space-x-3'>
                        <div className='flex items-center space-x-2 text-xs text-gray-400'>
                            <span>
                                {releases.length} / {currentWorkspace.limits.releasesPerProject}
                            </span>
                            <span>releases</span>
                        </div>
                        <Dialog open={isCreateReleaseOpen} onOpenChange={setIsCreateReleaseOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    className='bg-white text-black hover:bg-gray-200 cursor-pointer transition-all'
                                    disabled={releases.length >= currentWorkspace.limits.releasesPerProject}>
                                    <Plus className='h-4 w-4 mr-2' />
                                    Create Release
                                </Button>
                            </DialogTrigger>
                        </Dialog>
                    </div>
                </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {releases.map((release: any) => (
                    <div
                        key={release._id}
                        className='group bg-gray-900/50 border border-gray-800/50 rounded-xl p-6 transition-all duration-300 hover:border-gray-600/50 hover:bg-gray-900/70 backdrop-blur-sm'>
                        <div className='flex items-center justify-between mb-6'>
                            <div className='flex items-center space-x-3'>
                                <div className='w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center border border-green-500/30 group-hover:border-green-500/50 transition-all'>
                                    <GitBranch className='h-6 w-6 text-green-400' />
                                </div>
                                <div>
                                    <h4 className='text-lg font-semibold text-white transition-colors mb-1'>
                                        {release.name}
                                    </h4>
                                    <div className='flex items-center gap-1'>
                                        <p className='text-sm text-gray-400 font-mono'>{release.version}</p>
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            onClick={e => handleCopyVersion(release.version, release._id, e)}
                                            className='h-6 w-6 p-1 text-gray-400 hover:text-white cursor-pointer'>
                                            {copiedVersionId === release._id ? (
                                                <Check className='h-3 w-3 text-green-400' />
                                            ) : (
                                                <Copy className='h-3 w-3' />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='space-y-3 mb-4'>
                            <div className='flex items-center justify-between text-xs'>
                                <span className='text-gray-400'>Namespace Versions</span>
                                <div className='flex items-center space-x-1'>
                                    <div className='w-2 h-2 bg-blue-400 rounded-full'></div>
                                    <span className='text-gray-300 font-medium'>
                                        {release.namespaceVersions?.length || 0}
                                    </span>
                                </div>
                            </div>
                            <div className='flex items-center justify-between text-xs'>
                                <span className='text-gray-400'>Created</span>
                                <span className='text-gray-300 font-medium'>
                                    {new Date(release._creationTime).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        <div className='flex items-center justify-end pt-4 border-t border-gray-800/50'>
                            <Button
                                size='sm'
                                variant='ghost'
                                className='p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 cursor-pointer transition-all'
                                onClick={e => handleMoreVerticalClick(e, release)}>
                                <MoreVertical className='h-4 w-4' />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

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

            <Dialog open={isCreateReleaseOpen} onOpenChange={setIsCreateReleaseOpen}>
                <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-2xl backdrop-blur-md'>
                    <DialogHeader>
                        <DialogTitle>Create New Release</DialogTitle>
                        <DialogDescription className='text-gray-400'>
                            Create a release by selecting namespace versions to include.
                        </DialogDescription>
                    </DialogHeader>
                    <div className='space-y-4 py-4'>
                        <div className='grid grid-cols-2 gap-4'>
                            <div>
                                <Label htmlFor='release-name-dialog'>Release Name</Label>
                                <Input
                                    id='release-name-dialog'
                                    placeholder='e.g., Spring Release, v2.1'
                                    value={newReleaseName}
                                    onChange={e => setNewReleaseName(e.target.value)}
                                    className='bg-black/30 border-gray-700/50 text-white mt-2'
                                />
                            </div>
                            <div>
                                <Label htmlFor='release-version-dialog'>Version</Label>
                                <Input
                                    id='release-version-dialog'
                                    placeholder='e.g., 1.0.0, beta, staging'
                                    value={newReleaseVersion}
                                    onChange={e => setNewReleaseVersion(e.target.value)}
                                    className='bg-black/30 border-gray-700/50 text-white mt-2'
                                />
                            </div>
                        </div>
                        <NamespaceVersionSelector
                            selectedVersions={selectedNamespaceVersions}
                            setSelectedVersions={setSelectedNamespaceVersions}
                            workspaceId={currentWorkspace._id}
                            namespaces={namespaces || []}
                            loadMoreNamespaces={loadMoreNamespaces}
                            namespacesStatus={namespacesStatus}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant='ghost'
                            onClick={() => {
                                resetCreateForm();
                                setIsCreateReleaseOpen(false);
                            }}
                            className='text-gray-400 hover:text-white hover:bg-gray-800/50'>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateRelease}
                            disabled={!newReleaseName.trim() || !newReleaseVersion.trim()}
                            className='bg-white text-black hover:bg-gray-200'>
                            Create Release
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isEditReleaseOpen} onOpenChange={setIsEditReleaseOpen}>
                <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-2xl backdrop-blur-md'>
                    <DialogHeader>
                        <DialogTitle>Edit Release</DialogTitle>
                        <DialogDescription className='text-gray-400'>
                            Update the release details and namespace versions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className='space-y-4 py-4'>
                        <div className='grid grid-cols-2 gap-4'>
                            <div>
                                <Label htmlFor='edit-release-name'>Release Name</Label>
                                <Input
                                    id='edit-release-name'
                                    value={editReleaseName}
                                    onChange={e => setEditReleaseName(e.target.value)}
                                    className='bg-black/30 border-gray-700/50 text-white mt-2'
                                />
                            </div>
                            <div>
                                <Label htmlFor='edit-release-version'>Version</Label>
                                <Input
                                    id='edit-release-version'
                                    value={editReleaseVersion}
                                    onChange={e => setEditReleaseVersion(e.target.value)}
                                    className='bg-black/30 border-gray-700/50 text-white mt-2'
                                />
                            </div>
                        </div>
                        <NamespaceVersionSelector
                            selectedVersions={editNamespaceVersions}
                            setSelectedVersions={setEditNamespaceVersions}
                            workspaceId={currentWorkspace._id}
                            namespaces={namespaces || []}
                            loadMoreNamespaces={loadMoreNamespaces}
                            namespacesStatus={namespacesStatus}
                        />
                    </div>
                    <DialogFooter className='flex justify-between w-full'>
                        <Button
                            variant='outline'
                            onClick={() => {
                                setIsDeleteReleaseOpen(true);
                                setIsEditReleaseOpen(false);
                            }}
                            className='border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50'>
                            <Trash2 className='h-4 w-4 mr-2' />
                            Delete
                        </Button>
                        <div className='flex space-x-3'>
                            <Button
                                variant='ghost'
                                onClick={() => setIsEditReleaseOpen(false)}
                                className='text-gray-400 hover:text-white hover:bg-gray-800/50'>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleEditRelease}
                                disabled={!editReleaseName.trim() || !editReleaseVersion.trim()}
                                className='bg-white text-black hover:bg-gray-200'>
                                <Save className='h-4 w-4 mr-2' />
                                Save Changes
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteReleaseOpen} onOpenChange={setIsDeleteReleaseOpen}>
                <DialogContent className='bg-gray-950/95 border border-gray-800/50 text-white max-w-lg backdrop-blur-md'>
                    <DialogHeader>
                        <div className='flex items-center space-x-4'>
                            <div className='w-12 h-12 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl flex items-center justify-center border border-red-500/30'>
                                <Trash2 className='h-6 w-6 text-red-400' />
                            </div>
                            <div>
                                <DialogTitle className='text-xl font-semibold'>Delete Release</DialogTitle>
                                <DialogDescription className='text-gray-400'>
                                    This action cannot be undone.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className='py-6 space-y-4'>
                        <p className='text-sm text-gray-300'>
                            Are you sure you want to delete the release{' '}
                            <span className='font-semibold text-white'>{selectedRelease?.name}</span>?
                        </p>
                        <div className='bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 rounded-xl p-4'>
                            <p className='text-xs text-gray-400 leading-relaxed'>
                                This will permanently delete the release and its associations.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className='flex justify-end space-x-3'>
                        <Button variant='ghost' onClick={() => setIsDeleteReleaseOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleDeleteRelease} className='bg-red-600 text-white hover:bg-red-700'>
                            Delete Release
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
