import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

import {
  clearInviteCode,
  getInviteCode
} from "@/utils/deepLinkStorage";
import { router } from 'expo-router';
import { auth } from '../firebase';
import { registerForPushNotifications } from '../utils/notification';

export default function LoginScreen() {

  // INIT GOOGLE SIGNIN
  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        `${process.env.EXPO_PUBLIC_WEB_CLIENT_ID}`,
      offlineAccess: true,
    });
  }, []);

  // LOGIN FUNCTION
  const onGoogleLogin = async () => {
    try {

      // Kiểm tra Google Play Services
      await GoogleSignin.hasPlayServices();

      // Đăng xuất tài khoản cũ
      await GoogleSignin.signOut();

      // Mở Google Sign In
      const userInfo = await GoogleSignin.signIn();

      // Lấy Google idToken
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        console.log('Không lấy được Google idToken');
        return;
      }

      // ==========================
      // Firebase login
      // ==========================

      const credential =
        GoogleAuthProvider.credential(idToken);

      const result =
        await signInWithCredential(auth, credential);

      const firebaseUser = result.user;

      // Firebase JWT token
      const firebaseIdToken =
        await firebaseUser.getIdToken();

      // ==========================
      // Login backend
      // ==========================

      const loginRes = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/auth/firebase`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            token: firebaseIdToken,
          }),
        }
      );

      if (!loginRes.ok) {
        throw new Error('Backend login failed');
      }

      const loginData = await loginRes.json();

      console.log('Backend login:', loginData);

      // ==========================
      // Lấy Expo Push Token
      // ==========================

      const expoPushToken =
        await registerForPushNotifications();

      console.log('Expo Push Token:', expoPushToken);

      // ==========================
      // Lưu Push Token lên backend
      // ==========================

      if (expoPushToken) {

        const pushRes = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/users/push-token`,
          {
            method: 'PUT',

            headers: {
              'Content-Type': 'application/json',

              Authorization: `Bearer ${firebaseIdToken}`,
            },

            body: JSON.stringify({
              expoPushToken,
            }),
          }
        );

        if (!pushRes.ok) {

          const errorText = await pushRes.text();

          console.log(
            'Lỗi lưu Push Token:',
            errorText
          );
        }
      }

      // ==========================
      // Chuyển sang trang chính
      // ==========================

      const inviteCode =
        await getInviteCode();

      if (!loginData.hobbyOnboardingCompleted) {
        if (inviteCode) await clearInviteCode();
        router.replace({
          pathname: '/HobbyPreferences',
          params: inviteCode ? { next: `/invite/${inviteCode}` } : {},
        });
        return;
      }

      if (inviteCode) {

        await clearInviteCode();

        router.replace(

          `/invite/${inviteCode}`

        );

      }

      else {

        router.replace(

          "/(tabs)"

        );

      }

    } catch (error) {

      console.log(
        'Google Sign-In Error:',
        error
      );
    }
  };

  return (
    <LinearGradient
      colors={['#4ade80', '#22c55e', '#86efac', '#4ade80']}
      locations={[0, 0.3, 0.7, 1]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.background}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <BlurView intensity={60} tint="light" style={styles.card}>

            <Image
              source={require('@/assets/images/WEGO_banner.png')}
              style={styles.logoBanner}
              resizeMode="cover"
            />

            <View style={styles.space}>

              {/* GOOGLE LOGIN BUTTON */}
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={onGoogleLogin}
                activeOpacity={0.85}
              >
                <View style={styles.googleIcon}>
                  <Text style={styles.googleG}>G</Text>
                </View>

                <Text style={styles.googleText}>
                  Continue with Google
                </Text>
              </TouchableOpacity>

            </View>

            {/* Terms */}
            <Text style={styles.terms}>
              By signing in, you agree to our{'\n'}
              <Text style={styles.termsLink}>Terms of Service</Text>
              <Text style={styles.termsGray}> and </Text>
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>

          </BlurView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  card: {
    width: '100%',
    borderRadius: 28,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
  },

  logoBanner: {
    width: '100%',
    height: 110,
    borderRadius: 18,
    marginBottom: 20,
  },

  space: {
    paddingTop: 18,
    paddingBottom: 18,
    width: '100%',
  },

  googleBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },

  googleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  googleG: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DB4437',
  },

  googleText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginRight: 28,
  },

  // Terms
  terms: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsGray: {
    color: '#6b7280',
  },
  termsLink: {
    color: '#16a34a',
    fontWeight: '600',
  },
});
