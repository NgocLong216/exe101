import GoongWebMap from "@/components/mapTab/GoongWebMap";
import { LocationResult } from "@/types/location";
import * as Location from "expo-location";
import { getAuth } from "firebase/auth";
import {
  getDatabase,
  onDisconnect,
  ref,
  set,
} from "firebase/database";
import { useEffect, useRef, useState } from "react";

const requestPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    alert("Cần quyền truy cập vị trí");
    return false;
  }
  return true;
};

export default function HomeScreen() {
  const [userLocation, setUserLocation] = useState<LocationResult | null>(null);

  // ─── Watch GPS + push to Firebase ───────────────────────────────────────────
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let disconnectSet = false; // onDisconnect should be registered once, not per GPS tick

    (async () => {
      const ok = await requestPermission();
      if (!ok) return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        async (loc) => {
          const { latitude, longitude } = loc.coords;
          setUserLocation(loc.coords);

          try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return;

            const db = getDatabase();
            const locationRef = ref(db, `live_locations/${user.uid}`);

            // Register onDisconnect only once per session
            if (!disconnectSet) {
              onDisconnect(locationRef).remove();
              disconnectSet = true;
            }

            await set(locationRef, {
              firebaseUid: user.uid,
              name: user.displayName || "Anonymous",
              lat: latitude,
              lng: longitude,
              picture: user.photoURL || null,
              updatedAt: Date.now(),
            });
          } catch (err) {
            console.log("Firebase send error:", err);
          }
        }
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, []);

  if (!userLocation) return null;

  return (
    <GoongWebMap
      latitude={userLocation.latitude}
      longitude={userLocation.longitude}
    />
  );
}