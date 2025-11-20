'use client';

import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect, useState } from 'react';
import {
    PlusIcon,
    TrashIcon,
    PencilSquareIcon,
    EllipsisVerticalIcon,
    EyeIcon,
    ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/components/ui/table';
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
import NamespaceMergeModal from './components/namespace-merge-modal';
import { useDateFormatter } from '@react-aria/i18n';

export default function NamespacesPage() {
    const searchParams = useSearchParams();
    const searchParamProjectId = searchParams.get('projectId');

    const [workspace, setWorkspace] = useState<WorkspaceWithPremium | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<Id<'projects'> | null>(null);

    const [isEditNamespaceSheetOpen, setIsEditNamespaceSheetOpen] = useState(false);
    const [isDeleteNamespaceModalOpen, setIsDeleteNamespaceModalOpen] = useState(false);
    const [isCreateNamespaceSheetOpen, setIsCreateNamespaceSheetOpen] = useState(false);
    const [isMergeNamespaceModalOpen, setIsMergeNamespaceModalOpen] = useState(false);
    const [selectedNamespace, setSelectedNamespace] = useState<Doc<'namespaces'> | null>(null);

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
                        <CardHeader>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col gap-1'>
                                    <CardTitle>Namespaces</CardTitle>
                                    <CardDescription>View, edit and delete your namespaces.</CardDescription>
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
                                        <PlusIcon />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table
                                bleed
                                className='[--gutter:var(--card-spacing)] sm:[--gutter:var(--card-spacing)]'
                                aria-label='Namespaces'>
                                <TableHeader>
                                    <TableColumn className='w-0'>Name</TableColumn>
                                    <TableColumn isRowHeader>Created At</TableColumn>
                                    <TableColumn />
                                </TableHeader>
                                <TableBody>
                                    <Collection items={namespaces}>
                                        {item => (
                                            <TableRow id={item._id}>
                                                <TableCell>{item.name}</TableCell>
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
                                                                href={`/dashboard/languages?namespaceId=${item._id}&projectId=${project?._id}`}>
                                                                <EyeIcon /> View
                                                            </MenuItem>
                                                            <MenuItem
                                                                onClick={() => {
                                                                    setIsEditNamespaceSheetOpen(true);
                                                                    setSelectedNamespace(item);
                                                                }}>
                                                                <PencilSquareIcon /> Edit
                                                            </MenuItem>
                                                            <MenuItem
                                                                onClick={() => {
                                                                    setIsMergeNamespaceModalOpen(true);
                                                                    setSelectedNamespace(item);
                                                                }}>
                                                                <ArrowsRightLeftIcon /> Merge Versions
                                                            </MenuItem>
                                                            <MenuSeparator />
                                                            <MenuItem
                                                                intent='danger'
                                                                onClick={() => {
                                                                    setIsDeleteNamespaceModalOpen(true);
                                                                    setSelectedNamespace(item);
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
                            <NamespaceMergeModal
                                isOpen={isMergeNamespaceModalOpen}
                                setIsOpen={value => {
                                    setIsMergeNamespaceModalOpen(value);
                                    setSelectedNamespace(null);
                                }}
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
