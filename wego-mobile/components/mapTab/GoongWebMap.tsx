import { useAuth } from "@/auth0/AuthContext";
import { LocationResult } from "@/types/location";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";

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

const user1 = {
  latitude: 10.841183,
  longitude: 106.839336,
};

const user2 = {
  latitude: 10.952678,
  longitude: 106.845175,
};

const GOONG_API_KEY =
  process.env.EXPO_PUBLIC_GOONG_API_KEY as string;

export default function GoongWebMap(
  origin: LocationResult
) {

  const { user } = useAuth();

  const isInteracting = useRef(false);

  const webRef = useRef<WebView>(null);

  const bottomSheetRef =
    useRef<PlaceBottomSheetRef>(null);

  const [route, setRoute] = useState<
    LatLng[][]
  >([]);

  const [loading, setLoading] =
    useState(false);

  const [destination, setDestination] =
    useState<LocationResult | null>(null);

  const [selectedPlace, setSelectedPlace] =
    useState<PlaceDetail | null>(null);

  // USER TEAM
  const userTeam1 = [
    origin,
    user1,
    user2,
  ];

  // OVERLAY
  const pointsData = [
    {
      id: "user",
      x: origin.latitude,
      y: origin.longitude,

      user: {
        picture:
          user?.picture || "",
      },
    },

    {
      id: "1",
      x: 10.841183,
      y: 106.839336,

      user: {
        picture:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcScN9DwfF0MYAvM-5Ur6pruhmYkjrPx2l34ug&s",
      },
    },

    {
      id: "2",
      x: 10.952678,
      y: 106.845175,

      user: {
        picture:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSPcVVAM2_HjuMafXvPevwU8jkYeJUQu89F6A&s",
      },
    },
  ];

  // SEARCH
  const handleSearch = (
    location: LocationResult
  ) => {

    setDestination(location);

    webRef.current?.injectJavaScript(`

      map.flyTo({
        center:[
          ${location.longitude},
          ${location.latitude}
        ],
        zoom:15
      });

      new goongjs.Marker({
        color:"red"
      })
      .setLngLat([
        ${location.longitude},
        ${location.latitude}
      ])
      .addTo(map);

      true;
    `);
  };

  // ROUTE
  useEffect(() => {

    setRoute([]);

    fetchRoute();

  }, [destination]);

  const fetchRoute = async () => {

    if (!destination) return;

    try {

      setLoading(true);

      const routesResult: LatLng[][] =
        [];

      for (const user of userTeam1) {

        const url =
          `https://rsapi.goong.io/Direction?origin=${user.latitude},${user.longitude}` +
          `&destination=${destination.latitude},${destination.longitude}` +
          `&vehicle=bike&api_key=${GOONG_API_KEY}`;

        const res = await fetch(url);

        const data = await res.json();

        if (!data.routes?.length)
          continue;

        const points =
          data.routes[0]
            .overview_polyline.points;

        const coords =
          decodePolyline(points);

        routesResult.push(coords);

        // DRAW ROUTE
        webRef.current?.injectJavaScript(`

          const routeCoords =
          ${JSON.stringify(
            coords.map((c) => [
              c.longitude,
              c.latitude,
            ])
          )};

          const routeId =
            "route_${Math.random()}";

          map.addSource(routeId,{
            type:"geojson",

            data:{
              type:"Feature",

              geometry:{
                type:"LineString",

                coordinates:
                  routeCoords
              }
            }
          });

          map.addLayer({
            id:routeId,

            type:"line",

            source:routeId,

            layout:{
              "line-join":"round",
              "line-cap":"round"
            },

            paint:{
              "line-color":"red",
              "line-width":4
            }
          });

          true;
        `);
      }

      setRoute(routesResult);

    } catch (err) {

      console.log(
        "Route error:",
        err
      );

    } finally {

      setLoading(false);
    }
  };

  // SELECT PLACE
  const handleSelectPlace = async (
    place: LatLng
  ) => {

    try {

      const url =
        `https://rsapi.goong.io/Geocode?latlng=${place.latitude},${place.longitude}` +
        `&api_key=${GOONG_API_KEY}`;

      const res = await fetch(url);

      const data = await res.json();

      const placeResult =
        data.results?.[0];

      if (!placeResult) return;

      const placeDetail = {
        place_id:
          placeResult.place_id,

        name:
          placeResult
            .address_components?.[0]
            ?.long_name,

        formatted_address:
          placeResult.formatted_address,

        geometry: {
          location: {
            lat:
              placeResult.geometry
                .location.lat,

            lng:
              placeResult.geometry
                .location.lng,
          },
        },
      };

      bottomSheetRef.current?.open(
        placeDetail
      );

      setSelectedPlace(placeDetail);

    } catch (err) {

      console.log(
        "Select place error:",
        err
      );
    }
  };

  // WEBVIEW HTML
  const html = `
<!DOCTYPE html>

<html>

<head>

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
/>

<link
href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js/dist/goong-js.css"
rel="stylesheet"
/>

<style>

html,
body {
  margin:0;
  padding:0;
  overflow:hidden;
}

#map {
  width:100vw;
  height:100vh;
}

</style>

</head>

<body>

<div id="map"></div>

<script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js/dist/goong-js.js"></script>

<script>

goongjs.accessToken =
"${GOONG_API_KEY}";

window.map =
new goongjs.Map({

  container:"map",

  style:
  "https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_API_KEY}",

  center:[
    ${origin.longitude},
    ${origin.latitude}
  ],

  zoom:15
});

// USER MARKER
new goongjs.Marker({
  color:"#2563EB"
})
.setLngLat([
  ${origin.longitude},
  ${origin.latitude}
])
.addTo(map);

// CLICK MAP
map.on("click",(e)=>{

  window.ReactNativeWebView.postMessage(
    JSON.stringify({

      type:"MAP_CLICK",

      latitude:e.lngLat.lat,

      longitude:e.lngLat.lng
    })
  );
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

            const data =
              JSON.parse(
                event.nativeEvent.data
              );

            if (
              data.type ===
              "MAP_CLICK"
            ) {

              handleSelectPlace({
                latitude:
                  data.latitude,

                longitude:
                  data.longitude,
              });
            }

          } catch (err) {

            console.log(err);
          }
        }}
      />

      {/* OVERLAY */}
      <MarkersOverlay
        points={pointsData}
        mapRef={webRef}
        isInteracting={
          isInteracting
        }
        origin={origin}
      />

      {/* LOADING */}
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
          />
        </View>
      )}

      {/* SEARCH */}
      <SearchBar
        onSelectLocation={
          handleSearch
        }
      />

      {/* BOTTOM SHEET */}
      <PlaceBottomSheet
        ref={bottomSheetRef}
      />

    </View>
  );
}

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