import GlobalSearchDialog from '@/components/global-search-dialog';
import ScreenshotCreateDialog from '@/components/screenshot-create-dialog';
import ScreenshotDeleteDialog from '@/components/screenshot-delete-dialog';
import { ProjectSidebar } from '@/components/project-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Menu, MenuGroup, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrganization } from '@clerk/tanstack-react-start';
import { createFileRoute, Link } from '@tanstack/react-router'
import { debounce } from '@tanstack/pacer';
import { api } from '@unlingo/backend/convex/_generated/api';
import type { Doc, Id } from '@unlingo/backend/convex/_generated/dataModel';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { BookIcon, EllipsisVerticalIcon, Eye, ImageIcon, SearchIcon, TrashIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';

export const Route = createFileRoute(
    '/_auth/_org/projects/$projectId/screenshots/',
)({
    component: RouteComponent,
    head: () => ({
        meta: [
            {
                title: 'Screenshots - Unlingo',
            },
            {
                name: 'description',
                content: 'Manage visual context screenshots for your Unlingo translation project.',
            },
            {
                property: 'og:type',
                content: 'website',
            },
            {
                property: 'og:title',
                content: 'Screenshots - Unlingo',
            },
            {
                property: 'og:description',
                content: 'Manage visual context screenshots for your Unlingo translation project.',
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
                content: 'Screenshots - Unlingo',
            },
            {
                name: 'twitter:description',
                content: 'Manage visual context screenshots for your Unlingo translation project.',
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
})

function RouteComponent() {
    const { projectId } = Route.useParams();
    const { organization } = useOrganization();

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedScreenshot, setSelectedScreenshot] = useState<Doc<'screenshots'> | null>(null);

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
        results: screenshots
    } = usePaginatedQuery(
        api.screenshots.getScreenshotsForProject,
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

    const filteredScreenshots = useMemo(() => {
        if (!screenshots) return [];

        return screenshots.filter(item => {
            return item.name.toLowerCase().includes(debouncedSearch.toLowerCase());
        });
    }, [screenshots, debouncedSearch]);

    return (
        <SidebarProvider>
            <ProjectSidebar activeItem='screenshots' projectId={projectId} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                    <GlobalSearchDialog workspace={workspace} project={project} />
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="flex items-center">
                        <h1>Screenshots</h1>
                        <div className="flex items-center ml-auto gap-2">
                            <InputGroup>
                                <InputGroupInput
                                    aria-label="Search"
                                    placeholder="Search screenshots"
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
                                Upload screenshot
                            </Button>
                        </div>
                    </div>
                    {workspace === undefined || project === undefined || screenshots === undefined ? (
                        <div className="flex items-center justify-center w-full mt-4">
                            <Spinner />
                        </div>
                    ) : filteredScreenshots.length === 0 ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <ImageIcon />
                                </EmptyMedia>
                                <EmptyTitle>No screenshots</EmptyTitle>
                                <EmptyDescription>Upload a screenshot to get started with visual context for your translations.</EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => setIsCreateDialogOpen(true)}
                                    >
                                        Upload screenshot
                                    </Button>
                                    <Button size="sm" variant="outline" render={<Link to='/docs/$' target='_blank' />}>
                                        <BookIcon className="opacity-72" />
                                        View docs
                                    </Button>
                                </div>
                            </EmptyContent>
                        </Empty>
                    ) : null}
                    {workspace && project && filteredScreenshots.length > 0 ? (
                        <Card>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Preview</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Dimensions</TableHead>
                                            <TableHead>Size</TableHead>
                                            <TableHead className="text-right" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredScreenshots.map(screenshot => (
                                            <TableRow key={screenshot._id}>
                                                <TableCell>
                                                    <Tooltip>
                                                        <TooltipTrigger delay={0} render={<div className="w-16 h-10 bg-muted rounded overflow-hidden" />}>
                                                            <img
                                                                src={screenshot.imageUrl}
                                                                alt={screenshot.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </TooltipTrigger>
                                                        <TooltipPopup>
                                                            <div className="w-[300px] h-[200px] bg-muted rounded overflow-hidden">
                                                                <img
                                                                    src={screenshot.imageUrl}
                                                                    alt={screenshot.name}
                                                                    className="h-full object-fit mx-auto"
                                                                />
                                                            </div>
                                                        </TooltipPopup>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip>
                                                        <TooltipTrigger delay={0} render={<span className="font-medium truncate" />}>
                                                            {screenshot.name}
                                                        </TooltipTrigger>
                                                        <TooltipPopup>
                                                            {screenshot.name}
                                                        </TooltipPopup>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>{screenshot.dimensions.width}x{screenshot.dimensions.height}</TableCell>
                                                <TableCell>{(screenshot.imageSize / 1024).toFixed(1)} KB</TableCell>
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
                                                                            key={screenshot._id}
                                                                            to="/projects/$projectId/screenshots/$screenshotId"
                                                                            params={{
                                                                                projectId: project._id,
                                                                                screenshotId: screenshot._id,
                                                                            }}
                                                                        />
                                                                    }
                                                                >
                                                                    <Eye className="opacity-72" />
                                                                    View
                                                                </MenuItem>
                                                            </MenuGroup>
                                                            <MenuSeparator />
                                                            <MenuItem
                                                                variant="destructive"
                                                                onClick={() => {
                                                                    setIsDeleteDialogOpen(true);
                                                                    setSelectedScreenshot(screenshot);
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
                            </CardContent>
                        </Card>
                    ) : null}
                </div>
                {workspace && project ? (
                    <>
                        <ScreenshotCreateDialog
                            isOpen={isCreateDialogOpen}
                            setIsOpen={setIsCreateDialogOpen}
                            project={project}
                            workspace={workspace}
                        />
                        {selectedScreenshot ? (
                            <ScreenshotDeleteDialog
                                isOpen={isDeleteDialogOpen}
                                setIsOpen={setIsDeleteDialogOpen}
                                workspace={workspace}
                                screenshot={selectedScreenshot}
                            />
                        ) : null}
                    </>
                ) : null}
            </SidebarInset>
        </SidebarProvider>
    )
}
