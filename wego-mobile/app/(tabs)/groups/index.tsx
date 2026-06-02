import { useRouter } from 'expo-router';
import { getAuth } from "firebase/auth";
import { Bell, ChevronRight, Plus, Search } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    Image,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const GREEN = process.env.EXPO_PUBLIC_GREEN_MAIN

type Group = {
    id: string;
    name: string;
    members: number;
    status: string;
    avatar: string;
    statusDot?: 'active' | 'online' | 'meeting' | 'session' | 'event';
};

type MyGroupResponse = {
    id: string;
    title: string;
    description: string;
    memberCount: number;
    host: boolean;
    groupPhoto: string;
    status: string;
};

const STATUS_COLORS: Record<string, string> = {
    active: '#22c55e',
    online: '#3b82f6',
    meeting: '#f59e0b',
    session: '#a855f7',
    event: '#f97316',
};

function GroupItem({ item, onPress }: { item: Group; onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.groupItem} activeOpacity={0.7} onPress={onPress}>
            <View style={styles.avatarWrapper}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                {item.statusDot && (
                    <View
                        style={[
                            styles.statusDot,
                            { backgroundColor: STATUS_COLORS[item.statusDot] },
                        ]}
                    />
                )}
            </View>

            <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{item.name}</Text>
                <View style={styles.metaRow}>
                    <Text style={styles.memberCount}>{item.members} members</Text>
                    <Text style={styles.dot}> • </Text>
                    <Text
                        style={[
                            styles.statusText,
                            item.statusDot ? { color: STATUS_COLORS[item.statusDot] } : {},
                        ]}
                    >
                        {item.status}
                    </Text>
                </View>
            </View>

            <ChevronRight size={18} color="#c7d2dc" strokeWidth={2} />
        </TouchableOpacity>
    );
}

type RootStackParamList = {
    Groups: undefined;
    GroupMembers: {
        groupId: string;
        groupName: string;
        memberCount: number;
        activeCount: number;
    };
};

export default function GroupsScreen() {
    const [query, setQuery] = useState('');
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchMyGroups();
    }, []);

    const fetchMyGroups = async () => {
        try {
            setLoading(true);

            const user = getAuth().currentUser;

            if (!user) {
                console.log("No user logged in");
                return;
            }

            const token = await user.getIdToken();

            const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/api/groups/my`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Fetch groups failed");
            }

            const data: MyGroupResponse[] = await response.json();

            const mapped: Group[] = data.map((g) => ({
                id: g.id,
                name: g.title,
                members: g.memberCount,
                status: g.host ? 'You are host' : 'Member',
                avatar: g.groupPhoto,
                statusDot: g.host ? 'active' : 'online',
            }));

            setGroups(mapped);

            console.log("GROUP DATA:", mapped);

        } catch (error) {
            console.log("FETCH GROUP ERROR:", error);
        } finally {
            setLoading(false);
        }
    };

    const filtered = groups.filter((g) =>
        (g.name ?? '').toLowerCase().includes((query ?? '').toLowerCase())
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Groups</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.iconBtn}
                        activeOpacity={0.7}
                        onPress={() => router.push({
                            pathname: '/(tabs)/groups/Notifications',
                        })}
                    >
                        <Bell size={22} color="#334155" strokeWidth={1.8} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addBtn}
                        activeOpacity={0.8}
                        onPress={() => router.push({
                            pathname: '/(tabs)/groups/CreateGroup',
                        })}
                    >
                        <Plus size={20} color="#fff" strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search size={16} color="#94a3b8" strokeWidth={2} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search your groups"
                        placeholderTextColor="#94a3b8"
                        value={query}
                        onChangeText={setQuery}
                    />
                </View>
            </View>

            {/* List */}
            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <GroupItem
                        item={item}
                        onPress={() =>
                            router.push({
                                pathname: '/(tabs)/groups/GroupMembers',
                                params: {
                                    groupId: item.id,
                                    groupName: item.name,
                                    memberCount: item.members,
                                    activeCount: item.members,
                                },
                            })
                        }
                    />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 32,
        marginBottom: 32,
        flex: 1,
        backgroundColor: '#f8fafc',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        backgroundColor: '#f8fafc',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#0f172a',
        letterSpacing: -0.5,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `#${GREEN}`,
        shadowColor: `#${GREEN}`,
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },

    // Search
    searchContainer: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 46,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1e293b',
        fontWeight: '400',
    },

    // List
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 32,
    },
    separator: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginLeft: 70,
    },

    // Group Item
    groupItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderRadius: 0,
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: 14,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#e2e8f0',
    },
    statusDot: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#fff',
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 15.5,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 3,
        letterSpacing: -0.2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberCount: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '400',
    },
    dot: {
        fontSize: 13,
        color: '#94a3b8',
    },
    statusText: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
});