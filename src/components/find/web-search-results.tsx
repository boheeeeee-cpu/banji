import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { searchNaverLocal, type NaverLocalResult } from '@/lib/naver-search';
import { useTripStore } from '@/store/trip-store';

type Props = {
  /** 검색할 단어. 빈 문자열이면 아무것도 하지 않음 */
  query: string;
  /** 반지 목록에 이미 나온 이름. 겹치는 결과는 빼고 보여줌 */
  excludeNames: string[];
};

type AddedState = Record<string, 'toGo' | 'myDays' | 'both'>;

/**
 * 찾기 탭 아래쪽: 반지 목록에 없는 거제 업체를 네이버 지역 검색으로 보여줌.
 * 반려동물 동반 여부는 모르는 곳이라 "확인 필요"로 표시.
 */
export function WebSearchResults({ query, excludeNames }: Props) {
  const [results, setResults] = useState<NaverLocalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState<AddedState>({});
  const { addCustomPlace, addToGo, addToMyDays, customPlaces } = useTripStore();
  const theme = useTheme();

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setError(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(false);
    searchNaverLocal(q + ' 거제', 5)
      .then(items => { if (!cancelled) setResults(items); })
      .catch(() => { if (!cancelled) { setResults([]); setError(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query]);

  if (!query.trim()) return null;

  const normalize = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  const exclude = new Set(excludeNames.map(normalize));
  const visible = results.filter(r => !exclude.has(normalize(r.title)));

  const handleAdd = (item: NaverLocalResult, dest: 'toGo' | 'myDays') => {
    const address = item.roadAddress || item.address;
    const existing = customPlaces.find(p => p.name === item.title && p.address === address);
    const id = existing
      ? existing.id
      : addCustomPlace({ name: item.title, address, lat: item.lat, lng: item.lng });
    if (dest === 'toGo') addToGo([id]);
    else addToMyDays([id]);
    setAdded(prev => {
      const cur = prev[item.title];
      const next = (cur && cur !== dest) ? 'both' : dest;
      return { ...prev, [item.title]: next };
    });
  };

  const isAdded = (title: string, dest: 'toGo' | 'myDays') => {
    const s = added[title];
    return s === dest || s === 'both';
  };

  return (
    <View>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>그 외 거제 업체</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          네이버 검색 결과 · 반려동물 동반 여부는 방문 전 확인해 주세요
        </ThemedText>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Brand.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText type="small" themeColor="textSecondary">
            검색 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.
          </ThemedText>
        </View>
      ) : visible.length === 0 ? (
        <View style={styles.center}>
          <ThemedText type="small" themeColor="textSecondary">다른 업체 검색 결과가 없어요</ThemedText>
        </View>
      ) : (
        visible.map((item, idx) => (
          <View key={`${item.title}-${idx}`} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.cardIcon}>
              <ThemedText style={styles.cardIconText}>{getCategoryEmoji(item.category)}</ThemedText>
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.nameRow}>
                <ThemedText type="smallBold" numberOfLines={1} style={{ flexShrink: 1 }}>{item.title}</ThemedText>
                <View style={styles.unknownBadge}>
                  <ThemedText style={styles.unknownBadgeText}>동반 확인 필요</ThemedText>
                </View>
              </View>
              {item.category ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{item.category}</ThemedText>
              ) : null}
              {(item.roadAddress || item.address) ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  📍 {item.roadAddress || item.address}
                </ThemedText>
              ) : null}
              <View style={styles.addRow}>
                <Pressable
                  onPress={() => handleAdd(item, 'toGo')}
                  style={[styles.addBtn, isAdded(item.title, 'toGo') && styles.addBtnDone]}>
                  <ThemedText style={styles.addBtnText}>{isAdded(item.title, 'toGo') ? '✓ 찜' : '+찜'}</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => handleAdd(item, 'myDays')}
                  style={[styles.addBtn, styles.addBtnSecondary, isAdded(item.title, 'myDays') && styles.addBtnDone]}>
                  <ThemedText style={styles.addBtnText}>
                    {isAdded(item.title, 'myDays') ? '✓ 내 일정' : '+내 일정'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function getCategoryEmoji(category: string): string {
  if (!category) return '📍';
  const c = category.toLowerCase();
  if (c.includes('카페') || c.includes('커피')) return '☕';
  if (c.includes('술집') || c.includes('주점') || c.includes('호프')) return '🍺';
  if (c.includes('음식') || c.includes('식당') || c.includes('맛집')) return '🍽';
  if (c.includes('숙박') || c.includes('펜션') || c.includes('호텔')) return '🏨';
  if (c.includes('관광') || c.includes('명소')) return '🏞';
  if (c.includes('쇼핑') || c.includes('마트')) return '🛍';
  if (c.includes('병원') || c.includes('약국')) return '🏥';
  return '📍';
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
    borderTopWidth: 4,
    borderTopColor: '#F3F4F6',
    marginTop: Spacing.two,
    gap: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  center: { paddingVertical: Spacing.four, alignItems: 'center' },
  card: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconText: { fontSize: 20 },
  cardInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unknownBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, backgroundColor: '#F3F4F6' },
  unknownBadgeText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  addRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  addBtn: {
    backgroundColor: Brand.primary,
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
    borderRadius: Spacing.one,
  },
  addBtnSecondary: { backgroundColor: '#6B8AFF' },
  addBtnDone: { backgroundColor: '#ccc' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
