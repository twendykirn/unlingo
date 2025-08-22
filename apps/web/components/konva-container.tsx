import { Doc } from '@/convex/_generated/dataModel';
import { useEffect, useRef } from 'react';
import { Rect, Transformer } from 'react-konva';

interface KonvaContainerProps {
    container: Doc<'screenshotContainers'>;
    isSelected: boolean;
    onSelect: () => void;
    onUpdate: (position: Doc<'screenshotContainers'>['position']) => void;
    stageRef: React.RefObject<any>;
    mode: 'edit' | 'translate';
}

const KonvaContainer = ({ container, isSelected, onSelect, onUpdate, stageRef, mode }: KonvaContainerProps) => {
    const rectRef = useRef<any>(null);
    const transformerRef = useRef<any>(null);

    useEffect(() => {
        if (isSelected && rectRef.current && transformerRef.current) {
            transformerRef.current.nodes([rectRef.current]);
            transformerRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    const handleTransform = () => {
        if (!rectRef.current || !stageRef.current) return;

        const rectNode = rectRef.current;
        const stage = stageRef.current;
        const layer = stage.findOne('Layer');
        const image = layer.findOne('Image');

        if (!image) return;

        const imageWidth = image.width();
        const imageHeight = image.height();

        const newWidth = rectNode.width() * rectNode.scaleX();
        const newHeight = rectNode.height() * rectNode.scaleY();

        rectNode.size({ width: newWidth, height: newHeight });
        rectNode.scaleX(1);
        rectNode.scaleY(1);

        const x = (rectNode.x() / imageWidth) * 100;
        const y = (rectNode.y() / imageHeight) * 100;
        const width = (newWidth / imageWidth) * 100;
        const height = (newHeight / imageHeight) * 100;

        onUpdate({ x, y, width, height });
    };

    if (!stageRef.current) return null;

    const stage = stageRef.current;
    const layer = stage.findOne('Layer');
    const image = layer?.findOne('Image');

    if (!image) return null;

    const imageWidth = image.width();
    const imageHeight = image.height();

    const backgroundColor = container.backgroundColor || '#3b82f6';
    const fillColor =
        mode === 'edit'
            ? isSelected
                ? `${backgroundColor}50`
                : `${backgroundColor}30`
            : isSelected
              ? `${backgroundColor}80`
              : `${backgroundColor}60`;

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
                draggable={isSelected && mode === 'edit'}
                onClick={onSelect}
                onDragEnd={mode === 'edit' ? handleTransform : undefined}
                onTransformEnd={mode === 'edit' ? handleTransform : undefined}
            />
            {container.description ? (
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
            ) : null}
            {isSelected && mode === 'edit' ? (
                <Transformer
                    ref={transformerRef}
                    rotateEnabled={false}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 50 || newBox.height < 30) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                />
            ) : null}
        </>
    );
};

export default KonvaContainer;
