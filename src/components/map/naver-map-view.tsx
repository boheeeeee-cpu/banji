import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import { getMapEmbedUri } from '@/lib/map-embed-uri';
import {
  buildMapUpdateScript,
  type MapPlacePayload,
  type MapUpdatePayload,
} from '@/lib/naver-map-html';

// react-native-webview is native-only; import conditionally
let WebView: typeof import('react-native-webview').default | null = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').default;
}

type NaverMapViewProps = {
  routeIds: string[];
  places: MapPlacePayload[];
  onMarkerPress?: (placeId: string) => void;
  onRouteDuration?: (seconds: number | null) => void;
  onReady?: () => void;
};

const READY_PROBE_SCRIPT = `
(function () {
  if (window.BanjiMapBridge && window.BanjiMapBridge.isReady()) {
    var msg = JSON.stringify({ type: 'ready' });
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(msg);
    }
  }
})();
true;
`;

export function NaverMapView({ routeIds, places, onMarkerPress, onRouteDuration, onReady }: NaverMapViewProps) {
  const webViewRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapAuthFailed, setMapAuthFailed] = useState(false);
  const mapUri = useMemo(() => getMapEmbedUri(), []);
  const isWeb = Platform.OS === 'web';

  const pushUpdate = useCallback((payload: MapUpdatePayload) => {
    if (isWeb) {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ type: 'banjiUpdate', payload }),
        '*',
      );
    } else {
      webViewRef.current?.injectJavaScript(buildMapUpdateScript(payload));
    }
  }, [isWeb]);

  const handleReady = useCallback(() => {
    setMapAuthFailed(false);
    setMapReady(true);
    onReady?.();
    pushUpdate({ routeIds, places });
  }, [onReady, pushUpdate, routeIds, places]);

  useEffect(() => {
    if (!mapReady) return;
    pushUpdate({ routeIds, places });
  }, [mapReady, routeIds, places, pushUpdate]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!mapReady && !mapAuthFailed) {
        setMapAuthFailed(true);
      }
    }, 12000);
    return () => clearTimeout(timeout);
  }, [mapReady, mapAuthFailed, mapUri]);

  const parseMessage = useCallback(
    (raw: string) => {
      try {
        const data = JSON.parse(raw) as { type: string; placeId?: string; durationSeconds?: number | null };
        if (data.type === 'ready') {
          handleReady();
        } else if (data.type === 'authFailure') {
          setMapReady(false);
          setMapAuthFailed(true);
        } else if (data.type === 'markerPress' && data.placeId) {
          onMarkerPress?.(data.placeId);
        } else if (data.type === 'routeInfo') {
          onRouteDuration?.(data.durationSeconds ?? null);
        }
      } catch {
        // ignore
      }
    },
    [handleReady, onMarkerPress, onRouteDuration],
  );

  // 웹: iframe에서 오는 postMessage 수신
  useEffect(() => {
    if (!isWeb) return;
    const onWindowMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      parseMessage(event.data);
    };
    window.addEventListener('message', onWindowMessage);
    return () => window.removeEventListener('message', onWindowMessage);
  }, [isWeb, parseMessage]);

  // 네이티브 WebView 메시지 핸들러
  const handleNativeMessage = (event: any) => {
    parseMessage(event.nativeEvent.data);
  };

  if (isWeb) {
    return (
      <View style={styles.container}>
        {/* @ts-ignore - iframe is valid on web */}
        <iframe
          ref={iframeRef}
          src={mapUri}
          style={{ flex: 1, border: 'none', width: '100%', height: '100%', minHeight: 280 }}
          onLoad={() => {
            setTimeout(() => {
              iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ type: 'probe' }),
                '*',
              );
            }, 500);
          }}
        />
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
              네이버 클라우드 Web 서비스 URL 등록을 확인해 주세요.
            </ThemedText>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        style={styles.webview}
        source={{ uri: mapUri }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        onMessage={handleNativeMessage}
        onLoadEnd={() => {
          webViewRef.current?.injectJavaScript(READY_PROBE_SCRIPT);
        }}
        onError={() => {
          setMapReady(false);
          setMapAuthFailed(true);
        }}
      />
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
            네이버 클라우드 Web 서비스 URL 등록을 확인해 주세요.
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
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
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
