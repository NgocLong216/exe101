import { Search, X } from "lucide-react-native";
import type { LocationResult } from "@/types/location";
import React, { useEffect, useRef, useState } from "react";
import {
    FlatList,
    Keyboard,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import type { PlaceDetail } from "./bottomSheet";

const GOONG_API_KEY = process.env.EXPO_PUBLIC_GOONG_API_KEY_2;
// hoặc: import { GOONG_API_KEY } from "../config";

type Props = {
    onSelectLocation: (location: LocationResult, detail: PlaceDetail) => void;
};

export default function SearchBar({ onSelectLocation }: Props) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [lastSelect, setLastSelect] = useState("");
    const detailRequestRef = useRef<AbortController | null>(null);

    useEffect(() => () => detailRequestRef.current?.abort(), []);

    useEffect(() => {
        if (query.length < 2 || query === lastSelect) {
            setResults([]);
            return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => {
            fetchAutocomplete(query, controller.signal);
        }, 500); // debounce

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [query, lastSelect]);

    const fetchAutocomplete = async (text: string, signal: AbortSignal) => {
        try {
            const url =
                `https://rsapi.goong.io/Place/AutoComplete` +
                `?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(text)}`;

            const res = await fetch(url, { signal });
            if (!res.ok) throw new Error(`Autocomplete failed: ${res.status}`);
            const json = await res.json();
            setResults(json.predictions || []);
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            console.log("Autocomplete error:", err);
        }
    };

    const handleDelete = () => {
        detailRequestRef.current?.abort();
        setLastSelect("");
        setQuery("");
    }

    const handleSelect = async (place : any) => {
        Keyboard.dismiss();
        detailRequestRef.current?.abort();
        const controller = new AbortController();
        detailRequestRef.current = controller;

        setLastSelect(place.description);
        setQuery(place.description);
        setResults([]);

        // 👉 Lấy chi tiết toạ độ
        const url =
            `https://rsapi.goong.io/Place/Detail` +
            `?place_id=${place.place_id}&api_key=${GOONG_API_KEY}`;

        try {
            const res = await fetch(url, { signal: controller.signal });
            if (!res.ok) throw new Error(`Place detail failed: ${res.status}`);
            const json = await res.json();
            const location = json.result?.geometry?.location;
            if (!location) throw new Error("Place detail has no location");

            const selectedLocation: LocationResult = {
                latitude: location.lat,
                longitude: location.lng,
                name: place.description
            };
            const detail: PlaceDetail = {
                ...json.result,
                place_id: json.result?.place_id || place.place_id,
                name: json.result?.name || place.description,
                geometry: {
                    location: {
                        lat: location.lat,
                        lng: location.lng,
                    },
                    boundary: json.result?.geometry?.boundary ?? null,
                },
            };

            onSelectLocation(selectedLocation, detail);
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            console.log("Place detail error:", err);
        }
    };

    return (
        <View style={styles.wrapper}>
            <View style={styles.searchBox}>
                <Search />
                <TextInput
                    placeholder="Search location..."
                    placeholderTextColor="#94A3B8"
                    value={query}
                    onChangeText={setQuery}
                    style={styles.input}
                />
                {query !== "" && (
                    <TouchableOpacity
                        style={styles.rightIcon}
                        onPress={handleDelete}
                    >
                        <X />
                    </TouchableOpacity>
                )}
            </View>

            {(lastSelect !== query) && results.length > 0 && (
                <FlatList
                    data={results}
                    keyExtractor={(item : any) => item.place_id}
                    style={styles.list}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.item}
                            onPress={() => {
                                handleSelect(item)
                            }}
                        >
                            <Text>{item.description}</Text>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        top: 50,
        left: 16,
        right: 16,
        zIndex: 1000
    },
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        elevation: 4,
        zIndex: 1000
    },
    rightIcon: {
        position: "absolute",
        right: 12,
        zIndex: 2
    },
    input: {
        height: 44,
        paddingRight: 56,
    },
    list: {
        marginTop: 6,
        backgroundColor: "#fff",
        borderRadius: 12,
        maxHeight: 250,
        elevation: 4
    },
    item: {
        padding: 12,
        borderBottomWidth: 0.5,
        borderColor: "#ddd"
    }
});
