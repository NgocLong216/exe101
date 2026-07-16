import { DirectionResult, DirectionStep, buildMapHtml, fetchDirectionWithSteps } from '@/apis/goongAPI';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

// ─── Maneuver helpers ─────────────────────────────────────────────────────────

function getManeuverIcon(maneuver: string): string {
    const m = (maneuver ?? '').toLowerCase();
    if (m.includes('right')) return 'arrow-forward';
    if (m.includes('left')) return 'arrow-back';
    if (m.includes('uturn')) return 'return-up-back';
    if (m.includes('roundabout') || m.includes('rotary')) return 'refresh';
    if (m.includes('merge') || m.includes('ramp')) return 'git-merge';
    if (m.includes('arrive') || m.includes('destination')) return 'flag';
    return 'arrow-up';
}

function getManeuverLabel(maneuver: string): string {
    const m = (maneuver ?? '').toLowerCase();
    if (m.includes('turn-right') || m.includes('turn right')) return 'Rẽ phải';
    if (m.includes('turn-left') || m.includes('turn left')) return 'Rẽ trái';
    if (m.includes('slight-right') || m.includes('slight right')) return 'Rẽ nhẹ phải';
    if (m.includes('slight-left') || m.includes('slight left')) return 'Rẽ nhẹ trái';
    if (m.includes('uturn')) return 'Quay đầu';
    if (m.includes('roundabout') || m.includes('rotary')) return 'Vòng xuyến';
    if (m.includes('arrive') || m.includes('destination')) return 'Đến nơi';
    if (m.includes('merge')) return 'Nhập làn';
    return 'Đi thẳng';
}

