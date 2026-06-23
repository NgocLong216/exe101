import { getInviteLink } from '@/apis/groupAPI';
import { auth, db } from '@/firebase';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { off, onValue, ref } from "firebase/database";
import { ArrowLeft, Bot, ChevronRight, Navigation, Search, UserPlus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type GroupMember = {
  firebaseUid: string;
  name: string;
  avatar: string;
  host: boolean;
  canKick?: boolean;
  statusDot: 'green' | 'orange' | 'gray';
  distance: string;
};

type GroupMembersRouteParams = {
  GroupMembers: {
    groupId: string;
    groupName: string;
    memberCount: number;
    activeCount: number;
  };
};

const STATUS_DOT_COLORS = {
  green: '#22c55e',
  orange: '#f97316',
  gray: '#94a3b8',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MemberRow({
  item,
  onKick,
}: {
  item: GroupMember;
  onKick: (uid: string, name: string) => void;
}) {
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
        <Text style={styles.memberName}>
          {item.name}
        </Text>

        <View style={styles.distanceRow}>
          <Navigation
            size={12}
            color="#94a3b8"
            strokeWidth={2}
            style={{ marginRight: 3 }}
          />
          <Text style={styles.distanceText}>
            {item.distance}
          </Text>
        </View>
      </View>

      {item.canKick && (
        <TouchableOpacity
          style={styles.kickButton}
          onPress={() =>
            onKick(item.firebaseUid, item.name)
          }
        >
          <Text style={styles.kickText}>
            Kick
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GroupMembersScreen() {

  const router = useRouter()

  const [memberUids, setMemberUids] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const { groupId, groupName, groupPhoto } = useLocalSearchParams<{
    groupId: string;
    groupName: string;
    groupPhoto: string;
  }>();

  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [presence, setPresence] = useState<Record<string, any>>({});

  const membersWithPresence: GroupMember[] = members.map(member => {
    const p = presence[member.firebaseUid];
  
    let status: 'green' | 'orange' | 'gray' = 'gray';
  
    if (p?.online) {
      status = 'green';
    }
  
    return {
      ...member,
      statusDot: status,
    };
  });

  useEffect(() => {
    const presenceRef = ref(db, "presence");
  
    onValue(
      presenceRef,
      (snapshot) => {
  
        setPresence(snapshot.val() || {});
      },
      (error) => {
        console.log(
          "PRESENCE ERROR:",
          error
        );
      }
    );
  
    return () => off(presenceRef);
  
  }, []);

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    const hostMember = members.find(
      m =>
        m.firebaseUid === currentUser.uid &&
        m.host === true
    );

    setIsHost(!!hostMember);
  }, [members]);

  const leaveGroup = async () => {
    try {

      const user = auth.currentUser;

      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/groups/${groupId}/leave`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const text = await response.text();

      if (!response.ok) {
        throw new Error(text);
      }

      Alert.alert(
        "Success",
        "You left the group",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace("/(tabs)/groups"),
          },
        ]
      );

    } catch (error: any) {

      Alert.alert(
        "Leave Failed",
        error?.message || "Cannot leave group"
      );

      console.log(error);
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      "Leave Group",
      "Are you sure you want to leave this group?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Leave",
          style: "destructive",
          onPress: leaveGroup,
        },
      ]
    );
  };

  const kickMember = async (
    firebaseUid: string,
    memberName: string
  ) => {
    try {

      const user = auth.currentUser;

      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/groups/${groupId}/members/${firebaseUid}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const text = await response.text();

      if (!response.ok) {
        throw new Error(text);
      }

      Alert.alert(
        "Success",
        `${memberName} has been removed`
      );

      fetchMembers();

    } catch (error: any) {

      Alert.alert(
        "Kick Failed",
        error?.message || "Cannot remove member"
      );

      console.log(error);
    }
  };

  const confirmKickMember = (
    firebaseUid: string,
    memberName: string
  ) => {

    Alert.alert(
      "Remove Member",
      `Remove ${memberName} from this group?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            kickMember(firebaseUid, memberName),
        },
      ]
    );
  };

  const searchUsers = async (keyword: string) => {
    try {
      if (!keyword.trim()) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);

      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/users/search?keyword=${encodeURIComponent(keyword)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      setSearchResults(data);

    } catch (error) {
      console.log("SEARCH USER ERROR:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  const inviteMember = async (firebaseUid: string) => {
    try {

      const user = auth.currentUser;

      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/groups/${groupId}/invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            firebaseUid,
          }),
        }
      );

      const text = await response.text();

      if (!response.ok) {
        throw new Error(text);
      }

      setInvitedUsers(prev => [
        ...prev,
        firebaseUid,
      ]);

      Alert.alert("Success", "Invitation sent");

    } catch (error: any) {

      Alert.alert(
        "Invite Failed",
        error?.message || "Cannot invite user"
      );

      console.log(error);
    }
  };

  const handleCopyInvite = async () => {

    try {
  
      const res =
        await getInviteLink(groupId);
  
      await Clipboard.setStringAsync(
  
        res.data.inviteLink
  
      );
  
      Alert.alert(
  
        "Success",
  
        "Invite link copied"
  
      );
  
    } catch {
  
      Alert.alert(
  
        "Error",
  
        "Cannot copy invite link"
  
      );
  
    }
  
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteGroup,
        },
      ]
    );
  };

  const deleteGroup = async () => {
    try {

      const user = auth.currentUser;

      if (!user) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      const token = await user.getIdToken();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/groups/${groupId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {

        const errorText = await response.text();

        throw new Error(errorText);
      }

      Alert.alert(
        'Success',
        'Group deleted successfully',
        [
          {
            text: 'OK',
            onPress: () =>
              router.replace('/(tabs)/groups'),
          },
        ]
      );

    } catch (error: any) {

      console.log('DELETE GROUP ERROR:', error);

      Alert.alert(
        'Delete Failed',
        error?.message || 'Cannot delete group'
      );
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/groups/${groupId}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      setMembers(data);

    } catch (error) {
      console.log("FETCH MEMBERS ERROR:", error);
    }
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
          {/* <Text style={styles.headerSub}>{memberCount} Members Active</Text> */}
        </View>
        <View style={styles.searchContainer}>
          <Search
            size={18}
            color="#94a3b8"
            style={{ marginHorizontal: 8 }}
          />

          <TextInput
            placeholder="Search users..."
            placeholderTextColor="#94A3B8"
            value={searchKeyword}
            onChangeText={(text) => {
              setSearchKeyword(text);
              searchUsers(text);
            }}
            style={styles.searchInput}
          />
        </View>
      </View>

      {searchKeyword.length > 0 && (
        <View style={styles.searchResultContainer}>

          {searchLoading && (
            <Text style={{ padding: 12 }}>
              Searching...
            </Text>
          )}

          {searchResults.map((user) => (
            <View
              key={user.firebaseUid}
              style={styles.searchUserRow}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <Image
                  source={{ uri: user.avatar }}
                  style={styles.searchAvatar}
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.searchName}>
                    {user.name}
                  </Text>

                  <Text style={styles.searchEmail}>
                    {user.email}
                  </Text>
                </View>
              </View>

              <View style={styles.searchResultActions}>
                {invitedUsers.includes(user.firebaseUid) ? (
                  <View style={styles.invitedButton}>
                    <Text style={styles.invitedText}>
                      Invited
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.inviteButton}
                    onPress={() =>
                      inviteMember(user.firebaseUid)
                    }
                  >
                    <UserPlus
                      size={18}
                      color="#fff"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Meeting Point Banner */}
        {/* <View style={styles.meetingBannerGreen}>
          <View style={styles.meetingIconWrap}>
            <MapPin size={20} color="#9dffc1" strokeWidth={2.2} />
          </View>
          <View style={styles.meetingTextWrap}>
            <Text style={styles.meetingLabel}>MEETING POINT</Text>
            <Text style={styles.meetingValue}>Central Park South Entrance</Text>
          </View>
        </View> */}

        {/* Chatbot Banner */}
        <TouchableOpacity
          style={styles.meetingBannerBlue}
          onPress={() => router.push({
            pathname: '/GroupChat',
            params: {
              groupId: groupId,
              groupName: groupName,
              groupMembers: members.length,
              groupPhoto: groupPhoto,
            },
          })}
        >
          <View style={styles.meetingIconWrapBlue}>
            <Bot size={20} color="#c7dbfb" strokeWidth={2.2} />
          </View>
          <View style={styles.meetingTextWrap}>
            <View>
              <Text style={styles.meetingLabelBlue}>PLAN WITH AI ASSISTANT</Text>
              <Text style={styles.meetingValueBlue}>Find more with our chat bot</Text>
            </View>
          </View>
          <ChevronRight />
        </TouchableOpacity>

        {/* Members List */}
        <View style={styles.membersList}>
          {membersWithPresence.map((member, index) => (
            <View key={member.firebaseUid}>
              <MemberRow
                item={member}
                onKick={confirmKickMember}
              />
              {index < members.length - 1 && (
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
          onPress={
            isHost
              ? handleDeleteGroup
              : handleLeaveGroup
          }
        >
          <Text style={styles.deleteText}>
            {isHost
              ? "Delete Group"
              : "Leave Group"}
          </Text>
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

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    flex: 1,
    marginLeft: 12,
    height: 40,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
  },

  searchResultContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    marginTop: 10,
    overflow: 'hidden',
  },

  searchUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  searchAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },

  searchName: {
    fontWeight: '600',
    fontSize: 15,
    color: '#0f172a',
  },

  searchEmail: {
    fontSize: 13,
    color: '#64748b',
  },

  inviteButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },

  searchResultActions: {
    justifyContent: 'center',
  },

  invitedButton: {
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  invitedText: {
    color: '#16a34a',
    fontWeight: '600',
    fontSize: 13,
  },

  kickButton: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  kickText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 13,
  },
});