import GlobalSearchDialog from '@/components/global-search-dialog';
import { ProjectSidebar } from '@/components/project-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { toastManager } from '@/components/ui/toast';
import { useOrganization } from '@clerk/tanstack-react-start';
import { createFileRoute } from '@tanstack/react-router'
import { api } from '@unlingo/backend/convex/_generated/api';
import type { Id } from '@unlingo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { PlusIcon, TrashIcon, ZoomInIcon, ZoomOutIcon, RotateCcwIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Sheet, SheetHeader, SheetPanel, SheetPopup, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { SearchIcon } from 'lucide-react';
import { debounce } from '@tanstack/pacer';
import { Stage, Layer, Image as KonvaImage, Circle, Group, Text } from 'react-konva';
import type Konva from 'konva';
import AutoSizer from 'react-virtualized-auto-sizer';
import { GroupSeparator, GroupText, Group as UIGroup } from '@/components/ui/group';

const CONTAINER_SIZE = 40;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_SENSITIVITY = 0.001; // For smooth wheel zooming

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

    const [zoom, setZoom] = useState(1);
    const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
    const [initialFitDone, setInitialFitDone] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

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

    useEffect(() => {
        if (loadedImage && screenshot && canvasSize.width > 0 && canvasSize.height > 0 && !initialFitDone) {
            const padding = 40;
            const availableWidth = canvasSize.width - padding * 2;
            const availableHeight = canvasSize.height - padding * 2;

            const scaleX = availableWidth / screenshot.dimensions.width;
            const scaleY = availableHeight / screenshot.dimensions.height;
            const fitScale = Math.min(scaleX, scaleY, 1);

            const scaledWidth = screenshot.dimensions.width * fitScale;
            const scaledHeight = screenshot.dimensions.height * fitScale;

            const offsetX = (canvasSize.width - scaledWidth) / 2;
            const offsetY = (canvasSize.height - scaledHeight) / 2;

            setZoom(fitScale);
            setStagePosition({ x: offsetX, y: offsetY });
            setInitialFitDone(true);
        }
    }, [loadedImage, screenshot, canvasSize, initialFitDone]);

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
            const widthPercent = (CONTAINER_SIZE / screenshot.dimensions.width) * 100;
            const heightPercent = (CONTAINER_SIZE / screenshot.dimensions.height) * 100;

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

    const handleZoomIn = () => {
        setZoom(prev => Math.min(MAX_ZOOM, prev * 1.25)); // 25% increase
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(MIN_ZOOM, prev / 1.25)); // 25% decrease
    };

    const handleResetZoom = () => {
        if (screenshot && canvasSize.width > 0 && canvasSize.height > 0) {
            const padding = 40;
            const availableWidth = canvasSize.width - padding * 2;
            const availableHeight = canvasSize.height - padding * 2;

            const scaleX = availableWidth / screenshot.dimensions.width;
            const scaleY = availableHeight / screenshot.dimensions.height;
            const fitScale = Math.min(scaleX, scaleY, 1);

            const scaledWidth = screenshot.dimensions.width * fitScale;
            const scaledHeight = screenshot.dimensions.height * fitScale;

            const offsetX = (canvasSize.width - scaledWidth) / 2;
            const offsetY = (canvasSize.height - scaledHeight) / 2;

            setZoom(fitScale);
            setStagePosition({ x: offsetX, y: offsetY });
        } else {
            setZoom(1);
            setStagePosition({ x: 0, y: 0 });
        }
    };

    // Handle wheel events - Figma-style navigation
    // - Wheel alone: zoom (smooth)
    // - Shift + wheel: horizontal pan
    // - Ctrl/Cmd + wheel: zoom (pinch-to-zoom on trackpad)
    // - Two-finger scroll on trackpad: pan (detected via deltaX presence)
    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();

        const stage = stageRef.current;
        if (!stage) return;

        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const evt = e.evt;

        // Detect trackpad two-finger scroll (has both deltaX and deltaY without modifiers)
        // or shift+wheel for horizontal pan
        const isTrackpadPan = Math.abs(evt.deltaX) > 0;
        const isShiftPan = evt.shiftKey && !evt.ctrlKey && !evt.metaKey;

        if (isTrackpadPan && !evt.ctrlKey && !evt.metaKey) {
            // Two-finger trackpad scroll: pan in both directions
            setStagePosition(prev => ({
                x: prev.x - evt.deltaX,
                y: prev.y - evt.deltaY,
            }));
        } else if (isShiftPan) {
            // Shift + wheel: horizontal pan
            setStagePosition(prev => ({
                x: prev.x - evt.deltaY,
                y: prev.y,
            }));
        } else {
            // Zoom (ctrl/cmd + wheel for trackpad pinch, or regular wheel)
            const oldScale = zoom;
            const mousePointTo = {
                x: (pointer.x - stagePosition.x) / oldScale,
                y: (pointer.y - stagePosition.y) / oldScale,
            };

            const zoomFactor = evt.ctrlKey || evt.metaKey
                ? 1 - evt.deltaY * 0.01
                : 1 - evt.deltaY * ZOOM_SENSITIVITY * 100;

            const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldScale * zoomFactor));

            const newPos = {
                x: pointer.x - mousePointTo.x * newScale,
                y: pointer.y - mousePointTo.y * newScale,
            };

            setZoom(newScale);
            setStagePosition(newPos);
        }
    };

    const handleContainerDragEnd = async (
        container: ContainerWithKey,
        e: Konva.KonvaEventObject<DragEvent>
    ) => {
        if (!workspace || !screenshot) return;

        const node = e.target;
        const newX = (node.x() / screenshot.dimensions.width) * 100;
        const newY = (node.y() / screenshot.dimensions.height) * 100;

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
                        <h1>{screenshot?.name || 'Screenshot Editor'} {selectedContainer?.translationKey ? `• ${selectedContainer.translationKey.key}` : null}</h1>
                        <UIGroup aria-label="Zoom controls" className='ml-auto'>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleZoomOut}
                                disabled={zoom <= MIN_ZOOM}
                            >
                                <ZoomOutIcon />
                            </Button>
                            <GroupSeparator />
                            <GroupText>{Math.round(zoom * 100)}%</GroupText>
                            <GroupSeparator />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleZoomIn}
                                disabled={zoom >= MAX_ZOOM}
                            >
                                <ZoomInIcon />
                            </Button>
                            <GroupSeparator />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleResetZoom}
                            >
                                <RotateCcwIcon />
                            </Button>
                        </UIGroup>
                        <div className="flex items-center gap-2">
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
                    {workspace === undefined || project === undefined || screenshot === undefined || containers === undefined || !loadedImage ? (
                        <div className="flex items-center justify-center w-full mt-4">
                            <Spinner />
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 overflow-hidden rounded-lg bg-muted/50 border relative">
                            <AutoSizer>
                                {({ width, height }) => {
                                    if (width !== canvasSize.width || height !== canvasSize.height) {
                                        setTimeout(() => setCanvasSize({ width, height }), 0);
                                    }

                                    return (
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
                                                {containers.map((container) => {
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
                                                            onDragStart={(e) => {
                                                                e.cancelBubble = true;
                                                                setHoveredContainerId(null);
                                                                setSelectedContainerId(container._id);
                                                            }}
                                                            onDragMove={(e) => {
                                                                e.cancelBubble = true;
                                                            }}
                                                            onDragEnd={(e) => {
                                                                e.cancelBubble = true;
                                                                handleContainerDragEnd(container, e);
                                                            }}
                                                            onClick={(e) => {
                                                                e.cancelBubble = true;
                                                                setSelectedContainerId(container._id);
                                                            }}
                                                            onMouseEnter={() => setHoveredContainerId(container._id)}
                                                            onMouseLeave={() => setHoveredContainerId(null)}
                                                        >
                                                            {isSelected && (
                                                                <Circle
                                                                    x={CONTAINER_SIZE / 2}
                                                                    y={CONTAINER_SIZE / 2}
                                                                    radius={CONTAINER_SIZE / 2 + 4}
                                                                    stroke="#ffffff"
                                                                    strokeWidth={2}
                                                                />
                                                            )}
                                                            {isHovered && !isSelected && (
                                                                <Circle
                                                                    x={CONTAINER_SIZE / 2}
                                                                    y={CONTAINER_SIZE / 2}
                                                                    radius={CONTAINER_SIZE / 2 + 2}
                                                                    stroke="rgba(255,255,255,0.5)"
                                                                    strokeWidth={2}
                                                                />
                                                            )}
                                                            <Circle
                                                                x={CONTAINER_SIZE / 2}
                                                                y={CONTAINER_SIZE / 2}
                                                                radius={CONTAINER_SIZE / 2}
                                                                fill={container.backgroundColor || '#3b82f6'}
                                                                opacity={0.9}
                                                            />
                                                            <Circle
                                                                x={CONTAINER_SIZE / 2}
                                                                y={CONTAINER_SIZE / 2 - 4}
                                                                radius={6}
                                                                stroke="#ffffff"
                                                                strokeWidth={2}
                                                                fill="transparent"
                                                            />
                                                            <Text
                                                                x={CONTAINER_SIZE / 2 - 1}
                                                                y={CONTAINER_SIZE / 2 + 2}
                                                                text="|"
                                                                fontSize={10}
                                                                fontStyle="bold"
                                                                fill="#ffffff"
                                                            />
                                                        </Group>
                                                    );
                                                })}
                                            </Layer>
                                        </Stage>
                                    );
                                }}
                            </AutoSizer>
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
