import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { ChevronDown, MapPinPlus, Navigation } from "lucide-react-native";
import React, {
    forwardRef,
    useImperativeHandle,
    useMemo,
    useRef,
    useState
} from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type PlaceDetail = {
    place_id: string;
    reference?: string;
    name?: string;
    address?: string;
    formatted_address?: string;

    address_components?: {
        long_name: string;
        short_name: string;
    }[];

    compound?: {
        commune?: string;
        district?: string;
        province?: string;
    };

    geometry?: {
        location: {
            lat: number;
            lng: number;
        };
        boundary: null | unknown;
    };

    plus_code?: {
        compound_code: string;
        global_code: string;
    };

    types?: string[];
};

export type PlaceBottomSheetRef = {
    open: (place: PlaceDetail) => void;
    close: () => void;
};

type PlaceBottomSheetProps = {
    onOpen?: () => void;
    onClose?: () => void;
    isDirectionMode?: boolean;
    lat?: string | number;
    lng?: string | number;
    placeName?: string;
};

const PlaceBottomSheet = forwardRef<PlaceBottomSheetRef, PlaceBottomSheetProps>(({ onOpen, onClose, isDirectionMode, lat, lng, placeName }, ref) => {
    const bottomSheetRef = useRef<BottomSheet>(null);

    const snapPoints = useMemo(() => ["30%"], []);

    const [place, setPlace] = useState<PlaceDetail | null>(null);
    const [openRequested, setOpenRequested] = useState(false);
    const router = useRouter()

    const handleSetMeetingPoint = () => {
        if (!place) return;
        router.push({
            pathname: '/PlaceDetail',
            params: {
                placeId: place.place_id,
                placeName: place.address_components?.[0].long_name,
                lat: place.geometry?.location.lat,
                lng: place.geometry?.location.lng,
                prevRoute: '/(tabs)'
            },
        })
    }

    const handleStart = () => {
        const destLat = lat ?? place?.geometry?.location.lat;
        const destLng = lng ?? place?.geometry?.location.lng;
        const destName = placeName || place?.name || place?.formatted_address || 'Điểm đến';
        if (!destLat || !destLng) return;
        router.push({
            pathname: '/NavigationScreen',
            params: {
                lat: String(destLat),
                lng: String(destLng),
                placeName: destName,
            },
        });
    }

    const handleSheetClose = React.useCallback(() => {
        setPlace(null);
        setOpenRequested(false);
        onClose?.();
    }, [onClose]);

    useImperativeHandle(ref, () => ({
        open: (placeDetail: PlaceDetail) => {
            setPlace(placeDetail);
            setOpenRequested(true);
            onOpen?.();
        },
        close: () => {
            bottomSheetRef.current?.close();
        }
    }), [onOpen]);

    React.useEffect(() => {
        if (openRequested && place) {
            const timeout = setTimeout(() => {
                bottomSheetRef.current?.snapToIndex(0);
                setOpenRequested(false);
            }, 50);

            return () => clearTimeout(timeout);
        }
    }, [openRequested, place]);

    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose
            onChange={(idx) => {
                if (idx === -1) {
                    handleSheetClose();
                }
            }}
            // Custom thanh gạch ngang (handle) phía trên cho mỏng và tinh tế giống ảnh
            handleIndicatorStyle={styles.handleIndicator}
            backgroundStyle={styles.sheetBackground}
        >
            {place !== null && (
                <BottomSheetView style={styles.content}>
                    <>
                        {/* Phần thông tin phía trên (Group Name + Subtitle + Avatar Stack) */}
                        <View style={styles.topInfoRow}>
                            <View style={styles.textContainer}>
                                <TouchableOpacity style={styles.titleRow} activeOpacity={0.7}>
                                    <Text style={styles.groupName} numberOfLines={1}>
                                        {place?.name || "Beach Day Crew"}
                                    </Text>
                                    <ChevronDown size={20} color="#1E293B" style={styles.chevronIcon} />
                                </TouchableOpacity>

                                <Text style={styles.subTitle} numberOfLines={1}>
                                    {place?.formatted_address || "Heading to Santa Monica Pier"}
                                </Text>
                            </View>

                            {/* Cụm Avatar chồng lên nhau (Avatar Stack) */}
                            <View style={styles.avatarStack}>
                                <Image
                                    source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=80' }}
                                    style={[styles.avatar, { zIndex: 3 }]}
                                />
                                <Image
                                    source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=80' }}
                                    style={[styles.avatar, { zIndex: 2, marginLeft: -14 }]}
                                />
                                <View style={[styles.avatarCountBadge, { zIndex: 1, marginLeft: -14 }]}>
                                    <Text style={styles.badgeText}>+2</Text>
                                </View>
                            </View>
                        </View>

                        {/* Nút hành động: Start (direction mode) hoặc Set Meeting Point */}
                        {isDirectionMode ? (
                            <TouchableOpacity
                                style={styles.startButton}
                                activeOpacity={0.9}
                                onPress={handleStart}
                            >
                                <Navigation size={20} color="#FFFFFF" strokeWidth={2.5} style={[styles.buttonIcon, { transform: [{ rotate: '45deg' }] }]} />
                                <Text style={styles.actionButtonText}>Start</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.actionButton}
                                activeOpacity={0.9}
                                onPress={handleSetMeetingPoint}
                            >
                                <MapPinPlus size={20} color="#FFFFFF" strokeWidth={2.5} style={styles.buttonIcon} />
                                <Text style={styles.actionButtonText}>Set Meeting Point</Text>
                            </TouchableOpacity>
                        )}
                    </>
                </BottomSheetView>
            )}
        </BottomSheet>
    );
});

PlaceBottomSheet.displayName = "PlaceBottomSheet";

export default PlaceBottomSheet;

const styles = StyleSheet.create({
    handleIndicator: {
        backgroundColor: '#CBD5E1',
        width: 36,
        height: 4,
    },
    sheetBackground: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28, // Bo góc tròn sâu cực kỳ sang trọng giống bản thiết kế
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 48
    },
    // Top Row Layout
    topInfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 18,
    },
    textContainer: {
        flex: 1,
        marginRight: 10,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    groupName: {
        fontSize: 22,
        fontWeight: "700",
        color: "#0F172A",
        letterSpacing: -0.3,
    },
    chevronIcon: {
        marginLeft: 4,
        marginTop: 2,
    },
    subTitle: {
        fontSize: 14,
        color: "#94A3B8",
        fontWeight: "500",
    },
    // Avatar Stack Styles
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    avatarCountBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#17F367', // Màu nền xanh trùng màu nút
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    // Main Green Action Button
    actionButton: {
        backgroundColor: "#17F367", // Màu xanh Neon đặc trưng chuẩn ảnh
        height: 54,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: "center",
        justifyContent: "center",
        shadowColor: '#17F367',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    // Start Navigation Button (blue)
    startButton: {
        backgroundColor: "#17F367",
        height: 54,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: "center",
        justifyContent: "center",
        shadowColor: '#17F367',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonIcon: {
        marginRight: 8,
    },
    actionButtonText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 20,
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 14,
    }
});
