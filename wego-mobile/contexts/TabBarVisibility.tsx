import React, { createContext, useContext, useRef, useCallback } from 'react';
import { Animated } from 'react-native';

type TabBarVisibilityContextType = {
  translateY: Animated.Value;
  hide: () => void;
  show: () => void;
};

const TabBarVisibilityContext = createContext<TabBarVisibilityContextType | null>(null);

const HIDE_OFFSET = 150; // enough to clear height(64) + bottom(24) + margin

export function TabBarVisibilityProvider({ children }: { children: React.ReactNode }) {
  const translateY = useRef(new Animated.Value(0)).current;

  const hide = useCallback(() => {
    Animated.timing(translateY, {
      toValue: HIDE_OFFSET,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const show = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  return (
    <TabBarVisibilityContext.Provider value={{ translateY, hide, show }}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  const ctx = useContext(TabBarVisibilityContext);
  if (!ctx) throw new Error('useTabBarVisibility must be used within TabBarVisibilityProvider');
  return ctx;
}