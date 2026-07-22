import { updateLocationSharing } from '@/apis/locationAPI';
import { updateNotificationSetting } from '@/apis/notificationAPI';
import { getCurrentUserProfile, hasActivePlus } from '@/apis/userAPI';
import { deleteMyAccount } from '@/apis/accountAPI';
import { useAuth } from '@/auth0/AuthContext';
import { auth, db } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Href, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ref, remove } from "firebase/database";
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const GREEN = '#22c55e';
const LIGHT_GREEN_BG = '#f0fdf4';
const GRAY_TEXT = '#6b7280';
const BORDER = '#f0f0f0';
const PRIVACY_POLICY_URL = "https://wego-ten.vercel.app/policy.html";
const TERMS_OF_SERVICE_URL = "https://wego-ten.vercel.app/term.html";

export default function SettingsScreen() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);
  const [isPlus, setIsPlus] = useState(false);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { user, logout, loading } = useAuth()

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your profile, Personal AI history, memberships, payments, and groups you own. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final confirmation',
              'Are you absolutely sure you want to delete your WeGo account?',
              [
                { text: 'Keep account', style: 'cancel' },
                {
                  text: 'Yes, delete it',
                  style: 'destructive',
                  onPress: async () => {
                    setDeletingAccount(true);
                    try {
                      await deleteMyAccount();
                      await logout();
                      router.replace('/login');
                    } catch (error) {
                      Alert.alert('Deletion failed', error instanceof Error ? error.message : 'Please try again.');
                    } finally {
                      setDeletingAccount(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getCurrentUserProfile()
        .then((profile) => {
          if (!active) return;
          setIsPlus(hasActivePlus(profile));
          setPlanExpiresAt(profile.planExpiresAt || null);
        })
        .catch((error) => console.warn('Could not load plan', error));
      return () => { active = false; };
    }, [])
  );

  const registerForPushNotifications = async () => {
    if (!Device.isDevice) return false;

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } =
        await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    return true;
  };

  const toggleNotifications = async (
    value: boolean
  ) => {
  
    try {
  
      setPushNotifications(value);
  
      await AsyncStorage.setItem(
        'pushNotifications',
        JSON.stringify(value)
      );
  
      const token =
        await auth
          .currentUser
          ?.getIdToken();
  
      if (!token) return;
  
      await updateNotificationSetting(
        value,
        token
      );
  
    } catch (error) {
  
      console.log(error);
  
      setPushNotifications(!value);
    }
  };

  useEffect(() => {
    const loadSetting = async () => {
      const value = await AsyncStorage.getItem(
        'pushNotifications'
      );

      if (value !== null) {
        setPushNotifications(JSON.parse(value));
      }
    };

    loadSetting();
  }, []);

  const toggleLocationSharing = async (
    value: boolean
  ) => {
  
    try {
  
      setLocationSharing(value);
  
      await AsyncStorage.setItem(
        'locationSharing',
        JSON.stringify(value)
      );

      if (!value) {
        const user = auth.currentUser;
  
        if (user) {
          await remove(
            ref(
              db,
              `live_locations/${user.uid}`
            )
          );
        }
      }

      const token =
        await auth
          .currentUser
          ?.getIdToken();
  
      if (!token) return;
  
      await updateLocationSharing(
        value,
        token
      );
  
    } catch (error) {
  
      console.log(error);
  
      setLocationSharing(!value);
    }
  };

  useEffect(() => {
    const loadSetting = async () => {
      const value = await AsyncStorage.getItem('locationSharing');
  
      if (value !== null) {
        setLocationSharing(JSON.parse(value));
      } else {
        setLocationSharing(true); 
      }
    };
  
    loadSetting();
  }, []);

  const SectionLabel = ({ title }: { title: string }) => (
    <Text style={styles.sectionLabel}>{title}</Text>
  );

  const RowItem = ({
    icon,
    label,
    subtitle,
    rightElement,
    onPress,
    danger,
  }: {
    icon: string;
    label: string;
    subtitle?: string;
    rightElement?: React.ReactNode;
    onPress?: () => void;
    danger?: boolean;
  }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon as any} size={20} color={danger ? '#ef4444' : GREEN} />
        </View>
        <View>
          <Text style={[styles.rowLabel, danger && { color: '#ef4444' }]}>{label}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View>{rightElement}</View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: user?.picture }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Edit Profile Button */}
        {/* <TouchableOpacity style={styles.editBtn} activeOpacity={0.85}>
          <Ionicons name="pencil" size={16} color="#fff" />
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity> */}

        {/* App Settings */}
        <SectionLabel title="MEMBERSHIP" />
        <View style={styles.card}>
          <RowItem
            icon="sparkles-outline"
            label="Plan & Billing"
            subtitle={isPlus
              ? `WeGo Plus${planExpiresAt ? ` · expires ${new Date(planExpiresAt).toLocaleDateString()}` : ''}`
              : 'Free plan'}
            rightElement={<Ionicons name="chevron-forward" size={18} color="#d1d5db" />}
            onPress={() => router.push('/UpdatePlan' as Href)}
          />
        </View>

        {/* App Settings */}
        <SectionLabel title="APP SETTINGS" />
        <View style={styles.card}>
          <RowItem
            icon="notifications-outline"
            label="Push Notifications"
            rightElement={
              <Switch
                value={pushNotifications}
                onValueChange={toggleNotifications}
                trackColor={{ false: '#d1d5db', true: GREEN }}
                thumbColor="#fff"
              />
            }
          />
          <View style={styles.divider} />
          <RowItem
            icon="location-outline"
            label="Location Sharing"
            rightElement={
              <Switch
                value={locationSharing}
                onValueChange={toggleLocationSharing}
                trackColor={{ false: '#d1d5db', true: GREEN }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* Preferences */}
        <SectionLabel title="PREFERENCES" />
        <View style={styles.card}>
          <RowItem
            icon="map-outline"
            label="Map Style"
            subtitle="Standard"
            rightElement={<Ionicons name="chevron-forward" size={18} color="#d1d5db" />}
            onPress={() => { }}
          />
          <View style={styles.divider} />
          <RowItem
            icon="speedometer-outline"
            label="Unit System"
            subtitle="Metric (km)"
            rightElement={<Ionicons name="chevron-forward" size={18} color="#d1d5db" />}
            onPress={() => { }}
          />
        </View>

        {/* Account & Privacy */}
        <SectionLabel title="ACCOUNT & PRIVACY" />
        <View style={styles.card}>
          <RowItem
            icon="lock-closed-outline"
            label="Privacy Policy"
            rightElement={<Ionicons name="open-outline" size={18} color="#d1d5db" />}
            onPress={() =>
              Linking.openURL(PRIVACY_POLICY_URL)
            }
          />
          <View style={styles.divider} />
          <RowItem
            icon="document-text-outline"
            label="Terms of Service"
            rightElement={<Ionicons name="open-outline" size={18} color="#d1d5db" />}
            onPress={() =>
              Linking.openURL(TERMS_OF_SERVICE_URL)
            }
          />
        </View>

        {/* Log Out */}
        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85} onPress={logout} disabled={loading}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteAccountBtn}
          activeOpacity={0.85}
          onPress={confirmDeleteAccount}
          disabled={deletingAccount}
        >
          {deletingAccount
            ? <ActivityIndicator color="#b91c1c" />
            : <Ionicons name="trash-outline" size={18} color="#b91c1c" />}
          <Text style={styles.deleteAccountText}>
            {deletingAccount ? 'Deleting account…' : 'Delete Account'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scroll: {
    flex: 1,
    top: 18,
    marginBottom: 24
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },

  // Profile
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 14,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  profileEmail: {
    fontSize: 13,
    color: GRAY_TEXT,
    marginTop: 2,
  },

  // Edit button
  editBtn: {
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 24,
  },
  editBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: GRAY_TEXT,
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginLeft: 56,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: LIGHT_GREEN_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  rowSubtitle: {
    fontSize: 12,
    color: GRAY_TEXT,
    marginTop: 1,
  },

  // Logout
  logoutBtn: {
    backgroundColor: '#fef2f2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 15,
  },
  deleteAccountBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
    backgroundColor: '#fff',
  },
  deleteAccountText: {
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: 15,
  },
});
