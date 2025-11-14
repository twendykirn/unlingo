'use client';

import { usePaginatedQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useState } from 'react';
import { PlusIcon, TrashIcon, PencilSquareIcon, EllipsisVerticalIcon, EyeIcon } from '@heroicons/react/24/outline';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@/components/ui/table';
import ProjectEditSheet from './components/project-edit-sheet';
import { Doc } from '@/convex/_generated/dataModel';
import ProjectRemoveModal from './components/project-remove-modal';
import DashboardSidebar, { WorkspaceWithPremium } from './components/dashboard-sidebar';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import ProjectCreateSheet from './components/project-create-sheet';
import { useDateFormatter } from '@react-aria/i18n';

export default function Dashboard() {
    const [workspace, setWorkspace] = useState<WorkspaceWithPremium | null>(null);
    const [isEditProjectSheetOpen, setIsEditProjectSheetOpen] = useState(false);
    const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
    const [isCreateProjectSheetOpen, setIsCreateProjectSheetOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Doc<'projects'> | null>(null);

    const formatter = useDateFormatter({ dateStyle: 'long' });

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
                        <CardHeader>
                            <div className='flex items-center justify-between'>
                                <div className='flex flex-col gap-1'>
                                    <CardTitle>Projects</CardTitle>
                                    <CardDescription>View, edit and delete your projects.</CardDescription>
                                </div>
                                <Button
                                    isDisabled={!canCreateProject}
                                    onClick={() => setIsCreateProjectSheetOpen(true)}>
                                    <PlusIcon />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table
                                bleed
                                className='[--gutter:var(--card-spacing)] sm:[--gutter:var(--card-spacing)]'
                                aria-label='Projects'>
                                <TableHeader>
                                    <TableColumn className='w-0'>Name</TableColumn>
                                    <TableColumn isRowHeader>Description</TableColumn>
                                    <TableColumn>Created At</TableColumn>
                                    <TableColumn />
                                </TableHeader>
                                <TableBody items={projects}>
                                    {item => (
                                        <TableRow id={item._id}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>{item.description || '-'}</TableCell>
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
                                                        <MenuItem href={`/dashboard/namespaces?projectId=${item._id}`}>
                                                            <EyeIcon /> View
                                                        </MenuItem>
                                                        <MenuItem
                                                            onClick={() => {
                                                                setIsEditProjectSheetOpen(true);
                                                                setSelectedProject(item);
                                                            }}>
                                                            <PencilSquareIcon /> Edit
                                                        </MenuItem>
                                                        <MenuSeparator />
                                                        <MenuItem
                                                            intent='danger'
                                                            onClick={() => {
                                                                setIsDeleteProjectModalOpen(true);
                                                                setSelectedProject(item);
                                                            }}>
                                                            <TrashIcon /> Delete
                                                        </MenuItem>
                                                    </MenuContent>
                                                </Menu>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
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
