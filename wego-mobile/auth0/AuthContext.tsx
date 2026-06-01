import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/firebase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

type AuthContextType = {
  user: any;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {

      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName,
          email: firebaseUser.email,
          picture: firebaseUser.photoURL,
        });
      } else {
        console.log("USER LOGGED OUT");
        setUser(null);
      }

      setLoading(false);
    });

    return unsub;
  }, []);

  const logout = async () => {
    setLoading(true);
    try {
      // Attempt to notify backend using the current Firebase ID token
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const firebaseIdToken = await currentUser.getIdToken();

          await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${firebaseIdToken}`,
            },
          });
        } catch (err) {
          console.error('Error calling backend logout:', err);
        }
      }

      await signOut(auth);
      await GoogleSignin.signOut();
      setUser(null);
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);