import LoadingScreen from '@/components/loadingScreen/LoadingScreen';

import { Redirect, usePathname } from 'expo-router';

import { useAuth } from './AuthContext';

export default function AuthGate() {

  const { user, loading } = useAuth();

  const pathname = usePathname();

  if (loading) {

    return <LoadingScreen />;

  }

  const isInviteRoute =
    pathname.startsWith('/invite');

  // Chưa login

  if (

    !user

    && pathname !== '/login'

    && !isInviteRoute

  ) {

    return <Redirect href="/login" />;

  }

  // Nếu đã login và đang ở login
  // Chỉ redirect khi không có deep link

  if (

    user

    && pathname === '/login'

  ) {

    return <Redirect href="/(tabs)" />;

  }

  return null;

}