import { Search, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

const GOONG_API_KEY = process.env.EXPO_PUBLIC_GOONG_API_KEY_2;
// hoặc: import { GOONG_API_KEY } from "../config";

export default function SearchBar({ onSelectLocation } : {onSelectLocation : any}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [lastSelect, setLastSelect] = useState("");

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        const timeout = setTimeout(() => {
            fetchAutocomplete(query);
        }, 500); // debounce

        return () => clearTimeout(timeout);
    }, [query]);

    const fetchAutocomplete = async (text: string) => {
        try {
            const url =
                `https://rsapi.goong.io/Place/AutoComplete` +
                `?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(text)}`;

            const res = await fetch(url);
            const json = await res.json();
            setResults(json.predictions || []);
        } catch (err) {
            console.log("Autocomplete error:", err);
        }
    };

    const handleDelete = () => {
        setQuery("");
    }

    const handleSelect = async (place : any) => {
        setQuery(place.description);
        setResults([]);

        // 👉 Lấy chi tiết toạ độ
        const url =
            `https://rsapi.goong.io/Place/Detail` +
            `?place_id=${place.place_id}&api_key=${GOONG_API_KEY}`;

        const res = await fetch(url);
        const json = await res.json();

        const location = json.result.geometry.location;

        onSelectLocation({
            latitude: location.lat,
            longitude: location.lng,
            name: place.description
        });
        setLastSelect(place.description)
    };

    return (
        <View style={styles.wrapper}>
            <View style={styles.searchBox}>
                <Search />
                <TextInput
                    placeholder="Search location..."
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
