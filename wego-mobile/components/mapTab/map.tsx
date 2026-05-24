import { useAuth } from "@/auth0/AuthContext";
import { LocationResult } from "@/types/location";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import SearchBar from './SearchBar';
import PlaceBottomSheet, { PlaceBottomSheetRef, PlaceDetail } from "./bottomSheet";
import MarkersOverlay from "./overlayMarker/MarkersOverlay";

export type LatLng = {
    latitude: number;
    longitude: number;
};

type userTeam = [LocationResult]

const user1 = {
    latitude: 10.841183,
    longitude: 106.839336
}

const user2 = {
    latitude: 10.952678,
    longitude: 106.845175
}

const GOONG_API_KEY = process.env.EXPO_PUBLIC_GOONG_API_KEY as string;

export default function GoongMap(origin: LocationResult) {
    const {user} = useAuth();
    const isInteracting = useRef(false);
    const mapRef = useRef<MapView>(null);
    const overlayFix = useRef({
        width: 0,
        height: 0,
        zoom: 0, // BASE_ZOOM
    });
    const bottomSheetRef = useRef<PlaceBottomSheetRef>(null);
    const [route, setRoute] = useState<LatLng[][]>([]);
    const [loading, setLoading] = useState(false);
    const [destination, setDestination] = useState<LocationResult | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<PlaceDetail | null>(null);

    const pointsData = [
        { id: 'user', x: origin.latitude, y: origin.longitude, user: { picture: user?.picture || '' } },
        { id: '1', x: 10.841183, y: 106.839336, user: { picture: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcScN9DwfF0MYAvM-5Ur6pruhmYkjrPx2l34ug&s' } },
        { id: '2', x: 10.952678, y: 106.845175, user: { picture: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSPcVVAM2_HjuMafXvPevwU8jkYeJUQu89F6A&s' } },
    ]
    const userTeam1 = [origin, user1, user2]

    // const updatePoint = async () => {
    //     if (!mapRef.current) return;

    //     const p = await mapRef.current.pointForCoordinate(origin);
    //     setPoint(p);
    // };

    // function useRerenderLoop(callback: () => void, enabled = true) {
    //     const rafId = useRef<number | null>(null);

    //     useEffect(() => {
    //         if (!enabled) return;

    //         const loop = () => {
    //             callback();
    //             rafId.current = requestAnimationFrame(loop);
    //         };

    //         rafId.current = requestAnimationFrame(loop);

    //         return () => {
    //             if (rafId.current) cancelAnimationFrame(rafId.current);
    //         };
    //     }, [enabled, callback]);
    // }

    // useRerenderLoop(() => {
    //     updatePoint(); // pointForCoordinate
    // });
    
    //console.log('User:', user.picture);


    const handleSearch = (location: LocationResult) => {
        setDestination(location);

        mapRef.current?.animateToRegion(
            {
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
            },
            800
        );
    };

    useEffect(() => {
        setRoute([])
        fetchRoute();
        console.log('Destination changed:', destination);
    }, [destination, selectedPlace]);

    const fetchRoute = async () => {
        if (!destination) return;

        try {
            setLoading(true);

            const routesResult: LatLng[][] = [];

            for (const user of userTeam1) {
                console.log('Fetching route for user at:', user.latitude, user.longitude);
                const url = `https://rsapi.goong.io/Direction?origin=${user.latitude},${user.longitude}&destination=${destination.latitude},${destination.longitude}&vehicle=bike&api_key=${GOONG_API_KEY}`;

                const res = await fetch(url);
                const data = await res.json();

                if (!data.routes?.length) continue;

                const points = data.routes[0].overview_polyline.points;
                const coords = decodePolyline(points);

                routesResult.push(coords);
            }

            setRoute(prev => [...prev, ...routesResult]);

            // focus theo route cuối
            const lastRoute = routesResult[routesResult.length - 1];
            if (lastRoute) {
                requestAnimationFrame(() => {
                    mapRef.current?.fitToCoordinates(lastRoute, {
                        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
                        animated: true
                    });
                });
            }
        } catch (err) {
            console.error("Route error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPlace = async (place: LatLng) => {
        const url = `https://rsapi.goong.io/Geocode?latlng=${place.latitude},${place.longitude}&api_key=${GOONG_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        const placeResult = data.results?.[0];
        const placeDetail = {
            place_id: placeResult.place_id,
            name: placeResult.address_components[0].long_name,
            formatted_address: placeResult.formatted_address,
            geometry: {
                location: {
                    lat: placeResult.geometry.location.lat,
                    lng: placeResult.geometry.location.lng
                }
            }
        }
        //console.log(placeResult);
        bottomSheetRef.current?.open(placeDetail)
        setSelectedPlace(placeDetail);
    };

    const fetchPlaceIdFromLatLng = async (lat: number, lng: number) => {
        const url = `https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${GOONG_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        const placeResult = data.results?.[0];
        //console.log(place);
        bottomSheetRef.current?.open(placeResult)
    };

    const colors = ["red", "blue", "green", "purple"];
    return (
        <View style={styles.container}>
            <MapView
                zoomEnabled
                scrollEnabled
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                initialRegion={{
                    latitude: origin.latitude,
                    longitude: origin.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01
                }}
                onPress={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    handleSelectPlace({ latitude, longitude })
                }}
                onRegionChange={(region) => {
                    isInteracting.current = true;
                }}
                onRegionChangeComplete={() => {
                    isInteracting.current = false;
                }}
            >
                {selectedPlace && selectedPlace.geometry?.location.lat !== undefined && selectedPlace.geometry?.location.lng !== undefined && (
                    <Marker coordinate={{ latitude: selectedPlace.geometry.location.lat, longitude: selectedPlace.geometry.location.lng }} title="selectedPlace" />
                )}

                {destination != null && (
                    <Marker coordinate={destination} title="End" />
                )}

                {route.map((r, i) => (
                    <Polyline
                        key={i}
                        strokeWidth={4}
                        coordinates={r}
                        strokeColor={colors[i % colors.length]}
                    />
                ))}
            </MapView>

            <MarkersOverlay points={pointsData} mapRef={mapRef} isInteracting={isInteracting} origin={origin}/>

            {loading && (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" />
                </View>
            )}
            <SearchBar onSelectLocation={handleSearch} />
            <PlaceBottomSheet ref={bottomSheetRef} />
            {/* <FocusBtn route={route} mapRef={mapRef} /> */}
        </View>
    );
}

/* ===================== */
/* Polyline decode util */
/* ===================== */
function decodePolyline(encoded: string): LatLng[] {
    let points: LatLng[] = [];
    let index = 0,
        lat = 0,
        lng = 0;

    while (index < encoded.length) {
        let b,
            shift = 0,
            result = 0;

        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlat = result & 1 ? ~(result >> 1) : result >> 1;
        lat += dlat;

        shift = 0;
        result = 0;

        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);

        const dlng = result & 1 ? ~(result >> 1) : result >> 1;
        lng += dlng;

        points.push({
            latitude: lat / 1e5,
            longitude: lng / 1e5
        });
    }

    return points;
}

const styles = StyleSheet.create({
    markerContainer: {
        position: 'absolute',
        alignItems: 'center',
    }, // --

    avatarWrapper: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#fff',
        padding: 3,
        elevation: 4,          // Android shadow
        shadowColor: '#000',   // iOS shadow
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
    }, //--

    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 999,
    }, //--

    pin: {
        width: 10,
        height: 10,
        backgroundColor: '#2563EB',
        borderRadius: 5,
        marginTop: -2,
    }, //--
    container: {
        flex: 1
    },
    loading: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center"
    }
});

