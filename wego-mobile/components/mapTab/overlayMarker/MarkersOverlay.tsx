import { MarkerPoint } from "@/types/map";
import React from "react";
import { MarkerUsers } from "./Marker";

type PixelCoord = { x: number; y: number };

type Props = {
    points: MarkerPoint[];
    pixelMap: Record<string, PixelCoord>;
    isInteracting: React.RefObject<boolean>;
    onMarkerPress: (point: MarkerPoint) => void;
    onPositionChange?: (id: string, pos: PixelCoord | null) => void;
};

export default function MarkersOverlay({
    points,
    pixelMap,
    isInteracting,
    onMarkerPress,
    onPositionChange,
}: Props) {
    return (
        <>
            {points.map((item) => {
                const pixel = pixelMap[item.id] ?? null;
                return (
                    <MarkerUsers
                        key={item.id}
                        locationPoint={item}
                        pixelX={pixel?.x ?? null}
                        pixelY={pixel?.y ?? null}
                        isInteracting={isInteracting}
                        onPress={() => onMarkerPress(item)}
                        onPositionChange={onPositionChange}
                    />
                );
            })}
        </>
    );
}