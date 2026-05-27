import LoadingScreen from '@/components/loadingScreen/LoadingScreen';
import { Redirect, usePathname } from 'expo-router';
import { useAuth } from './AuthContext';

export default function AuthGate() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) return <LoadingScreen />;

  if (!user && pathname !== '/login') {
    return <Redirect href="/login" />;
  }

  if (user && pathname === '/login') {
    return <Redirect href="/(tabs)" />;
  }

  return null;
}
