'use client';

import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import { Doc, Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { isAddingContainer$, selectedContainerId$ } from '@/app/dashboard/screenshots/[screenshotId]/store';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import KonvaContainer from './konva-container';
import { use$ } from '@legendapp/state/react';
import { ButtonGroup, ButtonGroupText } from './ui/button-group';

interface ScreenshotCanvasProps {
    workspaceId: Id<'workspaces'>;
    screenshotId: Id<'screenshots'>;
    canvasImage: HTMLImageElement;
    mode: 'edit' | 'translate';
    onCanvasClick?: (e: any) => void;
    containers?: Doc<'screenshotContainers'>[];
}

export default function ScreenshotCanvas({
    workspaceId,
    screenshotId,
    canvasImage,
    mode,
    containers = [],
}: ScreenshotCanvasProps) {
    const selectedContainerId = use$(selectedContainerId$);
    const isAddingContainer = use$(isAddingContainer$);

    const stageRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const stageContainerRef = useRef<HTMLDivElement>(null);
    const topBarRef = useRef<HTMLDivElement>(null);

    const [scale, setScale] = useState(1);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

    const updateContainer = useMutation(api.screenshots.updateContainer);
    const createContainer = useMutation(api.screenshots.createContainer);

    const handleContainerUpdate = async (
        containerId: Id<'screenshotContainers'>,
        position: Doc<'screenshotContainers'>['position']
    ) => {
        try {
            await updateContainer({
                containerId,
                position,
                workspaceId,
            });
        } catch (error) {
            console.error('Failed to update container:', error);
        }
    };

    const handleAddContainer = async (x: number, y: number) => {
        try {
            await createContainer({
                screenshotId,
                position: {
                    x: Math.max(0, Math.min(85, x - 7.5)),
                    y: Math.max(0, Math.min(90, y - 5)),
                    width: 15,
                    height: 10,
                },
                backgroundColor: '#3b82f6',
                workspaceId,
            });

            isAddingContainer$.set(false);
        } catch (error) {
            console.error('Failed to create container:', error);
            alert(error instanceof Error ? error.message : 'Failed to create container');
        }
    };

    const handleCanvasClick = (e: any) => {
        if (mode === 'edit' && isAddingContainer) {
            const stage = e.target.getStage();
            const layer = stage.findOne('Layer');
            const image = layer?.findOne('Image');

            if (!image) return;

            const pointer = stage.getPointerPosition();

            const transform = stage.getAbsoluteTransform().copy();
            transform.invert();
            const pos = transform.point(pointer);

            const imageWidth = image.width();
            const imageHeight = image.height();

            const x = (pos.x / imageWidth) * 100;
            const y = (pos.y / imageHeight) * 100;

            handleAddContainer(x, y);
        } else {
            const clickedOnEmpty = e.target === e.target.getStage() || e.target.getType() === 'Image';
            if (clickedOnEmpty && selectedContainerId) {
                selectedContainerId$.set(null);
            }
        }
    };

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev * 1.2, 3));
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev / 1.2, 0.1));
    };

    const handleResetZoom = () => {
        if (canvasImage && stageContainerRef.current) {
            const width = Math.max(200, stageContainerRef.current.clientWidth);
            const height = Math.max(200, stageContainerRef.current.clientHeight);
            const scaleX = width / canvasImage.width;
            const scaleY = height / canvasImage.height;
            const initialScale = Math.min(scaleX, scaleY, 1);
            setScale(initialScale);

            if (stageRef.current) {
                stageRef.current.position({ x: 0, y: 0 });
                stageRef.current.batchDraw();
            }
        }
    };

    const handleWheel = (e: any) => {
        e.evt.preventDefault();

        const scaleBy = 1.05;
        const stage = e.target.getStage();
        const oldScale = stage.scaleX();

        const pointer = stage.getPointerPosition();

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
        const clampedScale = Math.max(0.1, Math.min(3, newScale));

        setScale(clampedScale);

        const newPos = {
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
        };

        stage.position(newPos);
        stage.batchDraw();
    };

    useEffect(() => {
        if (!stageContainerRef.current) return;
        const element = stageContainerRef.current;
        const observer = new ResizeObserver(entries => {
            const [obsEntry] = entries;
            if (!obsEntry) return;
            const width = Math.max(200, Math.floor(obsEntry.contentRect.width));
            const height = Math.max(200, Math.floor(obsEntry.contentRect.height));
            setCanvasSize({ width, height });

            if (canvasImage) {
                const scaleX = width / canvasImage.width;
                const scaleY = height / canvasImage.height;
                const initialScale = Math.min(scaleX, scaleY, 1);
                setScale(initialScale);
            }
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, [canvasImage]);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.focus();
        }
    }, []);

    useEffect(() => {
        if (mode === 'translate') {
            isAddingContainer$.set(false);
        }
    }, [mode]);

    return (
        <div
            ref={containerRef}
            className='bg-gray-950/50 border border-gray-800/50 rounded-2xl p-4 sm:p-6 backdrop-blur-sm flex h-full flex-col'
            tabIndex={0}>
            <div ref={topBarRef} className='mb-2 sm:mb-4 flex items-center justify-between'>
                <div className='text-sm text-blue-400'>
                    {mode === 'edit'
                        ? isAddingContainer
                            ? 'Click on the screenshot to place a new container'
                            : 'Use wheel to zoom • Drag to pan • Click and drag containers to reposition'
                        : 'Use wheel to zoom • Drag to pan • Click containers to select and assign keys'}
                </div>

                <ButtonGroup>
                    <Button onClick={handleZoomOut} intent='outline' size='sm'>
                        <ZoomOut className='h-4 w-4' />
                    </Button>
                    <ButtonGroupText>{Math.round(scale * 100)}%</ButtonGroupText>
                    <Button onClick={handleZoomIn} intent='outline' size='sm'>
                        <ZoomIn className='h-4 w-4' />
                    </Button>
                    <Button onClick={handleResetZoom} intent='outline' size='sm'>
                        <RotateCcw className='h-4 w-4' />
                    </Button>
                </ButtonGroup>
            </div>

            <div
                ref={stageContainerRef}
                className='border border-gray-700/50 rounded-xl overflow-hidden bg-gray-900 flex-1 min-h-0'>
                <Stage
                    ref={stageRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    scaleX={scale}
                    scaleY={scale}
                    draggable={!(mode === 'edit' && isAddingContainer)}
                    onClick={handleCanvasClick}
                    onWheel={handleWheel}
                    style={{ cursor: mode === 'edit' && isAddingContainer ? 'crosshair' : 'grab' }}>
                    <Layer>
                        <KonvaImage image={canvasImage} width={canvasImage.width} height={canvasImage.height} />
                        {containers.map(container => {
                            return (
                                <KonvaContainer
                                    key={container._id}
                                    container={container}
                                    isSelected={selectedContainerId === container._id}
                                    onSelect={() => selectedContainerId$.set(container._id)}
                                    onUpdate={position => handleContainerUpdate(container._id, position)}
                                    stageRef={stageRef}
                                    mode={mode}
                                />
                            );
                        })}
                    </Layer>
                </Stage>
            </div>
        </div>
    );
}
