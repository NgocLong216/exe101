import { useAuth } from "@/auth0/AuthContext";
import { LocationResult } from "@/types/location";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { getAuth } from "firebase/auth";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
import SearchBar from "./SearchBar";
import { useTabBarVisibility } from "@/contexts/TabBarVisibility";

const ROUTE_COLORS = ["#2563EB", "#EF4444", "#22C55E", "#F59E0B", "#A855F7", "#EC4899"];
const ROUTE_REFRESH_INTERVAL_MS = 15_000;
const EMPTY_ROUTE_COLLECTION = {
  type: "FeatureCollection",
  features: [],
};

type MemberMarkerData = {
  id: string;
  latitude: number;
  longitude: number;
  picture: string;
};

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

const buildMemberMarkerScript = (points: MemberMarkerData[]) => `
  (function() {
    if (!window.map || !window.goongjs) return;

    var points = ${JSON.stringify(points)};
    var markers = window.memberMarkers || (window.memberMarkers = Object.create(null));
    var nextIds = Object.create(null);
    var fallbackPicture = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

    points.forEach(function(point) {
      if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return;

      nextIds[point.id] = true;
      var entry = markers[point.id];

      if (!entry) {
        var element = document.createElement("button");
        element.type = "button";
        element.className = "wego-member-marker";
        element.setAttribute("aria-label", "Center map on member");

        var avatar = document.createElement("img");
        avatar.className = "wego-member-marker__avatar";
        avatar.alt = "";

        var tip = document.createElement("span");
        tip.className = "wego-member-marker__tip";

        element.appendChild(avatar);
        element.appendChild(tip);

        entry = { point: point, avatar: avatar, picture: null, marker: null };
        element.addEventListener("click", function(event) {
          event.preventDefault();
          event.stopPropagation();
          var current = entry.point;
          window.map.flyTo({
            center: [current.longitude, current.latitude],
            zoom: 17,
            pitch: 0,
            bearing: 0,
            duration: 600
          });
        });

        entry.marker = new window.goongjs.Marker({ element: element, anchor: "bottom" })
          .setLngLat([point.longitude, point.latitude])
          .addTo(window.map);
        markers[point.id] = entry;
      }

      entry.point = point;
      entry.marker.setLngLat([point.longitude, point.latitude]);
      if (entry.picture !== point.picture) {
        entry.avatar.src = point.picture || fallbackPicture;
        entry.picture = point.picture;
      }
    });

    Object.keys(markers).forEach(function(id) {
      if (nextIds[id]) return;
      markers[id].marker.remove();
      delete markers[id];
    });
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
  const routeRequestRef = useRef(0);
  const lastRouteFetchAtRef = useRef(0);
  const lastRouteDestinationRef = useRef<string | null>(null);
  const latestLocationRef = useRef({ latitude, longitude });
  latestLocationRef.current = { latitude, longitude };
  const { hide: hideTabBar, show: showTabBar } = useTabBarVisibility();

  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState<LocationResult | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

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

  const memberMarkerData = useMemo<MemberMarkerData[]>(
    () => [
      {
        id: "me",
        latitude,
        longitude,
        picture: user?.picture || "",
      },
      ...members.map((member) => ({
        id: member.firebaseUid,
        latitude: member.lat,
        longitude: member.lng,
        picture: member.picture || "",
      })),
    ],
    [latitude, longitude, members, user?.picture]
  );

  useEffect(() => {
    if (!isMapReady) return;
    const timeout = setTimeout(() => {
      webRef.current?.injectJavaScript(
        buildMemberMarkerScript(memberMarkerData)
      );
    }, 100);

    return () => clearTimeout(timeout);
  }, [isMapReady, memberMarkerData]);

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

  return (

    <View style={styles.container}>

      <WebView
        ref={webRef}
        source={webViewSource}
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
            if (data.type === "MAP_CLICK") {

              if (isDirectionMode || isBottomSheetOpen) {
                return;
              }

              handleSelectPlace({
                latitude: data.latitude,
                longitude: data.longitude
              });
            }
          } catch (err) {
            console.log(err);
          }
        }}
      />

      {isDirectionMode && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            clearDestinationAndRoute();
            router.back();
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
        <SearchBar onSelectLocation={handleSearch} />
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
          setIsBottomSheetOpen(false);
          clearDestinationAndRoute();

          if (shouldReturnToPlaceDetail) {
            router.back();
          }
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
