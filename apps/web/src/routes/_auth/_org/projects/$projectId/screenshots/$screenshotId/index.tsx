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
import type { Doc, Id } from '@unlingo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeftIcon, PlusIcon, TrashIcon, KeyIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Sheet, SheetHeader, SheetPanel, SheetPopup, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { SearchIcon } from 'lucide-react';
import { debounce } from '@tanstack/pacer';

// Constants for container size (40x40 pixels on a standard display)
const CONTAINER_SIZE = 40;

interface ContainerPosition {
    x: number;
    y: number;
    width: number;
    height: number;
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
    const [isSheetOpen, setIsSheetOpen] = useState(false);
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
    );

    const namespaces = useQuery(
        api.namespaces.getNamespaces,
        workspace && project
            ? {
                projectId: project._id,
                workspaceId: workspace._id,
            }
            : 'skip'
    );

    const translationKeys = useQuery(
        api.translationKeys.getTranslationKeys,
        workspace && project && namespaces?.results && namespaces.results.length > 0
            ? {
                projectId: project._id,
                workspaceId: workspace._id,
                namespaceId: namespaces.results[0]._id,
                search: debouncedKeySearch || undefined,
            }
            : 'skip'
    );

    const createContainer = useMutation(api.screenshots.createContainer);
    const updateContainer = useMutation(api.screenshots.updateContainer);
    const deleteContainer = useMutation(api.screenshots.deleteContainer);
    const assignKeyToContainer = useMutation(api.screenshots.assignKeyToContainer);
    const removeKeyFromContainer = useMutation(api.screenshots.removeKeyFromContainer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSetKeySearch = useCallback(
        debounce((value: string) => setDebouncedKeySearch(value), { wait: 500 }),
        []
    );

    const handleKeySearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setKeySearch(e.target.value);
        debouncedSetKeySearch(e.target.value);
    };

    const handleAddContainer = async () => {
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
                position: {
                    x: Math.max(0, Math.min(100 - widthPercent, centerX - widthPercent / 2)),
                    y: Math.max(0, Math.min(100 - heightPercent, centerY - heightPercent / 2)),
                    width: widthPercent,
                    height: heightPercent,
                },
                backgroundColor: '#3b82f6',
            });

            setSelectedContainerId(containerId);
            toastManager.add({
                description: 'Container added',
                type: 'success',
            });
        } catch (err) {
            toastManager.add({
                description: `Failed to add container: ${err}`,
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
        container: Doc<'screenshotContainers'>
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

    const handleAssignKey = async (translationKeyId: Id<'translationKeys'>) => {
        if (!workspace || !selectedContainerId) return;

        try {
            await assignKeyToContainer({
                containerId: selectedContainerId,
                translationKeyId,
                workspaceId: workspace._id,
            });

            toastManager.add({
                description: 'Key assigned to container',
                type: 'success',
            });
        } catch (err) {
            toastManager.add({
                description: `Failed to assign key: ${err}`,
                type: 'error',
            });
        }
    };

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
                            <Button onClick={handleAddContainer}>
                                <PlusIcon />
                                Add Container
                            </Button>
                            {selectedContainerId && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsSheetOpen(true)}
                                    >
                                        <KeyIcon />
                                        Assign Keys
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => handleDeleteContainer(selectedContainerId)}
                                    >
                                        <TrashIcon />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
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
                                            {/* Render containers */}
                                            {containers.map(container => (
                                                <div
                                                    key={container._id}
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
                                                >
                                                    {containers.indexOf(container) + 1}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </AutoSizer>
                        </div>
                    )}
                </div>

                {/* Key Assignment Sheet */}
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetPopup className="min-w-[400px]">
                        <SheetHeader>
                            <SheetTitle>Assign Translation Keys</SheetTitle>
                            <SheetDescription>
                                Select translation keys to associate with this container.
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
                                />
                                <InputGroupAddon>
                                    <SearchIcon />
                                </InputGroupAddon>
                            </InputGroup>
                            <ScrollArea className="h-[400px]">
                                <div className="flex flex-col gap-2">
                                    {translationKeys?.results?.map(key => (
                                        <Card
                                            key={key._id}
                                            className="py-2 cursor-pointer hover:border-primary/30"
                                            onClick={() => handleAssignKey(key._id)}
                                        >
                                            <CardContent className="p-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="font-mono text-sm truncate">
                                                        {key.key}
                                                    </div>
                                                    <Button size="sm" variant="ghost">
                                                        <PlusIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {(!translationKeys?.results || translationKeys.results.length === 0) && (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            No translation keys found
                                        </p>
                                    )}
                                </div>
                            </ScrollArea>
                        </SheetPanel>
                    </SheetPopup>
                </Sheet>
            </SidebarInset>
        </SidebarProvider>
    );
}
