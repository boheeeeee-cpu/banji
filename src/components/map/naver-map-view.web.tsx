import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import type { MapPlacePayload, MapUpdatePayload } from '@/lib/naver-map-html';

const MAP_HOST_ID = 'banji-map-host';
const MAP_CONTAINER_ID = 'banji-map-root';

type NaverMapViewProps = {
  routeIds: string[];
  places: MapPlacePayload[];
  onMarkerPress?: (placeId: string) => void;
  onRouteDuration?: (seconds: number | null) => void;
  onReady?: () => void;
};

declare global {
  interface Window {
    __banjiNaverMapReady?: boolean;
    __banjiNaverMapAuthFailed?: boolean;
    naver?: { maps?: unknown };
    BanjiMapBridge?: {
      init: (containerId: string) => boolean;
      update: (payload: MapUpdatePayload) => void;
      isReady: () => boolean;
    };
  }
}

/**
 * Web: +html.tsx 에서 로드한 네이버 SDK + BanjiMapBridge 를 직접 사용 (WebView 미사용)
 */
export function NaverMapView({ routeIds, places, onMarkerPress, onRouteDuration, onReady }: NaverMapViewProps) {
  const [mapReady, setMapReady] = useState(false);
  const [mapAuthFailed, setMapAuthFailed] = useState(false);
  const mountedRef = useRef(true);

  const tryInit = useCallback(() => {
    if (!mountedRef.current) return;

    if (window.__banjiNaverMapAuthFailed) {
      setMapAuthFailed(true);
      setMapReady(false);
      return;
    }

    if (!window.BanjiMapBridge || !window.naver?.maps) return;

    const host = document.getElementById(MAP_HOST_ID);
    if (!host) return;

    let container = document.getElementById(MAP_CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = MAP_CONTAINER_ID;
      container.style.width = '100%';
      container.style.height = '100%';
      host.appendChild(container);
    }

    if (window.BanjiMapBridge.isReady()) {
      setMapReady(true);
      setMapAuthFailed(false);
      return;
    }

    if (window.BanjiMapBridge.init(MAP_CONTAINER_ID)) {
      setMapReady(true);
      setMapAuthFailed(false);
      onReady?.();
    }
  }, [onReady]);

  useEffect(() => {
    mountedRef.current = true;

    const onSdkReady = () => tryInit();
    const onMapReady = () => {
      if (!mountedRef.current) return;
      setMapReady(true);
      setMapAuthFailed(false);
      onReady?.();
    };
    const onAuthFail = () => {
      if (!mountedRef.current) return;
      setMapAuthFailed(true);
      setMapReady(false);
    };
    const onMarkerMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(String(event.data)) as { type: string; placeId?: string };
        if (data.type === 'markerPress' && data.placeId) {
          onMarkerPress?.(data.placeId);
        }
      } catch {
        // ignore
      }
    };

    const onRouteDurationEvent = (event: Event) => {
      const { seconds } = (event as CustomEvent<{ seconds: number | null }>).detail;
      onRouteDuration?.(seconds);
    };

    window.addEventListener('banji-naver-map-sdk-ready', onSdkReady);
    window.addEventListener('banji-naver-map-ready', onMapReady);
    window.addEventListener('banji-naver-map-auth-failure', onAuthFail);
    window.addEventListener('message', onMarkerMessage);
    window.addEventListener('banji-route-duration', onRouteDurationEvent);

    tryInit();
    const poll = window.setInterval(tryInit, 250);
    const timeout = window.setTimeout(() => {
      if (mountedRef.current && !window.BanjiMapBridge?.isReady()) {
        setMapAuthFailed(true);
        setMapReady(false);
      }
    }, 12000);

    return () => {
      mountedRef.current = false;
      window.clearInterval(poll);
      window.clearTimeout(timeout);
      window.removeEventListener('banji-naver-map-sdk-ready', onSdkReady);
      window.removeEventListener('banji-naver-map-ready', onMapReady);
      window.removeEventListener('banji-naver-map-auth-failure', onAuthFail);
      window.removeEventListener('message', onMarkerMessage);
      window.removeEventListener('banji-route-duration', onRouteDurationEvent);
    };
  }, [tryInit, onMarkerPress, onReady]);

  useEffect(() => {
    if (!mapReady || !window.BanjiMapBridge) return;
    window.BanjiMapBridge.update({ routeIds, places });
  }, [mapReady, routeIds, places]);

  return (
    <View style={styles.container} nativeID={MAP_HOST_ID}>
      {!mapReady && !mapAuthFailed && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Brand.primary} />
        </View>
      )}
      {mapAuthFailed && (
        <View style={styles.errorBox}>
          <ThemedText type="smallBold" style={styles.errorTitle}>
            지도를 불러오지 못했습니다
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.errorText}>
            네이버 클라우드 콘솔에 현재 주소(예: http://localhost:8081 또는 8083)를 Web
            서비스 URL로 등록했는지 확인해 주세요.
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 280,
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 2,
  },
  errorBox: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 2,
  },
  errorTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
