import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { ArrowLeft, Clock, MapPin, UserPlus, XCircle } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Định nghĩa kiểu dữ liệu cho Notification
type NotificationItem = {
  id: string;
  type: 'group_invite' | 'meeting_declined' | 'new_meeting_point' | 'meeting_soon';
  title: string;
  time: string;
  description: React.ReactNode; // Dùng ReactNode để có thể highlight text màu xanh lá
  hasButtons?: boolean;
  hasDetailsButton?: boolean;
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter()

  const fetchInvitations = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token =
        await getAuth().currentUser?.getIdToken();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/groups/invitations`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      setNotifications(data);

    } catch (error) {
      console.log(
        "FETCH INVITATIONS ERROR:",
        error
      );
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const onRefresh = useCallback(() => {
    fetchInvitations(true);
  }, [fetchInvitations]);

  const acceptInvite = async (
    memberId: string
  ) => {
    try {

      const token =
        await getAuth().currentUser?.getIdToken();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/groups/invitations/${memberId}/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          await response.text()
        );
      }

      setNotifications(prev =>
        prev.filter(
          item => item.memberId !== memberId
        )
      );

    } catch (error) {
      console.log(
        "ACCEPT INVITE ERROR:",
        error
      );
    }
  };

  const rejectInvite = async (
    memberId: string
  ) => {
    try {

      const token =
        await getAuth().currentUser?.getIdToken();

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/groups/invitations/${memberId}/reject`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          await response.text()
        );
      }

      setNotifications(prev =>
        prev.filter(
          item => item.memberId !== memberId
        )
      );

    } catch (error) {
      console.log(
        "REJECT INVITE ERROR:",
        error
      );
    }
  };

  // Hàm render Icon và Background tương ứng cho từng loại thông báo
  const renderIcon = (type: string) => {
    switch (type) {
      case 'group_invite':
        return (
          <View style={[styles.iconContainer, { backgroundColor: '#EBF3FF' }]}>
            <UserPlus size={22} color="#22C55E" />
          </View>
        );
      case 'meeting_declined':
        return (
          <View style={[styles.iconContainer, { backgroundColor: '#FFE6E6' }]}>
            <XCircle size={22} color="#EF4444" />
          </View>
        );
      case 'new_meeting_point':
        return (
          <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
            <MapPin size={22} color="#0EA5E9" />
          </View>
        );
      case 'meeting_soon':
        return (
          <View style={[styles.iconContainer, { backgroundColor: '#FEF9C3' }]}>
            <Clock size={22} color="#D97706" />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={
          styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }

            router.dismissTo('/(tabs)/groups');
          }}
          activeOpacity={0.7}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#22C55E"
              colors={['#22C55E']}
            />
          }
        >
          {/* Section Title */}
          <Text style={styles.sectionTitle}>TODAY</Text>

          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No notifications</Text>
            </View>
          ) : (
            /* List thông báo */
            notifications.map((item) => (
              <View
                key={item.memberId}
                style={styles.notificationCard}
              >
                <View style={styles.row}>

                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: "#EBF3FF" }
                    ]}
                  >
                    <UserPlus
                      size={22}
                      color="#22C55E"
                    />
                  </View>

                  <View style={styles.textContainer}>

                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>
                        Group Invitation
                      </Text>

                      <Text style={styles.timeText}>
                        Pending
                      </Text>
                    </View>

                    <Text style={styles.descText}>
                      You have been invited to join{" "}
                      <Text style={styles.highlightText}>
                        {item.groupTitle}
                      </Text>
                    </Text>

                    <View style={styles.buttonGroup}>
                      <TouchableOpacity
                        style={[
                          styles.btn,
                          styles.btnAccept,
                        ]}
                        onPress={() =>
                          acceptInvite(
                            item.memberId
                          )
                        }
                      >
                        <Text
                          style={
                            styles.btnTextAccept
                          }
                        >
                          Accept
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.btn,
                          styles.btnDecline,
                        ]}
                        onPress={() =>
                          rejectInvite(
                            item.memberId
                          )
                        }
                      >
                        <Text
                          style={
                            styles.btnTextDecline
                          }
                        >
                          Decline
                        </Text>
                      </TouchableOpacity>
                    </View>

                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '500',
  },
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginLeft: 16,
  },
  markAllText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#22C55E',
  },
  // Section styles
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: '#F8FAFC', // Tạo background xám nhạt cho phần phân cách như hình
  },
  // Card styles
  notificationCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  timeText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  descText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  highlightText: {
    color: '#22C55E',
    fontWeight: '500',
  },
  // Button styles
  buttonGroup: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    maxWidth: 110,
  },
  btnAccept: {
    backgroundColor: '#22C55E',
  },
  btnDecline: {
    backgroundColor: '#EF4444',
  },
  btnDetails: {
    backgroundColor: '#F1F5F9',
  },
  btnTextAccept: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  btnTextDecline: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  btnTextDetails: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 14,
  },
});