import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CalendarDays, Compass, Settings, Users } from 'lucide-react-native';
import { useTabBarVisibility } from '@/contexts/TabBarVisibility';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { translateY } = useTabBarVisibility();
  const GREEN = process.env.EXPO_PUBLIC_GREEN_MAIN

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: `#${GREEN}`,
        headerShown: false,
        freezeOnBlur: true,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: 'absolute',
          bottom: 24,
          left: 24,
          right: 24,
          backgroundColor: '#ffffff',
          borderRadius: 24,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          marginLeft: 18,
          marginRight: 18,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 10,
          transform: [{ translateY }], // ← animated slide
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <Compass size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => <CalendarDays size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
