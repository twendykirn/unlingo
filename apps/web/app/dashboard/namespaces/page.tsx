'use client';

import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect, useState } from 'react';
import { IconDotsVertical, IconEye, IconHighlight, IconPlus, IconTrash } from '@intentui/icons';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { CalendarDateTime } from '@internationalized/date';
import { DateField } from '@/components/ui/date-field';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import DashboardSidebar, { WorkspaceWithPremium } from '../components/dashboard-sidebar';
import { Collection, TableLoadMoreItem } from 'react-aria-components';
import { useSearchParams } from 'next/navigation';
import ProjectsSelector from '../components/projects-selector';
import NamespaceCreateSheet from './components/namespace-create-sheet';
import NamespaceEditSheet from './components/namespace-edit-sheet';
import NamespaceRemoveModal from './components/namespace-remove-modal';

export default function NamespacesPage() {
    const searchParams = useSearchParams();
    const searchParamProjectId = searchParams.get('projectId');

    const [workspace, setWorkspace] = useState<WorkspaceWithPremium | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<Id<'projects'> | null>(null);

    const [isEditNamespaceSheetOpen, setIsEditNamespaceSheetOpen] = useState(false);
    const [isDeleteNamespaceModalOpen, setIsDeleteNamespaceModalOpen] = useState(false);
    const [isCreateNamespaceSheetOpen, setIsCreateNamespaceSheetOpen] = useState(false);
    const [selectedNamespace, setSelectedNamespace] = useState<Doc<'namespaces'> | null>(null);

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
        results: namespaces,
        status,
        loadMore,
    } = usePaginatedQuery(
        api.namespaces.getNamespaces,
        workspace && project
            ? {
                  projectId: project._id,
                  workspaceId: workspace._id,
              }
            : 'skip',
        { initialNumItems: 20 }
    );

    const canCreateNamespace =
        workspace && project ? project.usage.namespaces < workspace.limits.namespacesPerProject : false;

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
        <DashboardSidebar activeItem='namespaces' onWorkspaceChange={setWorkspace}>
            {workspace ? (
                <>
                    <Card>
                        <Card.Header>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col gap-1'>
                                    <Card.Title>Namespaces</Card.Title>
                                    <Card.Description>View, edit and delete your namespaces.</Card.Description>
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
                                        isDisabled={!canCreateNamespace}
                                        onClick={() => setIsCreateNamespaceSheetOpen(true)}>
                                        <IconPlus />
                                    </Button>
                                </div>
                            </div>
                        </Card.Header>
                        <Card.Content>
                            <Table
                                bleed
                                className='[--gutter:var(--card-spacing)] sm:[--gutter:var(--card-spacing)]'
                                aria-label='Namespaces'>
                                <Table.Header>
                                    <Table.Column className='w-0'>Name</Table.Column>
                                    <Table.Column isRowHeader>Created At</Table.Column>
                                    <Table.Column />
                                </Table.Header>
                                <Table.Body>
                                    <Collection items={namespaces}>
                                        {item => {
                                            const createdAt = new Date(item._creationTime);
                                            const date = new CalendarDateTime(
                                                createdAt.getFullYear(),
                                                createdAt.getMonth(),
                                                createdAt.getDate(),
                                                createdAt.getHours(),
                                                createdAt.getMinutes()
                                            );

                                            return (
                                                <Table.Row id={item._id}>
                                                    <Table.Cell>{item.name}</Table.Cell>
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
                                                                    href={`/dashboard/languages?namespaceId=${item._id}&projectId=${project?._id}`}>
                                                                    <IconEye /> View
                                                                </MenuItem>
                                                                <MenuItem
                                                                    onClick={() => {
                                                                        setIsEditNamespaceSheetOpen(true);
                                                                        setSelectedNamespace(item);
                                                                    }}>
                                                                    <IconHighlight /> Edit
                                                                </MenuItem>
                                                                <MenuSeparator />
                                                                <MenuItem
                                                                    isDanger
                                                                    onClick={() => {
                                                                        setIsDeleteNamespaceModalOpen(true);
                                                                        setSelectedNamespace(item);
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
                    {project && selectedNamespace ? (
                        <>
                            <NamespaceRemoveModal
                                isOpen={isDeleteNamespaceModalOpen}
                                setIsOpen={value => {
                                    setIsDeleteNamespaceModalOpen(value);
                                    setSelectedNamespace(null);
                                }}
                                project={project}
                                namespace={selectedNamespace}
                                workspace={workspace}
                            />
                            <NamespaceEditSheet
                                isOpen={isEditNamespaceSheetOpen}
                                setIsOpen={value => {
                                    setIsEditNamespaceSheetOpen(value);
                                    setSelectedNamespace(null);
                                }}
                                project={project}
                                namespace={selectedNamespace}
                                workspace={workspace}
                            />
                        </>
                    ) : null}
                    {project ? (
                        <NamespaceCreateSheet
                            isOpen={isCreateNamespaceSheetOpen}
                            setIsOpen={setIsCreateNamespaceSheetOpen}
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
