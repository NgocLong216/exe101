import { getAuth } from 'firebase/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Bot, ChevronRight, MapPin, Navigation, Search, UserPlus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import {
  getGroupMembers,
  kickMember,
  deleteGroup,
  leaveGroup,
  type GroupMember,
} from '@/apis/groups'; // adjust path to wherever your api file lives

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  onBack?: () => void;
};

const STATUS_DOT_COLORS = {
  green: '#22c55e',
  orange: '#f97316',
  gray: '#94a3b8',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MemberRow({
  item,
  currentUid,
  onKick,
  onLeave,
}: {
  item: GroupMember;
  currentUid: string | null;
  onKick: (uid: string, name: string) => void;
  onLeave: () => void;
}) {
  const isMe = item.firebaseUid === currentUid;

  return (
    <View style={styles.memberRow}>
      <View style={styles.avatarWrapper}>
        <View style={[styles.memberAvatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>
            {item.name?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: STATUS_DOT_COLORS.green },
          ]}
        />
      </View>

      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {item.name}
          {item.host ? ' 👑' : ''}
          {isMe ? ' (You)' : ''}
        </Text>
      </View>

      {/* Kick — only non-host, non-me members */}
      {!item.host && !isMe && (
        <TouchableOpacity
          style={styles.kickBtn}
          activeOpacity={0.7}
          onPress={() => onKick(item.firebaseUid, item.name)}
        >
          <Text style={styles.kickText}>Kick</Text>
        </TouchableOpacity>
      )}

      {/* Leave — only myself, non-host */}
      {!item.host && isMe && (
        <TouchableOpacity
          style={styles.leaveBtn}
          activeOpacity={0.7}
          onPress={onLeave}
        >
          <Text style={styles.leaveText}>Leave</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GroupMembersScreen({
  onBack,
}: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  const { groupId, groupName, memberCount } = useLocalSearchParams<{
    groupId: string;
    groupName: string;
    memberCount: string;
  }>();

  // ── Load current user ──
  useEffect(() => {
    const user = getAuth().currentUser;
    if (user) setCurrentUid(user.uid);
  }, []);

  // ── Load members ──
  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    getGroupMembers(groupId)
      .then(setMembers)
      .finally(() => setLoading(false));
  }, [groupId]);

  // ── Actions ──
  const handleKick = (firebaseUid: string, name: string) => {
    Alert.alert(
      'Kick Member',
      `Remove ${name} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Kick',
          style: 'destructive',
          onPress: async () => {
            try {
              await kickMember(groupId, firebaseUid);
              setMembers(prev => prev.filter(m => m.firebaseUid !== firebaseUid));
            } catch {
              Alert.alert('Error', 'Failed to kick member.');
            }
          },
        },
      ]
    );
  };

  const handleLeave = () => {
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup(groupId);
              router.replace('/(tabs)/groups');
            } catch {
              Alert.alert('Error', 'Failed to leave group.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup(groupId);
              router.replace('/(tabs)/groups');
            } catch {
              Alert.alert('Error', 'Failed to delete group.');
            }
          },
        },
      ]
    );
  };

  const handleCopyLink = () => {
    Alert.alert('Link Copied', 'Invite link has been copied to clipboard.');
  };

  const displayMemberCount = memberCount ?? members.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/(tabs)/groups' })}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#1e293b" strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{groupName}</Text>
          <Text style={styles.headerSub}>{displayMemberCount} Members Active</Text>
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
            <MapPin size={20} color="#9dffc1" strokeWidth={2.2} />
          </View>
          <View style={styles.meetingTextWrap}>
            <Text style={styles.meetingLabel}>MEETING POINT</Text>
            <Text style={styles.meetingValue}>Central Park South Entrance</Text>
          </View>
        </View>

        {/* Chatbot Banner */}
        <TouchableOpacity
          style={styles.meetingBannerBlue}
          onPress={() => router.push({ pathname: '/GroupChat' })}
        >
          <View style={styles.meetingIconWrapBlue}>
            <Bot size={20} color="#c7dbfb" strokeWidth={2.2} />
          </View>
          <View style={styles.meetingTextWrap}>
            <Text style={styles.meetingLabelBlue}>PLAN WITH AI ASSISTANT</Text>
            <Text style={styles.meetingValueBlue}>Find more with our chat bot</Text>
          </View>
          <ChevronRight />
        </TouchableOpacity>

        {/* Members List */}
        <View style={styles.membersList}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color="#22c55e"
              style={{ paddingVertical: 24 }}
            />
          ) : members.length === 0 ? (
            <Text style={styles.emptyText}>No members found.</Text>
          ) : (
            members.map((member, index) => (
              <View key={member.firebaseUid}>
                <MemberRow
                  item={member}
                  currentUid={currentUid}
                  onKick={handleKick}
                  onLeave={handleLeave}
                />
                {index < members.length - 1 && (
                  <View style={styles.memberSeparator} />
                )}
              </View>
            ))
          )}
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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
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
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#22c55e',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  meetingIconWrapBlue: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  meetingTextWrap: { flex: 1 },
  meetingLabel: {
    fontSize: 10, fontWeight: '700', color: '#16a34a',
    letterSpacing: 0.8, marginBottom: 3,
  },
  meetingValue: {
    fontSize: 15, fontWeight: '700', color: '#0f172a', letterSpacing: -0.2,
  },
  meetingLabelBlue: {
    fontSize: 10, fontWeight: '700', color: '#2563eb',
    letterSpacing: 0.8, marginBottom: 3,
  },
  meetingValueBlue: {
    fontSize: 15, fontWeight: '700', color: '#0f172a', letterSpacing: -0.2,
  },
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
    width: 54, height: 54, borderRadius: 27,
  },
  avatarFallback: {
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748b',
  },
  statusDot: {
    position: 'absolute',
    bottom: 1, right: 1,
    width: 13, height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  memberInfo: { flex: 1 },
  memberName: {
    fontSize: 15.5, fontWeight: '600', color: '#0f172a',
    marginBottom: 3, letterSpacing: -0.2,
  },
  distanceRow: { flexDirection: 'row', alignItems: 'center' },
  distanceText: { fontSize: 13, color: '#64748b', fontWeight: '400' },
  memberSeparator: {
    height: 1, backgroundColor: '#f1f5f9', marginLeft: 68,
  },
  kickBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  kickText: {
    fontSize: 13, fontWeight: '600', color: '#ef4444',
  },
  leaveBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  leaveText: {
    fontSize: 13, fontWeight: '600', color: '#64748b',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    paddingVertical: 24,
    fontSize: 14,
  },
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
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  inviteTitle: {
    fontSize: 16, fontWeight: '700', color: '#0f172a',
    marginBottom: 6, letterSpacing: -0.2,
  },
  inviteSubtitle: {
    fontSize: 13.5, color: '#64748b', textAlign: 'center',
    lineHeight: 20, marginBottom: 18, paddingHorizontal: 8,
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
    fontSize: 15, fontWeight: '600', color: '#16a34a', letterSpacing: -0.1,
  },
  deleteBtn: {
    backgroundColor: '#fff1f2',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 15, fontWeight: '600', color: '#ef4444', letterSpacing: -0.1,
  },
});