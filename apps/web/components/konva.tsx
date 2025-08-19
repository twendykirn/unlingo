'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text, Transformer } from 'react-konva';
import { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface Container {
    _id: Id<'screenshotContainers'>;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    backgroundColor?: string;
    description?: string;
    createdAt: number;
    updatedAt: number;
}

interface KeyMapping {
    _id: Id<'screenshotKeyMappings'>;
    containerId: Id<'screenshotContainers'>;
    translationKey: string;
    valueType: 'string' | 'number' | 'boolean';
    currentValue: string | number | boolean | null;
    updatedAt: number;
}

interface KonvaContainerProps {
    container: Container;
    isSelected: boolean;
    onSelect: () => void;
    onUpdate: (position: Container['position']) => void;
    onDelete: () => void;
    stageRef: React.RefObject<any>;
    mode: 'edit' | 'translate';
    mappings?: KeyMapping[]; // Only used in translate mode
}

const KonvaContainer = ({ container, isSelected, onSelect, onUpdate, onDelete, stageRef, mode, mappings = [] }: KonvaContainerProps) => {
    const rectRef = useRef<any>(null);
    const textRef = useRef<any>(null);
    const transformerRef = useRef<any>(null);

    useEffect(() => {
        if (isSelected && rectRef.current && transformerRef.current) {
            transformerRef.current.nodes([rectRef.current]);
            transformerRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    const handleTransform = useCallback(() => {
        if (!rectRef.current || !stageRef.current) return;

        const rectNode = rectRef.current;
        const textNode = textRef.current;
        const stage = stageRef.current;
        const layer = stage.findOne('Layer');
        const image = layer.findOne('Image');

        if (!image) return;

        // Get image dimensions (original size)
        const imageWidth = image.width();
        const imageHeight = image.height();

        // Apply the scale to the size and reset scale to prevent accumulation
        const newWidth = rectNode.width() * rectNode.scaleX();
        const newHeight = rectNode.height() * rectNode.scaleY();
        
        rectNode.size({ width: newWidth, height: newHeight });
        rectNode.scaleX(1);
        rectNode.scaleY(1);

        // Update text position and size to match rect (only in translate mode)
        if (textNode && mode === 'translate') {
            textNode.position({
                x: rectNode.x(),
                y: rectNode.y()
            });
            textNode.size({
                width: newWidth,
                height: newHeight
            });
        }

        // Convert to percentage for storage
        const x = (rectNode.x() / imageWidth) * 100;
        const y = (rectNode.y() / imageHeight) * 100;
        const width = (newWidth / imageWidth) * 100;
        const height = (newHeight / imageHeight) * 100;

        onUpdate({ x, y, width, height });
    }, [onUpdate, stageRef, mode]);

    const handleClick = useCallback(
        (e: any) => {
            onSelect();
        },
        [onSelect]
    );

    if (!stageRef.current) return null;

    const stage = stageRef.current;
    const layer = stage.findOne('Layer');
    const image = layer?.findOne('Image');

    if (!image) return null;

    // Use the original image dimensions for positioning
    const imageWidth = image.width();
    const imageHeight = image.height();

    // Determine colors based on mode and selection
    const backgroundColor = container.backgroundColor || '#3b82f6';
    const fillColor = mode === 'edit' 
        ? (isSelected ? `${backgroundColor}50` : `${backgroundColor}30`) // More transparent in edit mode
        : (isSelected ? `${backgroundColor}80` : `${backgroundColor}60`); // Less transparent in translate mode
    
    const strokeColor = isSelected ? backgroundColor : `${backgroundColor}90`;

    return (
        <>
            <Rect
                ref={rectRef}
                x={(container.position.x / 100) * imageWidth}
                y={(container.position.y / 100) * imageHeight}
                width={(container.position.width / 100) * imageWidth}
                height={(container.position.height / 100) * imageHeight}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={2}
                draggable={isSelected && mode === 'edit'} // Only draggable in edit mode
                onClick={handleClick}
                onDragEnd={mode === 'edit' ? handleTransform : undefined}
                onTransformEnd={mode === 'edit' ? handleTransform : undefined}
            />
            
            {/* Small indicator for containers with descriptions */}
            {container.description && (
                <Rect
                    x={(container.position.x / 100) * imageWidth + 2}
                    y={(container.position.y / 100) * imageHeight + 2}
                    width={8}
                    height={8}
                    fill='rgba(255, 255, 255, 0.8)'
                    stroke='rgba(0, 0, 0, 0.3)'
                    strokeWidth={1}
                    cornerRadius={2}
                    listening={false}
                />
            )}
            
            {isSelected && mode === 'edit' && (
                <Transformer
                    ref={transformerRef}
                    rotateEnabled={false} // Disable rotation
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 50 || newBox.height < 30) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />
            )}
        </>
    );
};

interface ScreenshotCanvasProps {
    canvasImage: HTMLImageElement;
    mode: 'edit' | 'translate';
    // Edit mode props
    isAddingContainer?: boolean;
    onCanvasClick?: (e: any) => void;
    containers?: Container[];
    selectedContainerId?: Id<'screenshotContainers'> | null;
    onContainerSelect?: (id: Id<'screenshotContainers'>) => void;
    onContainerUpdate?: (containerId: Id<'screenshotContainers'>, position: Container['position']) => void;
    onContainerDelete?: (containerId: Id<'screenshotContainers'>) => void;
    // Translate mode props
    selectedKey?: any;
    keyMappings?: KeyMapping[];
    onClearSelection: () => void;
}

export default function ScreenshotCanvas({
    canvasImage,
    mode,
    isAddingContainer,
    onCanvasClick,
    containers = [],
    selectedContainerId,
    onContainerSelect,
    onContainerUpdate,
    onContainerDelete,
    selectedKey,
    keyMappings = [],
    onClearSelection,
}: ScreenshotCanvasProps) {
    const stageRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

    // Calculate canvas size based on container
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const container = containerRef.current;
                const containerWidth = Math.min(container.clientWidth - 48, 1200); // Max 1200px width, account for padding
                const containerHeight = Math.min(600, window.innerHeight * 0.6); // Max 600px or 60vh

                setCanvasSize({ width: containerWidth, height: containerHeight });

                // Auto-fit image to canvas initially
                if (canvasImage) {
                    const scaleX = containerWidth / canvasImage.width;
                    const scaleY = containerHeight / canvasImage.height;
                    const initialScale = Math.min(scaleX, scaleY, 0.8); // Don't scale up initially, leave some margin
                    setScale(initialScale);
                }
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [canvasImage]);

    const handleCanvasClick = (e: any) => {
        if (mode === 'edit' && isAddingContainer && onCanvasClick) {
            onCanvasClick(e);
        } else {
            // Check if click target is the Stage or Image (empty canvas area)
            const clickedOnEmpty = e.target === e.target.getStage() || e.target.getType() === 'Image';
            if (clickedOnEmpty && selectedContainerId) {
                onClearSelection();
            }
        }
    };

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev * 1.2, 3)); // Max 3x zoom
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev / 1.2, 0.1)); // Min 0.1x zoom
    };

    const handleResetZoom = () => {
        if (canvasImage && containerRef.current) {
            const containerWidth = Math.min(containerRef.current.clientWidth - 48, 1200);
            const containerHeight = Math.min(600, window.innerHeight * 0.6);
            const scaleX = containerWidth / canvasImage.width;
            const scaleY = containerHeight / canvasImage.height;
            const initialScale = Math.min(scaleX, scaleY, 0.8);
            setScale(initialScale);

            // Reset stage position to center
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

    return (
        <div ref={containerRef} className='bg-gray-950/50 border border-gray-800/50 rounded-2xl p-6 backdrop-blur-sm'>
            <div className='mb-4 flex items-center justify-between'>
                <div>
                    <h3 className='text-lg font-semibold text-white mb-2'>
                        {mode === 'edit' ? 'Edit Containers' : 'Translate Mode'}
                    </h3>
                    {mode === 'edit' && isAddingContainer && (
                        <p className='text-sm text-blue-400'>
                            Click on the screenshot to place a new container
                        </p>
                    )}
                    {mode === 'translate' && selectedKey && (
                        <p className='text-sm text-blue-400'>
                            Select a container to assign the key "{selectedKey.key}"
                        </p>
                    )}
                </div>

                {/* Zoom Controls */}
                <div className='flex items-center space-x-2'>
                    <Button
                        onClick={handleZoomOut}
                        variant='outline'
                        size='sm'
                        className='border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white'>
                        <ZoomOut className='h-4 w-4' />
                    </Button>
                    <span className='text-sm text-gray-400 min-w-12 text-center'>{Math.round(scale * 100)}%</span>
                    <Button
                        onClick={handleZoomIn}
                        variant='outline'
                        size='sm'
                        className='border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white'>
                        <ZoomIn className='h-4 w-4' />
                    </Button>
                    <Button
                        onClick={handleResetZoom}
                        variant='outline'
                        size='sm'
                        className='border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white'>
                        <RotateCcw className='h-4 w-4' />
                    </Button>
                </div>
            </div>

            <div className='border border-gray-700/50 rounded-xl overflow-hidden bg-gray-900'>
                <Stage
                    ref={stageRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    scaleX={scale}
                    scaleY={scale}
                    draggable={!(mode === 'edit' && isAddingContainer)}
                    onClick={handleCanvasClick}
                    onWheel={handleWheel}
                    style={{ cursor: (mode === 'edit' && isAddingContainer) ? 'crosshair' : 'grab' }}>
                    <Layer>
                        <KonvaImage image={canvasImage} width={canvasImage.width} height={canvasImage.height} />
                        {containers.map(container => {
                            // Get mappings for this container if in translate mode
                            const containerMappings = mode === 'translate' 
                                ? keyMappings.filter(m => m.containerId === container._id)
                                : [];
                            
                            return (
                                <KonvaContainer
                                    key={container._id}
                                    container={container}
                                    isSelected={selectedContainerId === container._id}
                                    onSelect={() => onContainerSelect?.(container._id)}
                                    onUpdate={position => onContainerUpdate?.(container._id, position)}
                                    onDelete={() => onContainerDelete?.(container._id)}
                                    stageRef={stageRef}
                                    mode={mode}
                                    mappings={containerMappings}
                                />
                            );
                        })}
                    </Layer>
                </Stage>
            </div>

            <div className='mt-2 text-xs text-gray-500 text-center'>
                {mode === 'edit' 
                    ? 'Use mouse wheel to zoom • Drag to pan • Click and drag containers to reposition'
                    : 'Use mouse wheel to zoom • Drag to pan • Click containers to select and assign keys'
                }
            </div>
        </div>
    );
}
