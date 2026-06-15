import { ScheduleResponse, getMySchedules, completeSchedule } from '@/apis/scheduleAPI';
import { PlaceDetail } from '@/components/mapTab/bottomSheet';
import { LatLng } from '@/types/location';
import { useRouter } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = ['Upcoming', 'Past', 'Invites'];
const GOONG_API_KEY_2 = process.env.EXPO_PUBLIC_GOONG_API_KEY_2

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByDate(events: ScheduleResponse[]): Record<string, ScheduleResponse[]> {
  return events.reduce<Record<string, ScheduleResponse[]>>((acc, event) => {
    const label = formatDateLabel(event.meetingTime);
    if (!acc[label]) acc[label] = [];
    acc[label].push(event);
    return acc;
  }, {});
}

function formatDateLabel(meetingTime: string): string {
  const date = new Date(meetingTime);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();

  if (isToday) return `TODAY, ${formatted}`;
  if (isTomorrow) return `TOMORROW, ${formatted}`;
  return formatted;
}

function formatTime(meetingTime: string): string {
  const date = new Date(meetingTime);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({
  event,
  onRefresh,
  activeTab,
}: {
  event: ScheduleResponse;
  onRefresh: () => Promise<void>;
  activeTab: string;
}) {
  const router = useRouter();
  const [placeName, setPlaceName] = useState('');
  const isPast = new Date(event.meetingTime) < new Date();

  useEffect(() => {
    let isMounted = true;

    GetInfo({ latitude: event.lat, longitude: event.lng }).then((info) => {
      if (isMounted) setPlaceName(info?.name ?? '');
    });

    return () => {
      isMounted = false;
    };
  }, [event.lat, event.lng]);

  return (
    <View style={styles.card}>
      {/* Map / Group Photo */}
      <View style={styles.mapContainer}>
        <Image
          source={{ uri: event.groupPhoto }}
          style={styles.mapImage}
          resizeMode="cover"
        />
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Time + Group tag */}
        <View style={styles.cardMeta}>
          <Text style={styles.cardTime}>{formatTime(event.meetingTime)}</Text>
          <View style={styles.groupTag}>
            <Text style={styles.groupTagText}>{event.groupTitle}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.cardTitle}>{event.groupTitle}</Text>

        {/* Description */}
        <Text style={styles.descriptionText} numberOfLines={1}>{event.description}</Text>

        {/* Location */}
        <View style={styles.locationRow}>
          <MapPin size={13} color="#94a3b8" strokeWidth={2} style={{ marginRight: 4 }} />
          <Text style={styles.locationText}>
            {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
          </Text>
        </View>

        {/* Attendees + Details */}
        <View style={styles.cardFooter}>
          <View style={styles.attendees}>
            {event.attendeePhotos.slice(0, 3).map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={[
                  styles.attendeeAvatar,
                  {
                    marginLeft: i === 0 ? 0 : -10,
                    zIndex: 10 - i,
                  },
                ]}
              />
            ))}

            {event.attendeeCount > 3 && (
              <View style={[styles.extraCount, { marginLeft: -10 }]}>
                <Text style={styles.extraCountText}>
                  +{event.attendeeCount - 3}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            {activeTab === 'Upcoming' && event.host && (
              <TouchableOpacity
                style={styles.doneBtn}
                activeOpacity={0.8}
                onPress={async () => {
                  try {
                    await completeSchedule(event.groupId);
                    await onRefresh();
                  } catch (err) {
                    console.log(err);
                  }
                }}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.detailsBtn}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: '/PlaceDetail',
                  params: {
                    placeName,
                    lat: event.lat,
                    lng: event.lng,
                    prevRoute: '/(tabs)/schedule',
                    groupId: event.groupId,
                  },
                })
              }
            >
              <Text style={styles.detailsBtnText}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Date Section ─────────────────────────────────────────────────────────────

function DateSection({
  date,
  events,
  onRefresh,
  activeTab,
}: {
  date: string;
  events: ScheduleResponse[];
  onRefresh: () => Promise<void>;
  activeTab: string;
}) {
  return (
    <View style={styles.dateSection}>
      <Text style={styles.dateSectionLabel}>{date}</Text>

      {events.map((event) => (
        <EventCard
          key={event.groupId}
          event={event}
          onRefresh={onRefresh}
          activeTab={activeTab}
        />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [schedules, setSchedules] = useState<ScheduleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const data = await getMySchedules();
      setSchedules(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const now = new Date();

  const filtered = schedules.filter((s) => {
    if (activeTab === 'Upcoming') {
      return ['WAITING', 'ON_GOING'].includes(s.status);
    }

    if (activeTab === 'Past') {
      return ['FINISHED', 'CANCELED'].includes(s.status);
    }

    return false;
  });

  const grouped = groupByDate(filtered);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.tabDivider} />

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#22c55e" />
          </View>
        ) : Object.keys(grouped).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No {activeTab.toLowerCase()} events</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([date, events]) => (
            <DateSection
              key={date}
              date={date}
              events={events}
              onRefresh={fetchSchedules}
              activeTab={activeTab}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// HELPER FUNCTION
async function GetInfo(place: LatLng) {
  try {
    const url = `https://rsapi.goong.io/Geocode?latlng=${place.latitude},${place.longitude}&api_key=${GOONG_API_KEY_2}`;
    const res = await fetch(url);
    const data = await res.json();
    const placeResult = data.results?.[0];
    if (!placeResult) return;

    const placeDetail: PlaceDetail = {
      place_id: placeResult.place_id,
      name: placeResult.name,
      formatted_address: placeResult.formatted_address,
      address: placeResult.address,
      address_components: placeResult.address_components,
      compound: placeResult.compound,
      plus_code: placeResult.plus_code,
      types: placeResult.types,
      geometry: placeResult.geometry
        ? {
          location: {
            lat: placeResult.geometry.location.lat,
            lng: placeResult.geometry.location.lng,
          },
          boundary: placeResult.geometry.boundary ?? null,
        }
        : undefined,
    };

    return placeDetail
  } catch (err) {
    console.log("Select place error:", err);
  }
};

// ─── Styles (unchanged) ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingTop: 48,
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    paddingTop: 4,
  },
  tabItem: {
    marginRight: 28,
    paddingBottom: 10,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#94a3b8',
  },
  tabLabelActive: {
    color: '#22c55e',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  tabDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 8,
  },
  dateSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  dateSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  mapContainer: {
    width: '100%',
    height: 160,
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    padding: 14,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTime: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#22c55e',
    letterSpacing: 0.2,
  },
  groupTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#22c55e18',
  },
  groupTagText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#22c55e',
    letterSpacing: 0.1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  locationText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '400',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendees: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#e2e8f0',
  },
  extraCount: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  extraCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  detailsBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#22c55e',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  detailsBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  doneBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },

  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});