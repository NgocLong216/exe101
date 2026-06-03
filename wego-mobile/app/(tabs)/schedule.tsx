import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getMySchedules, ScheduleResponse } from '@/apis/scheduleAPI';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = ['Upcoming', 'Past', 'Invites'];

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

function EventCard({ event }: { event: ScheduleResponse }) {
  const router = useRouter();

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
                style={[styles.attendeeAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}
              />
            ))}
            {event.attendeeCount > 3 && (
              <View style={[styles.extraCount, { marginLeft: -10 }]}>
                <Text style={styles.extraCountText}>+{event.attendeeCount - 3}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.detailsBtn}
            activeOpacity={0.8}
            onPress={() => router.push({
              pathname: '/PlaceDetail',
              params: { prevRoute: '/(tabs)/schedule' },
            })}
          >
            <Text style={styles.detailsBtnText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Date Section ─────────────────────────────────────────────────────────────

function DateSection({ date, events }: { date: string; events: ScheduleResponse[] }) {
  return (
    <View style={styles.dateSection}>
      <Text style={styles.dateSectionLabel}>{date}</Text>
      {events.map((event) => (
        <EventCard key={event.groupId} event={event} />
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

  useEffect(() => {
    async function fetchSchedules() {
      setLoading(true);
      const data = await getMySchedules();
      setSchedules(data);
      setLoading(false);
    }
    fetchSchedules();
  }, []);

  const now = new Date();

  const filtered = schedules.filter((s) => {
    const isPast = new Date(s.meetingTime) < now;
    if (activeTab === 'Upcoming') return !isPast;
    if (activeTab === 'Past') return isPast;
    return false; // Invites — wire up separately
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
            <DateSection key={date} date={date} events={events} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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
});