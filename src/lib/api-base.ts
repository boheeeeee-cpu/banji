import { Platform } from 'react-native';

export const PROD_ORIGIN = 'https://banji-banbo.vercel.app';

/**
 * 우리 서버(/api/...) 주소.
 * 앱(Expo Go 등)에서는 window.location이 개발 서버 주소라서 /api가 없음 → 실제 사이트를 씀.
 * 웹 개발(localhost)에서도 /api가 없으니 실제 사이트를 씀.
 */
export function apiOrigin(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return PROD_ORIGIN;
    return origin;
  }
  return PROD_ORIGIN;
}
