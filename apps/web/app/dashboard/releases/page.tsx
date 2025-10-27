'use client';

import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect, useState } from 'react';
import { IconDotsVertical, IconHighlight, IconPlus, IconTrash } from '@intentui/icons';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { CalendarDateTime } from '@internationalized/date';
import { DateField } from '@/components/ui/date-field';
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

export default function ReleasesPage() {
    const searchParams = useSearchParams();
    const searchParamProjectId = searchParams.get('projectId');

    const [workspace, setWorkspace] = useState<WorkspaceWithPremium | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<Id<'projects'> | null>(null);

    const [isEditReleaseSheetOpen, setIsEditReleaseSheetOpen] = useState(false);
    const [isDeleteReleaseModalOpen, setIsDeleteReleaseModalOpen] = useState(false);
    const [isCreateReleaseSheetOpen, setIsCreateReleaseSheetOpen] = useState(false);
    const [selectedRelease, setSelectedRelease] = useState<Doc<'releases'> | null>(null);

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
                        <Card.Header>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col gap-1'>
                                    <Card.Title>Releases</Card.Title>
                                    <Card.Description>View, edit and delete your releases.</Card.Description>
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
                                        <IconPlus />
                                    </Button>
                                </div>
                            </div>
                        </Card.Header>
                        <Card.Content>
                            <Table
                                bleed
                                className='[--gutter:var(--card-spacing)] sm:[--gutter:var(--card-spacing)]'
                                aria-label='Projects'>
                                <Table.Header>
                                    <Table.Column className='w-0'>Id</Table.Column>
                                    <Table.Column isRowHeader>Name</Table.Column>
                                    <Table.Column>Tag</Table.Column>
                                    <Table.Column>Created At</Table.Column>
                                    <Table.Column />
                                </Table.Header>
                                <Table.Body>
                                    <Collection items={releases}>
                                        {item => {
                                            const projectCreatedAt = new Date(item._creationTime);
                                            const date = new CalendarDateTime(
                                                projectCreatedAt.getFullYear(),
                                                projectCreatedAt.getMonth(),
                                                projectCreatedAt.getDate(),
                                                projectCreatedAt.getHours(),
                                                projectCreatedAt.getMinutes()
                                            );

                                            return (
                                                <Table.Row id={item._id}>
                                                    <Table.Cell>{item._id}</Table.Cell>
                                                    <Table.Cell>{item.name}</Table.Cell>
                                                    <Table.Cell>
                                                        <Snippet size='sm' hideSymbol>
                                                            {item.tag}
                                                        </Snippet>
                                                    </Table.Cell>
                                                    <Table.Cell>
                                                        <div className='flex gap-2 flex-1 items-center'>
                                                            <DateField
                                                                isReadOnly
                                                                defaultValue={date}
                                                                hideTimeZone
                                                                hourCycle={24}
                                                                aria-label='created-at'
                                                            />
                                                        </div>
                                                    </Table.Cell>
                                                    <Table.Cell className='text-end last:pr-2.5'>
                                                        <Menu>
                                                            <MenuTrigger>
                                                                <IconDotsVertical />
                                                            </MenuTrigger>
                                                            <MenuContent placement='left top'>
                                                                <MenuItem
                                                                    onClick={() => {
                                                                        setIsEditReleaseSheetOpen(true);
                                                                        setSelectedRelease(item);
                                                                    }}>
                                                                    <IconHighlight /> Edit
                                                                </MenuItem>
                                                                <MenuSeparator />
                                                                <MenuItem
                                                                    isDanger
                                                                    onClick={() => {
                                                                        setIsDeleteReleaseModalOpen(true);
                                                                        setSelectedRelease(item);
                                                                    }}>
                                                                    <IconTrash /> Delete
                                                                </MenuItem>
                                                            </MenuContent>
                                                        </Menu>
                                                    </Table.Cell>
                                                </Table.Row>
                                            );
                                        }}
                                    </Collection>
                                    {status !== 'Exhausted' ? (
                                        <TableLoadMoreItem
                                            className='sticky inset-x-0 bottom-0 h-16'
                                            onLoadMore={handleLoadingMore}
                                            isLoading={status === 'LoadingMore'}>
                                            <Loader className='mx-auto' isIndeterminate aria-label='Loading more...' />
                                        </TableLoadMoreItem>
                                    ) : null}
                                </Table.Body>
                            </Table>
                        </Card.Content>
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
