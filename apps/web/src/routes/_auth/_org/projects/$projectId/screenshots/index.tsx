import GlobalSearchDialog from '@/components/global-search-dialog';
import ScreenshotCreateDialog from '@/components/screenshot-create-dialog';
import ScreenshotDeleteDialog from '@/components/screenshot-delete-dialog';
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
import { toastManager } from '@/components/ui/toast';
import { useOrganization } from '@clerk/tanstack-react-start';
import { createFileRoute, Link } from '@tanstack/react-router'
import { debounce } from '@tanstack/pacer';
import { api } from '@unlingo/backend/convex/_generated/api';
import type { Doc, Id } from '@unlingo/backend/convex/_generated/dataModel';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { BookIcon, Edit, EllipsisVerticalIcon, Eye, ImageIcon, LayoutGridIcon, SearchIcon, TableIcon, TrashIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

export const Route = createFileRoute(
    '/_auth/_org/projects/$projectId/screenshots/',
)({
    component: RouteComponent,
})

function RouteComponent() {
    const { projectId } = Route.useParams();
    const { organization } = useOrganization();

    const [layout, setLayout] = useState<'grid' | 'table'>('grid');
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

    const generateUploadUrl = useMutation(api.files.generateUploadUrl);

    const handleUploadFile = async (file: File): Promise<string> => {
        const { uploadUrl, fileId } = await generateUploadUrl();

        const response = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to upload file');
        }

        return fileId;
    };

    return (
        <SidebarProvider>
            <ProjectSidebar activeItem='screenshots' projectId={projectId} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                    <GlobalSearchDialog projectId={projectId} />
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="flex items-center">
                        <h1>Screenshots</h1>
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
                                    <Button size="sm" variant="outline" render={<a href="https://docs.unlingo.com" target="_blank" />}>
                                        <BookIcon className="opacity-72" />
                                        View docs
                                    </Button>
                                </div>
                            </EmptyContent>
                        </Empty>
                    ) : null}
                    {workspace && project ? (
                        <>
                            {layout === 'grid' && filteredScreenshots.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {filteredScreenshots.map(screenshot => (
                                        <Card key={screenshot._id} className="py-0 overflow-hidden hover:border-primary/30 min-w-[200px]">
                                            <Link
                                                to="/projects/$projectId/screenshots/$screenshotId"
                                                params={{
                                                    projectId: project._id,
                                                    screenshotId: screenshot._id,
                                                }}
                                                className="block"
                                            >
                                                <div className="aspect-video bg-muted overflow-hidden">
                                                    <img
                                                        src={screenshot.imageUrl}
                                                        alt={screenshot.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            </Link>
                                            <CardHeader className="px-4 py-3 flex justify-between items-center">
                                                <Link
                                                    to="/projects/$projectId/screenshots/$screenshotId"
                                                    params={{
                                                        projectId: project._id,
                                                        screenshotId: screenshot._id,
                                                    }}
                                                    className="w-full flex items-center gap-2"
                                                >
                                                    <span className="font-medium truncate">{screenshot.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {screenshot.dimensions.width}x{screenshot.dimensions.height}
                                                    </span>
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
                                            </CardHeader>
                                        </Card>
                                    ))}
                                </div>
                            ) : null}
                            {layout === 'table' && filteredScreenshots.length > 0 ? (
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
                                                            <div className="w-16 h-10 bg-muted rounded overflow-hidden">
                                                                <img
                                                                    src={screenshot.imageUrl}
                                                                    alt={screenshot.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-medium">{screenshot.name}</TableCell>
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
                        </>
                    ) : null}
                </div>
                {workspace && project ? (
                    <>
                        <ScreenshotCreateDialog
                            isOpen={isCreateDialogOpen}
                            setIsOpen={setIsCreateDialogOpen}
                            project={project}
                            workspace={workspace}
                            onUploadFile={handleUploadFile}
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
