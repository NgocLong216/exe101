import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../auth0/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();

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
          {/* Frosted Glass Card */}
          <BlurView intensity={60} tint="light" style={styles.card}>
            {/* Logo Banner */}
            <Image
              source={require('@/assets/images/WEGO_banner.png')}
              style={styles.logoBanner}
              resizeMode="cover"
            />

            {/* Google Button */}
            <View
              style={styles.space}
            >
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={() => login('google-oauth2')}
                activeOpacity={0.85}
              >
                <View style={styles.googleIcon}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={styles.googleText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Facebook Button */}
              <TouchableOpacity
                style={styles.facebookBtn}
                onPress={() => login('facebook')}
                activeOpacity={0.85}
              >
                <View style={styles.fbIconWrap}>
                  <Text style={styles.fbF}>f</Text>
                </View>
                <Text style={styles.facebookText}>Continue with Facebook</Text>
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

  // Frosted glass card
  card: {
    width: '100%',
    borderRadius: 28,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
  },

  // Logo Banner
  logoBanner: {
    width: '100%',
    height: 110,
    borderRadius: 18,
    marginBottom: 20,
  },

  space: {
    paddingTop: 18,
    paddingBottom: 18,
  },

  // Google Button
  googleBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
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

  // Facebook Button
  facebookBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1877F2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  fbIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  fbF: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1877F2',
    lineHeight: 20,
  },
  facebookText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
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