import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { PlacePhoto } from '@/components/place-photo';
import { PlaceDetailSheet } from '@/components/place-detail-sheet';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { RECOMMENDED_PLACES, type Place } from '@/data/places';
import { useTripStore } from '@/store/trip-store';
import { useTheme } from '@/hooks/use-theme';

// 홈 맨 위: 반려동물 동반 가능한 장소를 바로 보여주는 영역
// 기준 사용자: 주말에 소형견과 처음 거제에 온 30대 (오후에 갈 곳 3군데 + 동선 확인)

type ChipId = 'all' | 'cafe' | 'restaurant' | 'beach' | 'walk' | 'stay' | 'landmark';

const CHIPS: { id: ChipId; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'cafe', label: '카페' },
  { id: 'restaurant', label: '식당' },
  { id: 'beach', label: '해변' },
  { id: 'walk', label: '산책' },
  { id: 'stay', label: '숙소' },
  { id: 'landmark', label: '관광지' },
];

const PAGE_SIZE = 6;
const GOAL_COUNT = 3;

function matchesChip(place: Place, chip: ChipId) {
  if (chip === 'all') return true;
  if (chip === 'walk') return place.placeTypes.includes('park') || place.activities.includes('산책');
  return place.placeTypes.includes(chip);
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatKm(km: number) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(km < 10 ? 1 : 0)}km`;
}

// 카드에 붙일 표시: 크기 제한 → 실내/실외 → petNote 순으로, 최대 2개
function badgesFor(place: Place): { text: string; kind: 'pet' | 'info' }[] {
  const out: { text: string; kind: 'pet' | 'info' }[] = [];
  if (place.dogSizes && place.dogSizes.length > 0) {
    out.push({
      text: place.dogSizes.length === 3 ? '대형견까지 가능' : `${place.dogSizes.join('·')} 가능`,
      kind: 'pet',
    });
  }
  if (out.length === 0 && place.petNote) {
    place.petNote.split('·').map(s => s.trim()).filter(Boolean).forEach(s => {
      out.push({ text: s, kind: /주차/.test(s) ? 'info' : 'pet' });
    });
  }
  if (place.parkingNote && !out.some(b => b.kind === 'info')) {
    out.push({ text: '주차 안내 있음', kind: 'info' });
  }
  return out.slice(0, 2);
}

export function PetPlacesSection() {
  const router = useRouter();
  const theme = useTheme();
  const { toGoIds, addToGo, removeFromToGo, startNewItinerary } = useTripStore();
  const [chip, setChip] = useState<ChipId>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [detailPlace, setDetailPlace] = useState<Place | null>(null);

  const list = useMemo(() => {
    const filtered = RECOMMENDED_PLACES.filter(p => matchesChip(p, chip)).map(p => ({
      place: p,
      km: myPos ? distanceKm(myPos.lat, myPos.lng, p.lat, p.lng) : null,
    }));
    if (myPos) filtered.sort((a, b) => (a.km ?? 0) - (b.km ?? 0));
    else filtered.sort((a, b) => b.place.rating - a.place.rating || b.place.reviewCount - a.place.reviewCount);
    return filtered;
  }, [chip, myPos]);

  const shown = list.slice(0, visibleCount);
  const savedPlaceIds = toGoIds.filter(id => RECOMMENDED_PLACES.some(p => p.id === id));
  const savedCount = savedPlaceIds.length;

  const askLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setLocStatus('error'); return; }
    setLocStatus('loading');
    navigator.geolocation.getCurrentPosition(
      pos => { setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocStatus('idle'); },
      () => setLocStatus('error'),
      { timeout: 8000 },
    );
  };

  const toggleSave = (id: string) => {
    if (toGoIds.includes(id)) removeFromToGo(id);
    else addToGo([id]);
  };

  const openRoute = () => {
    if (savedCount === 0) return;
    startNewItinerary(savedPlaceIds);
    router.navigate({ pathname: '/my-page', params: { section: 'mydays' } });
  };

  const sortLabel = myPos
    ? '내 위치에서 가까운 순'
    : locStatus === 'loading'
      ? '위치 확인 중…'
      : locStatus === 'error'
        ? '위치를 못 가져왔어요 · 다시 시도'
        : '평점 높은 순 · 가까운 순으로 보기';

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>강아지랑 어디 갈까요?</ThemedText>
        <Pressable onPress={myPos ? undefined : askLocation} disabled={!!myPos || locStatus === 'loading'} hitSlop={8}>
          <ThemedText
            type="small"
            style={{ color: myPos ? theme.textSecondary : Brand.primary }}>
            📍 {sortLabel}
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {CHIPS.map(c => {
          const selected = c.id === chip;
          return (
            <Pressable
              key={c.id}
              onPress={() => { setChip(c.id); setVisibleCount(PAGE_SIZE); }}
              style={[
                styles.chip,
                { borderColor: selected ? Brand.primary : theme.backgroundSelected },
                selected && { backgroundColor: Brand.primary },
              ]}>
              <ThemedText style={[styles.chipText, { color: selected ? '#FFF' : theme.textSecondary }]}>
                {c.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <View>
        {shown.map(({ place, km }) => {
          const saved = toGoIds.includes(place.id);
          return (
            <Pressable
              key={place.id}
              onPress={() => setDetailPlace(place)}
              style={[styles.card, { borderBottomColor: theme.backgroundSelected }]}>
              <PlacePhoto place={place} size={60} />
              <View style={styles.cardInfo}>
                <ThemedText type="smallBold" numberOfLines={1}>{place.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {place.area}
                  {place.reviewCount > 0 ? ` · ★${place.rating.toFixed(1)}` : ''}
                  {km !== null ? ` · ${formatKm(km)}` : ''}
                </ThemedText>
                <View style={styles.badgeRow}>
                  {badgesFor(place).map(b => (
                    <View key={b.text} style={[styles.badge, b.kind === 'info' ? styles.badgeInfo : styles.badgePet]}>
                      <ThemedText style={[styles.badgeText, { color: b.kind === 'info' ? '#1E40AF' : '#166534' }]} numberOfLines={1}>
                        {b.text}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
              <Pressable
                onPress={() => toggleSave(place.id)}
                hitSlop={10}
                accessibilityLabel={saved ? '찜 취소' : '찜하기'}
                style={styles.heartBtn}>
                <ThemedText style={[styles.heart, { color: saved ? Brand.primary : theme.textSecondary }]}>
                  {saved ? '♥' : '♡'}
                </ThemedText>
              </Pressable>
            </Pressable>
          );
        })}
        {list.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            이 분류에는 아직 장소가 없어요.
          </ThemedText>
        )}
      </View>

      {list.length > visibleCount && (
        <Pressable onPress={() => setVisibleCount(n => n + 10)} style={styles.moreBtn}>
          <ThemedText style={[styles.moreText, { color: Brand.primary }]}>
            장소 더 보기 ({list.length - visibleCount}곳 남음)
          </ThemedText>
        </Pressable>
      )}

      {savedCount > 0 && (
        <Pressable onPress={openRoute} style={styles.routeStrip}>
          <ThemedText style={styles.routeStripText}>
            {savedCount >= GOAL_COUNT
              ? `찜 ${savedCount}곳으로 동선 보기`
              : `찜 ${savedCount}곳 · ${GOAL_COUNT - savedCount}곳 더 고르면 하루 코스가 돼요`}
          </ThemedText>
          <ThemedText style={styles.routeStripArrow}>›</ThemedText>
        </Pressable>
      )}

      <PlaceDetailSheet place={detailPlace} visible={!!detailPlace} onClose={() => setDetailPlace(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  header: { gap: 4 },
  title: { fontSize: 24, fontWeight: '800' },
  chipRow: { gap: 6, paddingRight: Spacing.four },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardInfo: { flex: 1, gap: 2, minWidth: 0 },
  badgeRow: { flexDirection: 'row', gap: 4, marginTop: 2, flexWrap: 'wrap' },
  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, maxWidth: '100%' },
  badgePet: { backgroundColor: '#DCFCE7' },
  badgeInfo: { backgroundColor: '#DBEAFE' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  heartBtn: { padding: 4 },
  heart: { fontSize: 24 },
  empty: { paddingVertical: Spacing.three, textAlign: 'center' },
  moreBtn: { alignItems: 'center', paddingVertical: Spacing.two },
  moreText: { fontSize: 13, fontWeight: '700' },
  routeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Brand.primaryMuted,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  routeStripText: { fontSize: 13, fontWeight: '700', color: '#B4234A', flex: 1 },
  routeStripArrow: { fontSize: 20, fontWeight: '700', color: '#B4234A' },
});
