import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

// ─── Types ────────────────────────────────────────────────────────────────────

type Event = {
  id: string;
  time: string;
  group: string;
  groupColor: string;
  title: string;
  location: string;
  mapImage: string;
  attendees: string[];
  extraCount: number;
  date: string; // e.g. "TODAY, OCT 5"
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const EVENTS: Event[] = [
  {
    id: '1',
    date: 'TODAY, OCT 5',
    time: '10:00 AM',
    group: 'Beach Day Crew',
    groupColor: '#22c55e',
    title: 'Santa Monica Pier',
    location: 'Main Entrance, Ocean Ave',
    mapImage: 'https://maps.googleapis.com/maps/api/staticmap?center=Santa+Monica+Pier,CA&zoom=13&size=600x200&maptype=roadmap&key=DEMO',
    attendees: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face',
    ],
    extraCount: 4,
  },
  {
    id: '2',
    date: 'TOMORROW, OCT 6',
    time: '7:30 AM',
    group: 'Hiking Enthusiasts',
    groupColor: '#f97316',
    title: 'Griffith Park Trail',
    location: 'Observatory Parking Lot',
    mapImage: 'https://maps.googleapis.com/maps/api/staticmap?center=Griffith+Park,Los+Angeles,CA&zoom=13&size=600x200&maptype=roadmap&key=DEMO',
    attendees: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop&crop=face',
    ],
    extraCount: 7,
  },
  {
    id: '3',
    date: 'TOMORROW, OCT 6',
    time: '1:00 PM',
    group: 'Study Group',
    groupColor: '#3b82f6',
    title: 'Central Library',
    location: '630 W 5th St, Los Angeles',
    mapImage: 'https://maps.googleapis.com/maps/api/staticmap?center=Central+Library,Los+Angeles,CA&zoom=14&size=600x200&maptype=roadmap&key=DEMO',
    attendees: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face',
    ],
    extraCount: 2,
  },
];

const PAST_EVENTS: Event[] = [
  {
    id: '4',
    date: 'OCT 1',
    time: '6:00 PM',
    group: 'Music Lovers',
    groupColor: '#a855f7',
    title: 'Echo Park Live Show',
    location: 'Echo Park Lake Bandstand',
    mapImage: 'https://maps.googleapis.com/maps/api/staticmap?center=Echo+Park,Los+Angeles,CA&zoom=14&size=600x200&maptype=roadmap&key=DEMO',
    attendees: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&crop=face',
    ],
    extraCount: 12,
  },
];

const TABS = ['Upcoming', 'Past', 'Invites'];

// ─── Map Placeholder ──────────────────────────────────────────────────────────
// Since Google Maps static API needs a key, we use a styled placeholder
function MapPlaceholder({ seed }: { seed: string }) {
  // Use Unsplash for a realistic map-like aerial/city image
  const mapImages: Record<string, string> = {
    '1': 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=600&h=200&fit=crop',
    '2': 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=200&fit=crop',
    '3': 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&h=200&fit=crop',
    '4': 'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?w=600&h=200&fit=crop',
  };
  return (
    <Image
      source={{ uri: mapImages[seed] || mapImages['1'] }}
      style={styles.mapImage}
      resizeMode="cover"
    />
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: Event }) {
  return (
    <View style={styles.card}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <MapPlaceholder seed={event.id} />
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        {/* Time + Group tag */}
        <View style={styles.cardMeta}>
          <Text style={styles.cardTime}>{event.time}</Text>
          <View style={[styles.groupTag, { backgroundColor: event.groupColor + '18' }]}>
            <Text style={[styles.groupTagText, { color: event.groupColor }]}>
              {event.group}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.cardTitle}>{event.title}</Text>

        {/* Location */}
        <View style={styles.locationRow}>
          <MapPin size={13} color="#94a3b8" strokeWidth={2} style={{ marginRight: 4 }} />
          <Text style={styles.locationText}>{event.location}</Text>
        </View>

        {/* Attendees + Details */}
        <View style={styles.cardFooter}>
          <View style={styles.attendees}>
            {event.attendees.map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={[styles.attendeeAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}
              />
            ))}
            {event.extraCount > 0 && (
              <View style={[styles.extraCount, { marginLeft: -10 }]}>
                <Text style={styles.extraCountText}>+{event.extraCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.detailsBtn} activeOpacity={0.8}>
            <Text style={styles.detailsBtnText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Date Section ─────────────────────────────────────────────────────────────

function DateSection({ date, events }: { date: string; events: Event[] }) {
  return (
    <View style={styles.dateSection}>
      <Text style={styles.dateSectionLabel}>{date}</Text>
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const [activeTab, setActiveTab] = useState('Upcoming');
  const insets = useSafeAreaInsets();

  const currentEvents = activeTab === 'Past' ? PAST_EVENTS : activeTab === 'Upcoming' ? EVENTS : [];

  // Group events by date
  const grouped = currentEvents.reduce<Record<string, Event[]>>((acc, event) => {
    if (!acc[event.date]) acc[event.date] = [];
    acc[event.date].push(event);
    return acc;
  }, {});

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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {Object.keys(grouped).length === 0 ? (
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingTop: 48,
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Tabs
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

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 8,
  },

  // Date Section
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

  // Card
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
  },
  groupTagText: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.4,
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

  // Footer
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

  // Empty
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