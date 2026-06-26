import { useAuth } from "@/auth0/AuthContext";
import { LocationResult } from "@/types/location";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { getAuth } from "firebase/auth";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import GroupChoose from "./GroupChoose";

// Import API lấy danh sách nhóm của bạn
import { getUserGroups, GroupResponse } from "@/apis/groupAPI"; // Điều chỉnh đường dẫn cho đúng

import {
  buildMapHtml,
  fetchDirection,
  LatLng,
  Member,
  reverseGeocode,
  subscribeGroupMembers,
} from "@/apis/goongAPI";
import PlaceBottomSheet, {
  PlaceBottomSheetRef,
  PlaceDetail,
} from "./bottomSheet";
import MarkersOverlay from "./overlayMarker/MarkersOverlay";
import SearchBar from "./SearchBar";

const ROUTE_COLORS = ["#2563EB", "#EF4444", "#22C55E", "#F59E0B", "#A855F7", "#EC4899"];

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

  // ─── Group Switcher States ──────────────────────────────────────────────────
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [groupChooseVisible, setGroupChooseVisible] = useState(false);
  const { groupId: initialGroupId, placeId, placeName, lat, lng, prevRoute } = useLocalSearchParams<{
    placeId?: string;
    placeName?: string;
    lat?: string;
    lng?: string;
    prevRoute?: string;
    groupId?: string;
  }>();

  const isDirectionMode =
    prevRoute === "/PlaceDetail" &&
    !!lat &&
    !!lng;

  // Quản lý groupId chủ động bằng State để có thể switch ngay trên màn hình này
  const [activeGroupId, setActiveGroupId] = useState<string | undefined>(initialGroupId);

  // Lấy tên của group hiện tại để hiển thị lên nút bấm
  const currentGroupName = useMemo(() => {
    if (!activeGroupId) return "Chọn nhóm";
    const found = groups.find(g => g.id === activeGroupId);
    return found ? found.title : "Đang tải nhóm...";
  }, [activeGroupId, groups]);

  const currentGroupPhoto = useMemo(() => {
    if (!activeGroupId) return null;

    const found = groups.find(
      g => String(g.id) === String(activeGroupId)
    );

    console.log("Current Group:", found);

    return found?.groupPhoto ?? null;

  }, [activeGroupId, groups]);

  // Load danh sách nhóm của user khi vào map
  useEffect(() => {
    async function loadGroups() {
      const userGroups = await getUserGroups();
      setGroups(userGroups);
      // Nếu params không truyền sang groupId nhưng user có group, tự chọn group đầu tiên làm mặc định
      if (!activeGroupId && userGroups.length > 0) {
        setActiveGroupId(userGroups[0].id);
      }
    }
    loadGroups();
  }, []);

  // ─── KEY FIX: html is memoized with initial coords only ─────────────────────
  const html = useMemo(
    () => buildMapHtml(
      latitude,
      longitude,
      isDirectionMode
    ),
    []
  );

  // ─── Subscribe thay đổi dựa vào activeGroupId thay vì groupId từ Param ──────
  useEffect(() => {
    if (!activeGroupId) {
      setMembers([]);
      return;
    }
    const unsub = subscribeGroupMembers(
      activeGroupId,
      (updated) => {
        // Cập nhật vị trí các thành viên trong thời gian thực
        setMembers(updated);
      },
      (err) => console.log("LOAD MEMBERS ERROR", err)
    );

    // Cleanup: Khi switch sang group khác, hàm này tự động hủy lắng nghe group cũ
    return () => {
      unsub();
    };
  }, [activeGroupId]);

  // Hàm xử lý khi ấn vào nút đổi nhóm
  const handleSwitchGroup = () => {
    setGroupChooseVisible(true);
  };

  // ─── Auto-load place từ params ──────────────────────────────────────────────
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
    let isMounted = true;
    setRoute([]);

    const runFetch = async () => {
      if (!destination) return;
      try {
        setLoading(true);
        // Xóa layer cũ
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

          if (!isMounted) return; // Guard chống race-condition khi switch group giữa chừng
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

    runFetch();
    return () => { isMounted = false; };
  }, [destination, members]);

  const handleSearch = (location: LocationResult) => {
    setDestination(location);
    webRef.current?.injectJavaScript(`
      map.flyTo({ center: [${location.longitude}, ${location.latitude}], zoom: 15 });
      if (!window.destinationMarker) {
        window.destinationMarker = new goongjs.Marker({ color: "red" }).addTo(map);
      }
      window.destinationMarker.setLngLat([${location.longitude}, ${location.latitude}]);
      true;
    `);
  };

  const handleSelectPlace = async (place: LatLng) => {
    try {
      const detail = await reverseGeocode(place.latitude, place.longitude);
      if (!detail) return;
      const detailForBottomSheet = {
        ...detail,
        geometry: detail.geometry ? { ...detail.geometry, boundary: detail.geometry.boundary ?? null } : undefined,
      } as any;
      bottomSheetRef.current?.open(detailForBottomSheet);
      setSelectedPlace(detailForBottomSheet);
      setDestination({ latitude: place.latitude, longitude: place.longitude } as LocationResult);
    } catch (err) {
      console.log("Select place error:", err);
    }
  };

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

              if (isDirectionMode) {
                return;
              }

              handleSelectPlace({
                latitude: data.latitude,
                longitude: data.longitude
              });
            }
            (MarkersOverlay as any)._onMessage?.(data);
          } catch (err) {
            console.log(err);
          }
        }}
      />

      {isDirectionMode && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#000"
          />
        </TouchableOpacity>
      )}

      {/* Lớp hiển thị Marker các thành viên của Group đang Active */}
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

      {/* UI Nút chuyển Group nổi trên map */}
      {!isDirectionMode && (
        <SearchBar onSelectLocation={handleSearch} />
      )}

      {!isDirectionMode && (
        <View style={styles.topBarContainer}>

          <TouchableOpacity
            style={styles.groupSwitcherBtn}
            onPress={handleSwitchGroup}
          >

            <Image
              source={{
                uri:
                  currentGroupPhoto ||
                  `https://ui-avatars.com/api/?name=${currentGroupName}`,
              }}
              style={styles.groupSwitcherAvatar}
            />

            <View style={styles.avatarOverlay}>
              <Text style={styles.dropdownIcon}>▾</Text>
            </View>

          </TouchableOpacity>

        </View>
      )}

      {/* 4. Nhúng Component GroupChoose xuống cuối Render JSX */}
      <GroupChoose
        visible={groupChooseVisible}
        onClose={() => setGroupChooseVisible(false)}
        groups={groups}
        activeGroupId={activeGroupId}
        onSelectGroup={(groupId) => {
          clearDestinationAndRoute();
          setActiveGroupId(groupId);
        }}
      />

      {!isDirectionMode && (
        <PlaceBottomSheet
          ref={bottomSheetRef}
          onClose={clearDestinationAndRoute}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBarContainer: {
    position: "absolute",

    top: 120,

    right: 16,

    zIndex: 1000,
  },

  avatarOverlay: {
    position: "absolute",

    bottom: 0,

    width: "100%",

    height: "50%",

    backgroundColor: "rgba(0,0,0,0.35)",

    borderBottomLeftRadius: 32,

    borderBottomRightRadius: 32,

    justifyContent: "center",

    alignItems: "center",
  },

  dropdownIcon: {
    color: "#FFFFFF",

    fontSize: 18,

    fontWeight: "700",

    marginTop: 6,
  },

  groupSwitcherBtn: {
    width: 60,

    height: 60,

    borderRadius: 30,

    backgroundColor: "#fff",

    justifyContent: "center",

    alignItems: "center",

    shadowColor: "#000",

    shadowOpacity: 0.18,

    shadowRadius: 8,

    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 5,
  },

  groupSwitcherAvatar: {
    width: 52,

    height: 52,

    borderRadius: 26,

    backgroundColor: "#E2E8F0",
  },
  groupSwitcherText: {
    fontWeight: "600",
    color: "#1F2937",
    fontSize: 14,
  },
  loading: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.4)",
    zIndex: 10,
  },
  backBtn: {
    position: "absolute",

    top: 60,

    left: 16,

    width: 48,

    height: 48,

    borderRadius: 24,

    backgroundColor: "#FFFFFF",

    justifyContent: "center",

    alignItems: "center",

    shadowColor: "#000",

    shadowOpacity: 0.15,

    shadowRadius: 8,

    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 5,

    zIndex: 2000,
  },
});