import { useAuth } from "@/auth0/AuthContext";
import { LocationResult } from "@/types/location";
import { MarkerPoint } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { getAuth } from "firebase/auth";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Image, Keyboard, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { WebView } from "react-native-webview";
import GroupChoose from "./GroupChoose";
import MarkersOverlay from "./overlayMarker/MarkersOverlay";

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
import SearchBar, { SearchBarRef } from "./SearchBar";
import { useTabBarVisibility } from "@/contexts/TabBarVisibility";

const ICON_VISUAL_OFFSET = 0;
const ROUTE_COLORS = ["#2563EB", "#EF4444", "#22C55E", "#F59E0B", "#A855F7", "#EC4899"];
const ROUTE_REFRESH_INTERVAL_MS = 15_000;
const EMPTY_ROUTE_COLLECTION = {
  type: "FeatureCollection",
  features: [],
};

// Bán kính (px) chấp nhận là "trúng icon" khi hit-test toạ độ click trên map
// so với vị trí pixel hiện tại của các marker người dùng.
const ICON_HIT_RADIUS = 36;

// Khoảng thời gian (ms) trì hoãn việc tắt cờ "đang focus search" sau khi
// TextInput blur — đủ để MAP_CLICK (nếu do cùng cú tap gây ra) kịp đọc
// được giá trị true trước khi cờ bị tắt.
const SEARCH_BLUR_GRACE_MS = 250;

type PixelCoord = { x: number; y: number };

type RouteFeature = {
  type: "Feature";
  properties: { color: string };
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
};

const haveSameVisibleMembers = (previous: Member[], next: Member[]) =>
  previous.length === next.length &&
  previous.every((member, index) => {
    const candidate = next[index];
    return (
      member.firebaseUid === candidate.firebaseUid &&
      member.lat === candidate.lat &&
      member.lng === candidate.lng &&
      member.picture === candidate.picture
    );
  });

const buildPixelScript = (points: MarkerPoint[]) => `
  (function() {
    if (!window.map) return;
    var pts = ${JSON.stringify(points.map((p) => ({ id: p.id, lat: p.x, lng: p.y })))};
    var results = pts.map(function(p) {
      var pixel = window.map.project([p.lng, p.lat]);
      return { id: p.id, x: pixel.x, y: pixel.y };
    });
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: "MARKER_PIXELS", pixels: results })
    );
  })();
  true;
`;

const buildRouteLayerScript = (features: RouteFeature[]) => `
  (function() {
    if (!window.map) return;

    var data = ${JSON.stringify({
  type: "FeatureCollection",
  features,
})};
    var source = window.map.getSource("wego-routes");

    if (source) {
      source.setData(data);
    } else {
      window.map.addSource("wego-routes", { type: "geojson", data: data });
    }

    if (!window.map.getLayer("wego-routes-line")) {
      window.map.addLayer({
        id: "wego-routes-line",
        type: "line",
        source: "wego-routes",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 4
        }
      });
    }
  })();
  true;
`;

type Props = {
  latitude: number;
  longitude: number;
};

