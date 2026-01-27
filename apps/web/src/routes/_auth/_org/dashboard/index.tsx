import { AppSidebar } from "@/components/app-sidebar"
import ProjectCreateDialog from "@/components/project-create-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Menu, MenuGroup, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupSeparator } from "@/components/ui/toggle-group";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import ProjectEditDialog from "@/components/project-edit-dialog";
import { useOrganization } from "@clerk/tanstack-react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@unlingo/backend/convex/_generated/api";
import type { Doc } from "@unlingo/backend/convex/_generated/dataModel";
import { usePaginatedQuery, useQuery } from "convex/react";
import { SearchIcon, LayoutGridIcon, TableIcon, TrashIcon, Edit, Eye, EllipsisVerticalIcon, BookIcon, FolderKanbanIcon } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import ProjectDeleteDialog from "@/components/project-delete-dialog";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { formatDate, formatTimeAgo } from "@/utils/time";

export const Route = createFileRoute('/_auth/_org/dashboard/')({
    component: RouteComponent,
    head: () => ({
        meta: [
            {
                title: 'Projects - Unlingo',
            },
            {
                name: 'description',
                content: 'Manage your translation projects, namespaces, and languages on the Unlingo dashboard.',
            },
            {
                property: 'og:type',
                content: 'website',
            },
            {
                property: 'og:title',
                content: 'Projects - Unlingo',
            },
            {
                property: 'og:description',
                content: 'Manage your translation projects, namespaces, and languages on the Unlingo dashboard.',
            },
            {
                property: 'og:url',
                content: 'https://unlingo.com/dashboard',
            },
            {
                property: 'og:image',
                content: '/og.png',
            },
            {
                name: 'twitter:card',
                content: 'summary_large_image',
            },
            {
                name: 'twitter:title',
                content: 'Projects - Unlingo',
            },
            {
                name: 'twitter:description',
                content: 'Manage your translation projects, namespaces, and languages on the Unlingo dashboard.',
            },
            {
                name: 'twitter:image',
                content: '/og.png',
            },
            {
                name: 'robots',
                content: 'noindex, nofollow',
            },
        ],
    }),
});

