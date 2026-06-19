import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Coffee, Heart, Navigation, Share2, Star, Wifi } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet, Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SERPAPI_KEY = process.env.EXPO_PUBLIC_SERPAPI_KEY;

interface ReviewTopic {
    keyword: string;
    mentions: number;
    id: string;
}

interface UserReview {
    username: string;
    rating: number;
    description: string;
    date: string;
    user_thumbnail?: string;
}

interface PlaceData {
    title: string;
    rating?: number;
    thumbnail?: string;
    photos?: { image: string }[];
    open_state?: string;
    address?: string;

    extensions?: {
        service_options?: string[];
        highlights?: string[];
        popular_for?: string[];
        accessibility?: string[];
        offerings?: string[];
        dining_options?: string[];
        amenities?: string[];
        atmosphere?: string[];
    }[];

    reviews?: number;

    rating_summary?: {
        stars: number;
        amount: number;
    }[];

    user_reviews?: {
        topics?: ReviewTopic[];
        most_relevant?: UserReview[];
    };
}

export default function PlaceDetailScreen() {
    const router = useRouter();
    const {
        placeId,
        placeName,
        lat,
        lng,
        prevRoute,
        groupId,
    } = useLocalSearchParams<{
        placeId: string;
        placeName: string;
        lat: string;
        lng: string;
        prevRoute: string;
        groupId: string;
    }>();

    const [placeData, setPlaceData] = useState<PlaceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!placeName || !lat || !lng) return;

        const fetchPlaceData = async () => {
            try {
                setLoading(true);
                // Replace spaces with + for the query
                const formattedName = placeName.replace(/\s+/g, '+');
                const url = `https://serpapi.com/search.json?engine=google_maps&q=${formattedName}&ll=@${lat},${lng},14z&api_key=${SERPAPI_KEY}`;

                const response = await fetch(url);
                const data = await response.json();

                // SerpAPI google_maps returns results in `local_results` array
                if (data.local_results && data.local_results.length > 0) {
                    setPlaceData(data.local_results[0]);
                } else if (data.place_results) {
                    setPlaceData(data.place_results);
                }
                else {
                    setError('No place data found');
                }
            } catch (err) {
                setError('Failed to fetch place data');
            } finally {
                setLoading(false);
            }
        };

        fetchPlaceData();
    }, [placeName, lat, lng]);

    // Pick best available photo
    const coverImageUri =
        placeData?.photos?.[0]?.image ??
        placeData?.thumbnail ??
        'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600&auto=format&fit=crop';

    const displayName = placeData?.title ?? placeName ?? 'Loading...';
    const isOpen = (placeData?.open_state ?? '').toLowerCase().includes('open');

    const atmosphere =
        placeData?.extensions
            ?.find(item => item.atmosphere)
            ?.atmosphere?.slice(0, 2)
            ?.join(', ') ?? 'Not available';

    const amenities =
        placeData?.extensions
            ?.find(item => item.amenities)
            ?.amenities?.slice(0, 2)
            ?.join(', ') ?? 'Not available';

    const totalReviews = placeData?.reviews ?? 0;

    const ratingSummary =
        [...(placeData?.rating_summary ?? [])]
            .sort((a, b) => b.stars - a.stars);

    const reviewTopics =
        placeData?.user_reviews?.topics?.slice(0, 6) ?? [];

    const userReviews =
        placeData?.user_reviews?.most_relevant?.slice(0, 3) ?? [];

    const rating = placeData?.rating ?? 0;

    const stars =
        '★'.repeat(Math.round(rating)) +
        '☆'.repeat(5 - Math.round(rating));

    const topics = placeData?.user_reviews?.topics ?? [];

    const reviews = placeData?.user_reviews?.most_relevant ?? [];

    const hasReviewData =
        topics.length > 0 || reviews.length > 0;

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

                {/* Header Image */}
                <View style={styles.imageHeaderContainer}>
                    {loading ? (
                        <View style={styles.imagePlaceholder}>
                            <ActivityIndicator size="large" color="#00E676" />
                        </View>
                    ) : (
                        <Image source={{ uri: coverImageUri }} style={styles.coverImage} />
                    )}

                    <SafeAreaView style={styles.headerButtonsOverlay}>
                        <View style={styles.headerRow}>
                            <TouchableOpacity
                                style={styles.circleHeaderBtn}
                                onPress={() => {

                                    if (prevRoute === "/GroupChat") {

                                        router.push({
                                            pathname: "/GroupChat",
                                            params: {
                                                groupId,
                                            },
                                        });

                                        return;
                                    }

                                    if (prevRoute) {
                                        router.push({
                                            pathname: prevRoute as any,
                                        });
                                    }
                                }}
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

                {/* Detail Card */}
                <View style={styles.detailCardContainer}>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#00E676" />
                            <Text style={styles.loadingText}>Loading place details...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : (
                        <>
                            {/* Name & Rating */}
                            <View style={styles.titleRow}>
                                <Text style={styles.placeName}>{displayName}</Text>
                                {placeData?.rating != null && (
                                    <View style={styles.ratingBadge}>
                                        <Star size={16} color="#00E676" fill="#00E676" />
                                        <Text style={styles.ratingText}>{placeData.rating}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Status Row */}
                            <View style={styles.statusRow}>
                                {placeData?.open_state ? (
                                    <View style={[
                                        styles.openStatusTag,
                                        !isOpen && styles.closedStatusTag
                                    ]}>
                                        <Text style={[
                                            styles.openStatusText,
                                            !isOpen && styles.closedStatusText
                                        ]}>
                                            {placeData.open_state.toUpperCase()}
                                        </Text>
                                    </View>
                                ) : null}

                                {placeData?.address && (
                                    <>
                                        <Text style={styles.dotSeparator}>•</Text>
                                        <Text style={styles.addressText} numberOfLines={1}>
                                            {placeData.address}
                                        </Text>
                                    </>
                                )}
                            </View>

                            {/* Feature Cards */}
                            <View style={styles.featuresGrid}>
                                <View style={styles.featureCard}>
                                    <View style={styles.featureIconWrapper}>
                                        <Coffee size={20} color="#00E676" />
                                    </View>
                                    <Text style={styles.featureLabel}>ATMOSPHERE</Text>
                                    <Text style={styles.featureValue}>{atmosphere}</Text>
                                </View>
                                <View style={styles.featureCard}>
                                    <View style={styles.featureIconWrapper}>
                                        <Wifi size={20} color="#00E676" />
                                    </View>
                                    <Text style={styles.featureLabel}>Amenities</Text>
                                    <Text style={styles.featureValue}>{amenities}</Text>
                                </View>
                            </View>


                            {hasReviewData ? (
                                <>
                                    {/* Review Summary */}
                                    <View style={styles.reviewContainer}>

                                        <Text style={styles.reviewTitle}>
                                            Review Summary
                                        </Text>

                                        <View style={styles.reviewContent}>

                                            {/* Left */}
                                            <View style={styles.reviewBars}>

                                                {ratingSummary.map(item => {

                                                    const percentage =
                                                        totalReviews > 0
                                                            ? (item.amount / totalReviews) * 100
                                                            : 0;

                                                    return (
                                                        <View
                                                            key={item.stars}
                                                            style={styles.reviewBarRow}
                                                        >
                                                            <Text style={styles.starNumber}>
                                                                {item.stars}
                                                            </Text>

                                                            <View style={styles.progressBackground}>
                                                                <View
                                                                    style={[
                                                                        styles.progressFill,
                                                                        { width: `${percentage}%` },
                                                                    ]}
                                                                />
                                                            </View>

                                                        </View>
                                                    );
                                                })}
                                            </View>

                                            {/* Right */}
                                            <View style={styles.reviewScoreBox}>

                                                <Text style={styles.reviewScore}>
                                                    {placeData?.rating ?? '-'}
                                                </Text>

                                                <View style={styles.starRow}>
                                                    {[1, 2, 3, 4, 5].map((item) => (
                                                        <Star
                                                            key={item}
                                                            size={18}
                                                            color="#F4B400"
                                                            fill={item <= Math.round(placeData?.rating ?? 0)
                                                                ? "#F4B400"
                                                                : "transparent"
                                                            }
                                                        />
                                                    ))}
                                                </View>
                                                <Text style={styles.reviewCount}>
                                                    {totalReviews.toLocaleString()} reviews
                                                </Text>

                                            </View>

                                        </View>

                                    </View>

                                    {topics.length > 0 && (
                                        <>
                                            <View style={styles.topicContainer}>

                                                <Text style={styles.sectionTitle}>
                                                    People often mention
                                                </Text>

                                                <View style={styles.topicWrapper}>

                                                    {reviewTopics.map(topic => (

                                                        <View
                                                            key={topic.id}
                                                            style={styles.topicChip}
                                                        >

                                                            <Text style={styles.topicText}>
                                                                {topic.keyword}
                                                            </Text>

                                                            <Text style={styles.topicCount}>
                                                                {topic.mentions}
                                                            </Text>

                                                        </View>

                                                    ))}

                                                </View>

                                            </View>
                                        </>
                                    )}
                                    {reviews.length > 0 && (
                                        <>

                                            <View style={styles.userReviewContainer}>

                                                <Text style={styles.sectionTitle}>
                                                    User Reviews
                                                </Text>

                                                {userReviews.map((review, index) => (

                                                    <View
                                                        key={index}
                                                        style={styles.reviewCard}
                                                    >

                                                        <View style={styles.reviewHeader}>

                                                            <Image
                                                                source={{ uri: review.user_thumbnail }}
                                                                style={styles.userAvatar}
                                                            />

                                                            <View style={{ flex: 1 }}>

                                                                <Text style={styles.username}>
                                                                    {review.username}
                                                                </Text>

                                                                <Text style={styles.reviewMeta}>
                                                                    ⭐ {review.rating} • {review.date}
                                                                </Text>

                                                            </View>

                                                        </View>

                                                        <Text
                                                            style={styles.reviewDescription}
                                                            numberOfLines={4}
                                                        >
                                                            {review.description}
                                                        </Text>

                                                    </View>

                                                ))}

                                            </View>
                                        </>
                                    )}
                                </>
                            ) : (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyTitle}>
                                        No reviews yet
                                    </Text>

                                    <Text style={styles.emptyDescription}>
                                        This place doesn't have enough public information yet.
                                    </Text>
                                </View>
                            )}

                            {/* Map Preview */}
                            {/* <View style={styles.mapPreviewContainer}>
                                <Image
                                    source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=400' }}
                                    style={styles.mapMiniImage}
                                />
                            </View> */}
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={styles.bottomActionBar}>
                <TouchableOpacity
                    style={styles.directionsButton}
                    activeOpacity={0.9}
                    onPress={() => {

                        // Nếu đi từ ScheduleMeet sang
                        if (prevRoute === "/(tabs)/schedule") {
                            router.push({
                                pathname: "/",
                                params: {
                                    placeId,
                                    placeName,
                                    lat,
                                    lng,
                                    prevRoute: "/PlaceDetail",
                                    groupId,
                                },
                            });

                            return;
                        }

                        // Các trường hợp khác
                        router.push({
                            pathname: "/MeetingSetup",
                            params: {
                                placeId,
                                placeName,
                                lat,
                                lng,
                                prevRoute: "/PlaceDetail",
                                groupId,
                            },
                        });
                    }}
                >
                    <Navigation size={20} color="#FFFFFF" fill="#FFFFFF"
                        style={{ marginRight: 8, transform: [{ rotate: '45deg' }] }} />
                    <Text style={styles.directionsButtonText}>DIRECTIONS</Text>
                </TouchableOpacity>
                {/* <TouchableOpacity style={styles.squareActionButton}>
                    <Copy size={22} color="#2563EB" />
                </TouchableOpacity> */}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    scrollView: { flex: 1 },
    imageHeaderContainer: { width: SCREEN_WIDTH, height: 300, position: 'relative' },
    coverImage: { width: '100%', height: '100%', objectFit: 'cover' },
    imagePlaceholder: {
        width: '100%', height: '100%',
        backgroundColor: '#E2E8F0',
        justifyContent: 'center', alignItems: 'center'
    },
    headerButtonsOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
    },
    headerRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12
    },
    circleHeaderBtn: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center'
    },
    rightHeaderActions: { flexDirection: 'row', gap: 12 },
    detailCardContainer: {
        backgroundColor: '#F8FAFC', borderTopLeftRadius: 28,
        borderTopRightRadius: 28, marginTop: -30,
        paddingHorizontal: 20, paddingTop: 32, paddingBottom: 120
    },
    loadingContainer: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    loadingText: { color: '#64748B', fontSize: 15 },
    errorContainer: { alignItems: 'center', paddingVertical: 40 },
    errorText: { color: '#EF4444', fontSize: 15 },
    titleRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 12
    },
    placeName: { fontSize: 28, fontWeight: '800', color: '#0F172A', flex: 1, marginRight: 12 },
    ratingBadge: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#E6FDF0',
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, gap: 4
    },
    ratingText: { fontSize: 14, fontWeight: '700', color: '#00E676' },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    openStatusTag: {
        backgroundColor: '#DCFCE7', paddingHorizontal: 10,
        paddingVertical: 6, borderRadius: 8
    },
    closedStatusTag: { backgroundColor: '#FEE2E2' },
    openStatusText: { fontSize: 12, fontWeight: '700', color: '#15803D' },
    closedStatusText: { color: '#DC2626' },
    dotSeparator: { marginHorizontal: 10, color: '#94A3B8', fontWeight: 'bold' },
    addressText: { fontSize: 13, fontWeight: '600', color: '#64748B', flex: 1 },
    featuresGrid: {
        flexDirection: 'row', justifyContent: 'space-between',
        gap: 16, marginBottom: 24
    },
    featureCard: {
        flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1,
        borderColor: '#E2E8F0', borderRadius: 20, padding: 16
    },
    featureIconWrapper: { marginBottom: 12 },
    featureLabel: {
        fontSize: 11, fontWeight: '800', color: '#94A3B8',
        letterSpacing: 0.5, marginBottom: 4
    },
    featureValue: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    mapPreviewContainer: {
        width: '100%', height: 140, borderRadius: 20,
        overflow: 'hidden', backgroundColor: '#E2E8F0', marginTop: 8
    },
    mapMiniImage: { width: '100%', height: '100%', opacity: 0.7 },
    bottomActionBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 32 : 28,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderTopWidth: 1, borderTopColor: '#F1F5F9'
    },
    directionsButton: {
        flex: 1, height: 54, backgroundColor: '#00E676',
        borderRadius: 14, flexDirection: 'row', justifyContent: 'center',
        alignItems: 'center', shadowColor: '#00E676',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3,
        shadowRadius: 6, elevation: 3
    },
    directionsButtonText: {
        color: '#FFFFFF', fontSize: 15,
        fontWeight: '800', letterSpacing: 0.3
    },
    squareActionButton: {
        width: 54, height: 54, backgroundColor: '#EEF2FF',
        borderRadius: 14, justifyContent: 'center', alignItems: 'center'
    },
    reviewContainer: {
        marginTop: 10,
    },

    reviewTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 18,
    },

    reviewContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    reviewBars: {
        flex: 1,
        marginRight: 20,
    },

    reviewBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },

    starNumber: {
        width: 18,
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },

    progressBackground: {
        flex: 1,
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 999,
        overflow: 'hidden',
    },

    progressFill: {
        height: '100%',
        backgroundColor: '#F4B400',
        borderRadius: 999,
    },

    reviewScoreBox: {
        width: 90,
        alignItems: 'center',
    },

    reviewScore: {
        fontSize: 52,
        fontWeight: '700',
        color: '#111827',
    },

    reviewStars: {
        fontSize: 18,
        marginVertical: 4,
    },

    reviewCount: {
        fontSize: 14,
        color: '#0891B2',
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 16,
    },

    topicContainer: {
        marginTop: 24,
    },

    topicWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },

    topicChip: {
        flexDirection: 'row',

        alignItems: 'center',

        backgroundColor: '#F1F5F9',

        borderRadius: 20,

        paddingHorizontal: 14,

        paddingVertical: 10,
    },

    topicText: {
        fontSize: 14,

        fontWeight: '600',

        color: '#334155',
    },

    topicCount: {
        marginLeft: 8,

        fontSize: 13,

        fontWeight: '700',

        color: '#00E676',
    },

    userReviewContainer: {
        marginTop: 28,
    },

    reviewCard: {
        backgroundColor: '#FFFFFF',

        borderRadius: 18,

        padding: 16,

        marginBottom: 16,

        borderWidth: 1,

        borderColor: '#E2E8F0',
    },

    reviewHeader: {
        flexDirection: 'row',

        alignItems: 'center',

        marginBottom: 12,
    },

    userAvatar: {
        width: 48,

        height: 48,

        borderRadius: 24,

        marginRight: 12,
    },

    username: {
        fontSize: 16,

        fontWeight: '700',

        color: '#0F172A',
    },

    reviewMeta: {
        fontSize: 13,

        color: '#64748B',

        marginTop: 2,
    },

    reviewDescription: {
        fontSize: 14,

        lineHeight: 22,

        color: '#334155',
    },
    starRow: {
        flexDirection: 'row',
        gap: 2,
        marginVertical: 6,
    },

    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 24,
    },

    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 8,
    },

    emptyDescription: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 22,
    },
});