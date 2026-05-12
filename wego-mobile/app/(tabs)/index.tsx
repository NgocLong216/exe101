import GoongMap from '@/components/mapTab/map';

import { LocationResult } from '@/types/location';
import * as Location from "expo-location";
import { useEffect, useState } from 'react';

const requestPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
        alert("Cần quyền truy cập vị trí");
        return false;
    }
    return true;
};

export default function HomeScreen() {
    const [userLocation, setUserLocation] = useState<LocationResult | null>(null)

    useEffect(() => {
        let subscription: { remove: any; };

        (async () => {
            const ok = await requestPermission();
            if (!ok) return;

            subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 2000,      // 2s
                    distanceInterval: 5,     // hoặc di chuyển 5m
                },
                (loc) => {
                    const { latitude, longitude } = loc.coords;
                    setUserLocation(loc.coords)
                    //console.log(latitude, longitude);
                }
            );
        })();

        return () => subscription?.remove();
    }, []);

    return (
        userLocation !== null && (
            <GoongMap
                latitude={userLocation.latitude}
                longitude={userLocation.longitude}
            />
        )
    );
}
