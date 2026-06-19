import { auth, db } from "@/firebase";
import { setupPresence } from "@/firebasePresence";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ref, update } from "firebase/database";
import { useEffect } from 'react';
import { AppState } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AuthProvider } from '@/auth0/AuthContext';
import AuthGate from '@/auth0/AuthGate';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const pathname = usePathname();

  useEffect(() => {
  }, [pathname]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await setupPresence();
      }
    });
  
    return unsubscribe;
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      async (state) => {
        const user = auth.currentUser;
  
        if (!user) return;
  
        const statusRef = ref(
          db,
          `presence/${user.uid}`
        );
  
        if (state === "active") {
          await update(statusRef, {
            online: true,
            lastSeen: Date.now(),
          });
        } else {
          await update(statusRef, {
            online: false,
            lastSeen: Date.now(),
          });
        }
      }
    );
  
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'light' ? DarkTheme : DefaultTheme}>
          <AuthGate />
          <Stack
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)"/>
            <Stack.Screen
              name="modal"
              options={{ presentation: 'modal', title: 'Modal' }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
