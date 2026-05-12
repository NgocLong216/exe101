import { Locate } from "lucide-react-native";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import MapView from "react-native-maps";
import type { LatLng } from "./map";

type Props = {
    route: LatLng[];
    mapRef: React.RefObject<MapView | null>;
};

export default function FocusBtn({ route, mapRef }: Props) {
    const recenter = () => {
        if (!mapRef.current || route.length === 0) return;

        mapRef.current.fitToCoordinates(route, {
            edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
            animated: true
        });
    };

    return (
        <TouchableOpacity style={styles.btn} onPress={recenter} disabled>
            <Locate />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        position: "absolute",
        bottom: 24,
        left: 16,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        elevation: 5
    }
});
