import { MarkerPoint } from "@/types/map";
import React from "react";
import { Dimensions } from "react-native";
import { MarkerUsers } from "./Marker";

type PixelCoord = { x: number; y: number };

type Props = {
    points: MarkerPoint[];
    pixelMap: Record<string, PixelCoord>;
    isInteracting: React.RefObject<boolean>;
    onMarkerPress: (point: MarkerPoint) => void;
    onPositionChange?: (id: string, pos: PixelCoord | null) => void;
};

// ─── Safe-zone chống bị SearchBar / TabBar che icon ─────────────────────────
// SearchBar: style top:50, height:48  → chiếm y ∈ [50, 98]
// TabBar (_layout.tsx): style bottom:24, height:64 → chiếm
//   y ∈ [screenHeight-88, screenHeight-24]
// Cộng thêm khoảng đệm (MARGIN) để icon không dính sát mép 2 thanh đó.
const SEARCH_BAR_TOP = 50;
const SEARCH_BAR_HEIGHT = 168;
const TAB_BAR_BOTTOM = 24;
const TAB_BAR_HEIGHT = 84;

// Khoảng đệm an toàn thêm ngoài 2 thanh, và cũng chừa chỗ cho nửa icon
// (icon marker vẽ theo tâm, nên cần trừ thêm để phần thân icon không đè lên bar).
const SAFE_MARGIN = 24;
const HORIZONTAL_MARGIN = 24;

function getSafeZone() {
    const { height: screenHeight, width: screenWidth } = Dimensions.get("window");

    const minY = SEARCH_BAR_TOP + SEARCH_BAR_HEIGHT + SAFE_MARGIN;
    const maxY =
        screenHeight - TAB_BAR_BOTTOM - TAB_BAR_HEIGHT - SAFE_MARGIN;

    const minX = HORIZONTAL_MARGIN;
    const maxX = screenWidth - HORIZONTAL_MARGIN;

    return { minX, maxX, minY, maxY };
}

function clamp(value: number, min: number, max: number) {
    // Nếu safe zone bị đảo (màn hình quá nhỏ), giữ nguyên giá trị gốc thay vì crash UI
    if (min >= max) return value;
    return Math.min(Math.max(value, min), max);
}

export default function MarkersOverlay({
    points,
    pixelMap,
    isInteracting,
    onMarkerPress,
    onPositionChange,
}: Props) {
    const { minX, maxX, minY, maxY } = getSafeZone();

    return (
        <>
            {points.map((item) => {
                const pixel = pixelMap[item.id] ?? null;

                const clampedPixel = pixel
                    ? {
                        x: clamp(pixel.x, minX, maxX),
                        y: clamp(pixel.y, minY, maxY),
                    }
                    : null;

                return (
                    <MarkerUsers
                        key={item.id}
                        locationPoint={item}
                        pixelX={clampedPixel?.x ?? null}
                        pixelY={clampedPixel?.y ?? null}
                        isInteracting={isInteracting}
                        onPress={() => onMarkerPress(item)}
                        onPositionChange={onPositionChange}
                    />
                );
            })}
        </>
    );
}