import { getAuth } from "firebase/auth";
import { getDatabase, onValue, ref } from "firebase/database";

const GOONG_API_KEY = process.env.EXPO_PUBLIC_GOONG_API_KEY as string;
const GOONG_API_KEY_2 = process.env.EXPO_PUBLIC_GOONG_API_KEY_2 as string;
const API_URL = process.env.EXPO_PUBLIC_API_URL as string;
const GOONG_JS_VERSION = "1.0.9";

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
  destination: LatLng,
  signal?: AbortSignal
): Promise<LatLng[]> {
  const url =
    `https://rsapi.goong.io/Direction` +
    `?origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&vehicle=bike&api_key=${GOONG_API_KEY_2}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Direction request failed: ${res.status}`);
  }
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
  let disposed = false;
  const firebaseUnsubs: (() => void)[] = [];

  (async () => {
    try {
      const token = await getAuth().currentUser?.getIdToken();

      const response = await fetch(
        `${API_URL}/api/groups/${groupId}/members/uids`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) {
        throw new Error(`Unable to load group members: ${response.status}`);
      }

      const memberUids = Array.from(new Set<string>(await response.json()));
      if (disposed) return;
      if (memberUids.length === 0) {
        onUpdate([]);
        return;
      }

      const db = getDatabase();
      const locations = new Map<string, Member>();
      const emitMembers = () => {
        if (disposed) return;
        onUpdate(
          memberUids
            .map((uid) => locations.get(uid))
            .filter((member): member is Member => Boolean(member))
        );
      };

      memberUids.forEach((uid) => {
        const unsubscribe = onValue(
          ref(db, `live_locations/${uid}`),
          (snapshot) => {
            const loc = snapshot.val();
            if (!loc) {
              locations.delete(uid);
            } else {
              locations.set(uid, {
                firebaseUid: uid,
                name: loc.name || "",
                lat: loc.lat,
                lng: loc.lng,
                picture:
                  loc.picture ||
                  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
                updatedAt: loc.updatedAt || 0,
              });
            }
            emitMembers();
          },
          (error) => {
            if (!disposed) onError?.(error);
          }
        );

        if (disposed) {
          unsubscribe();
        } else {
          firebaseUnsubs.push(unsubscribe);
        }
      });
    } catch (err) {
      if (!disposed) onError?.(err);
    }
  })();

  return () => {
    disposed = true;
    firebaseUnsubs.splice(0).forEach((unsubscribe) => unsubscribe());
  };
}

// ─── HTML string for WebView (stable, created once) ──────────────────────────

export function buildMapHtml(latitude: number, longitude: number, readonly = false): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@${GOONG_JS_VERSION}/dist/goong-js.css" rel="stylesheet" />
  <style>
    html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
    #map { width: 100vw; height: 100vh; }
    .wego-member-marker {
      width: 62px;
      height: 64px;
      padding: 0;
      border: 0;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: auto;
      -webkit-tap-highlight-color: transparent;
    }
    .wego-member-marker__avatar {
      width: 54px;
      height: 54px;
      box-sizing: border-box;
      border: 3px solid #fff;
      border-radius: 50%;
      background: #cbd5e1;
      object-fit: cover;
      box-shadow: 0 3px 8px rgba(15, 23, 42, 0.28);
    }
    .wego-member-marker__tip {
      width: 14px;
      height: 14px;
      margin-top: -7px;
      background: #fff;
      transform: rotate(45deg);
      box-shadow: 2px 2px 4px rgba(15, 23, 42, 0.16);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@${GOONG_JS_VERSION}/dist/goong-js.js"></script>
  <script>
    goongjs.accessToken = "${GOONG_MAP_TOKEN}";
    window.map = new goongjs.Map({
      container: "map",
      style: "https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAP_TOKEN}",
      center: [${longitude}, ${latitude}],
      zoom: 15
    });

    window.destinationMarker = null;
    window.memberMarkers = Object.create(null);
    window.locationSelectionLocked = false;
    window.mapReadOnly = ${readonly};
    window.markerPixels = {}; // id -> {x, y}, cập nhật bởi updateMarkerPixels

    // Được GoongWebMap gọi định kỳ (qua injectJavaScript) để cập nhật vị trí
    // pixel hiện tại của các marker người dùng — dùng để hit-test khi click.
    window.updateMarkerPixels = function(points) {
      if (!window.map) return;
      var results = {};
      var payload = [];
      points.forEach(function(p) {
        var pixel = window.map.project([p.lng, p.lat]);
        results[p.id] = { x: pixel.x, y: pixel.y };
        payload.push({ id: p.id, x: pixel.x, y: pixel.y });
      });
      window.markerPixels = results;
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: "MARKER_PIXELS", pixels: payload })
      );
    };

    map.on("load", () => {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: "MAP_READY" })
      );
    });

    map.on("click", (e) => {
      if (window.mapReadOnly || window.locationSelectionLocked) {
        return;
      }

      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "MAP_CLICK",
          latitude: e.lngLat.lat,
          longitude: e.lngLat.lng,
          pixelX: e.point.x,
          pixelY: e.point.y
        })
      );
    });
  </script>
</body>
</html>`;
}

// ─── Direction with Steps ─────────────────────────────────────────────────────

export type DirectionStep = {
  distance: number;       // metres
  duration: number;       // seconds
  instruction: string;    // plain text, e.g. "Rẽ phải vào Đường ABC"
  maneuver: string;       // e.g. "turn-right", "turn-left", "straight"
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
};

export type DirectionResult = {
  steps: DirectionStep[];
  totalDistance: number;  // metres
  totalDuration: number;  // seconds
  polyline: LatLng[];
};

/** Strips HTML tags from a string */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export async function fetchDirectionWithSteps(
  origin: LatLng,
  destination: LatLng
): Promise<DirectionResult | null> {
  const url =
    `https://rsapi.goong.io/Direction` +
    `?origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&vehicle=bike&api_key=${GOONG_API_KEY_2}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.routes?.length) return null;

  const route = data.routes[0];
  const leg = route.legs?.[0];
  if (!leg) return null;

  const steps: DirectionStep[] = (leg.steps ?? []).map((s: any) => ({
    distance: s.distance?.value ?? 0,
    duration: s.duration?.value ?? 0,
    instruction: stripHtml(s.html_instructions ?? s.maneuver ?? ''),
    maneuver: s.maneuver ?? 'straight',
    startLocation: { lat: s.start_location?.lat ?? 0, lng: s.start_location?.lng ?? 0 },
    endLocation: { lat: s.end_location?.lat ?? 0, lng: s.end_location?.lng ?? 0 },
  }));

  return {
    steps,
    totalDistance: leg.distance?.value ?? 0,
    totalDuration: leg.duration?.value ?? 0,
    polyline: decodePolyline(route.overview_polyline.points),
  };
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
