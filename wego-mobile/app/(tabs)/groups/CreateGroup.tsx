import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    StatusBar,
    KeyboardAvoidingView,
    ScrollView,
    Image
} from 'react-native';
import { ArrowLeft, Pencil } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';

export default function CreateGroupScreen() {
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const router = useRouter()
    const [loading, setLoading] = useState(false);
    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    const handleCreateGroup = async () => {
        try {

            if (!groupName.trim()) {
                alert("Please enter group name");
                return;
            }

            setLoading(true);

            const user = getAuth().currentUser;

            if (!user) {
                alert("User not logged in");
                return;
            }

            const token = await user.getIdToken();

            const formData = new FormData();

            formData.append("title", groupName);
            formData.append("description", groupDescription);

            // optional fields
            // formData.append("meetingTime", "2026-05-27T20:00:00");
            // formData.append("lat", "10.123");
            // formData.append("lng", "106.123");
            // formData.append("placeId", "abcxyz");

            console.log("API_URL =", API_URL);
            console.log("REQUEST =", `${API_URL}/api/groups`);
            const response = await fetch(
                `${API_URL}/api/groups`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const data = await response.json();

            console.log("CREATE GROUP SUCCESS:", data);

            alert("Create group success");

            router.push({
                pathname: '/(tabs)/groups',
            });

        } catch (error) {

            console.log("CREATE GROUP ERROR:", error);

            alert("Create group failed");

        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.push({
                            pathname: '/(tabs)/groups',
                        })}
                    >
                        <ArrowLeft size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Create New Group</Text>
                    <View style={{ width: 32 }} /> {/* View đệm để giữ chữ Title ở giữa */}
                </View>

                {/* Content */}
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Avatar Upload Section */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity style={styles.avatarContainer} activeOpacity={0.8}>
                            {/* Vòng tròn màu be sữa chứa icon nhóm mặc định */}
                            <View style={styles.avatarPlaceholder}>
                                <Image
                                    source={{ uri: 'https://img.icons8.com/illustrations/meaning/100/null/conference-call.png' }}
                                    style={styles.groupDefaultIcon}
                                    resizeMode="contain"
                                />
                            </View>
                            {/* Nút Pencil màu xanh lá nhỏ ở góc */}
                            {/* <View style={styles.editBadge}>
                <Pencil size={14} color="#FFFFFF" strokeWidth={3} />
              </View> */}
                        </TouchableOpacity>

                        {/* <TouchableOpacity>
              <Text style={styles.uploadText}>Upload Group Photo</Text>
            </TouchableOpacity> */}
                    </View>

                    {/* Form Inputs */}
                    <View style={styles.form}>
                        {/* Input: Group Name */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Group Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Weekend Hikers"
                                placeholderTextColor="#94A3B8"
                                value={groupName}
                                onChangeText={setGroupName}
                            />
                        </View>

                        {/* Input: Group Description */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Group Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="What is this group for?"
                                placeholderTextColor="#94A3B8"
                                multiline={true}
                                numberOfLines={5}
                                textAlignVertical="top" // Căn chữ lên đầu dòng cho Android
                                value={groupDescription}
                                onChangeText={setGroupDescription}
                            />
                        </View>
                    </View>
                </ScrollView>

                {/* Bottom Button */}
                <View style={styles.bottomContainer}>
                    <TouchableOpacity
                        style={styles.createButton}
                        activeOpacity={0.9}
                        onPress={handleCreateGroup}
                        disabled={loading}
                    >
                        <Text style={styles.createButtonText}>
                            {loading ? "Creating..." : "Create Group"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center',
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    // Avatar Styles
    avatarSection: {
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 30,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarPlaceholder: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: '#E2B97B', // Màu be sữa chuẩn theo ảnh
        borderWidth: 2,
        borderColor: '#E2B97B',
        borderStyle: 'dashed', // Tạo hiệu ứng viền đứt nét nhẹ quanh avatar
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    groupDefaultIcon: {
        width: 80,
        height: 80,
        tintColor: '#FFFFFF', // Đổi icon sang màu trắng tinh
    },
    editBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: '#00E676', // Màu xanh neon của nút Edit
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    uploadText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#00E676',
    },
    // Form Styles
    form: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 10,
    },
    input: {
        width: '100%',
        height: 52,
        backgroundColor: '#F8FAFC', // Màu nền input xám cực nhạt
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 15,
        color: '#1E293B',
    },
    textArea: {
        height: 140,
        paddingTop: 16,
        paddingBottom: 16,
    },
    // Button Styles
    bottomContainer: {
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 86 : 108,
        backgroundColor: '#FFFFFF',
    },
    createButton: {
        width: '100%',
        height: 54,
        backgroundColor: '#17F367', // Màu xanh lá neon chuẩn UI
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        // Đổ bóng nhẹ cho nút bấm giống ảnh gốc
        shadowColor: '#17F367',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    createButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});