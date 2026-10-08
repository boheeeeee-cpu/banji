import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export type NavApp = 'naver' | 'kakao';
const KEY = 'banji_nav_app';

async function load(): Promise<NavApp> {
  try {
    if (Platform.OS === 'web') {
      return (localStorage.getItem(KEY) as NavApp) ?? 'naver';
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return ((await AsyncStorage.getItem(KEY)) as NavApp) ?? 'naver';
  } catch {
    return 'naver';
  }
}

async function save(app: NavApp) {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(KEY, app);
    } else {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(KEY, app);
    }
  } catch {}
}

export function useNavPreference() {
  const [navApp, setNavAppState] = useState<NavApp>('naver');

  useEffect(() => {
    load().then(setNavAppState);
  }, []);

  const setNavApp = useCallback((app: NavApp) => {
    setNavAppState(app);
    save(app);
  }, []);

  return { navApp, setNavApp };
}
