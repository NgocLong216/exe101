import { MarkerPoint } from "@/types/map";
import React, { useCallback, useRef, useState } from "react";
import { WebView } from "react-native-webview";
import { MarkerUsers } from "./Marker";

type PixelCoord = { x: number; y: number };

type Props = {
    points: MarkerPoint[];
    origin: any;
    mapRef: React.RefObject<WebView | null>;
    isInteracting: React.RefObject<boolean>;
};

// JS injected into the WebView on every map move — asks Goong map to
// project each lat/lng to screen pixel and post it back as MARKER_PIXELS
const buildPixelScript = (points: MarkerPoint[]) => `
(function() {
  var pts = ${JSON.stringify(
    points.map((p) => ({ id: p.id, lat: p.x, lng: p.y }))
  )};

  var results = pts.map(function(p) {
    var pixel = map.project([p.lng, p.lat]);
    return { id: p.id, x: pixel.x, y: pixel.y };
  });

  window.ReactNativeWebView.postMessage(
    JSON.stringify({ type: "MARKER_PIXELS", pixels: results })
  );
})();
true;
`;

export default function MarkersOverlay({
    points,
    mapRef,
    isInteracting,
}: Props) {
    // id → latest pixel position received from the WebView
    const [pixelMap, setPixelMap] = useState<Record<string, PixelCoord>>({});

    // Called by GoongWebMap's onMessage — forward WebView messages here
    const handleWebViewMessage = useCallback(
        (data: any) => {
            if (data.type !== "MARKER_PIXELS") return;

            setPixelMap((prev) => {
                const next = { ...prev };
                for (const item of data.pixels as Array<{
                    id: string;
                    x: number;
                    y: number;
                }>) {
                    next[item.id] = { x: item.x, y: item.y };
                }
                return next;
            });
        },
        []
    );

    // Expose handler so GoongWebMap can call it from its onMessage
    // We attach it to the ref so no prop drilling needed
    (MarkersOverlay as any)._onMessage = handleWebViewMessage;

    // Poll pixel positions via rAF loop by injecting JS into the WebView
    const rafRef = useRef<ReturnType<typeof setInterval> | null>(null);

    React.useEffect(() => {
        // Use setInterval at ~30fps instead of rAF (rAF is inside WebView)
        rafRef.current = setInterval(() => {
            if (mapRef.current) {
                mapRef.current.injectJavaScript(buildPixelScript(points));
            }
        }, 33);

        return () => {
            if (rafRef.current) clearInterval(rafRef.current);
        };
    }, [points]);

    const handleFocusUser = (point: MarkerPoint) => {
        if (!mapRef.current) return;

        mapRef.current.injectJavaScript(`
            map.flyTo({
                center: [${"{"}point.y${"}"},  ${"{"}point.x${"}"}],
                zoom: 17,
                pitch: 0,
                bearing: 0,
                duration: 600
            });
            true;
        `.replace(/\$\{point\.y\}/g, String(point.y))
          .replace(/\$\{point\.x\}/g, String(point.x)));
    };

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
                        onPress={() => handleFocusUser(item)}
                    />
                );
            })}
        </>
    );
}