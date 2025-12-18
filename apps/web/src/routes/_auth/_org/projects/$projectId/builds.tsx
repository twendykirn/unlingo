import GlobalSearchDialog from '@/components/global-search-dialog';
import BuildCreateDialog from '@/components/build-create-dialog';
import BuildDeleteDialog from '@/components/build-delete-dialog';
import BuildEditDialog from '@/components/build-edit-dialog';
import { ProjectSidebar } from '@/components/project-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Menu, MenuGroup, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router'
import { debounce } from '@tanstack/pacer';
import { api } from '@unlingo/backend/convex/_generated/api';
import type { Doc, Id } from '@unlingo/backend/convex/_generated/dataModel';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { BookIcon, Edit, EllipsisVerticalIcon, PackageIcon, SearchIcon, TrashIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

export const Route = createFileRoute('/_auth/_org/projects/$projectId/builds')({
    component: RouteComponent,
})

function RouteComponent() {
    const { projectId } = Route.useParams();
    const { organization } = useOrganization();

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedBuild, setSelectedBuild] = useState<Doc<'builds'> | null>(null);

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
        { initialNumItems: 100 }
    );

    const {
        results: builds,
        loadMore,
        status: buildsStatus
    } = usePaginatedQuery(
        api.builds.getBuilds,
        workspace && project
            ? {
                projectId: project._id,
                workspaceId: workspace._id,
                search: debouncedSearch || undefined,
            }
            : 'skip',
        { initialNumItems: 40 }
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSetSearch = useCallback(
        debounce((value: string) => setDebouncedSearch(value), { wait: 500 }),
        []
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        debouncedSetSearch(e.target.value);
    };

    const getBuildStatusBadge = (status: number, statusDescription?: string) => {
        switch (status) {
            case 1:
                return <Badge variant="success">Active</Badge>;
            case 2:
                return <Badge variant="warning">{statusDescription || 'Building'}</Badge>;
            case -1:
                return <Badge variant="error">Deleting</Badge>;
            default:
                return <Badge>Unknown</Badge>;
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getTotalFileSize = (build: Doc<'builds'>) => {
        const totalBytes = Object.values(build.languageFiles).reduce((sum, file) => sum + file.fileSize, 0);
        return formatFileSize(totalBytes);
    };

    return (
        <SidebarProvider>
            <ProjectSidebar activeItem='builds' projectId={projectId} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                    <GlobalSearchDialog projectId={projectId} />
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="flex items-center">
                        <h1>Builds</h1>
                        <div className="flex items-center ml-auto gap-2">
                            <InputGroup>
                                <InputGroupInput
                                    aria-label="Search"
                                    placeholder="Search builds"
                                    type="search"
                                    value={search}
                                    onChange={handleSearchChange}
                                />
                                <InputGroupAddon>
                                    <SearchIcon />
                                </InputGroupAddon>
                            </InputGroup>
                            <Button
                                onClick={() => setIsCreateDialogOpen(true)}
                            >
                                Create build
                            </Button>
                        </div>
                    </div>
                    {workspace === undefined || project === undefined || builds === undefined ? (
                        <div className="flex items-center justify-center w-full mt-4">
                            <Spinner />
                        </div>
                    ) : builds.length === 0 ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <PackageIcon />
                                </EmptyMedia>
                                <EmptyTitle>No builds</EmptyTitle>
                                <EmptyDescription>Create a build to package your translations for deployment.</EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => setIsCreateDialogOpen(true)}
                                    >
                                        Create build
                                    </Button>
                                    <Button size="sm" variant="outline" render={<a href="https://docs.unlingo.com" target="_blank" />}>
                                        <BookIcon className="opacity-72" />
                                        View docs
                                    </Button>
                                </div>
                            </EmptyContent>
                        </Empty>
                    ) : (
                        <Card>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tag</TableHead>
                                            <TableHead>Namespace</TableHead>
                                            <TableHead>Languages</TableHead>
                                            <TableHead>Size</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {builds.map(build => (
                                            <TableRow key={build._id}>
                                                <TableCell className="font-medium font-mono">{build.tag}</TableCell>
                                                <TableCell>{build.namespace}</TableCell>
                                                <TableCell>{Object.keys(build.languageFiles).length}</TableCell>
                                                <TableCell>{getTotalFileSize(build)}</TableCell>
                                                <TableCell>{getBuildStatusBadge(build.status, build.statusDescription)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Menu>
                                                        <MenuTrigger render={<Button variant="ghost" size="icon" />}>
                                                            <EllipsisVerticalIcon />
                                                        </MenuTrigger>
                                                        <MenuPopup>
                                                            <MenuGroup>
                                                                <MenuItem
                                                                    onClick={() => {
                                                                        setIsEditDialogOpen(true);
                                                                        setSelectedBuild(build);
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
                                                                    setSelectedBuild(build);
                                                                }}
                                                            >
                                                                <TrashIcon />
                                                                Delete
                                                            </MenuItem>
                                                        </MenuPopup>
                                                    </Menu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {buildsStatus === 'CanLoadMore' && (
                                    <div className="flex justify-center mt-4">
                                        <Button variant="outline" onClick={() => loadMore(40)}>
                                            Load more
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
                {workspace && project && namespaces ? (
                    <>
                        <BuildCreateDialog
                            isOpen={isCreateDialogOpen}
                            setIsOpen={setIsCreateDialogOpen}
                            project={project}
                            workspace={workspace}
                            namespaces={namespaces}
                        />
                        {selectedBuild ? (
                            <>
                                <BuildEditDialog
                                    isOpen={isEditDialogOpen}
                                    setIsOpen={setIsEditDialogOpen}
                                    workspace={workspace}
                                    build={selectedBuild}
                                />
                                <BuildDeleteDialog
                                    isOpen={isDeleteDialogOpen}
                                    setIsOpen={setIsDeleteDialogOpen}
                                    workspace={workspace}
                                    build={selectedBuild}
                                />
                            </>
                        ) : null}
                    </>
                ) : null}
            </SidebarInset>
        </SidebarProvider>
    )
}
