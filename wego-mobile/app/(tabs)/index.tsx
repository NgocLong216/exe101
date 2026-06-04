import GoongWebMap from "@/components/mapTab/GoongWebMap";

import { LocationResult } from "@/types/location";

import * as Location from "expo-location";

import { useEffect, useState } from "react";

import { getAuth } from "firebase/auth";

import {
  getDatabase,
  onDisconnect,
  onValue,
  ref,
  set,
} from "firebase/database";

const requestPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") {
    alert("Cần quyền truy cập vị trí");
    return false;
  }

  return true;
};

type Member = {
  firebaseUid: string;
  name: string;
  lat: number;
  lng: number;
  picture?: string;
  updatedAt: number;
};

export default function HomeScreen() {
  const [userLocation, setUserLocation] =
    useState<LocationResult | null>(null);

  const [members, setMembers] = useState<Member[]>([]);

  // WATCH GPS + SEND TO FIREBASE
  useEffect(() => {
    let subscription: any;

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

          // FIREBASE
          try {
            const auth = getAuth();

            const user = auth.currentUser;

            if (!user) return;

            const db = getDatabase();

            const locationRef = ref(
              db,
              `live_locations/${user.uid}`
            );

            const locationData = {
              firebaseUid: user.uid,
              name: user.displayName || "Anonymous",
              lat: latitude,
              lng: longitude,
              picture: user.photoURL || null,
              updatedAt: Date.now(),
            };

            await set(locationRef, locationData);

            onDisconnect(locationRef).remove();

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

  // LISTEN REALTIME MEMBERS
  useEffect(() => {
    const db = getDatabase();

    const locationsRef = ref(db, "live_locations");

    const unsubscribe = onValue(
      locationsRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setMembers([]);
          return;
        }

        const arr = Object.values(data) as Member[];

        console.log("👥 MEMBERS:", arr);

        setMembers([]);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
  <>
    {userLocation && (
      <GoongWebMap
        latitude={userLocation.latitude}
        longitude={userLocation.longitude}
      />
    )}
  </>
);
}