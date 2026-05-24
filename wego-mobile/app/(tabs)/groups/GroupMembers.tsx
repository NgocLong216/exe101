import { useRouter } from 'expo-router';
import { ArrowLeft, Bot, MapPin, Navigation, Search, UserPlus } from 'lucide-react-native';
import React from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type Member = {
  id: string;
  name: string;
  distance: string;
  avatar: string;
  statusDot: 'green' | 'orange' | 'gray';
};

type GroupMembersRouteParams = {
  GroupMembers: {
    groupId: string;
    groupName: string;
    memberCount: number;
    activeCount: number;
  };
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MEMBERS: Member[] = [
  {
    id: '1',
    name: 'Alex Johnson',
    distance: '0.4 miles away',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    statusDot: 'green',
  },
  {
    id: '2',
    name: 'Sarah Chen',
    distance: '1.2 miles away',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    statusDot: 'green',
  },
  {
    id: '3',
    name: 'David Miller',
    distance: '2.8 miles away',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    statusDot: 'orange',
  },
  {
    id: '4',
    name: 'Emma Wilson',
    distance: '5.5 miles away',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    statusDot: 'gray',
  },
];

const STATUS_DOT_COLORS = {
  green: '#22c55e',
  orange: '#f97316',
  gray: '#94a3b8',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MemberRow({ item }: { item: Member }) {
  return (
    <View style={styles.memberRow}>
      <View style={styles.avatarWrapper}>
        <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
        <View
          style={[
            styles.statusDot,
            { backgroundColor: STATUS_DOT_COLORS[item.statusDot] },
          ]}
        />
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <View style={styles.distanceRow}>
          <Navigation size={12} color="#94a3b8" strokeWidth={2} style={{ marginRight: 3 }} />
          <Text style={styles.distanceText}>{item.distance}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Props = {
  groupName?: string;
  memberCount?: number;
  activeCount?: number;
  onBack?: () => void;
};

export default function GroupMembersScreen({
  groupName = 'Weekend Hike',
  memberCount = 6,
  activeCount = 6,
  onBack,
}: Props) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) onBack();
    // navigation.goBack();
  };

  const handleCopyLink = () => {
    Alert.alert('Link Copied', 'Invite link has been copied to clipboard.');
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { } },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: '/(tabs)/groups'
            })
          }
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#1e293b" strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{groupName}</Text>
          <Text style={styles.headerSub}>{memberCount} Members Active</Text>
        </View>
        <TouchableOpacity style={styles.searchBtn} activeOpacity={0.7}>
          <Search size={20} color="#22c55e" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Meeting Point Banner */}
        <View style={styles.meetingBannerGreen}>
          <View style={styles.meetingIconWrap}>
            <MapPin size={20} color="#22c55e" strokeWidth={2.2} />
          </View>
          <View style={styles.meetingTextWrap}>
            <Text style={styles.meetingLabel}>MEETING POINT</Text>
            <Text style={styles.meetingValue}>Central Park South Entrance</Text>
          </View>
        </View>

        {/* Chatbot Banner */}
        <View style={styles.meetingBannerBlue}>
          <View style={styles.meetingIconWrapBlue}>
            <Bot size={20} color="#3b82f6" strokeWidth={2.2} />
          </View>
          <View style={styles.meetingTextWrap}>
            <Text style={styles.meetingLabelBlue}>MEETING POINT</Text>
            <Text style={styles.meetingValueBlue}>Find more with our chat bot</Text>
          </View>
        </View>

        {/* Members List */}
        <View style={styles.membersList}>
          {MEMBERS.map((member, index) => (
            <View key={member.id}>
              <MemberRow item={member} />
              {index < MEMBERS.length - 1 && (
                <View style={styles.memberSeparator} />
              )}
            </View>
          ))}
        </View>

        {/* Invite Card */}
        <View style={styles.inviteCard}>
          <View style={styles.inviteIconCircle}>
            <UserPlus size={26} color="#94a3b8" strokeWidth={1.8} />
          </View>
          <Text style={styles.inviteTitle}>Invite more friends</Text>
          <Text style={styles.inviteSubtitle}>
            Share your group link so others can join the tracking
          </Text>
          <TouchableOpacity
            style={styles.copyLinkBtn}
            activeOpacity={0.8}
            onPress={handleCopyLink}
          >
            <Text style={styles.copyLinkText}>Copy Invite Link</Text>
          </TouchableOpacity>
        </View>

        {/* Delete Group */}
        <TouchableOpacity
          style={styles.deleteBtn}
          activeOpacity={0.8}
          onPress={handleDeleteGroup}
        >
          <Text style={styles.deleteText}>Delete Group</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingTop: 32,
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
    fontWeight: '400',
  },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Meeting Banners
  meetingBannerGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  meetingBannerBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  meetingIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  meetingIconWrapBlue: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  meetingTextWrap: {
    flex: 1,
  },
  meetingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  meetingValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  meetingLabelBlue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  meetingValueBlue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },

  // Members
  membersList: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  memberAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#e2e8f0',
  },
  statusDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '400',
  },
  memberSeparator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 68,
  },

  // Invite Card
  inviteCard: {
    backgroundColor: '#f8fafc',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
  },
  inviteIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  inviteSubtitle: {
    fontSize: 13.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  copyLinkBtn: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  copyLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#16a34a',
    letterSpacing: -0.1,
  },

  // Delete
  deleteBtn: {
    backgroundColor: '#fff1f2',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
    letterSpacing: -0.1,
  },
});