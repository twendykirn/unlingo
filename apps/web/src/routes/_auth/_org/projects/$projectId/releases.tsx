import GlobalSearchDialog from '@/components/global-search-dialog';
import ReleaseCreateDialog from '@/components/release-create-dialog';
import ReleaseDeleteDialog from '@/components/release-delete-dialog';
import ReleaseEditDialog from '@/components/release-edit-dialog';
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
import { BookIcon, Edit, EllipsisVerticalIcon, RocketIcon, SearchIcon, TrashIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

export const Route = createFileRoute(
    '/_auth/_org/projects/$projectId/releases',
)({
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
    const [selectedRelease, setSelectedRelease] = useState<Doc<'releases'> | null>(null);

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
        results: builds
    } = usePaginatedQuery(
        api.builds.getBuilds,
        workspace && project
            ? {
                projectId: project._id,
                workspaceId: workspace._id,
            }
            : 'skip',
        { initialNumItems: 100 }
    );

    const {
        results: releases,
        loadMore,
        status: releasesStatus
    } = usePaginatedQuery(
        api.releases.getReleases,
        workspace && project
            ? {
                projectId: project._id,
                workspaceId: workspace._id,
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

    const filteredReleases = useMemo(() => {
        if (!releases) return [];

        if (!debouncedSearch) return releases;

        return releases.filter(release =>
            release.tag.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
    }, [releases, debouncedSearch]);

    const getBuildInfo = (release: Doc<'releases'>) => {
        if (!builds) return [];

        return release.builds.map(rb => {
            const build = builds.find(b => b._id === rb.buildId);
            return {
                ...rb,
                tag: build?.tag || 'Unknown',
                namespace: build?.namespace || 'Unknown',
            };
        });
    };

    const getNamespaceGroups = (release: Doc<'releases'>) => {
        const buildInfo = getBuildInfo(release);
        const groups: Record<string, typeof buildInfo> = {};

        buildInfo.forEach(b => {
            if (!groups[b.namespace]) {
                groups[b.namespace] = [];
            }
            groups[b.namespace].push(b);
        });

        return groups;
    };

    return (
        <SidebarProvider>
            <ProjectSidebar activeItem='releases' projectId={projectId} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                    <GlobalSearchDialog projectId={projectId} />
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="flex items-center">
                        <h1>Releases</h1>
                        <div className="flex items-center ml-auto gap-2">
                            <InputGroup>
                                <InputGroupInput
                                    aria-label="Search"
                                    placeholder="Search releases"
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
                                Create release
                            </Button>
                        </div>
                    </div>
                    {workspace === undefined || project === undefined || releases === undefined ? (
                        <div className="flex items-center justify-center w-full mt-4">
                            <Spinner />
                        </div>
                    ) : filteredReleases.length === 0 ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <RocketIcon />
                                </EmptyMedia>
                                <EmptyTitle>No releases</EmptyTitle>
                                <EmptyDescription>Create a release to deploy your translation builds.</EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => setIsCreateDialogOpen(true)}
                                    >
                                        Create release
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
                                            <TableHead>Builds</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead className="text-right" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredReleases.map(release => {
                                            const namespaceGroups = getNamespaceGroups(release);

                                            return (
                                                <TableRow key={release._id}>
                                                    <TableCell className="font-medium font-mono">{release.tag}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-2">
                                                            {Object.entries(namespaceGroups).map(([namespace, nsBuilds]) => (
                                                                <div key={namespace} className="flex items-center gap-2">
                                                                    <span className="text-xs text-muted-foreground">{namespace}:</span>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {nsBuilds.map((b, idx) => (
                                                                            <Badge key={idx} variant="outline" className="text-xs">
                                                                                {b.tag} ({b.selectionChance}%)
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {Object.keys(namespaceGroups).length === 0 && (
                                                                <span className="text-muted-foreground text-sm">No builds</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(release._creationTime).toLocaleDateString(undefined, {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })}
                                                    </TableCell>
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
                                                                            setSelectedRelease(release);
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
                                                                        setSelectedRelease(release);
                                                                    }}
                                                                >
                                                                    <TrashIcon />
                                                                    Delete
                                                                </MenuItem>
                                                            </MenuPopup>
                                                        </Menu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                                {releasesStatus === 'CanLoadMore' && (
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
                {workspace && project && builds ? (
                    <>
                        <ReleaseCreateDialog
                            isOpen={isCreateDialogOpen}
                            setIsOpen={setIsCreateDialogOpen}
                            project={project}
                            workspace={workspace}
                            builds={builds}
                        />
                        {selectedRelease ? (
                            <>
                                <ReleaseEditDialog
                                    isOpen={isEditDialogOpen}
                                    setIsOpen={setIsEditDialogOpen}
                                    workspace={workspace}
                                    project={project}
                                    release={selectedRelease}
                                    builds={builds}
                                />
                                <ReleaseDeleteDialog
                                    isOpen={isDeleteDialogOpen}
                                    setIsOpen={setIsDeleteDialogOpen}
                                    workspace={workspace}
                                    project={project}
                                    release={selectedRelease}
                                />
                            </>
                        ) : null}
                    </>
                ) : null}
            </SidebarInset>
        </SidebarProvider>
    )
}