export default function GoongWebMap({ latitude, longitude }: Props) {
  const { user } = useAuth();
  const currentUid = getAuth().currentUser?.uid;
  const webRef = useRef<WebView>(null);
  const bottomSheetRef = useRef<PlaceBottomSheetRef>(null);
  const searchBarRef = useRef<SearchBarRef>(null);
  const routeRequestRef = useRef(0);
  const lastRouteFetchAtRef = useRef(0);
  const lastRouteDestinationRef = useRef<string | null>(null);
  const latestLocationRef = useRef({ latitude, longitude });
  latestLocationRef.current = { latitude, longitude };
  const { hide: hideTabBar, show: showTabBar } = useTabBarVisibility();

  const isInteracting = useRef(false);

  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState<LocationResult | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // ─── Search focus state (drives keyboard-dismiss-on-map-tap fix) ───────────
  // isSearchFocusedRef is the source of truth read inside handleMapPress
  // (needs to be read synchronously, not delayed by a React re-render).
  // isSearchFocused (state) only exists to control SearchBar/other UI.
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const isSearchFocusedRef = useRef(false);
  const blurResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  //Clamp
  const displayedPixelsRef = useRef<Record<string, PixelCoord>>({});

  const handleMarkerPositionChange = (id: string, pos: PixelCoord | null) => {
    if (pos) {
      displayedPixelsRef.current[id] = pos;
    } else {
      delete displayedPixelsRef.current[id];
    }
  };

  // ─── Marker pixel positions (for member/self icons drawn as native overlay) ─
  const [markerPixels, setMarkerPixels] = useState<Record<string, PixelCoord>>({});
  const markerPixelsRef = useRef<Record<string, PixelCoord>>({});

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

    return found?.groupPhoto ?? null;

  }, [activeGroupId, groups]);

  const handleFocusPoint = (point: MarkerPoint) => {
    webRef.current?.injectJavaScript(`
    map.flyTo({
      center: [${point.y}, ${point.x}],
      zoom: 17,
      pitch: 0,
      bearing: 0,
      duration: 600
    });
    true;
  `);
  };

  // Load danh sách nhóm của user khi vào map
  useEffect(() => {
    async function loadGroups() {
      const userGroups = await getUserGroups();
      setGroups(userGroups);
      // Nếu params không truyền sang groupId nhưng user có group, tự chọn group đầu tiên làm mặc định
      setActiveGroupId((current) => current ?? userGroups[0]?.id);
    }
    loadGroups();
  }, []);

  // Keep the WebView document stable while live GPS props change.
  const initialHtmlRef = useRef<string | null>(null);
  if (initialHtmlRef.current === null) {
    initialHtmlRef.current = buildMapHtml(latitude, longitude, isDirectionMode);
  }
  const html = initialHtmlRef.current;
  const webViewSource = useMemo(() => ({ html }), [html]);

  // ─── Subscribe thay đổi dựa vào activeGroupId thay vì groupId từ Param ──────
  useEffect(() => {
    if (!activeGroupId) {
      setMembers([]);
      return;
    }
    setMembers([]);
    const unsub = subscribeGroupMembers(
      activeGroupId,
      (updated) => {
        const visibleMembers = updated.filter(
          (member) => member.firebaseUid !== currentUid
        );
        setMembers((previous) =>
          haveSameVisibleMembers(previous, visibleMembers)
            ? previous
            : visibleMembers
        );
      },
      (err) => console.log("LOAD MEMBERS ERROR", err)
    );

    // Cleanup: Khi switch sang group khác, hàm này tự động hủy lắng nghe group cũ
    return () => {
      unsub();
    };
  }, [activeGroupId, currentUid]);

  const latestMembersRef = useRef(members);
  latestMembersRef.current = members;

  const routeOriginsVersion = useMemo(
    () => [
      `me:${Math.round(latitude * 1000)},${Math.round(longitude * 1000)}`,
      ...members
        .map(
          (member) =>
            `${member.firebaseUid}:${Math.round(member.lat * 1000)},${Math.round(member.lng * 1000)}`
        )
        .sort(),
    ].join("|"),
    [latitude, longitude, members]
  );

  // Tất cả marker "người" (bản thân + thành viên khác) được vẽ bằng
  // native overlay (MarkersOverlay/MarkerUsers) thay vì vẽ trong DOM WebView,
  // để có animation mượt + có thể hit-test khi bấm.
  const overlayPoints = useMemo<MarkerPoint[]>(
    () => [
      {
        id: "me",
        x: latitude,
        y: longitude,
        user: { picture: user?.picture || "" },
      },
      ...members.map((member) => ({
        id: member.firebaseUid,
        x: member.lat,
        y: member.lng,
        user: { picture: member.picture || "" },
      })),
    ],
    [latitude, longitude, members, user?.picture]
  );

  // Poll toạ độ pixel của các marker người mỗi 200ms khi map đã sẵn sàng.
  useEffect(() => {
    if (!isMapReady) return;

    const interval = setInterval(() => {
      webRef.current?.injectJavaScript(buildPixelScript(overlayPoints));
    }, 200);

    return () => clearInterval(interval);
  }, [isMapReady, overlayPoints]);

  // ─── Tab bar visibility follows destination state ───────────────────────────
  // Bottom sheet opens whenever destination is set (search, map tap, or
  // auto-load from /PlaceDetail params), and clearDestinationAndRoute() is the
  // single place that nulls it back out. Driving visibility off this one state
  // means every "sheet open" path is covered without duplicating hide()/show()
  // calls at each call site.
  useEffect(() => {
    if (destination) {
      hideTabBar();
    } else {
      showTabBar();
    }
  }, [destination, hideTabBar, showTabBar]);

  useEffect(() => {
    if (!isBottomSheetOpen) return;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      bottomSheetRef.current?.close();
      return true;
    });

    return () => subscription.remove();
  }, [isBottomSheetOpen]);

  useEffect(() => {
    if (!isMapReady) return;
    webRef.current?.injectJavaScript(`
      window.locationSelectionLocked = ${isBottomSheetOpen};
      window.mapReadOnly = ${isDirectionMode};
      true;
    `);
  }, [isBottomSheetOpen, isDirectionMode, isMapReady]);

  // Dọn timeout khi unmount, tránh set state sau khi component đã gỡ.
  useEffect(() => {
    return () => {
      if (blurResetTimeoutRef.current) {
        clearTimeout(blurResetTimeoutRef.current);
      }
    };
  }, []);

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

        setDestination({ latitude: selectedLat, longitude: selectedLng } as LocationResult);
        bottomSheetRef.current?.open(detail);

      } catch (e) {
        console.log("AUTO LOAD PLACE ERROR", e);
      }
    })();
  }, [placeId, placeName, lat, lng, prevRoute]);

  useEffect(() => {
    if (!isMapReady || !destination) return;

    const zoom = isDirectionMode ? 16 : 15;
    webRef.current?.injectJavaScript(`
      map.stop();
      map.easeTo({
        center: [${destination.longitude}, ${destination.latitude}],
        zoom: ${zoom},
        duration: 300
      });
      if (!window.destinationMarker) {
        window.destinationMarker = new goongjs.Marker({ color: "red", anchor: "bottom" })
          .setLngLat([${destination.longitude}, ${destination.latitude}])
          .addTo(map);
      } else {
        window.destinationMarker.setLngLat([${destination.longitude}, ${destination.latitude}]);
      }
      true;
    `);
  }, [destination, isDirectionMode, isMapReady]);

  // Route geometry refreshes immediately for a destination, then at most every
  // 15 seconds after an origin moves into a new ~100 m coordinate bucket.
  useEffect(() => {
    const requestId = ++routeRequestRef.current;
    const controller = new AbortController();

    if (!destination || !isMapReady) {
      if (!destination) {
        lastRouteDestinationRef.current = null;
      }
      setLoading(false);
      return () => {
        if (routeRequestRef.current === requestId) {
          routeRequestRef.current += 1;
        }
        controller.abort();
      };
    }

    setLoading(false);
    const destinationKey = `${destination.latitude},${destination.longitude}`;
    const destinationChanged =
      destinationKey !== lastRouteDestinationRef.current;
    lastRouteDestinationRef.current = destinationKey;

    if (destinationChanged) {
      lastRouteFetchAtRef.current = 0;
      webRef.current?.injectJavaScript(buildRouteLayerScript([]));
    }

    const timeUntilRefresh = Math.max(
      0,
      ROUTE_REFRESH_INTERVAL_MS - (Date.now() - lastRouteFetchAtRef.current)
    );
    const refreshDelay = destinationChanged
      ? 250
      : Math.max(250, timeUntilRefresh);

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const currentLocation = latestLocationRef.current;
        const origins = [
          currentLocation,
          ...latestMembersRef.current.map((member) => ({
            latitude: member.lat,
            longitude: member.lng,
          })),
        ].filter(
          (origin) =>
            Number.isFinite(origin.latitude) &&
            Number.isFinite(origin.longitude)
        );

        const fetchedRoutes = await Promise.all(
          origins.map(async (origin) => {
            try {
              return await fetchDirection(origin, {
                latitude: destination.latitude,
                longitude: destination.longitude,
              }, controller.signal);
            } catch (error) {
              if (error instanceof Error && error.name === "AbortError") {
                throw error;
              }
              console.log("Route origin error:", error);
              return [];
            }
          })
        );

        if (requestId !== routeRequestRef.current) return;
        lastRouteFetchAtRef.current = Date.now();

        const features: RouteFeature[] = fetchedRoutes.flatMap((coordinates, index) =>
          coordinates.length
            ? [{
              type: "Feature" as const,
              properties: { color: ROUTE_COLORS[index % ROUTE_COLORS.length] },
              geometry: {
                type: "LineString" as const,
                coordinates: coordinates.map(
                  (coordinate) => [coordinate.longitude, coordinate.latitude] as [number, number]
                ),
              },
            }]
            : []
        );

        webRef.current?.injectJavaScript(buildRouteLayerScript(features));
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.log("Route error:", err);
      } finally {
        if (requestId === routeRequestRef.current) {
          setLoading(false);
        }
      }
    }, refreshDelay);

    return () => {
      if (routeRequestRef.current === requestId) {
        routeRequestRef.current += 1;
      }
      clearTimeout(timeout);
      controller.abort();
    };
  }, [destination, isMapReady, routeOriginsVersion]);

  const handleSearch = (location: LocationResult, place: PlaceDetail) => {
    const detail: PlaceDetail = {
      ...place,
      name: location.name || place.name,
      geometry: {
        location: {
          lat: location.latitude,
          lng: location.longitude,
        },
        boundary: place.geometry?.boundary ?? null,
      },
    };

    setDestination(location);
    bottomSheetRef.current?.open(detail);
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
      setDestination({ latitude: place.latitude, longitude: place.longitude } as LocationResult);
    } catch (err) {
      console.log("Select place error:", err);
    }
  };

  const clearDestinationAndRoute = () => {
    routeRequestRef.current += 1;
    setLoading(false);
    webRef.current?.injectJavaScript(`
      var routeSource = window.map && window.map.getSource("wego-routes");
      if (routeSource) {
        routeSource.setData(${JSON.stringify(EMPTY_ROUTE_COLLECTION)});
      }
      if (window.destinationMarker) {
        window.destinationMarker.remove();
        window.destinationMarker = null;
      }
      true;
    `);
    setDestination(null);
  };

  const returnToPlaceDetail = () => {
    setIsBottomSheetOpen(false);
    clearDestinationAndRoute();
    showTabBar();

    // The map stays mounted underneath PlaceDetail. Reset both the native
    // route params and the WebView flags so it is interactive when revisited.
    webRef.current?.injectJavaScript(`
      window.locationSelectionLocked = false;
      window.mapReadOnly = false;
      true;
    `);
    router.setParams({
      placeId: undefined,
      placeName: undefined,
      lat: undefined,
      lng: undefined,
      prevRoute: undefined,
    });

    router.push({
      pathname: "/PlaceDetail",
      params: {
        placeId,
        placeName,
        lat,
        lng,
        prevRoute: "/(tabs)/schedule",
        groupId: activeGroupId,
      },
    });
  };

    // Chỉ zoom — dùng nội bộ khi hit-test từ MAP_CLICK phát hiện trúng icon.
    const focusOnPoint = (point: MarkerPoint) => {
      webRef.current?.injectJavaScript(`
    map.flyTo({
      center: [${point.y}, ${point.x}],
      zoom: 17,
      pitch: 0,
      bearing: 0,
      duration: 600
    });
    true;
  `);
    };

    const handleSearchFocusChange = (focused: boolean) => {
      if (blurResetTimeoutRef.current) {
        clearTimeout(blurResetTimeoutRef.current);
        blurResetTimeoutRef.current = null;
      }

      if (focused) {
        isSearchFocusedRef.current = true;
        setIsSearchFocused(true);
        return;
      }

      // Blur xảy ra đồng bộ ngay khi user chạm ra ngoài, NHƯNG MAP_CLICK
      // tương ứng chỉ tới sau đó (qua WebView bridge). Trì hoãn việc tắt cờ
      // để handleMapPress còn kịp đọc được giá trị true của cùng cú tap đó.
      blurResetTimeoutRef.current = setTimeout(() => {
        isSearchFocusedRef.current = false;
        setIsSearchFocused(false);
      }, SEARCH_BLUR_GRACE_MS);
    };

    // ─── Hàm trung tâm xử lý MỌI lần bấm vào map ────────────────────────────────
    // 1) Hit-test toạ độ pixel của click so với vị trí hiện tại của các icon
    //    người dùng — nếu trúng, chỉ zoom tới người đó, KHÔNG chọn destination.
    // 2) Nếu không trúng icon nào và search đang mở bàn phím, chỉ tắt bàn phím,
    //    KHÔNG chọn destination ở lần bấm đó.
    // 3) Ngược lại, xử lý như một lần chọn destination bình thường.
    const handleMapPress = (pixelX: number, pixelY: number, lat: number, lng: number) => {
      for (const point of overlayPoints) {
        const pixel = displayedPixelsRef.current[point.id];
        if (!pixel) continue;

        const dx = pixel.x - pixelX;
        const dy = pixel.y - pixelY;
        if (Math.sqrt(dx * dx + dy * dy) <= ICON_HIT_RADIUS) {
          focusOnPoint(point);
          return;
        }
      }

      if (isSearchFocusedRef.current) {
        searchBarRef.current?.blur();
        Keyboard.dismiss();
        if (blurResetTimeoutRef.current) {
          clearTimeout(blurResetTimeoutRef.current);
          blurResetTimeoutRef.current = null;
        }
        isSearchFocusedRef.current = false;
        setIsSearchFocused(false);
        return;
      }

      if (isDirectionMode || isBottomSheetOpen) {
        return;
      }

      handleSelectPlace({ latitude: lat, longitude: lng });
    };

    return (

      <View style={styles.container}>

        <WebView
          ref={webRef}
          source={webViewSource}
          onTouchStart={Keyboard.dismiss}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          style={StyleSheet.absoluteFill}
          onLoadStart={() => {
            lastRouteDestinationRef.current = null;
            setIsMapReady(false);
          }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);

              if (data.type === "MAP_READY") {
                setIsMapReady(true);
                return;
              }

              if (data.type === "MARKER_PIXELS") {
                const next = { ...markerPixelsRef.current };
                for (const item of data.pixels as Array<{ id: string; x: number; y: number }>) {
                  next[item.id] = { x: item.x, y: item.y };
                }
                markerPixelsRef.current = next;
                setMarkerPixels(next);
                return;
              }

              if (data.type === "MAP_CLICK") {
                handleMapPress(data.pixelX, data.pixelY, data.latitude, data.longitude);
                return;
              }
            } catch (err) {
              console.log(err);
            }
          }}
        />

        <MarkersOverlay
          points={overlayPoints}
          pixelMap={markerPixels}
          isInteracting={isInteracting}
          onMarkerPress={handleFocusPoint}
          onPositionChange={handleMarkerPositionChange}
        />

        {isDirectionMode && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (isBottomSheetOpen) {
                bottomSheetRef.current?.close();
                return;
              }

              returnToPlaceDetail();
            }}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#000"
            />
          </TouchableOpacity>
        )}

        {loading && (
          <View pointerEvents="none" style={styles.loading}>
            <ActivityIndicator size="large" />
          </View>
        )}

        {/* UI Nút chuyển Group nổi trên map */}
        {!isDirectionMode && !isBottomSheetOpen && (
          <SearchBar
            ref={searchBarRef}
            onSelectLocation={handleSearch}
            onFocusChange={handleSearchFocusChange}
          />
        )}

        {!isDirectionMode && !isBottomSheetOpen && (
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

        {!isDirectionMode && activeGroupId && !isBottomSheetOpen && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open personal AI chat"
            style={styles.aiChatButton}
            onPress={() =>
              router.push({
                pathname: "/PersonalAiChat",
                params: { groupId: activeGroupId },
              })
            }
          >
            <Ionicons name="sparkles" size={24} color="#FFFFFF" />
          </TouchableOpacity>
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

        <PlaceBottomSheet
          ref={bottomSheetRef}
          onOpen={() => setIsBottomSheetOpen(true)}
          onClose={() => {
            const shouldReturnToPlaceDetail = isDirectionMode && isBottomSheetOpen;

            if (shouldReturnToPlaceDetail) {
              returnToPlaceDetail();
              return;
            }

            setIsBottomSheetOpen(false);
            clearDestinationAndRoute();
          }}
          isDirectionMode={isDirectionMode}
          lat={lat}
          lng={lng}
          placeName={placeName}
        />
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
    aiChatButton: {
      position: "absolute",
      left: 16,
      bottom: 112,
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: "#1AF364",
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 6,
      zIndex: 2000,
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
