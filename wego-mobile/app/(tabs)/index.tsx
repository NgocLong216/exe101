import GoongWebMap from "@/components/mapTab/GoongWebMap";
import { auth, db } from "@/firebase";
import { LocationResult } from "@/types/location";
import { MapWidget } from "@/widgets/MapWidget";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import {
  onDisconnect,
  ref,
  set,
} from "firebase/database";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ImageWidgetSource, getWidgetInfo, requestWidgetUpdate } from 'react-native-android-widget';

const GOONG_API_KEY = process.env.EXPO_PUBLIC_GOONG_API_KEY_2 || '';
const WIDGET_NAME = "Map";
const WIDGET_UPDATE_INTERVAL_MS = 30_000;

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
  const [initializing, setInitializing] = useState(true);
  const [isLocationSharingEnabled, setIsLocationSharingEnabled] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const lastWidgetUpdateRef = useRef(0);
  const widgetUpdateInFlightRef = useRef(false);
    

  const startTracking = useCallback(async () => {
    let subscription: Location.LocationSubscription | null = null;
    let disconnectSet = false;

    const enabled = await AsyncStorage.getItem("locationSharing");

    if (enabled === "false") {
      return;
    }

    subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      async (loc) => {
        const { latitude, longitude } = loc.coords;
        setUserLocation(loc.coords);
        setInitializing(false);
        void AsyncStorage.multiSet([
          ['widget_lat', latitude.toString()],
          ['widget_lng', longitude.toString()],
        ]).catch((error) => console.log('Widget coordinate storage error:', error));

        const now = Date.now();
        if (
          !widgetUpdateInFlightRef.current &&
          now - lastWidgetUpdateRef.current >= WIDGET_UPDATE_INTERVAL_MS
        ) {
          widgetUpdateInFlightRef.current = true;
          lastWidgetUpdateRef.current = now;

          void (async () => {
            try {
              const offset = 0.0001;
              const mapUrl = `https://rsapi.goong.io/staticmap/route?origin=${latitude + offset},${longitude}&destination=${latitude},${longitude}&width=600&height=300&vehicle=car&api_key=${GOONG_API_KEY}` as ImageWidgetSource;
              const widgets = await getWidgetInfo(WIDGET_NAME);

              if (!widgets.length) {
                console.log('No widget instance found yet. Add the widget to the Android home screen first.');
                return;
              }

              await requestWidgetUpdate({
                widgetName: WIDGET_NAME,
                renderWidget: () => (
                  <MapWidget
                    latitude={latitude}
                    longitude={longitude}
                    Image={mapUrl}
                  />
                ),
                widgetNotFound: () => console.log('Widget instance not found. Add the widget to the Android home screen and rebuild the app if needed.'),
              });
            } catch (err) {
              console.log('Widget update error:', err);
            } finally {
              widgetUpdateInFlightRef.current = false;
            }
          })();
        }

        // Firebase update

        try {
          const user = auth.currentUser;
          if (!user) return;
          
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

  useFocusEffect(
    useCallback(() => {
      let cleanupFn: (() => void) | undefined;
      let cancelled = false;
  
      const run = async () => {
        setInitializing(true); // 👈 bắt đầu load
  
        setLocationError(null);
        const enabled = await AsyncStorage.getItem("locationSharing");
        if (cancelled) return;
  
        if (enabled === "false") {
          setIsLocationSharingEnabled(false);
          setUserLocation(null);
          setInitializing(false);
          return;
        }
  
        setIsLocationSharingEnabled(true);
        const ok = await requestPermission();
        if (cancelled) return;
  
        if (!ok) {
          setUserLocation(null);
          setLocationError("Location permission is not granted");
          setInitializing(false);
          return;
        }
  
        try {
          const trackingCleanup = await startTracking();
          if (cancelled) {
            trackingCleanup?.();
          } else {
            cleanupFn = trackingCleanup;
          }
        } catch (error) {
          if (cancelled) return;
          console.log("Location tracking error:", error);
          setLocationError("Unable to get your current location");
          setInitializing(false);
        }
      };
  
      run();
  
      return () => {
        cancelled = true;
        cleanupFn?.();
      };
    }, [startTracking])
  );

  if (initializing) {
    return (
      <View style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  
  if (!isLocationSharingEnabled) {
    return (
      <View style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}>
        <Text>Location sharing is disabled</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}>
        <Text>{locationError}</Text>
      </View>
    );
  }

  if (!userLocation) {
    return (
      <View style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}>
        <ActivityIndicator size="large" />
        <Text>Getting your current location...</Text>
      </View>
    );
  }
  
  return (
    <GoongWebMap
      latitude={userLocation.latitude}
      longitude={userLocation.longitude}
    />
  );
}
