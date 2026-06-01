import { useAuth } from "@/auth0/AuthContext";
import { LocationResult } from "@/types/location";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import SearchBar from "./SearchBar";
import PlaceBottomSheet, {
  PlaceBottomSheetRef,
  PlaceDetail,
} from "./bottomSheet";
import MarkersOverlay from "./overlayMarker/MarkersOverlay";

export type LatLng = {
  latitude: number;
  longitude: number;
};

// Member type passed in from HomeScreen via Firebase
export type Member = {
  firebaseUid: string;
  name: string;
  lat: number;
  lng: number;
  updatedAt: number;
  picture?: string;
};

const GOONG_API_KEY = process.env.EXPO_PUBLIC_GOONG_API_KEY as string;
const GOONG_API_KEY_2 = process.env.EXPO_PUBLIC_GOONG_API_KEY_2 as string;

type Props = {
  latitude: number;
  longitude: number;
  members: Member[]; // 👈 receive from HomeScreen
};

export default function GoongWebMap({ latitude, longitude, members }: Props) {
  const { user } = useAuth();
  const isInteracting = useRef(false);
  const webRef = useRef<WebView>(null);
  const bottomSheetRef = useRef<PlaceBottomSheetRef>(null);

  const [route, setRoute] = useState<LatLng[][]>([]);
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState<LocationResult | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetail | null>(null);

  // Build points for MarkersOverlay from Firebase members + self
  const pointsData = [
    {
      id: "me",
      x: latitude,
      y: longitude,
      user: { picture: user?.picture || "" },
    },
    ...members.map((m) => ({
      id: m.firebaseUid,
      x: m.lat,
      y: m.lng,
      user: { picture: m.picture || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png" },
    })),
  ];

  // SEARCH
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

  // ROUTE — re-fetch whenever destination changes
  useEffect(() => {
    setRoute([]);
    fetchRoute();
  }, [destination]);

  const fetchRoute = async () => {
    if (!destination) return;
    try {
      setLoading(true);
      const routesResult: LatLng[][] = [];

      const origins = [
        { latitude, longitude },
        ...members.map((m) => ({ latitude: m.lat, longitude: m.lng })),
      ];

      for (const origin of origins) {
        const url =
          `https://rsapi.goong.io/Direction?origin=${origin.latitude},${origin.longitude}` +
          `&destination=${destination.latitude},${destination.longitude}` +
          `&vehicle=bike&api_key=${GOONG_API_KEY_2}`;

        const res = await fetch(url);
        const data = await res.json();
        if (!data.routes?.length) continue;

        const points = data.routes[0].overview_polyline.points;
        const coords = decodePolyline(points);
        routesResult.push(coords);

        const routeId = `route_${Math.random()}`;
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
            paint: { "line-color": "red", "line-width": 4 }
          });
          true;
        `);
      }

      setRoute(routesResult);
    } catch (err) {
      console.log("Route error:", err);
    } finally {
      setLoading(false);
    }
  };

  // MAP TAP → reverse geocode → open bottom sheet
  const handleSelectPlace = async (place: LatLng) => {
    try {
      const url = `https://rsapi.goong.io/Geocode?latlng=${place.latitude},${place.longitude}&api_key=${GOONG_API_KEY_2}`;
      const res = await fetch(url);
      const data = await res.json();
      const placeResult = data.results?.[0];
      if (!placeResult) return;

      const placeDetail: PlaceDetail = {
        place_id: placeResult.place_id,
        name: placeResult.name,
        formatted_address: placeResult.formatted_address,
        address: placeResult.address,
        address_components: placeResult.address_components,
        compound: placeResult.compound,
        plus_code: placeResult.plus_code,
        types: placeResult.types,
        geometry: placeResult.geometry
          ? {
              location: {
                lat: placeResult.geometry.location.lat,
                lng: placeResult.geometry.location.lng,
              },
              boundary: placeResult.geometry.boundary ?? null,
            }
          : undefined,
      };

      bottomSheetRef.current?.open(placeDetail);
      setSelectedPlace(placeDetail);

      // Set as destination to draw polylines
      setDestination({
        latitude: place.latitude,
        longitude: place.longitude,
      } as LocationResult);
    } catch (err) {
      console.log("Select place error:", err);
    }
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js/dist/goong-js.css" rel="stylesheet" />
  <style>
    html, body { margin: 0; padding: 0; overflow: hidden; }
    #map { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js/dist/goong-js.js"></script>
  <script>
    goongjs.accessToken = "${GOONG_API_KEY}";
    window.map = new goongjs.Map({
      container: "map",
      style: "https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_API_KEY}",
      center: [${longitude}, ${latitude}],
      zoom: 15
    });

    new goongjs.Marker({ color: "#2563EB" })
      .setLngLat([${longitude}, ${latitude}])
      .addTo(map);

    map.on("click", (e) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "MAP_CLICK",
        latitude: e.lngLat.lat,
        longitude: e.lngLat.lng
      }));
    });
  </script>
</body>
</html>
`;

  return (
    <View style={styles.container}>
      {/* MAP */}
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
              handleSelectPlace({ latitude: data.latitude, longitude: data.longitude });
            }

            // Forward to MarkersOverlay
            (MarkersOverlay as any)._onMessage?.(data);
          } catch (err) {
            console.log(err);
          }
        }}
      />

      {/* OVERLAY MARKERS */}
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

      <PlaceBottomSheet ref={bottomSheetRef} />
    </View>
  );
}

// ... keep your existing decodePolyline and styles

/* ===================== */
/* POLYLINE DECODE */
/* ===================== */

function decodePolyline(
  encoded: string
): LatLng[] {

  let points: LatLng[] = [];

  let index = 0;

  let lat = 0;

  let lng = 0;

  while (index < encoded.length) {

    let b;

    let shift = 0;

    let result = 0;

    do {

      b =
        encoded.charCodeAt(
          index++
        ) - 63;

      result |=
        (b & 0x1f)
        << shift;

      shift += 5;

    } while (b >= 0x20);

    const dlat =
      result & 1
        ? ~(result >> 1)
        : result >> 1;

    lat += dlat;

    shift = 0;

    result = 0;

    do {

      b =
        encoded.charCodeAt(
          index++
        ) - 63;

      result |=
        (b & 0x1f)
        << shift;

      shift += 5;

    } while (b >= 0x20);

    const dlng =
      result & 1
        ? ~(result >> 1)
        : result >> 1;

    lng += dlng;

    points.push({
      latitude:
        lat / 1e5,

      longitude:
        lng / 1e5,
    });
  }

  return points;
}

const styles = StyleSheet.create({

  markerContainer: {
    position: "absolute",

    alignItems: "center",
  },

  avatarWrapper: {

    width: 52,

    height: 52,

    borderRadius: 26,

    backgroundColor: "#fff",

    padding: 3,

    elevation: 4,

    shadowColor: "#000",

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.25,

    shadowRadius: 3,
  },

  avatar: {

    width: "100%",

    height: "100%",

    borderRadius: 999,
  },

  pin: {

    width: 10,

    height: 10,

    backgroundColor:
      "#2563EB",

    borderRadius: 5,

    marginTop: -2,
  },

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