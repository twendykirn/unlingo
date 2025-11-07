'use client';

import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect, useState } from 'react';
import { PlusIcon, TrashIcon, PencilSquareIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/components/ui/table';
import { Snippet } from '@heroui/snippet';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'next/navigation';
import DashboardSidebar, { WorkspaceWithPremium } from '../components/dashboard-sidebar';
import ProjectsSelector from '../components/projects-selector';
import { Collection, TableLoadMoreItem } from 'react-aria-components';
import ReleaseCreateSheet from './components/release-create-sheet';
import ReleaseRemoveModal from './components/release-remove-modal';
import ReleaseEditSheet from './components/release-edit-sheet';
import { useDateFormatter } from '@react-aria/i18n';

export default function ReleasesPage() {
    const searchParams = useSearchParams();
    const searchParamProjectId = searchParams.get('projectId');

    const [workspace, setWorkspace] = useState<WorkspaceWithPremium | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<Id<'projects'> | null>(null);

    const [isEditReleaseSheetOpen, setIsEditReleaseSheetOpen] = useState(false);
    const [isDeleteReleaseModalOpen, setIsDeleteReleaseModalOpen] = useState(false);
    const [isCreateReleaseSheetOpen, setIsCreateReleaseSheetOpen] = useState(false);
    const [selectedRelease, setSelectedRelease] = useState<Doc<'releases'> | null>(null);

    const formatter = useDateFormatter({ dateStyle: 'long' });

    const project = useQuery(
        api.projects.getProject,
        workspace && selectedProjectId
            ? {
                  projectId: selectedProjectId,
                  workspaceId: workspace._id,
              }
            : 'skip'
    );

    const {
        results: releases,
        status,
        loadMore,
    } = usePaginatedQuery(
        api.releases.getReleases,
        workspace && project
            ? {
                  projectId: project._id,
                  workspaceId: workspace._id,
              }
            : 'skip',
        { initialNumItems: 20 }
    );

    const handleLoadingMore = () => {
        if (status === 'CanLoadMore') {
            loadMore(20);
        }
    };

    useEffect(() => {
        if (workspace && searchParamProjectId) {
            setSelectedProjectId(searchParamProjectId as Id<'projects'>);
        }
    }, [workspace, searchParamProjectId]);

    return (
        <DashboardSidebar activeItem='releases' onWorkspaceChange={setWorkspace}>
            {workspace ? (
                <>
                    <Card>
                        <CardHeader>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col gap-1'>
                                    <CardTitle>Releases</CardTitle>
                                    <CardDescription>View, edit and delete your releases.</CardDescription>
                                </div>
                                <div className='flex items-end gap-2'>
                                    <ProjectsSelector
                                        workspace={workspace}
                                        selectedProjectId={selectedProjectId}
                                        defaultProjectId={(searchParamProjectId as Id<'projects'>) || undefined}
                                        setSelectedProjectId={setSelectedProjectId}
                                        label='Project'
                                        isPreSelectLonelyItem
                                    />
                                    <Button
                                        intent='plain'
                                        isDisabled={!project}
                                        onClick={() => setIsCreateReleaseSheetOpen(true)}>
                                        <PlusIcon />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table
                                bleed
                                className='[--gutter:var(--card-spacing)] sm:[--gutter:var(--card-spacing)]'
                                aria-label='Projects'>
                                <TableHeader>
                                    <TableColumn className='w-0'>Name</TableColumn>
                                    <TableColumn isRowHeader>Tag</TableColumn>
                                    <TableColumn>Created At</TableColumn>
                                    <TableColumn />
                                </TableHeader>
                                <TableBody>
                                    <Collection items={releases}>
                                        {item => (
                                            <TableRow id={item._id}>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell>
                                                    <Snippet size='sm' hideSymbol>
                                                        {item.tag}
                                                    </Snippet>
                                                </TableCell>
                                                <TableCell>
                                                    <div className='flex gap-2 flex-1 items-center'>
                                                        {formatter.format(new Date(item._creationTime))}
                                                    </div>
                                                </TableCell>
                                                <TableCell className='flex justify-end'>
                                                    <Menu>
                                                        <MenuTrigger className='size-6'>
                                                            <EllipsisVerticalIcon />
                                                        </MenuTrigger>
                                                        <MenuContent placement='left top'>
                                                            <MenuItem
                                                                onClick={() => {
                                                                    setIsEditReleaseSheetOpen(true);
                                                                    setSelectedRelease(item);
                                                                }}>
                                                                <PencilSquareIcon /> Edit
                                                            </MenuItem>
                                                            <MenuSeparator />
                                                            <MenuItem
                                                                intent='danger'
                                                                onClick={() => {
                                                                    setIsDeleteReleaseModalOpen(true);
                                                                    setSelectedRelease(item);
                                                                }}>
                                                                <TrashIcon /> Delete
                                                            </MenuItem>
                                                        </MenuContent>
                                                    </Menu>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Collection>
                                    {status !== 'Exhausted' ? (
                                        <TableLoadMoreItem
                                            className='sticky inset-x-0 bottom-0 h-16'
                                            onLoadMore={handleLoadingMore}
                                            isLoading={status === 'LoadingMore'}>
                                            <Loader className='mx-auto' isIndeterminate aria-label='Loading more...' />
                                        </TableLoadMoreItem>
                                    ) : null}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    {project && selectedRelease ? (
                        <>
                            <ReleaseRemoveModal
                                isOpen={isDeleteReleaseModalOpen}
                                setIsOpen={value => {
                                    setIsDeleteReleaseModalOpen(value);
                                    setSelectedRelease(null);
                                }}
                                release={selectedRelease}
                                workspace={workspace}
                            />
                            <ReleaseEditSheet
                                isOpen={isEditReleaseSheetOpen}
                                setIsOpen={setIsEditReleaseSheetOpen}
                                workspace={workspace}
                                project={project}
                                release={selectedRelease}
                            />
                        </>
                    ) : null}
                    {project ? (
                        <ReleaseCreateSheet
                            isOpen={isCreateReleaseSheetOpen}
                            setIsOpen={setIsCreateReleaseSheetOpen}
                            workspace={workspace}
                            project={project}
                        />
                    ) : null}
                </>
            ) : (
                <Loader />
            )}
        </DashboardSidebar>
    );
}
