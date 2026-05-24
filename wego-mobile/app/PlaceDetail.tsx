import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    StatusBar,
    Dimensions
} from 'react-native';
import { ArrowLeft, Heart, Share2, Star, Navigation, Coffee, Wifi, Copy } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PlaceDetailScreen() {
    const router = useRouter()
    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Scroll View hiển thị toàn bộ nội dung */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

                {/* Header Image với các nút thao tác nhanh phía trên */}
                <View style={styles.imageHeaderContainer}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600&auto=format&fit=crop' }}
                        style={styles.coverImage}
                    />

                    {/* Lớp phủ gradient/mờ nhẹ phía trên để nổi bật nút bấm */}
                    <SafeAreaView style={styles.headerButtonsOverlay}>
                        <View style={styles.headerRow}>
                            <TouchableOpacity
                                style={styles.circleHeaderBtn}
                                onPress={() => router.push({
                                    pathname: '/(tabs)/schedule'
                                })}
                            >
                                <ArrowLeft size={22} color="#FFFFFF" />
                            </TouchableOpacity>

                            <View style={styles.rightHeaderActions}>
                                <TouchableOpacity style={styles.circleHeaderBtn}>
                                    <Heart size={22} color="#FFFFFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.circleHeaderBtn}>
                                    <Share2 size={22} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </SafeAreaView>
                </View>

                {/* Khối nội dung thông tin chi tiết địa điểm */}
                <View style={styles.detailCardContainer}>

                    {/* Tên địa điểm & Đánh giá Star */}
                    <View style={styles.titleRow}>
                        <Text style={styles.placeName}>The Workshop Coffee</Text>
                        <View style={styles.ratingBadge}>
                            <Star size={16} color="#00E676" fill="#00E676" />
                            <Text style={styles.ratingText}>4.8</Text>
                        </View>
                    </View>

                    {/* Trạng thái hoạt động & Khoảng cách */}
                    <View style={styles.statusRow}>
                        <View style={styles.openStatusTag}>
                            <Text style={styles.openStatusText}>OPEN UNTIL 8 PM</Text>
                        </View>
                        <Text style={styles.dotSeparator}>•</Text>
                        <View style={styles.distanceContainer}>
                            <Navigation size={14} color="#64748B" style={styles.navIcon} />
                            <Text style={styles.distanceText}>EST. 12 MIN AWAY</Text>
                        </View>
                    </View>

                    {/* Đoạn văn mô tả (Description) */}
                    <Text style={styles.descriptionText}>
                        Industrial chic, quiet ambiance. The perfect sanctuary for focused work and premium roasts.
                    </Text>

                    {/* Các hộp thông tin tiện ích (Features Cards) */}
                    <View style={styles.featuresGrid}>
                        {/* Thẻ Atmosphere */}
                        <View style={styles.featureCard}>
                            <View style={styles.featureIconWrapper}>
                                <Coffee size={20} color="#00E676" />
                            </View>
                            <Text style={styles.featureLabel}>ATMOSPHERE</Text>
                            <Text style={styles.featureValue}>Quiet & Focused</Text>
                        </View>

                        {/* Thẻ Internet */}
                        <View style={styles.featureCard}>
                            <View style={styles.featureIconWrapper}>
                                <Wifi size={20} color="#00E676" />
                            </View>
                            <Text style={styles.featureLabel}>INTERNET</Text>
                            <Text style={styles.featureValue}>Ultra Fast WiFi</Text>
                        </View>
                    </View>

                    {/* Khối giả lập Bản đồ Map Preview nhỏ phía dưới */}
                    <View style={styles.mapPreviewContainer}>
                        <Image
                            source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=400' }}
                            style={styles.mapMiniImage}
                        />
                    </View>

                </View>
            </ScrollView>

            {/* Thanh công cụ cố định ở đáy màn hình (Bottom Action Bar) */}
            <View style={styles.bottomActionBar}>
                <TouchableOpacity style={styles.directionsButton} activeOpacity={0.9}>
                    <Navigation size={20} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 8, transform: [{ rotate: '45deg' }] }} />
                    <Text style={styles.directionsButtonText}>DIRECTIONS</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.squareActionButton}>
                    <Copy size={22} color="#2563EB" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollView: {
        flex: 1,
    },
    // Header Image Styles
    imageHeaderContainer: {
        width: SCREEN_WIDTH,
        height: 300,
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    headerButtonsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    circleHeaderBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(0, 0, 0, 0.35)', // Làm mờ đen nhẹ phía sau nút
        justifyContent: 'center',
        alignItems: 'center',
    },
    rightHeaderActions: {
        flexDirection: 'row',
        gap: 12,
    },
    // Detail Content Card Styles
    detailCardContainer: {
        backgroundColor: '#F8FAFC',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: -30, // Kéo phần card đè lên ảnh cover chuẩn UI
        paddingHorizontal: 20,
        paddingTop: 32,
        paddingBottom: 120, // Tạo khoảng trống để không bị nút đáy che mất dữ liệu khi cuộn xuống cùng
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    placeName: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        flex: 1,
        marginRight: 12,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E6FDF0',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 4,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#00E676',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    openStatusTag: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    openStatusText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#15803D',
    },
    dotSeparator: {
        marginHorizontal: 10,
        color: '#94A3B8',
        fontWeight: 'bold',
    },
    distanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    navIcon: {
        marginRight: 4,
    },
    distanceText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    descriptionText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#475569',
        fontWeight: '400',
        marginBottom: 28,
    },
    // Features Row Grid Styles
    featuresGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
    },
    featureCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 20,
        padding: 16,
    },
    featureIconWrapper: {
        marginBottom: 12,
    },
    featureLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    featureValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    // Map preview Box
    mapPreviewContainer: {
        width: '100%',
        height: 140,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#E2E8F0',
        marginTop: 8,
    },
    mapMiniImage: {
        width: '100%',
        height: '100%',
        opacity: 0.7,
    },
    // Fixed Bottom Actions Layout
    bottomActionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 32 : 28, // Tính toán khoảng cách đệm cho nút HomeBar của iOS
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    directionsButton: {
        flex: 1,
        height: 54,
        backgroundColor: '#00E676', // Xanh Neon rực rỡ
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#00E676',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
    directionsButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    squareActionButton: {
        width: 54,
        height: 54,
        backgroundColor: '#EEF2FF', // Xanh dương pastel nhạt cho nút chức năng phụ kế bên
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
});