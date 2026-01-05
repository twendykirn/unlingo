import GlobalSearchDialog from '@/components/global-search-dialog';
import { ProjectSidebar } from '@/components/project-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { toastManager } from '@/components/ui/toast';
import { useOrganization } from '@clerk/tanstack-react-start';
import { createFileRoute, Link } from '@tanstack/react-router'
import { api } from '@unlingo/backend/convex/_generated/api';
import type { Id } from '@unlingo/backend/convex/_generated/dataModel';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { ArrowLeftIcon, PlusIcon, TrashIcon, KeyIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Sheet, SheetHeader, SheetPanel, SheetPopup, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { SearchIcon } from 'lucide-react';
import { debounce } from '@tanstack/pacer';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from '@/components/ui/tooltip';

const CONTAINER_SIZE = 40;

interface ContainerWithKey {
    _id: Id<'screenshotContainers'>;
    screenshotId: Id<'screenshots'>;
    translationKeyId: Id<'translationKeys'>;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    backgroundColor?: string;
    translationKey: {
        _id: Id<'translationKeys'>;
        key: string;
        namespaceName: string;
    } | null;
}

export const Route = createFileRoute(
    '/_auth/_org/projects/$projectId/screenshots/$screenshotId/',
)({
    component: RouteComponent,
})

function RouteComponent() {
    const { projectId, screenshotId } = Route.useParams();
    const { organization } = useOrganization();

    const [selectedContainerId, setSelectedContainerId] = useState<Id<'screenshotContainers'> | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isKeySearchOpen, setIsKeySearchOpen] = useState(false);
    const [keySearch, setKeySearch] = useState('');
    const [debouncedKeySearch, setDebouncedKeySearch] = useState('');

    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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

    const screenshot = useQuery(
        api.screenshots.getScreenshot,
        workspace
            ? {
                screenshotId: screenshotId as Id<'screenshots'>,
                workspaceId: workspace._id,
            }
            : 'skip'
    );

    const containers = useQuery(
        api.screenshots.getContainersForScreenshot,
        workspace && screenshot
            ? {
                screenshotId: screenshot._id,
                workspaceId: workspace._id,
            }
            : 'skip'
    ) as ContainerWithKey[] | undefined;

    // Search translation keys across all namespaces (only when search term is provided)
    const {
        results: searchResults,
        status: searchStatus,
        loadMore,
    } = usePaginatedQuery(
        api.screenshots.searchTranslationKeysForScreenshot,
        workspace && project && debouncedKeySearch.length >= 2
            ? {
                projectId: project._id,
                workspaceId: workspace._id,
                search: debouncedKeySearch,
            }
            : 'skip',
        { initialNumItems: 20 }
    );

    const createContainer = useMutation(api.screenshots.createContainer);
    const updateContainer = useMutation(api.screenshots.updateContainer);
    const deleteContainer = useMutation(api.screenshots.deleteContainer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSetKeySearch = useCallback(
        debounce((value: string) => setDebouncedKeySearch(value), { wait: 400 }),
        []
    );

    const handleKeySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setKeySearch(e.target.value);
        debouncedSetKeySearch(e.target.value);
    };

    const handleOpenKeySearch = () => {
        setKeySearch('');
        setDebouncedKeySearch('');
        setIsKeySearchOpen(true);
    };

    const handleSelectKeyAndCreateContainer = async (translationKeyId: Id<'translationKeys'>) => {
        if (!workspace || !screenshot) return;

        try {
            // Calculate position percentage for center of the visible area
            const containerElement = containerRef.current;
            const imageElement = imageRef.current;

            if (!containerElement || !imageElement) return;

            const rect = containerElement.getBoundingClientRect();
            const imageRect = imageElement.getBoundingClientRect();

            // Position at center of visible area
            const centerX = (rect.width / 2) / imageRect.width * 100;
            const centerY = (rect.height / 2) / imageRect.height * 100;

            // Container size as percentage
            const widthPercent = (CONTAINER_SIZE / screenshot.dimensions.width) * 100;
            const heightPercent = (CONTAINER_SIZE / screenshot.dimensions.height) * 100;

            const containerId = await createContainer({
                screenshotId: screenshot._id,
                workspaceId: workspace._id,
                translationKeyId,
                position: {
                    x: Math.max(0, Math.min(100 - widthPercent, centerX - widthPercent / 2)),
                    y: Math.max(0, Math.min(100 - heightPercent, centerY - heightPercent / 2)),
                    width: widthPercent,
                    height: heightPercent,
                },
                backgroundColor: '#3b82f6',
            });

            setSelectedContainerId(containerId);
            setIsKeySearchOpen(false);
            toastManager.add({
                description: 'Container created with translation key',
                type: 'success',
            });
        } catch (err) {
            toastManager.add({
                description: `Failed to create container: ${err}`,
                type: 'error',
            });
        }
    };

    const handleDeleteContainer = async (containerId: Id<'screenshotContainers'>) => {
        if (!workspace) return;

        try {
            await deleteContainer({
                containerId,
                workspaceId: workspace._id,
            });

            if (selectedContainerId === containerId) {
                setSelectedContainerId(null);
            }

            toastManager.add({
                description: 'Container deleted',
                type: 'success',
            });
        } catch (err) {
            toastManager.add({
                description: `Failed to delete container: ${err}`,
                type: 'error',
            });
        }
    };

    const handleContainerMouseDown = (
        e: React.MouseEvent,
        container: ContainerWithKey
    ) => {
        e.preventDefault();
        e.stopPropagation();

        setSelectedContainerId(container._id);
        setIsDragging(true);

        const imageElement = imageRef.current;
        if (!imageElement) return;

        const imageRect = imageElement.getBoundingClientRect();
        const containerX = (container.position.x / 100) * imageRect.width + imageRect.left;
        const containerY = (container.position.y / 100) * imageRect.height + imageRect.top;

        setDragOffset({
            x: e.clientX - containerX,
            y: e.clientY - containerY,
        });
    };

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging || !selectedContainerId || !workspace || !screenshot) return;

            const imageElement = imageRef.current;
            if (!imageElement) return;

            const imageRect = imageElement.getBoundingClientRect();
            const selectedContainer = containers?.find(c => c._id === selectedContainerId);
            if (!selectedContainer) return;

            const newX = ((e.clientX - dragOffset.x - imageRect.left) / imageRect.width) * 100;
            const newY = ((e.clientY - dragOffset.y - imageRect.top) / imageRect.height) * 100;

            // Clamp position to image bounds
            const clampedX = Math.max(0, Math.min(100 - selectedContainer.position.width, newX));
            const clampedY = Math.max(0, Math.min(100 - selectedContainer.position.height, newY));

            // Update container position
            updateContainer({
                containerId: selectedContainerId,
                workspaceId: workspace._id,
                position: {
                    ...selectedContainer.position,
                    x: clampedX,
                    y: clampedY,
                },
            });
        },
        [isDragging, selectedContainerId, workspace, screenshot, containers, dragOffset, updateContainer]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const selectedContainer = containers?.find(c => c._id === selectedContainerId);

    return (
        <SidebarProvider>
            <ProjectSidebar activeItem='screenshots' projectId={projectId} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                    <GlobalSearchDialog workspaceId={workspace?._id} projectId={project?._id} />
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            render={
                                <Link
                                    to="/projects/$projectId/screenshots"
                                    params={{ projectId }}
                                />
                            }
                        >
                            <ArrowLeftIcon />
                        </Button>
                        <h1>{screenshot?.name || 'Screenshot Editor'}</h1>
                        <div className="flex items-center ml-auto gap-2">
                            <Button onClick={handleOpenKeySearch}>
                                <PlusIcon />
                                Add Container
                            </Button>
                            {selectedContainerId && selectedContainer && (
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => handleDeleteContainer(selectedContainerId)}
                                >
                                    <TrashIcon />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Selected container info */}
                    {selectedContainer && selectedContainer.translationKey && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                            <KeyIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Selected:</span>
                            <Badge variant="secondary" className="font-mono">
                                {selectedContainer.translationKey.key}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                ({selectedContainer.translationKey.namespaceName})
                            </span>
                        </div>
                    )}

                    {workspace === undefined || project === undefined || screenshot === undefined || containers === undefined ? (
                        <div className="flex items-center justify-center w-full mt-4">
                            <Spinner />
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0">
                            <AutoSizer>
                                {({ width, height }) => (
                                    <div
                                        ref={containerRef}
                                        className="overflow-auto bg-muted/50 rounded-lg"
                                        style={{ width, height }}
                                        onClick={() => setSelectedContainerId(null)}
                                    >
                                        <div className="relative inline-block min-w-full min-h-full p-4">
                                            <img
                                                ref={imageRef}
                                                src={screenshot.imageUrl}
                                                alt={screenshot.name}
                                                className="max-w-full h-auto block"
                                                draggable={false}
                                            />
                                            {containers.map((container, index) => (
                                                <Tooltip key={container._id}>
                                                    <TooltipTrigger
                                                        render={
                                                            <div
                                                                className={`absolute rounded-full cursor-move transition-all ${selectedContainerId === container._id
                                                                    ? 'ring-2 ring-white ring-offset-2'
                                                                    : 'hover:ring-2 hover:ring-white/50'
                                                                    }`}
                                                                style={{
                                                                    left: `${container.position.x}%`,
                                                                    top: `${container.position.y}%`,
                                                                    width: `${CONTAINER_SIZE}px`,
                                                                    height: `${CONTAINER_SIZE}px`,
                                                                    backgroundColor: container.backgroundColor || '#3b82f6',
                                                                    opacity: 0.9,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: 'white',
                                                                    fontSize: '12px',
                                                                    fontWeight: 'bold',
                                                                }}
                                                                onMouseDown={(e) => handleContainerMouseDown(e, container)}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedContainerId(container._id);
                                                                }}
                                                            />
                                                        }
                                                        delay={0}
                                                    >
                                                        {index + 1}
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-[300px]">
                                                        {container.translationKey ? (
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-mono text-xs">{container.translationKey.key}</span>
                                                                <span className="text-xs text-muted-foreground">{container.translationKey.namespaceName}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">Key not found</span>
                                                        )}
                                                    </TooltipContent>
                                                </Tooltip>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </AutoSizer>
                        </div>
                    )}
                </div>
                <Sheet open={isKeySearchOpen} onOpenChange={setIsKeySearchOpen}>
                    <SheetPopup className="min-w-[450px]">
                        <SheetHeader>
                            <SheetTitle>Select Translation Key</SheetTitle>
                            <SheetDescription>
                                Search for a translation key to create a new container. Type at least 2 characters to search.
                            </SheetDescription>
                        </SheetHeader>
                        <SheetPanel className="flex flex-col gap-4">
                            <InputGroup>
                                <InputGroupInput
                                    aria-label="Search keys"
                                    placeholder="Search translation keys..."
                                    type="search"
                                    value={keySearch}
                                    onChange={handleKeySearchChange}
                                    autoFocus
                                />
                                <InputGroupAddon>
                                    <SearchIcon />
                                </InputGroupAddon>
                            </InputGroup>

                            {debouncedKeySearch.length < 2 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    Type at least 2 characters to search for translation keys
                                </p>
                            ) : searchStatus === 'LoadingFirstPage' ? (
                                <div className="flex items-center justify-center py-8">
                                    <Spinner />
                                </div>
                            ) : (
                                <ScrollArea className="h-[400px]">
                                    <div className="flex flex-col gap-2">
                                        {searchResults?.map(key => (
                                            <Card
                                                key={key._id}
                                                className="py-2 cursor-pointer hover:border-primary/30 transition-colors"
                                                onClick={() => handleSelectKeyAndCreateContainer(key._id)}
                                            >
                                                <CardContent className="p-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                            <div className="font-mono text-sm truncate">
                                                                {key.key}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {key.namespaceName}
                                                            </div>
                                                        </div>
                                                        <Button size="sm" variant="ghost">
                                                            <PlusIcon className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                        {(!searchResults || searchResults.length === 0) && (
                                            <p className="text-sm text-muted-foreground text-center py-8">
                                                No translation keys found for "{debouncedKeySearch}"
                                            </p>
                                        )}
                                        {searchStatus === 'CanLoadMore' && (
                                            <Button
                                                variant="ghost"
                                                className="w-full"
                                                onClick={() => loadMore(20)}
                                            >
                                                Load more
                                            </Button>
                                        )}
                                        {searchStatus === 'LoadingMore' && (
                                            <div className="flex items-center justify-center py-4">
                                                <Spinner />
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            )}
                        </SheetPanel>
                    </SheetPopup>
                </Sheet>
            </SidebarInset>
        </SidebarProvider>
    );
}
