import { getAuth } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";

const GOONG_API_KEY = process.env.EXPO_PUBLIC_GOONG_API_KEY as string;
const GOONG_API_KEY_2 = process.env.EXPO_PUBLIC_GOONG_API_KEY_2 as string;
const API_URL = process.env.EXPO_PUBLIC_API_URL as string;

// ─── Types ────────────────────────────────────────────────────────────────────

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type Member = {
  firebaseUid: string;
  name: string;
  lat: number;
  lng: number;
  updatedAt: number;
  picture?: string;
};

export type PlaceDetail = {
  place_id: string;
  name: string;
  formatted_address?: string;
  address?: string;
  address_components?: any;
  compound?: any;
  plus_code?: any;
  types?: string[];
  geometry?: {
    location: { lat: number; lng: number };
    boundary?: unknown;
  };
};

// ─── Goong Map token (for map tile + JS SDK) ──────────────────────────────────

export const GOONG_MAP_TOKEN = GOONG_API_KEY;

// ─── Geocode (reverse: latlng → place) ───────────────────────────────────────

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<PlaceDetail | null> {
  const url = `https://rsapi.goong.io/Geocode?latlng=${lat},${lng}&api_key=${GOONG_API_KEY_2}`;
  const res = await fetch(url);
  const data = await res.json();
  const r = data.results?.[0];
  if (!r) return null;

  return {
    place_id: r.place_id,
    name: r.name,
    formatted_address: r.formatted_address,
    address: r.address,
    address_components: r.address_components,
    compound: r.compound,
    plus_code: r.plus_code,
    types: r.types,
    geometry: r.geometry
      ? {
        location: {
          lat: r.geometry.location.lat,
          lng: r.geometry.location.lng,
        },
        boundary: r.geometry.boundary ?? null,
      }
      : undefined,
  };
}

// ─── Direction (origin → destination polyline) ───────────────────────────────

export async function fetchDirection(
  origin: LatLng,
  destination: LatLng
): Promise<LatLng[]> {
  const url =
    `https://rsapi.goong.io/Direction` +
    `?origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&vehicle=bike&api_key=${GOONG_API_KEY_2}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.routes?.length) return [];

  return decodePolyline(data.routes[0].overview_polyline.points);
}

// ─── Group members from backend + Firebase live_locations ────────────────────

/**
 * Fetches group member UIDs from backend, then subscribes to their
 * live locations in Firebase Realtime Database.
 *
 * Returns an unsubscribe function — call it to stop listening.
 */
export function subscribeGroupMembers(
  groupId: string,
  onUpdate: (members: Member[]) => void,
  onError?: (err: unknown) => void
): () => void {
  let firebaseUnsub: (() => void) | null = null;

  (async () => {
    try {
      const token = await getAuth().currentUser?.getIdToken();

      const response = await fetch(
        `${API_URL}/api/groups/${groupId}/members/uids`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const memberUids: string[] = await response.json();

      const db = getDatabase();

      firebaseUnsub = onValue(
        ref(db, "live_locations"),
        (snapshot) => {
          const locations = snapshot.val() || {};

          const members: Member[] = memberUids
            .map((uid) => {
              const loc = locations[uid];
              if (!loc) return null;
              return {
                firebaseUid: uid,
                name: loc.name || "",
                lat: loc.lat,
                lng: loc.lng,
                picture:
                  loc.picture ||
                  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
                updatedAt: loc.updatedAt || 0,
              };
            })
            .filter(Boolean) as Member[];

          onUpdate(members);
        }
      );
    } catch (err) {
      onError?.(err);
    }
  })();

  // Return cleanup — works even if firebase hasn't subscribed yet
  return () => {
    firebaseUnsub?.();
  };
}

// ─── HTML string for WebView (stable, created once) ──────────────────────────

export function buildMapHtml(latitude: number, longitude: number): string {
  return `
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
    goongjs.accessToken = "${GOONG_MAP_TOKEN}";
    window.map = new goongjs.Map({
      container: "map",
      style: "https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAP_TOKEN}",
      center: [${longitude}, ${latitude}],
      zoom: 15
    });

    window.destinationMarker = null;

    map.on("click", (e) => {

      // Xóa marker cũ
      if (window.destinationMarker) {
        window.destinationMarker.remove();
      }

      // Tạo marker đỏ mới
      window.destinationMarker = new goongjs.Marker({
        color: "red"
      })
        .setLngLat([e.lngLat.lng, e.lngLat.lat])
        .addTo(map);

      // Gửi tọa độ về React Native
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "MAP_CLICK",
          latitude: e.lngLat.lat,
          longitude: e.lngLat.lng
        })
      );
    });
  </script>
</body>
</html>`;
}

// ─── Polyline decoder ─────────────────────────────────────────────────────────

export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}