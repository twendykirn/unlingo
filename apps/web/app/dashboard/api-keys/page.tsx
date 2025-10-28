'use client';

import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect, useState } from 'react';
import { IconDotsVertical, IconPlus, IconTrash } from '@intentui/icons';
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
import ApiKeyRemoveModal from './components/api-key-remove-modal';
import ApiKeyCreateModal from './components/api-key-create-modal';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';

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
                        <Card.Header>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col gap-1'>
                                    <Card.Title>API Keys</Card.Title>
                                    <Card.Description>Create and delete your API keys.</Card.Description>
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
                                    <Button intent='plain' onClick={() => setIsCreateApiKeySheetOpen(true)}>
                                        <IconPlus />
                                    </Button>
                                </div>
                            </div>
                        </Card.Header>
                        <Card.Content>
                            <Table
                                bleed
                                className='[--gutter:var(--card-spacing)] sm:[--gutter:var(--card-spacing)]'
                                aria-label='API Keys'>
                                <Table.Header>
                                    <Table.Column className='w-0'>Name</Table.Column>
                                    <Table.Column isRowHeader>Key</Table.Column>
                                    <Table.Column>Created At</Table.Column>
                                    <Table.Column />
                                </Table.Header>
                                <Table.Body>
                                    <Collection items={apiKeys}>
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
                                                    <Table.Cell>{item.name}</Table.Cell>
                                                    <Table.Cell>{formatKeyDisplay(item.prefix)}</Table.Cell>
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
                                                                    isDanger
                                                                    onClick={() => {
                                                                        setIsDeleteApiKeyModalOpen(true);
                                                                        setSelectedApiKey(item);
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
