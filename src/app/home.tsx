import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PlacePhoto } from '@/components/place-photo';
import { PopularPlacesRow } from '@/components/home/popular-places-row';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { RECOMMENDED_PLACES } from '@/data/places';
import { RECOMMENDED_ROUTES, type RecommendedRoute } from '@/data/routes';
import { useTripStore } from '@/store/trip-store';
import { useAuthStore } from '@/store/auth-store';
import { useTheme } from '@/hooks/use-theme';

const FEATURED_IDS = ['4', '20', '10', '1', '15'];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuthStore();
  const { toGoIds, myDaysIds, savedItineraries, addToGo, startNewItinerary } = useTripStore();
  const totalItineraries = savedItineraries.length + (myDaysIds.length > 0 ? 1 : 0);
  const [selectedRoute, setSelectedRoute] = useState<RecommendedRoute | null>(null);

  const featured = FEATURED_IDS
    .map(id => RECOMMENDED_PLACES.find(p => p.id === id))
    .filter(Boolean) as typeof RECOMMENDED_PLACES;

  const handleStartRoute = (route: RecommendedRoute) => {
    startNewItinerary(route.placeIds);
    setSelectedRoute(null);
    router.navigate({ pathname: '/my-page', params: { section: 'mydays' } });
  };

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.four }]}>
        {/* 인사 */}
        <View style={styles.greeting}>
          <ThemedText style={styles.greetingText}>안녕하세요 👋</ThemedText>
          <ThemedText style={styles.subText}>거제도 반려동물 여행, 반지와 함께해요</ThemedText>
        </View>

        {/* 빠른 통계 */}
        <View style={styles.statsRow}>
          <Pressable style={styles.statCard} onPress={() => router.navigate({ pathname: '/my-page', params: { section: 'togo' } })}>
            <ThemedText style={styles.statEmoji}>❤️</ThemedText>
            <ThemedText style={styles.statNum}>{toGoIds.length}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">찜한 장소</ThemedText>
          </Pressable>
          <Pressable style={styles.statCard} onPress={() => router.navigate({ pathname: '/my-page', params: { section: 'mydays-list' } })}>
            <ThemedText style={styles.statEmoji}>🗓</ThemedText>
            <ThemedText style={styles.statNum}>{totalItineraries}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">내 일정</ThemedText>
          </Pressable>
        </View>

        {/* 추천 루트 */}
        <View style={styles.routeSection}>
          <ThemedText style={styles.sectionTitle}>🗺 추천 루트</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routeScroll}>
            {RECOMMENDED_ROUTES.map(route => (
              <Pressable
                key={route.id}
                style={[styles.routeCard, { backgroundColor: theme.backgroundElement }]}
                onPress={() => setSelectedRoute(route)}>
                <ThemedText style={styles.routeEmoji}>{route.emoji}</ThemedText>
                <ThemedText style={styles.routeName} numberOfLines={1}>{route.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{route.placeIds.length}곳 · {route.duration}</ThemedText>
                <View style={styles.tagRow}>
                  {route.tags.slice(0, 2).map(tag => (
                    <View key={tag} style={styles.tag}>
                      <ThemedText style={styles.tagText}>{tag}</ThemedText>
                    </View>
                  ))}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* 인기 여행지 */}
        <PopularPlacesRow />

        {/* 추천 장소 */}
        <View style={styles.featuredSection}>
          <ThemedText style={styles.sectionTitle}>📍 반지 추천 장소</ThemedText>
          {featured.map(place => {
            const saved = toGoIds.includes(place.id);
            return (
              <View key={place.id} style={styles.placeRow}>
                <PlacePhoto place={place} />
                <View style={styles.placeInfo}>
                  <ThemedText type="smallBold" numberOfLines={1}>{place.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">{place.area} · {place.petNote}</ThemedText>
                </View>
                <Pressable
                  onPress={() => !saved && addToGo([place.id])}
                  style={[styles.saveChip, saved && styles.saveChipSaved]}>
                  <ThemedText style={[styles.saveChipText, saved && { color: Brand.primary }]}>
                    {saved ? '저장됨' : '+ 저장'}
                  </ThemedText>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* 루트 상세 모달 */}
      <Modal visible={!!selectedRoute} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedRoute(null)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.background }]} onPress={() => {}}>
            {selectedRoute && <RouteDetail route={selectedRoute} onStart={handleStartRoute} onClose={() => setSelectedRoute(null)} />}
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

function RouteDetail({
  route,
  onStart,
  onClose,
}: {
  route: RecommendedRoute;
  onStart: (r: RecommendedRoute) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const places = route.placeIds
    .map(id => RECOMMENDED_PLACES.find(p => p.id === id))
    .filter(Boolean) as typeof RECOMMENDED_PLACES;

  return (
    <>
      <View style={styles.sheetHandle} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
        <View style={styles.sheetHeader}>
          <ThemedText style={styles.sheetEmoji}>{route.emoji}</ThemedText>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.sheetTitle}>{route.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{route.places?.length ?? places.length}곳 · {route.duration}</ThemedText>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <ThemedText themeColor="textSecondary" style={{ fontSize: 18 }}>✕</ThemedText>
          </Pressable>
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.sheetDesc}>{route.description}</ThemedText>

        <View style={styles.placeList}>
          {places.map((place, idx) => (
            <View key={place.id} style={styles.routePlaceRow}>
              <View style={[styles.stepBadge, { backgroundColor: Brand.primary }]}>
                <ThemedText style={styles.stepNum}>{idx + 1}</ThemedText>
              </View>
              <PlacePhoto place={place} size={44} />
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold" numberOfLines={1}>{place.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{place.area}</ThemedText>
              </View>
              {idx < places.length - 1 && (
                <ThemedText themeColor="textSecondary" style={styles.arrow}>›</ThemedText>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <Pressable style={[styles.startBtn, { backgroundColor: Brand.primary }]} onPress={() => onStart(route)}>
        <ThemedText style={styles.startBtnText}>이 루트로 일정 만들기</ThemedText>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: 100 },
  greeting: { gap: 4 },
  greetingText: { fontSize: 24, fontWeight: '800' },
  subText: { fontSize: 14, color: '#888' },

  statsRow: { flexDirection: 'row', gap: Spacing.three },
  statCard: {
    flex: 1,
    backgroundColor: Brand.primary + '12',
    borderRadius: 16,
    padding: Spacing.three,
    alignItems: 'center',
    gap: 4,
  },
  statEmoji: { fontSize: 24 },
  statNum: { fontSize: 28, fontWeight: '800', color: Brand.primary },

  routeSection: { gap: Spacing.two },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  routeScroll: { gap: Spacing.two, paddingRight: Spacing.four },
  routeCard: {
    width: 148,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  routeEmoji: { fontSize: 28, marginBottom: 2 },
  routeName: { fontSize: 14, fontWeight: '700' },
  tagRow: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  tag: { backgroundColor: Brand.primary + '18', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 11, color: Brand.primary, fontWeight: '600' },

  featuredSection: { gap: Spacing.two },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
  placeInfo: { flex: 1, gap: 2 },
  saveChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CCC',
  },
  saveChipSaved: { borderColor: Brand.primary, backgroundColor: Brand.primary + '12' },
  saveChipText: { fontSize: 12, fontWeight: '600', color: '#888' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CCC', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetScroll: { padding: Spacing.four, gap: Spacing.three, paddingBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sheetEmoji: { fontSize: 32 },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  sheetDesc: { lineHeight: 20 },
  placeList: { gap: Spacing.two },
  routePlaceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepNum: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  arrow: { fontSize: 20 },
  startBtn: {
    margin: Spacing.four,
    marginTop: 0,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
