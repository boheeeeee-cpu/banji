import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** WebView에서 등록된 Web URL(origin)로 map-embed.html 로드 */
export function getMapEmbedUri(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/map-embed.html`;
  }

  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri;

  if (debuggerHost) {
    const protocol = debuggerHost.includes('localhost') ? 'http' : 'http';
    return `${protocol}://${debuggerHost}/map-embed.html`;
  }

  return 'http://localhost:8081/map-embed.html';
}
