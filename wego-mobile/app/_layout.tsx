import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { usePathname } from 'expo-router';
import { useEffect } from 'react';

import { AuthProvider } from '@/auth0/AuthContext';
import AuthGate from '@/auth0/AuthGate';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const pathname = usePathname();

  useEffect(() => {
    console.log('CURRENT ROUTE:', pathname);
  }, [pathname]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'light' ? DarkTheme : DefaultTheme}>
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