function formatDistance(metres: number): string {
    if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km`;
    return `${Math.round(metres)} m`;
}

function formatDuration(seconds: number): string {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} phút`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h} giờ${m > 0 ? ` ${m} phút` : ''}`;
}

function getETA(durationSeconds: number): string {
    const now = new Date();
    now.setSeconds(now.getSeconds() + durationSeconds);
    const h = now.getHours().toString().padStart(2, '0');
    const min = now.getMinutes().toString().padStart(2, '0');
    return `${h}:${min}`;
}

function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // metres
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NavigationScreen() {
    const router = useRouter();
    const { lat, lng, placeName } = useLocalSearchParams<{
        lat: string;
        lng: string;
        placeName: string;
    }>();

    const webRef = useRef<WebView>(null);
    const locationSubRef = useRef<Location.LocationSubscription | null>(null);
    const prevCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
    const lastHeadingRef = useRef<number>(0);

    const [direction, setDirection] = useState<DirectionResult | null>(null);
    const [currentStepIdx, setCurrentStepIdx] = useState(0);
    const [liveProgress, setLiveProgress] = useState({
        stepDistance: 0,
        remainingDistance: 0,
        remainingDuration: 0,
    });
    const [loading, setLoading] = useState(true);
    const [html, setHtml] = useState<string>('');

    const destLat = parseFloat(lat ?? '0');
    const destLng = parseFloat(lng ?? '0');

    // ─── Get user location & load direction ──────────────────────────────────
    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') { setLoading(false); return; }

                const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                if (!mounted) return;

                const uLat = pos.coords.latitude;
                const uLng = pos.coords.longitude;

                setHtml(buildMapHtml(uLat, uLng, true));

                const result = await fetchDirectionWithSteps(
                    { latitude: uLat, longitude: uLng },
                    { latitude: destLat, longitude: destLng }
                );
                if (!mounted) return;

                setDirection(result);
                if (result) {
                    setLiveProgress({
                        stepDistance: result.steps[0]?.distance ?? 0,
                        remainingDistance: result.totalDistance,
                        remainingDuration: result.totalDuration,
                    });
                }
            } catch (e) {
                console.log('NavigationScreen init error:', e);
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => { mounted = false; };
    }, [destLat, destLng]);

    // ─── Draw route on map after direction loaded ─────────────────────────────
    useEffect(() => {
        if (!direction || !webRef.current) return;
        const coords = direction.polyline.map(c => [c.longitude, c.latitude]);
        if (coords.length === 0) return;

        const script = `
            (function() {
                function drawRoute() {
                    if (!window.map || !map.isStyleLoaded()) {
                        setTimeout(drawRoute, 300);
                        return;
                    }
                    if (map.getSource('nav-route')) {
                        map.removeLayer('nav-route');
                        map.removeSource('nav-route');
                    }
                    map.addSource('nav-route', {
                        type: 'geojson',
                        data: {
                            type: 'Feature',
                            geometry: {
                                type: 'LineString',
                                coordinates: ${JSON.stringify(coords)}
                            }
                        }
                    });
                    map.addLayer({
                        id: 'nav-route',
                        type: 'line',
                        source: 'nav-route',
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: { 'line-color': '#2563EB', 'line-width': 6 }
                    });
                    new goongjs.Marker({ color: '#EF4444' })
                        .setLngLat([${destLng}, ${destLat}])
                        .addTo(map);
                    const first = ${JSON.stringify(coords[0])};
                    const last = ${JSON.stringify(coords[coords.length - 1])};
                    const bounds = new goongjs.LngLatBounds(first, first);
                    ${JSON.stringify(coords)}.forEach(c => bounds.extend(c));
                    map.fitBounds(bounds, { padding: 70, duration: 900 });
                }
                drawRoute();
            })();
            true;
        `;
        setTimeout(() => webRef.current?.injectJavaScript(script), 1600);
    }, [destLat, destLng, direction]);

    // ─── Track position & advance steps ──────────────────────────────────────
    useEffect(() => {
        if (!direction) return;

        Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 },
            (pos) => {
                const { latitude, longitude } = pos.coords;

                let heading = (typeof pos.coords.heading === 'number' && pos.coords.heading >= 0)
                    ? pos.coords.heading
                    : -1;

                const prev = prevCoordsRef.current;
                if (prev) {
                    const dist = getDistance(prev.latitude, prev.longitude, latitude, longitude);
                    if (dist > 2.5) {
                        const calculatedBearing = getBearing(prev.latitude, prev.longitude, latitude, longitude);
                        heading = calculatedBearing;
                        lastHeadingRef.current = calculatedBearing;
                        prevCoordsRef.current = { latitude, longitude };
                    } else {
                        heading = lastHeadingRef.current;
                    }
                } else {
                    prevCoordsRef.current = { latitude, longitude };
                    if (heading === -1) {
                        heading = 0;
                    } else {
                        lastHeadingRef.current = heading;
                    }
                }

                webRef.current?.injectJavaScript(`
                    (function() {
                        if (!window._userMarker) {
                            var el = document.createElement('div');
                            el.style.width = '32px';
                            el.style.height = '32px';
                            
                            var inner = document.createElement('div');
                            inner.id = 'user-arrow-inner';
                            inner.style.width = '100%';
                            inner.style.height = '100%';
                            inner.style.transition = 'transform 0.3s ease-out';
                            inner.innerHTML = \`<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2.5px 3px rgba(0,0,0,0.35));">
                                <path d="M16 3L27 25L16 20L5 25L16 3Z" fill="#1AF364" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
                            </svg>\`;
                            el.appendChild(inner);
                            
                            window._userMarkerElement = inner;
                            window._userMarker = new goongjs.Marker(el)
                                .setLngLat([${longitude}, ${latitude}])
                                .addTo(map);
                        } else {
                            window._userMarker.setLngLat([${longitude}, ${latitude}]);
                        }
                        if (window._userMarkerElement) {
                            window._userMarkerElement.style.transform = 'rotate(${heading}deg)';
                        }
                    })();
                    map.easeTo({ center: [${longitude}, ${latitude}], zoom: 16, duration: 500 });
                    true;
                `);

                setCurrentStepIdx(previousIndex => {
                    if (!direction.steps[previousIndex]) return previousIndex;

                    let activeIndex = previousIndex;
                    let distanceToStepEnd = getDistance(
                        latitude,
                        longitude,
                        direction.steps[activeIndex].endLocation.lat,
                        direction.steps[activeIndex].endLocation.lng
                    );

                    // A GPS update can skip over a short maneuver, so consume every
                    // nearby step instead of advancing only one step per update.
                    while (distanceToStepEnd < 35 && activeIndex < direction.steps.length - 1) {
                        activeIndex += 1;
                        distanceToStepEnd = getDistance(
                            latitude,
                            longitude,
                            direction.steps[activeIndex].endLocation.lat,
                            direction.steps[activeIndex].endLocation.lng
                        );
                    }

                    const activeStep = direction.steps[activeIndex];
                    const stepDistance = Math.min(distanceToStepEnd, activeStep.distance);
                    const laterSteps = direction.steps.slice(activeIndex + 1);
                    const laterDistance = laterSteps.reduce((sum, step) => sum + step.distance, 0);
                    const laterDuration = laterSteps.reduce((sum, step) => sum + step.duration, 0);
                    const activeDuration = activeStep.distance > 0
                        ? activeStep.duration * (stepDistance / activeStep.distance)
                        : 0;

                    setLiveProgress({
                        stepDistance,
                        remainingDistance: stepDistance + laterDistance,
                        remainingDuration: activeDuration + laterDuration,
                    });

                    return activeIndex;
                });
            }
        ).then(sub => { locationSubRef.current = sub; });

        return () => { locationSubRef.current?.remove(); };
    }, [direction]);

    const currentStep: DirectionStep | undefined = direction?.steps[currentStepIdx];
    const nextStep: DirectionStep | undefined = direction?.steps[currentStepIdx + 1];

    const remainingDistance = liveProgress.remainingDistance;
    const remainingDuration = liveProgress.remainingDuration;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#17F367" translucent />

            {/* ── Top Header ────────────────────────────────────────────────── */}
            <View style={styles.header}>
                {loading ? (
                    <ActivityIndicator color="#0F172A" size="large" style={{ marginTop: 12 }} />
                ) : (
                    <>
                        <View style={styles.headerTop}>
                            <View style={styles.maneuverIconBox}>
                                <Ionicons
                                    name={getManeuverIcon(currentStep?.maneuver ?? 'straight') as any}
                                    size={34}
                                    color="#0F172A"
                                />
                            </View>
                            <View style={styles.headerTextBox}>
                                <Text style={styles.maneuverLabel} numberOfLines={1}>
                                    {getManeuverLabel(currentStep?.maneuver ?? 'straight')}
                                </Text>
                                <Text style={styles.roadName} numberOfLines={2}>
                                    {currentStep?.instruction || placeName || 'Đang điều hướng...'}
                                </Text>
                            </View>
                            <View style={styles.stepDistBadge}>
                                <Text style={styles.stepDistText}>
                                    {formatDistance(liveProgress.stepDistance)}
                                </Text>
                            </View>
                        </View>

                        {nextStep && (
                            <View style={styles.nextStepRow}>
                                <Ionicons name="return-down-forward-outline" size={15} color="rgba(15,23,42,0.6)" />
                                <Text style={styles.nextStepText} numberOfLines={1}>
                                    {'  '}Sau đó: {getManeuverLabel(nextStep.maneuver)} • {formatDistance(nextStep.distance)}
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* ── Map ───────────────────────────────────────────────────────── */}
            <View style={styles.mapContainer}>
                {html ? (
                    <WebView
                        ref={webRef}
                        source={{ html }}
                        originWhitelist={['*']}
                        javaScriptEnabled
                        domStorageEnabled
                        style={StyleSheet.absoluteFill}
                    />
                ) : (
                    <View style={styles.mapPlaceholder}>
                        <ActivityIndicator size="large" color="#2563EB" />
                    </View>
                )}

                {/* Cancel button */}
                <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={() => {
                        locationSubRef.current?.remove();
                        router.back();
                    }}
                >
                    <Ionicons name="close" size={22} color="#1E293B" />
                </TouchableOpacity>
            </View>

            {/* ── Bottom Panel ───────────────────────────────────────────────── */}
            <View style={styles.bottomPanel}>
                {loading ? (
                    <ActivityIndicator color="#2563EB" style={{ marginBottom: 8 }} />
                ) : (
                    <View style={styles.statsRow}>
                        {/* Duration */}
                        <View style={styles.statBlock}>
                            <Text style={styles.statValue}>{formatDuration(remainingDuration)}</Text>
                            <Text style={styles.statLabel}>Thời gian</Text>
                        </View>
                        <View style={styles.divider} />
                        {/* Distance */}
                        <View style={styles.statBlock}>
                            <Text style={styles.statValue}>{formatDistance(remainingDistance)}</Text>
                            <Text style={styles.statLabel}>Khoảng cách</Text>
                        </View>
                        <View style={styles.divider} />
                        {/* ETA */}
                        <View style={styles.statBlock}>
                            <Text style={styles.statValue}>{getETA(remainingDuration)}</Text>
                            <Text style={styles.statLabel}>Đến nơi lúc</Text>
                        </View>
                    </View>
                )}
                <Text style={styles.destName} numberOfLines={1}>{placeName ?? 'Điểm đến'}</Text>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const HEADER_PADDING_TOP = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 10 : 56;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#17F367' },

    // Header
    header: {
        backgroundColor: '#17F367',
        paddingTop: HEADER_PADDING_TOP,
        paddingBottom: 14,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 8,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    maneuverIconBox: {
        width: 54,
        height: 54,
        borderRadius: 14,
        backgroundColor: 'rgba(15,23,42,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    headerTextBox: { flex: 1 },
    maneuverLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(15,23,42,0.6)',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 2,
    },
    roadName: {
        fontSize: 19,
        fontWeight: '800',
        color: '#0F172A',
        lineHeight: 23,
    },
    stepDistBadge: {
        backgroundColor: 'rgba(15,23,42,0.1)',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginLeft: 10,
        minWidth: 58,
        alignItems: 'center',
    },
    stepDistText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
    },
    nextStepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        backgroundColor: 'rgba(15,23,42,0.08)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    nextStepText: {
        fontSize: 13,
        color: 'rgba(15,23,42,0.8)',
        fontWeight: '500',
        flex: 1,
    },

    // Map
    mapContainer: { flex: 1, position: 'relative' },
    mapPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E2E8F0',
    },
    closeBtn: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 6,
        zIndex: 50,
    },

    // Bottom panel
    bottomPanel: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24,
        paddingTop: 18,
        paddingBottom: Platform.OS === 'ios' ? 38 : 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 12,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statBlock: { flex: 1, alignItems: 'center' },
    statValue: {
        fontSize: 21,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    divider: {
        width: 1,
        height: 38,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 6,
    },
    destName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        textAlign: 'center',
    },
});
