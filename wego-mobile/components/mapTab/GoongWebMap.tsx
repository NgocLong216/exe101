import { useAuth } from "@/auth0/AuthContext";
import { LocationResult } from "@/types/location";
import { useLocalSearchParams } from "expo-router";
import { getAuth } from "firebase/auth";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import SearchBar from "./SearchBar";
import PlaceBottomSheet, {
  PlaceBottomSheetRef,
  PlaceDetail,
} from "./bottomSheet";
import MarkersOverlay from "./overlayMarker/MarkersOverlay";
import {
  LatLng,
  Member,
  buildMapHtml,
  fetchDirection,
  reverseGeocode,
  subscribeGroupMembers,
} from "@/apis/goongAPI";

const ROUTE_COLORS = [
  "#2563EB",
  "#EF4444",
  "#22C55E",
  "#F59E0B",
  "#A855F7",
  "#EC4899",
];

type Props = {
  latitude: number;
  longitude: number;
};

export default function GoongWebMap({ latitude, longitude }: Props) {
  const { user } = useAuth();
  const isInteracting = useRef(false);
  const webRef = useRef<WebView>(null);
  const bottomSheetRef = useRef<PlaceBottomSheetRef>(null);

  const [route, setRoute] = useState<LatLng[][]>([]);
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState<LocationResult | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetail | null>(null);
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const { placeId, placeName, lat, lng, prevRoute } = useLocalSearchParams<{
    placeId?: string;
    placeName?: string;
    lat?: string;
    lng?: string;
    prevRoute?: string;
  }>();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();

  // ─── KEY FIX: html is memoized with initial coords only ─────────────────────
  // Changing `members`, `route`, `destination`, etc. no longer causes a reload.
  // Any map updates after init go through injectJavaScript.
  const html = useMemo(
    () => buildMapHtml(latitude, longitude),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // intentionally empty — we never want this to change after first render
  );

  // ─── Subscribe to group members ──────────────────────────────────────────────
  useEffect(() => {
    if (!groupId) {
      setMembers([]);
      return;
    }

    const unsub = subscribeGroupMembers(
      groupId,
      (updated) => setMembers(updated),
      (err) => console.log("LOAD MEMBERS ERROR", err)
    );

    return unsub;
  }, [groupId]);

  // ─── Auto-load place from navigation params ──────────────────────────────────
  useEffect(() => {
    if (prevRoute !== "/PlaceDetail" || !lat || !lng) return;

    const selectedLat = Number(lat);
    const selectedLng = Number(lng);

    (async () => {
      try {
        const place = await reverseGeocode(selectedLat, selectedLng);
        if (!place) return;

        const detail: PlaceDetail = {
          ...place,
          place_id: placeId || place.place_id,
          name: placeName || place.name,
          geometry: { location: { lat: selectedLat, lng: selectedLng }, boundary: undefined },
        };

        setSelectedPlace(detail);
        setDestination({ latitude: selectedLat, longitude: selectedLng } as LocationResult);
        bottomSheetRef.current?.open(detail);

        webRef.current?.injectJavaScript(`
          map.flyTo({ center: [${selectedLng}, ${selectedLat}], zoom: 16 });
          new goongjs.Marker({ color: "red" })
            .setLngLat([${selectedLng}, ${selectedLat}])
            .addTo(map);
          true;
        `);
      } catch (e) {
        console.log("AUTO LOAD PLACE ERROR", e);
      }
    })();
  }, [placeId, placeName, lat, lng, prevRoute]);

  // ─── Re-fetch routes whenever destination or members change ─────────────────
  useEffect(() => {
    setRoute([]);
    fetchRoutes();
  }, [destination, members]);

  const fetchRoutes = async () => {
    if (!destination) return;

    try {
      setLoading(true);

      // Remove old route layers from map
      routeIds.forEach((id) => {
        webRef.current?.injectJavaScript(`
          if (map.getLayer("${id}")) map.removeLayer("${id}");
          if (map.getSource("${id}")) map.removeSource("${id}");
          true;
        `);
      });

      const currentUid = getAuth().currentUser?.uid;
      const origins = [
        { latitude, longitude },
        ...members
          .filter((m) => m.firebaseUid !== currentUid)
          .map((m) => ({ latitude: m.lat, longitude: m.lng })),
      ];

      const newRouteIds: string[] = [];
      const routesResult: LatLng[][] = [];

      for (let i = 0; i < origins.length; i++) {
        const coords = await fetchDirection(origins[i], {
          latitude: destination.latitude,
          longitude: destination.longitude,
        });
        if (!coords.length) continue;

        routesResult.push(coords);

        const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
        const routeId = `route_${Math.random().toString(36).slice(2)}`;
        newRouteIds.push(routeId);

        webRef.current?.injectJavaScript(`
          map.addSource("${routeId}", {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: ${JSON.stringify(coords.map((c) => [c.longitude, c.latitude]))}
              }
            }
          });
          map.addLayer({
            id: "${routeId}",
            type: "line",
            source: "${routeId}",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "${color}", "line-width": 4 }
          });
          true;
        `);
      }

      setRoute(routesResult);
      setRouteIds(newRouteIds);
    } catch (err) {
      console.log("Route error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Search bar handler ──────────────────────────────────────────────────────
  const handleSearch = (location: LocationResult) => {
    setDestination(location);
    webRef.current?.injectJavaScript(`
      map.flyTo({ center: [${location.longitude}, ${location.latitude}], zoom: 15 });
      new goongjs.Marker({ color: "red" })
        .setLngLat([${location.longitude}, ${location.latitude}])
        .addTo(map);
      true;
    `);
  };

  // ─── Map tap handler ─────────────────────────────────────────────────────────
  const handleSelectPlace = async (place: LatLng) => {
    try {
      const detail = await reverseGeocode(place.latitude, place.longitude);
      if (!detail) return;

      // Ensure geometry.boundary exists to satisfy BottomSheet PlaceDetail type
      const detailForBottomSheet = {
        ...detail,
        geometry: detail.geometry
          ? { ...detail.geometry, boundary: detail.geometry.boundary ?? null }
          : undefined,
      } as any;
      bottomSheetRef.current?.open(detailForBottomSheet);
      setSelectedPlace(detailForBottomSheet);
      setDestination({ latitude: place.latitude, longitude: place.longitude } as LocationResult);
    } catch (err) {
      console.log("Select place error:", err);
    }
  };

  // ─── Clear destination & routes ──────────────────────────────────────────────
  const clearDestinationAndRoute = () => {
    routeIds.forEach((id) => {
      webRef.current?.injectJavaScript(`
        if (map.getLayer("${id}")) map.removeLayer("${id}");
        if (map.getSource("${id}")) map.removeSource("${id}");
        true;
      `);
    });
    setDestination(null);
    setRoute([]);
    setRouteIds([]);
    setSelectedPlace(null);
  };

  // ─── Overlay marker points ───────────────────────────────────────────────────
  const currentUid = getAuth().currentUser?.uid;
  const pointsData = useMemo(
    () => [
      {
        id: "me",
        x: latitude,
        y: longitude,
        user: { picture: user?.picture || "" },
      },
      ...members
        .filter((m) => m.firebaseUid !== currentUid)
        .map((m) => ({
          id: m.firebaseUid,
          x: m.lat,
          y: m.lng,
          user: { picture: m.picture || "" },
        })),
    ],
    [members, latitude, longitude, user?.picture]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        source={{ html }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        style={StyleSheet.absoluteFill}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "MAP_CLICK") {
              handleSelectPlace({
                latitude: data.latitude,
                longitude: data.longitude,
              });
            }
            (MarkersOverlay as any)._onMessage?.(data);
          } catch (err) {
            console.log(err);
          }
        }}
      />

      <MarkersOverlay
        points={pointsData}
        mapRef={webRef}
        isInteracting={isInteracting}
        origin={{ latitude, longitude }}
      />

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
        </View>
      )}

      <SearchBar onSelectLocation={handleSearch} />

      <PlaceBottomSheet
        ref={bottomSheetRef}
        onClose={clearDestinationAndRoute}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
});