export default function RouteComponent() {
    const { organization } = useOrganization();

    const [layout, setLayout] = useState<'grid' | 'table'>('grid');
    const [search, setSearch] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Doc<'projects'> | null>(null);

    const clerkId = organization?.id;

    const workspace = useQuery(
        api.workspaces.getWorkspaceWithSubscription,
        clerkId ? { clerkId } : 'skip'
    );

    const { results: projects } = usePaginatedQuery(
        api.projects.getProjects,
        workspace ? { workspaceId: workspace._id } : 'skip',
        {
            initialNumItems: 30,
        }
    );

    const filteredProjects = useMemo(() => {
        if (!projects) return [];

        return projects.filter(project => {
            return project.name.toLowerCase().includes(search.toLowerCase());
        });
    }, [projects, search]);

    return (
        <SidebarProvider>
            <AppSidebar activeItem='home' />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="flex items-center">
                        <h1>Projects</h1>
                        <div className="flex items-center ml-auto gap-2">
                            <ToggleGroup
                                variant="outline"
                                value={[layout]}
                                onValueChange={(value) => {
                                    setLayout(value[0]);
                                }}
                            >
                                <Toggle aria-label="Toggle layout grid" value="grid">
                                    <LayoutGridIcon />
                                </Toggle>
                                <ToggleGroupSeparator />
                                <Toggle aria-label="Toggle layout table" value="table">
                                    <TableIcon />
                                </Toggle>
                            </ToggleGroup>
                            <InputGroup>
                                <InputGroupInput
                                    aria-label="Search"
                                    placeholder="Search projects"
                                    type="search"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                                <InputGroupAddon>
                                    <SearchIcon />
                                </InputGroupAddon>
                            </InputGroup>
                            <Button
                                onClick={() => setIsCreateDialogOpen(true)}
                            >
                                Create project
                            </Button>
                        </div>
                    </div>
                    {projects === undefined || workspace === undefined ? (
                        <div className="flex items-center justify-center w-full mt-4">
                            <Spinner />
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <FolderKanbanIcon />
                                </EmptyMedia>
                                <EmptyTitle>No projects</EmptyTitle>
                                <EmptyDescription>Create a project to get started.</EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => setIsCreateDialogOpen(true)}
                                    >
                                        Create project
                                    </Button>
                                    <Button size="sm" variant="outline" render={<a href="https://docs.unlingo.com" target="_blank" />}>
                                        <BookIcon className="opacity-72" />
                                        View docs
                                    </Button>
                                </div>
                            </EmptyContent>
                        </Empty>
                    ) : null}
                    {layout === 'grid' ? (
                        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredProjects.map(project => (
                                <Card key={project._id} className="py-4 hover:border-primary/30">
                                    <CardHeader className="px-4 flex justify-between items-center">
                                        <Link
                                            key={project._id}
                                            to="/projects/$projectId"
                                            params={{
                                                projectId: project._id,
                                            }}
                                            className="w-full"
                                        >
                                            <h6>{project.name}</h6>
                                            <Tooltip>
                                                <TooltipTrigger render={<span className="text-xs text-gray-500 mt-2" />}>
                                                    {formatTimeAgo(project._creationTime)}
                                                </TooltipTrigger>
                                                <TooltipPopup>{formatDate(project._creationTime)}</TooltipPopup>
                                            </Tooltip>
                                        </Link>
                                        <Menu>
                                            <MenuTrigger render={<Button variant="ghost" size="icon" />} onClick={(e) => {
                                                e.stopPropagation();
                                            }}>
                                                <EllipsisVerticalIcon />
                                            </MenuTrigger>
                                            <MenuPopup>
                                                <MenuGroup>
                                                    <MenuItem
                                                        render={
                                                            <Link
                                                                key={project._id}
                                                                to="/projects/$projectId"
                                                                params={{
                                                                    projectId: project._id,
                                                                }}
                                                            />
                                                        }
                                                    >
                                                        <Eye className="opacity-72" />
                                                        View
                                                    </MenuItem>
                                                    <MenuItem
                                                        onClick={() => {
                                                            setIsEditDialogOpen(true);
                                                            setSelectedProject(project);
                                                        }}
                                                    >
                                                        <Edit className="opacity-72" />
                                                        Edit
                                                    </MenuItem>
                                                </MenuGroup>
                                                <MenuSeparator />
                                                <MenuItem
                                                    variant="destructive"
                                                    onClick={() => {
                                                        setIsDeleteDialogOpen(true);
                                                        setSelectedProject(project);
                                                    }}
                                                >
                                                    <TrashIcon />
                                                    Delete
                                                </MenuItem>
                                            </MenuPopup>
                                        </Menu>
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    ) : null}
                    {layout === 'table' ? (
                        <Card>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Created At</TableHead>
                                            <TableHead className="text-right" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProjects.map((project) => (
                                            <Fragment key={project._id}>
                                                <TableRow>
                                                    <TableCell className="font-medium">{project.name}</TableCell>
                                                    <TableCell>
                                                        <Tooltip>
                                                            <TooltipTrigger render={<span className="text-sm text-gray-500 mt-2" />}>
                                                                {formatTimeAgo(project._creationTime)}
                                                            </TooltipTrigger>
                                                            <TooltipPopup>{formatDate(project._creationTime)}</TooltipPopup>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Menu>
                                                            <MenuTrigger render={<Button variant="ghost" size="icon" />}>
                                                                <EllipsisVerticalIcon />
                                                            </MenuTrigger>
                                                            <MenuPopup>
                                                                <MenuGroup>
                                                                    <MenuItem
                                                                        render={
                                                                            <Link
                                                                                key={project._id}
                                                                                to="/projects/$projectId"
                                                                                params={{
                                                                                    projectId: project._id,
                                                                                }}
                                                                            />
                                                                        }
                                                                    >
                                                                        <Eye className="opacity-72" />
                                                                        View
                                                                    </MenuItem>
                                                                    <MenuItem
                                                                        onClick={() => {
                                                                            setIsEditDialogOpen(true);
                                                                            setSelectedProject(project);
                                                                        }}
                                                                    >
                                                                        <Edit className="opacity-72" />
                                                                        Edit
                                                                    </MenuItem>
                                                                </MenuGroup>
                                                                <MenuSeparator />
                                                                <MenuItem
                                                                    variant="destructive"
                                                                    onClick={() => {
                                                                        setIsDeleteDialogOpen(true);
                                                                        setSelectedProject(project);
                                                                    }}
                                                                >
                                                                    <TrashIcon />
                                                                    Delete
                                                                </MenuItem>
                                                            </MenuPopup>
                                                        </Menu>
                                                    </TableCell>
                                                </TableRow>
                                            </Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>
                {workspace ? (
                    <>
                        <ProjectCreateDialog
                            isOpen={isCreateDialogOpen}
                            setIsOpen={setIsCreateDialogOpen}
                            workspace={workspace}
                        />
                        {selectedProject ? (
                            <>
                                <ProjectEditDialog
                                    isOpen={isEditDialogOpen}
                                    setIsOpen={setIsEditDialogOpen}
                                    project={selectedProject}
                                    workspace={workspace}
                                />
                                <ProjectDeleteDialog
                                    isOpen={isDeleteDialogOpen}
                                    setIsOpen={setIsDeleteDialogOpen}
                                    project={selectedProject}
                                    workspace={workspace}
                                />
                            </>
                        ) : null}
                    </>
                ) : null}
            </SidebarInset>
        </SidebarProvider>
    )
}