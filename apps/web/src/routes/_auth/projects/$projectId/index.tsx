import NamespaceCreateDialog from '@/components/namespace-create-dialog';
import NamespaceDeleteDialog from '@/components/namespace-delete-dialog';
import NamespaceEditDialog from '@/components/namespace-edit-dialog';
import { ProjectSidebar } from '@/components/project-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Menu, MenuGroup, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toggle, ToggleGroup, ToggleGroupSeparator } from '@/components/ui/toggle-group';
import { useOrganization } from '@clerk/tanstack-react-start';
import { createFileRoute, Link } from '@tanstack/react-router'
import { api } from '@unlingo/backend/convex/_generated/api';
import type { Doc, Id } from '@unlingo/backend/convex/_generated/dataModel';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { BookIcon, Edit, EllipsisVerticalIcon, Eye, LayoutGridIcon, NewspaperIcon, SearchIcon, TableIcon, TrashIcon } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

export const Route = createFileRoute('/_auth/projects/$projectId/')({
    component: RouteComponent,
})

function RouteComponent() {
    const { projectId } = Route.useParams();
    const { organization } = useOrganization();

    const [layout, setLayout] = useState<'grid' | 'table'>('grid');
    const [search, setSearch] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedNamespace, setSelectedNamespace] = useState<Doc<'namespaces'> | null>(null);

    const clerkId = organization?.id;

    const workspace = useQuery(
        api.workspaces.getWorkspaceWithSubscription,
        clerkId ? { clerkId } : 'skip'
    );

    const project = useQuery(
        api.projects.getProject,
        workspace
            ? {
                projectId: projectId as Id<'projects'>,
                workspaceId: workspace._id,
            }
            : 'skip'
    );

    const {
        results: namespaces
    } = usePaginatedQuery(
        api.namespaces.getNamespaces,
        workspace && project
            ? {
                projectId: project._id,
                workspaceId: workspace._id,
            }
            : 'skip',
        { initialNumItems: 40 }
    );

    const filteredNamespaces = useMemo(() => {
        if (!namespaces) return [];

        return namespaces.filter(item => {
            return item.name.toLowerCase().includes(search.toLowerCase());
        });
    }, [namespaces, search]);

    const canCreateNamespace =
        workspace && project ? project.usage.namespaces < workspace.limits.namespacesPerProject : false;

    return (
        <SidebarProvider>
            <ProjectSidebar activeItem='namespaces' projectId={projectId} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="flex items-center">
                        <h1>Namespaces</h1>
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
                                    placeholder="Search namespaces"
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
                                disabled={!canCreateNamespace}
                            >
                                Create namespace
                            </Button>
                        </div>
                    </div>
                    {namespaces === undefined || workspace === undefined ? (
                        <div className="flex items-center justify-center w-full mt-4">
                            <Spinner />
                        </div>
                    ) : filteredNamespaces.length === 0 ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <NewspaperIcon />
                                </EmptyMedia>
                                <EmptyTitle>No namespaces</EmptyTitle>
                                <EmptyDescription>Create a namespace to get started.</EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => setIsCreateDialogOpen(true)}
                                        disabled={!canCreateNamespace}
                                    >
                                        Create namespace
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
                            {filteredNamespaces.map(namespace => (
                                <Card key={namespace._id} className="py-4 hover:border-primary/30">
                                    <CardHeader className="px-4 flex justify-between items-center">
                                        <div className="w-full">
                                            <h6>{namespace.name}</h6>
                                            <div className='flex items-center gap-1 text-muted-foreground'>
                                                <Button variant="link" className='text-xs p-0'>Production</Button>
                                                •
                                                <Button variant="link" className='text-xs p-0'>Development</Button>
                                            </div>
                                        </div>
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
                                                                key={namespace._id}
                                                                to="/projects/$projectId"
                                                                params={{
                                                                    projectId: namespace._id,
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
                                                            setSelectedNamespace(namespace);
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
                                                        setSelectedNamespace(namespace);
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
                                            <TableHead>Environments</TableHead>
                                            <TableHead className="text-right" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredNamespaces.map(namespace => (
                                            <Fragment key={namespace._id}>
                                                <TableRow>
                                                    <TableCell className="font-medium">{namespace.name}</TableCell>
                                                    <TableCell className='flex items-center gap-1 text-muted-foreground'>
                                                        <Button variant="link" className='text-xs p-0'>Production</Button>
                                                        •
                                                        <Button variant="link" className='text-xs p-0'>Development</Button>
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
                                                                                key={namespace._id}
                                                                                to="/projects/$projectId"
                                                                                params={{
                                                                                    projectId: namespace._id,
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
                                                                            setSelectedNamespace(namespace);
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
                                                                        setSelectedNamespace(namespace);
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
                {workspace && project ? (
                    <>
                        <NamespaceCreateDialog
                            isOpen={isCreateDialogOpen}
                            setIsOpen={setIsCreateDialogOpen}
                            project={project}
                            workspace={workspace}
                        />
                        {selectedNamespace ? (
                            <>
                                <NamespaceEditDialog
                                    isOpen={isEditDialogOpen}
                                    setIsOpen={setIsEditDialogOpen}
                                    project={project}
                                    workspace={workspace}
                                    namespace={selectedNamespace}
                                />
                                <NamespaceDeleteDialog
                                    isOpen={isDeleteDialogOpen}
                                    setIsOpen={setIsDeleteDialogOpen}
                                    project={project}
                                    workspace={workspace}
                                    namespace={selectedNamespace}
                                />
                            </>
                        ) : null}
                    </>
                ) : null}
            </SidebarInset>
        </SidebarProvider>
    )
}
