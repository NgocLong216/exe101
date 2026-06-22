import GoongWebMap from "@/components/mapTab/GoongWebMap";
import { auth } from "@/firebase";
import { LocationResult } from "@/types/location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import {
  getDatabase,
  onDisconnect,
  ref,
  set,
} from "firebase/database";
import { useCallback, useState } from "react";

const requestPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    alert("Cần quyền truy cập vị trí");
    return false;
  }
  return true;
};

export default function HomeScreen() {
  const [userLocation, setUserLocation] =
    useState<LocationResult | null>(null);

  const startTracking = useCallback(async () => {
    let subscription: Location.LocationSubscription | null = null;
    let disconnectSet = false;

    const enabled = await AsyncStorage.getItem("locationSharing");

    if (enabled !== "true") return;

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
          const user = auth.currentUser;
          if (!user) return;

          const db = getDatabase();
          const locationRef = ref(
            db,
            `live_locations/${user.uid}`
          );

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

    return () => {
      subscription?.remove();
    };
  }, []);

  // ⭐ ĐÂY LÀ CHỖ BẠN CẦN THÊM useFocusEffect
  useFocusEffect(
    useCallback(() => {
      let cleanupFn: any;

      const run = async () => {
        cleanupFn = await startTracking();
      };

      run();

      return () => {
        cleanupFn?.();
      };
    }, [startTracking])
  );

  if (!userLocation) return null;

  return (
    <GoongWebMap
      latitude={userLocation.latitude}
      longitude={userLocation.longitude}
    />
  );
}