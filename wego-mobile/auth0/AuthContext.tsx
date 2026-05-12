import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { loginWith } from './authService';

type AuthContextType = {
  user: any | null;
  loading: boolean;
  login: (provider: 'google-oauth2' | 'facebook') => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        const idToken = await SecureStore.getItemAsync('idToken');

        if (!idToken) {
          setUser(null);
          return;
        }

        const decoded: any = jwtDecode(idToken);

        // ⏰ check expiration
        if (decoded.exp * 1000 < Date.now()) {
          await SecureStore.deleteItemAsync('idToken');
          setUser(null);
          return;
        }

        setUser(decoded);
      } catch (e) {
        await SecureStore.deleteItemAsync('idToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (provider: 'google-oauth2' | 'facebook') => {
    setLoading(true);

    try {
      const auth = await loginWith(provider);
      //console.log('AUTH RESULT:', auth);
      if (!auth?.idToken) return;

      await SecureStore.setItemAsync('idToken', auth.idToken);
      await SecureStore.setItemAsync('accessToken', auth.accessToken);

      const decoded: any = jwtDecode(auth.idToken);
      setUser(decoded);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('idToken');
    await SecureStore.deleteItemAsync('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
