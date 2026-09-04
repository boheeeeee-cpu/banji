import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NaverMapView } from '@/components/map/naver-map-view';
import { PlaceDetailSheet } from '@/components/place-detail-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { RECOMMENDED_PLACES, type Place } from '@/data/places';
import type { MapPlacePayload } from '@/lib/naver-map-html';
import { useTripStore } from '@/store/trip-store';

export default function MapScreen() {
  const [detailPlace, setDetailPlace] = useState<Place | null>(null);
  const insets = useSafeAreaInsets();
  const { myDaysIds, myDaysRouteActive, setMyDaysRouteActive } = useTripStore();

  const handleMarkerPress = (placeId: string) => {
    const place = RECOMMENDED_PLACES.find(p => p.id === placeId);
    if (place) setDetailPlace(place);
  };

  const mapPlaces: MapPlacePayload[] = useMemo(
    () =>
      RECOMMENDED_PLACES.map((p) => ({
        id: p.id,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        area: p.area,
      })),
    [],
  );

  return (
    <ThemedView style={styles.screen}>
      {myDaysRouteActive && (
        <View style={[styles.myDaysBanner, { top: Platform.OS === 'web' ? Spacing.two : insets.top }]}>
          <ThemedView type="backgroundElement" style={styles.myDaysBubble}>
            <ThemedText type="smallBold">🗓 My Days 동선</ThemedText>
            <Pressable onPress={() => setMyDaysRouteActive(false)} hitSlop={8}>
              <ThemedText type="small" style={{ color: Brand.primary }}>
                닫기
              </ThemedText>
            </Pressable>
          </ThemedView>
        </View>
      )}

      <View style={[styles.mapArea, { paddingTop: Platform.OS === 'web' ? Spacing.two : insets.top }]}>
        <NaverMapView
          routeIds={myDaysRouteActive ? myDaysIds : []}
          places={mapPlaces}
          onMarkerPress={handleMarkerPress}
        />

        <PlaceDetailSheet
          place={detailPlace}
          visible={!!detailPlace}
          onClose={() => setDetailPlace(null)}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  mapArea: { flex: 1 },
  myDaysBanner: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    zIndex: 10,
    alignItems: 'center',
  },
  myDaysBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    opacity: 0.95,
    width: '100%',
  },
});
