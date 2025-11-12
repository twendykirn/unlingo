'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect, useState } from 'react';
import { PlusIcon, TrashIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/components/ui/table';
import { Id } from '@/convex/_generated/dataModel';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import DashboardSidebar, { WorkspaceWithPremium } from '../components/dashboard-sidebar';
import { Collection } from 'react-aria-components';
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

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    createdAt: number;
}

export default function ApiKeysPage() {
    const searchParams = useSearchParams();
    const searchParamProjectId = searchParams.get('projectId');

    const [workspace, setWorkspace] = useState<WorkspaceWithPremium | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<Id<'projects'> | null>(null);

    const [isDeleteApiKeyModalOpen, setIsDeleteApiKeyModalOpen] = useState(false);
    const [isCreateApiKeySheetOpen, setIsCreateApiKeySheetOpen] = useState(false);
    const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);

    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const [hasMore, setHasMore] = useState(false);

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

    // Fetch API keys from Next.js API route
    const fetchApiKeys = async (loadMore: boolean = false) => {
        if (!workspace || !project) return;

        setIsLoading(true);
        try {
            const url = new URL('/api/api-keys', window.location.origin);
            url.searchParams.append('projectId', project._id);
            url.searchParams.append('workspaceId', workspace._id);

            if (loadMore && cursor) {
                url.searchParams.append('cursor', cursor);
            }

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error('Failed to fetch API keys');
            }

            const data = await response.json();

            if (loadMore) {
                setApiKeys(prev => [...prev, ...(data.keys || [])]);
            } else {
                setApiKeys(data.keys || []);
            }

            setCursor(data.cursor);
            setHasMore(!!data.cursor);
        } catch (error) {
            console.error('Error fetching API keys:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (workspace && searchParamProjectId) {
            setSelectedProjectId(searchParamProjectId as Id<'projects'>);
        }
    }, [workspace, searchParamProjectId]);

    useEffect(() => {
        fetchApiKeys();
    }, [workspace, project]);

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
                            {isLoading ? (
                                <div className='flex justify-center p-8'>
                                    <Loader isIndeterminate aria-label='Loading API keys...' />
                                </div>
                            ) : (
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
                                                <TableRow id={item.id}>
                                                    <TableCell>{item.name}</TableCell>
                                                    <TableCell>{formatKeyDisplay(item.prefix)}</TableCell>
                                                    <TableCell>
                                                        <div className='flex gap-2 flex-1 items-center'>
                                                            {formatter.format(new Date(item.createdAt))}
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
                                    </TableBody>
                                </Table>
                            )}
                            {!isLoading && hasMore && (
                                <div className='flex justify-center mt-4'>
                                    <Button onClick={() => fetchApiKeys(true)}>
                                        Load More
                                    </Button>
                                </div>
                            )}
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
                            onDeleted={fetchApiKeys}
                        />
                    ) : null}
                    {project ? (
                        <ApiKeyCreateModal
                            isOpen={isCreateApiKeySheetOpen}
                            setIsOpen={setIsCreateApiKeySheetOpen}
                            workspace={workspace}
                            project={project}
                            onCreated={fetchApiKeys}
                        />
                    ) : null}
                </>
            ) : (
                <Loader />
            )}
        </DashboardSidebar>
    );
}
