import { useAuth } from '@/auth0/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const GREEN = '#22c55e';
const LIGHT_GREEN_BG = '#f0fdf4';
const GRAY_TEXT = '#6b7280';
const BORDER = '#f0f0f0';

export default function SettingsScreen() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);
  const { user, logout } = useAuth()
  //console.log('user: ', user)

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
        <SectionLabel title="APP SETTINGS" />
        <View style={styles.card}>
          <RowItem
            icon="notifications-outline"
            label="Push Notifications"
            rightElement={
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
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
                onValueChange={setLocationSharing}
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
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <RowItem
            icon="speedometer-outline"
            label="Unit System"
            subtitle="Metric (km)"
            rightElement={<Ionicons name="chevron-forward" size={18} color="#d1d5db" />}
            onPress={() => {}}
          />
        </View>

        {/* Account & Privacy */}
        <SectionLabel title="ACCOUNT & PRIVACY" />
        <View style={styles.card}>
          <RowItem
            icon="lock-closed-outline"
            label="Privacy Policy"
            rightElement={<Ionicons name="open-outline" size={18} color="#d1d5db" />}
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <RowItem
            icon="document-text-outline"
            label="Terms of Service"
            rightElement={<Ionicons name="open-outline" size={18} color="#d1d5db" />}
            onPress={() => {}}
          />
        </View>

        {/* Log Out */}
        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
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
});