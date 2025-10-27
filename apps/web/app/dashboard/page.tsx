'use client';

import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useState } from 'react';
import { IconDotsVertical, IconEye, IconHighlight, IconPlus, IconTrash } from '@intentui/icons';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { CalendarDateTime } from '@internationalized/date';
import { DateField } from '@/components/ui/date-field';
import { Snippet } from '@heroui/snippet';
import ProjectEditSheet from './components/project-edit-sheet';
import { Doc } from '@/convex/_generated/dataModel';
import ProjectRemoveModal from './components/project-remove-modal';
import DashboardSidebar, { WorkspaceWithPremium } from './components/dashboard-sidebar';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import ProjectCreateSheet from './components/project-create-sheet';

export default function Dashboard() {
    const [workspace, setWorkspace] = useState<WorkspaceWithPremium | null>(null);
    const [isEditProjectSheetOpen, setIsEditProjectSheetOpen] = useState(false);
    const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
    const [isCreateProjectSheetOpen, setIsCreateProjectSheetOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Doc<'projects'> | null>(null);

    const { results: projects } = usePaginatedQuery(
        api.projects.getProjects,
        workspace ? { workspaceId: workspace._id } : 'skip',
        {
            initialNumItems: 30,
        }
    );

    const canCreateProject = workspace ? workspace.currentUsage.projects < workspace.limits.projects : false;

    return (
        <DashboardSidebar activeItem='projects' onWorkspaceChange={setWorkspace}>
            {workspace ? (
                <>
                    <Card>
                        <Card.Header>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col gap-1'>
                                    <Card.Title>Projects</Card.Title>
                                    <Card.Description>View, edit and delete your projects.</Card.Description>
                                </div>
                                <Button
                                    intent='plain'
                                    isDisabled={!canCreateProject}
                                    onClick={() => setIsCreateProjectSheetOpen(true)}>
                                    <IconPlus />
                                </Button>
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
                                    <Table.Column>Description</Table.Column>
                                    <Table.Column>Created At</Table.Column>
                                    <Table.Column />
                                </Table.Header>
                                <Table.Body items={projects}>
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
                                                <Table.Cell>
                                                    <Snippet size='sm' hideSymbol>
                                                        {item._id}
                                                    </Snippet>
                                                </Table.Cell>
                                                <Table.Cell>{item.name}</Table.Cell>
                                                <Table.Cell>{item.description || '-'}</Table.Cell>
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
                                                                href={`/dashboard/namespaces?projectId=${item._id}`}>
                                                                <IconEye /> View
                                                            </MenuItem>
                                                            <MenuItem
                                                                onClick={() => {
                                                                    setIsEditProjectSheetOpen(true);
                                                                    setSelectedProject(item);
                                                                }}>
                                                                <IconHighlight /> Edit
                                                            </MenuItem>
                                                            <MenuSeparator />
                                                            <MenuItem
                                                                isDanger
                                                                onClick={() => {
                                                                    setIsDeleteProjectModalOpen(true);
                                                                    setSelectedProject(item);
                                                                }}>
                                                                <IconTrash /> Delete
                                                            </MenuItem>
                                                        </MenuContent>
                                                    </Menu>
                                                </Table.Cell>
                                            </Table.Row>
                                        );
                                    }}
                                </Table.Body>
                            </Table>
                        </Card.Content>
                    </Card>
                    {selectedProject ? (
                        <>
                            <ProjectRemoveModal
                                isOpen={isDeleteProjectModalOpen}
                                setIsOpen={value => {
                                    setIsDeleteProjectModalOpen(value);
                                    setSelectedProject(null);
                                }}
                                project={selectedProject}
                                workspace={workspace}
                            />
                            <ProjectEditSheet
                                isOpen={isEditProjectSheetOpen}
                                setIsOpen={value => {
                                    setIsEditProjectSheetOpen(value);
                                    setSelectedProject(null);
                                }}
                                project={selectedProject}
                                workspace={workspace}
                            />
                        </>
                    ) : null}
                    <ProjectCreateSheet
                        isOpen={isCreateProjectSheetOpen}
                        setIsOpen={setIsCreateProjectSheetOpen}
                        workspace={workspace}
                    />
                </>
            ) : (
                <Loader />
            )}
        </DashboardSidebar>
    );
}
