import { useAuth } from "@/auth0/AuthContext";
import { MarkerPoint } from "@/types/map";
import { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    Pressable,
    StyleSheet,
    View,
} from "react-native";

type Props = {
    locationPoint: MarkerPoint;
    mapRef: React.RefObject<any>;
    isInteracting: React.RefObject<boolean>;
};

const PIN_HEIGHT = 10;
const EDGE_PADDING = 16;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
    Dimensions.get("window");

const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);

export function MarkerUsers({
    locationPoint,
    mapRef,
    isInteracting,
}: Props) {
    const { user } = useAuth();
    if (!user) return null;

    const animatedPoint = useRef(
        new Animated.ValueXY({
            x: locationPoint.x,
            y: locationPoint.y,
        })
    ).current;

    const overlayFix = useRef({ width: 0, height: 0 });

    const ready =
        overlayFix.current.width > 0 &&
        overlayFix.current.height > 0;

    const animateTo = (x: number, y: number) => {
        animatedPoint.stopAnimation();
        Animated.timing(animatedPoint, {
            toValue: { x, y },
            duration: 120,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
        }).start();
    };

    const focusToUser = () => {
        if (!mapRef.current) return;

        mapRef.current.animateCamera(
            {
                center: {
                    latitude: locationPoint.x,
                    longitude: locationPoint.y,
                },
                zoom: 17,
                pitch: 0,
                heading: 0,
            },
            { duration: 600 }
        );
    };

    useEffect(() => {
        let rafId: number;

        const loop = async () => {
            if (isInteracting.current && mapRef.current && ready) {
                const p = await mapRef.current.pointForCoordinate({
                    latitude: locationPoint.x,
                    longitude: locationPoint.y,
                });

                const halfW = overlayFix.current.width / 2;
                const halfH = overlayFix.current.height / 2;

                const minX = EDGE_PADDING + halfW;
                const maxX = SCREEN_WIDTH - EDGE_PADDING - halfW;

                const minY = EDGE_PADDING + halfH;
                const maxY = SCREEN_HEIGHT - EDGE_PADDING - halfH;

                animateTo(
                    clamp(p.x, minX, maxX),
                    clamp(p.y, minY, maxY)
                );
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafId);
    }, [ready]);

    return (
        <Animated.View
            onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                overlayFix.current.width = width;
                overlayFix.current.height = height;
            }}
            style={[
                styles.markerContainer,
                {
                    opacity: ready ? 1 : 0,
                    transform: animatedPoint.getTranslateTransform(),
                },
            ]}
        >
            <View
                style={{
                    transform: [
                        { translateX: -overlayFix.current.width / 2 },
                        { translateY: -overlayFix.current.height + PIN_HEIGHT / 2 },
                    ],
                }}
            >
                <Pressable onPress={focusToUser}>
                    <View style={styles.pinWrapper}>
                        <View style={styles.pinBody}>
                            <Image
                                source={{ uri: locationPoint.user.picture }}
                                style={styles.avatar}
                            />
                        </View>

                        <View style={styles.pinTip} />
                    </View>
                </Pressable>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    markerContainer: {
        position: "absolute",
        alignItems: "center",
    },

    pinWrapper: {
        alignItems: "center",
    },

    // Phần giọt nước
    pinBody: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: "#fff",
        padding: 3,

        elevation: 5, // Android
        shadowColor: "#000", // iOS
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },

    avatar: {
        width: "100%",
        height: "100%",
        borderRadius: 999,
    },

    // Mũi nhọn
    pinTip: {
        width: 14,
        height: 14,
        backgroundColor: "#fff",
        transform: [{ rotate: "45deg" }],
        marginTop: -6,

        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
});

