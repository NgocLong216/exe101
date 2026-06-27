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
import { useCallback, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ImageWidgetSource, getWidgetInfo, requestWidgetUpdate } from 'react-native-android-widget';

const GOONG_API_KEY = process.env.EXPO_PUBLIC_GOONG_API_KEY_2 || '';
const WIDGET_NAME = "Map";

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

         // Fetch base64 map image rồi mới update widget
         try {
          const offset = 0.0001
          await AsyncStorage.setItem('widget_lat', latitude.toString());
          await AsyncStorage.setItem('widget_lng', longitude.toString());

          const mapUrl = `https://rsapi.goong.io/staticmap/route?origin=${latitude+offset},${longitude}&destination=${latitude},${longitude}&width=400&height=200&vehicle=car&api_key=${GOONG_API_KEY}` as ImageWidgetSource ;

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

          setUserLocation({ latitude, longitude });
          setInitializing(false);

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
  
      const run = async () => {
        setInitializing(true); // 👈 bắt đầu load
  
        const enabled = await AsyncStorage.getItem("locationSharing");
  
        if (enabled === "false") {
          setUserLocation(null);
          setInitializing(false);
          return;
        }
  
        const ok = await requestPermission();
  
        if (!ok) {
          setUserLocation(null);
          setInitializing(false);
          return;
        }
  
        cleanupFn = await startTracking();
        setInitializing(false);
      };
  
      run();
  
      return () => {
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
  
  if (!userLocation) {
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
  
  return (
    <GoongWebMap
      latitude={userLocation.latitude}
      longitude={userLocation.longitude}
    />
  );
}