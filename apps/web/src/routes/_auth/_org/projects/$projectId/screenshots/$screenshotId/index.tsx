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
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeftIcon, PlusIcon, TrashIcon, KeyIcon, ZoomInIcon, ZoomOutIcon, RotateCcwIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Stage, Layer, Image as KonvaImage, Circle, Group, Text } from 'react-konva';
import type Konva from 'konva';
import AutoSizer from 'react-virtualized-auto-sizer';

const CONTAINER_SIZE = 40;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

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
        primaryValue: string | null;
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
    const [isKeySearchOpen, setIsKeySearchOpen] = useState(false);
    const [keySearch, setKeySearch] = useState('');
    const [debouncedKeySearch, setDebouncedKeySearch] = useState('');

    // Canvas zoom and pan state
    const [zoom, setZoom] = useState(1);
    const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });

    const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const [hoveredContainerId, setHoveredContainerId] = useState<Id<'screenshotContainers'> | null>(null);

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

    const searchResults = useQuery(
        api.translationKeys.getTranslationKeysGlobalSearch,
        workspace && project && debouncedKeySearch.length >= 2
            ? {
                projectId: project._id,
                workspaceId: workspace._id,
                search: debouncedKeySearch,
            }
            : 'skip',
    );

    const createContainer = useMutation(api.screenshots.createContainer);
    const updateContainer = useMutation(api.screenshots.updateContainer);
    const deleteContainer = useMutation(api.screenshots.deleteContainer);

    // Load the screenshot image
    useEffect(() => {
        if (screenshot?.imageUrl) {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.src = screenshot.imageUrl;
            img.onload = () => {
                setLoadedImage(img);
            };
        }
    }, [screenshot?.imageUrl]);

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
            // Container size as percentage
            const widthPercent = (CONTAINER_SIZE / screenshot.dimensions.width) * 100;
            const heightPercent = (CONTAINER_SIZE / screenshot.dimensions.height) * 100;

            // Position at center of the image
            const centerX = 50 - widthPercent / 2;
            const centerY = 50 - heightPercent / 2;

            const containerId = await createContainer({
                screenshotId: screenshot._id,
                workspaceId: workspace._id,
                translationKeyId,
                position: {
                    x: Math.max(0, Math.min(100 - widthPercent, centerX)),
                    y: Math.max(0, Math.min(100 - heightPercent, centerY)),
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

    // Zoom controls
    const handleZoomIn = () => {
        setZoom(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
    };

    const handleResetZoom = () => {
        setZoom(1);
        setStagePosition({ x: 0, y: 0 });
    };

    // Handle wheel zoom on stage
    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();

        const stage = stageRef.current;
        if (!stage) return;

        const oldScale = zoom;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - stagePosition.x) / oldScale,
            y: (pointer.y - stagePosition.y) / oldScale,
        };

        // Check if ctrl/cmd is pressed for zooming, otherwise pan
        if (e.evt.ctrlKey || e.evt.metaKey) {
            const direction = e.evt.deltaY > 0 ? -1 : 1;
            const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldScale + direction * ZOOM_STEP));

            const newPos = {
                x: pointer.x - mousePointTo.x * newScale,
                y: pointer.y - mousePointTo.y * newScale,
            };

            setZoom(newScale);
            setStagePosition(newPos);
        }
    };

    // Handle container drag
    const handleContainerDragEnd = async (
        container: ContainerWithKey,
        e: Konva.KonvaEventObject<DragEvent>
    ) => {
        if (!workspace || !screenshot) return;

        const node = e.target;
        const newX = (node.x() / screenshot.dimensions.width) * 100;
        const newY = (node.y() / screenshot.dimensions.height) * 100;

        // Clamp position to image bounds
        const clampedX = Math.max(0, Math.min(100 - container.position.width, newX));
        const clampedY = Math.max(0, Math.min(100 - container.position.height, newY));

        try {
            await updateContainer({
                containerId: container._id,
                workspaceId: workspace._id,
                position: {
                    ...container.position,
                    x: clampedX,
                    y: clampedY,
                },
            });
        } catch (err) {
            toastManager.add({
                description: `Failed to move container: ${err}`,
                type: 'error',
            });
        }
    };

    // Handle stage drag for panning
    const handleStageDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
        setStagePosition({
            x: e.target.x(),
            y: e.target.y(),
        });
    };

    const selectedContainer = containers?.find(c => c._id === selectedContainerId);
    const hoveredContainer = containers?.find(c => c._id === hoveredContainerId);

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

                        {/* Zoom controls */}
                        <div className="flex items-center gap-1 ml-4 bg-muted rounded-lg p-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleZoomOut}
                                disabled={zoom <= MIN_ZOOM}
                            >
                                <ZoomOutIcon className="w-4 h-4" />
                            </Button>
                            <span className="text-sm font-medium min-w-[4rem] text-center">
                                {Math.round(zoom * 100)}%
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleZoomIn}
                                disabled={zoom >= MAX_ZOOM}
                            >
                                <ZoomInIcon className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleResetZoom}
                            >
                                <RotateCcwIcon className="w-4 h-4" />
                            </Button>
                        </div>

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
                            {selectedContainer.translationKey.primaryValue && (
                                <span className="text-sm text-muted-foreground ml-2 truncate max-w-[300px]">
                                    "{selectedContainer.translationKey.primaryValue}"
                                </span>
                            )}
                        </div>
                    )}

                    {workspace === undefined || project === undefined || screenshot === undefined || containers === undefined || !loadedImage ? (
                        <div className="flex items-center justify-center w-full mt-4">
                            <Spinner />
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 overflow-hidden rounded-lg bg-muted/50 border relative">
                            <AutoSizer>
                                {({ width, height }) => (
                                    <Stage
                                        ref={stageRef}
                                        width={width}
                                        height={height}
                                        scaleX={zoom}
                                        scaleY={zoom}
                                        x={stagePosition.x}
                                        y={stagePosition.y}
                                        draggable
                                        onDragEnd={handleStageDragEnd}
                                        onWheel={handleWheel}
                                        onClick={(e) => {
                                            // Deselect when clicking on empty space
                                            if (e.target === e.target.getStage()) {
                                                setSelectedContainerId(null);
                                            }
                                        }}
                                    >
                                        <Layer>
                                            <KonvaImage
                                                image={loadedImage}
                                                width={screenshot.dimensions.width}
                                                height={screenshot.dimensions.height}
                                            />
                                            {containers.map((container, index) => {
                                                const x = (container.position.x / 100) * screenshot.dimensions.width;
                                                const y = (container.position.y / 100) * screenshot.dimensions.height;
                                                const isSelected = selectedContainerId === container._id;
                                                const isHovered = hoveredContainerId === container._id;

                                                return (
                                                    <Group
                                                        key={container._id}
                                                        x={x}
                                                        y={y}
                                                        draggable
                                                        onDragEnd={(e) => handleContainerDragEnd(container, e)}
                                                        onClick={(e) => {
                                                            e.cancelBubble = true;
                                                            setSelectedContainerId(container._id);
                                                        }}
                                                        onMouseEnter={() => setHoveredContainerId(container._id)}
                                                        onMouseLeave={() => setHoveredContainerId(null)}
                                                    >
                                                        {/* Selection ring */}
                                                        {isSelected && (
                                                            <Circle
                                                                x={CONTAINER_SIZE / 2}
                                                                y={CONTAINER_SIZE / 2}
                                                                radius={CONTAINER_SIZE / 2 + 4}
                                                                stroke="#ffffff"
                                                                strokeWidth={2}
                                                            />
                                                        )}
                                                        {/* Hover ring */}
                                                        {isHovered && !isSelected && (
                                                            <Circle
                                                                x={CONTAINER_SIZE / 2}
                                                                y={CONTAINER_SIZE / 2}
                                                                radius={CONTAINER_SIZE / 2 + 2}
                                                                stroke="rgba(255,255,255,0.5)"
                                                                strokeWidth={2}
                                                            />
                                                        )}
                                                        {/* Main circle */}
                                                        <Circle
                                                            x={CONTAINER_SIZE / 2}
                                                            y={CONTAINER_SIZE / 2}
                                                            radius={CONTAINER_SIZE / 2}
                                                            fill={container.backgroundColor || '#3b82f6'}
                                                            opacity={0.9}
                                                        />
                                                        {/* Index number */}
                                                        <Text
                                                            x={0}
                                                            y={CONTAINER_SIZE / 2 - 6}
                                                            width={CONTAINER_SIZE}
                                                            text={String(index + 1)}
                                                            fontSize={12}
                                                            fontStyle="bold"
                                                            fill="#ffffff"
                                                            align="center"
                                                        />
                                                    </Group>
                                                );
                                            })}
                                        </Layer>
                                    </Stage>
                                )}
                            </AutoSizer>

                            {/* Tooltip overlay for hovered container */}
                            {hoveredContainer && hoveredContainer.translationKey && (
                                <div
                                    className="absolute bg-popover text-popover-foreground border rounded-md shadow-md p-2 pointer-events-none z-50"
                                    style={{
                                        left: ((hoveredContainer.position.x / 100) * screenshot.dimensions.width * zoom) + stagePosition.x + CONTAINER_SIZE + 10,
                                        top: ((hoveredContainer.position.y / 100) * screenshot.dimensions.height * zoom) + stagePosition.y,
                                        maxWidth: '300px',
                                    }}
                                >
                                    <div className="flex flex-col gap-1">
                                        <span className="font-mono text-xs font-medium">{hoveredContainer.translationKey.key}</span>
                                        <span className="text-xs text-muted-foreground">{hoveredContainer.translationKey.namespaceName}</span>
                                        {hoveredContainer.translationKey.primaryValue && (
                                            <span className="text-xs mt-1 border-t pt-1 border-border">
                                                "{hoveredContainer.translationKey.primaryValue}"
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
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
                            ) : searchResults === undefined ? (
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
