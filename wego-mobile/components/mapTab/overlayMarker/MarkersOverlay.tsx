import { MarkerPoint } from "@/types/map";
import React from "react";
import { MarkerUsers } from "./Marker";

type Props = {
    points: MarkerPoint[];
    origin: any;
    mapRef: React.RefObject<any>;
    isInteracting: React.RefObject<boolean>;
};

export default function MarkersOverlay({ points, mapRef, isInteracting, origin }: Props) {
    //console.log('MarkersOverlay points:', points);
    return (
        <>
            {points.map((item) => (
                <MarkerUsers key={item.id} locationPoint={item} mapRef={mapRef} isInteracting={isInteracting}/>
            ))}
        </>
    );
}