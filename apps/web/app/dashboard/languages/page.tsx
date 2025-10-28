'use client';

import { useConvex, useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useEffect, useMemo, useState } from 'react';
import { IconDotsVertical, IconHighlight, IconPlus, IconStar, IconTrash } from '@intentui/icons';
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
import NamespaceSelector from '../components/namespace-selector';
import EnvironmentSelector from '../components/environment-selector';
import { toast } from 'sonner';
import LanguageRemoveModal from './components/language-removal-modal';
import LanguageCreateSheet from './components/language-create-sheet';

export default function NamespacesPage() {
    const searchParams = useSearchParams();
    const searchParamProjectId = searchParams.get('projectId');
    const searchParamNamespaceId = searchParams.get('namespaceId');
    const searchParamEnvironmentId = searchParams.get('environmentId');

    const convex = useConvex();

    const [workspace, setWorkspace] = useState<WorkspaceWithPremium | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<Id<'projects'> | null>(null);
    const [selectedNamespace, setSelectedNamespace] = useState<Doc<'namespaces'> | null>(null);
    const [selectedEnvironment, setSelectedEnvironment] = useState<Doc<'namespaceVersions'> | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<Doc<'languages'> | null>(null);

    const [searchNamespace, setSearchNamespace] = useState<Doc<'namespaces'> | null>(null);
    const [searchEnvironment, setSearchEnvironment] = useState<Doc<'namespaceVersions'> | null>(null);

    const setPrimaryLanguage = useMutation(api.namespaces.setPrimaryLanguage);

    const [isDeleteLanguageModalOpen, setIsDeleteLanguageModalOpen] = useState(false);
    const [isCreateLanguageSheetOpen, setIsCreateLanguageSheetOpen] = useState(false);

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
        results: languages,
        status,
        loadMore,
    } = usePaginatedQuery(
        api.languages.getLanguages,
        workspace && selectedEnvironment
            ? {
                  namespaceVersionId: selectedEnvironment._id,
                  workspaceId: workspace._id,
              }
            : 'skip',
        { initialNumItems: 20 }
    );

    const languagesWithPrimary = useMemo(() => {
        if (!selectedEnvironment || !languages) return [];

        return languages.map(lang => ({
            ...lang,
            isPrimary: lang._id === selectedEnvironment.primaryLanguageId,
        }));
    }, [selectedEnvironment, languages]);

    const canCreateLanguage =
        workspace && selectedEnvironment
            ? selectedEnvironment.usage.languages < workspace.limits.languagesPerVersion
            : false;

    const handleLoadingMore = () => {
        if (status === 'CanLoadMore') {
            loadMore(20);
        }
    };

    const fetchNamespace = async (
        namespaceId: Id<'namespaces'>,
        projectId: Id<'projects'>,
        workspaceId: Id<'workspaces'>
    ) => {
        const namespace = await convex.query(api.namespaces.getNamespace, {
            namespaceId,
            projectId,
            workspaceId,
        });

        setSearchNamespace(namespace);
    };

    const fetchEnvironment = async (environmentId: Id<'namespaceVersions'>, workspaceId: Id<'workspaces'>) => {
        const environment = await convex.query(api.namespaceVersions.getNamespaceVersion, {
            namespaceVersionId: environmentId,
            workspaceId,
        });

        setSearchEnvironment(environment);
    };

    const handleSetPrimaryLanguage = async (languageId: Id<'languages'>) => {
        if (!selectedNamespace || !workspace || !selectedEnvironment) return;

        try {
            await setPrimaryLanguage({
                namespaceId: selectedNamespace._id,
                workspaceId: workspace._id,
                languageId,
            });

            const environment = await convex.query(api.namespaceVersions.getNamespaceVersion, {
                namespaceVersionId: selectedEnvironment._id,
                workspaceId: workspace._id,
            });

            setSelectedEnvironment(environment);

            toast.success('Primary language updated successfully');
        } catch (error) {
            toast.error(`Failed to set primary language: ${error instanceof Error ? error.message : error}`);
        }
    };

    useEffect(() => {
        if (workspace && searchParamProjectId) {
            setSelectedProjectId(searchParamProjectId as Id<'projects'>);
        }
    }, [workspace, searchParamProjectId]);

    useEffect(() => {
        if (workspace && searchParamProjectId && searchParamNamespaceId) {
            fetchNamespace(
                searchParamNamespaceId as Id<'namespaces'>,
                searchParamProjectId as Id<'projects'>,
                workspace._id
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspace, searchParamProjectId, searchParamNamespaceId]);

    useEffect(() => {
        if (workspace && searchParamProjectId && searchParamEnvironmentId && searchParamNamespaceId) {
            fetchEnvironment(searchParamEnvironmentId as Id<'namespaceVersions'>, workspace._id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspace, searchParamProjectId, searchParamNamespaceId, searchParamEnvironmentId]);

    return (
        <DashboardSidebar activeItem='languages' onWorkspaceChange={setWorkspace}>
            {workspace ? (
                <>
                    <Card>
                        <Card.Header>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col gap-1'>
                                    <Card.Title>Languages</Card.Title>
                                    <Card.Description>View, edit and delete your languages.</Card.Description>
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
                                    <NamespaceSelector
                                        workspace={workspace}
                                        project={project}
                                        selectedNamespace={selectedNamespace}
                                        setSelectedNamespace={setSelectedNamespace}
                                        defaultNamespace={searchNamespace ?? undefined}
                                        label='Namespace'
                                        isPreSelectLonelyItem
                                    />
                                    <EnvironmentSelector
                                        workspace={workspace}
                                        namespace={selectedNamespace ?? undefined}
                                        selectedEnvironment={selectedEnvironment}
                                        setSelectedEnvironment={setSelectedEnvironment}
                                        defaultEnvironment={searchEnvironment ?? undefined}
                                        label='Environment'
                                        isPreSelectLonelyItem
                                    />
                                    <Button
                                        intent='plain'
                                        isDisabled={!canCreateLanguage}
                                        onClick={() => setIsCreateLanguageSheetOpen(true)}>
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
                                    <Table.Column isRowHeader>Primary</Table.Column>
                                    <Table.Column>Created At</Table.Column>
                                    <Table.Column />
                                </Table.Header>
                                <Table.Body>
                                    <Collection items={languagesWithPrimary}>
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
                                                    <Table.Cell>{item.languageCode}</Table.Cell>
                                                    <Table.Cell>{item.isPrimary ? <IconStar className='text-yellow-500' /> : null}</Table.Cell>
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
                                                                    href={`/dashboard/editor?languageId=${item._id}`}>
                                                                    <IconHighlight /> Edit
                                                                </MenuItem>
                                                                {!item.isPrimary ? (
                                                                    <MenuItem
                                                                        onClick={() => {
                                                                            handleSetPrimaryLanguage(item._id);
                                                                        }}>
                                                                        <IconStar /> Set Primary
                                                                    </MenuItem>
                                                                ) : null}
                                                                <MenuSeparator />
                                                                <MenuItem
                                                                    isDanger
                                                                    onClick={() => {
                                                                        if (item.isPrimary && languages.length > 1) {
                                                                            toast.error(
                                                                                'Cannot delete primary language until it is the only language in environment. Try to delete all other languages or set a new primary language.'
                                                                            );
                                                                            return;
                                                                        }
                                                                        setIsDeleteLanguageModalOpen(true);
                                                                        setSelectedLanguage(item);
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
                    {selectedLanguage ? (
                        <LanguageRemoveModal
                            isOpen={isDeleteLanguageModalOpen}
                            setIsOpen={value => {
                                setIsDeleteLanguageModalOpen(value);
                                setSelectedLanguage(null);
                            }}
                            workspace={workspace}
                            language={selectedLanguage}
                        />
                    ) : null}
                    {workspace && selectedEnvironment ? (
                        <LanguageCreateSheet
                            isOpen={isCreateLanguageSheetOpen}
                            setIsOpen={setIsCreateLanguageSheetOpen}
                            workspace={workspace}
                            environment={selectedEnvironment}
                        />
                    ) : null}
                </>
            ) : (
                <Loader />
            )}
        </DashboardSidebar>
    );
}
