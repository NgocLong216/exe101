import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import React, {
    forwardRef,
    useImperativeHandle,
    useMemo,
    useRef,
    useState
} from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

export type PlaceDetail = {
    place_id: string;
    name?: string;
    formatted_address?: string;
    geometry?: {
        location: {
            lat: number;
            lng: number;
        };
    };
};

export type PlaceBottomSheetRef = {
    open: (place: PlaceDetail) => void;
    close: () => void;
};

const PlaceBottomSheet = forwardRef<PlaceBottomSheetRef>((_, ref) => {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["25%", "50%"], []);

    const [place, setPlace] = useState<PlaceDetail | null>(null);

    useImperativeHandle(ref, () => ({
        open: (placeDetail: PlaceDetail) => {
            setPlace(placeDetail);
            bottomSheetRef.current?.expand();
        },
        close: () => {
            bottomSheetRef.current?.close();
        }
    }));

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose
        >
            <BottomSheetView style={styles.content}>
                {place ? (
                    <>
                        <Text style={styles.title}>
                            {place.name || "Không có tên"}
                        </Text>

                        <Text style={styles.address}>
                            {place.formatted_address}
                        </Text>

                        {place.geometry && (
                            <Text style={styles.coords}>
                                {place.geometry.location.lat},{" "}
                                {place.geometry.location.lng}
                            </Text>
                        )}

                        <TouchableOpacity style={styles.button}>
                            <Text style={styles.buttonText}>Chỉ đường</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <Text>Không có dữ liệu</Text>
                )}
            </BottomSheetView>
        </BottomSheet>
    );
});

export default PlaceBottomSheet;

const styles = StyleSheet.create({
    content: {
        flex: 1,
        padding: 16
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 8
    },
    address: {
        fontSize: 14,
        color: "#555",
        marginBottom: 8
    },
    coords: {
        fontSize: 12,
        color: "#888",
        marginBottom: 16
    },
    button: {
        backgroundColor: "#000",
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center"
    },
    buttonText: {
        color: "#fff",
        fontWeight: "600"
    }
});
