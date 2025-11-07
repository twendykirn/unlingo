'use client';

import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect, useState } from 'react';
import { PlusIcon, TrashIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/components/ui/table';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import DashboardSidebar, { WorkspaceWithPremium } from '../components/dashboard-sidebar';
import { Collection, TableLoadMoreItem } from 'react-aria-components';
import { useSearchParams } from 'next/navigation';
import ProjectsSelector from '../components/projects-selector';
import ApiKeyRemoveModal from './components/api-key-remove-modal';
import ApiKeyCreateModal from './components/api-key-create-modal';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';
import { useDateFormatter } from '@react-aria/i18n';

const formatKeyDisplay = (key: string) => {
    if (!key) return '';
    const parts = key.split('_');
    if (parts.length < 2) return 'Invalid Key';
    const prefix = parts[0];
    return `${prefix}_${'*'.repeat(20)}`;
};

export default function ApiKeysPage() {
    const searchParams = useSearchParams();
    const searchParamProjectId = searchParams.get('projectId');

    const [workspace, setWorkspace] = useState<WorkspaceWithPremium | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<Id<'projects'> | null>(null);

    const [isDeleteApiKeyModalOpen, setIsDeleteApiKeyModalOpen] = useState(false);
    const [isCreateApiKeySheetOpen, setIsCreateApiKeySheetOpen] = useState(false);
    const [selectedApiKey, setSelectedApiKey] = useState<Doc<'apiKeys'> | null>(null);

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
        results: apiKeys,
        status,
        loadMore,
    } = usePaginatedQuery(
        api.apiKeys.getApiKeys,
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
        <DashboardSidebar activeItem='api-keys' onWorkspaceChange={setWorkspace}>
            {workspace ? (
                <>
                    <Card>
                        <CardHeader>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col gap-1'>
                                    <CardTitle>API Keys</CardTitle>
                                    <CardDescription>Create and delete your API keys.</CardDescription>
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
                                    <Button onClick={() => setIsCreateApiKeySheetOpen(true)}>
                                        <PlusIcon />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table
                                bleed
                                className='[--gutter:var(--card-spacing)] sm:[--gutter:var(--card-spacing)]'
                                aria-label='API Keys'>
                                <TableHeader>
                                    <TableColumn className='w-0'>Name</TableColumn>
                                    <TableColumn isRowHeader>Key</TableColumn>
                                    <TableColumn>Created At</TableColumn>
                                    <TableColumn />
                                </TableHeader>
                                <TableBody>
                                    <Collection items={apiKeys}>
                                        {item => (
                                            <TableRow id={item._id}>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell>{formatKeyDisplay(item.prefix)}</TableCell>
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
                                                                intent='danger'
                                                                onClick={() => {
                                                                    setIsDeleteApiKeyModalOpen(true);
                                                                    setSelectedApiKey(item);
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
                    {selectedApiKey ? (
                        <ApiKeyRemoveModal
                            isOpen={isDeleteApiKeyModalOpen}
                            setIsOpen={value => {
                                setIsDeleteApiKeyModalOpen(value);
                                setSelectedApiKey(null);
                            }}
                            apiKey={selectedApiKey}
                            workspace={workspace}
                        />
                    ) : null}
                    {project ? (
                        <ApiKeyCreateModal
                            isOpen={isCreateApiKeySheetOpen}
                            setIsOpen={setIsCreateApiKeySheetOpen}
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
