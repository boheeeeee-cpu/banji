import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/brand';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { searchNaverLocal, type NaverLocalResult } from '@/lib/naver-search';
import { useTripStore } from '@/store/trip-store';

type AddedState = Record<string, 'toGo' | 'myDays' | 'both'>;

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NaverLocalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [added, setAdded] = useState<AddedState>({});

  const { addCustomPlace, addToGo, addToMyDays, toGoIds, myDaysIds, customPlaces } = useTripStore();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setResults([]);
    try {
      const items = await searchNaverLocal(q + ' 거제', 5);
      setResults(items);
    } catch (e) {
      setError('검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (item: NaverLocalResult, dest: 'toGo' | 'myDays') => {
    const existing = customPlaces.find(
      p => p.name === item.title && p.address === (item.roadAddress || item.address),
    );
    let id: string;
    if (existing) {
      id = existing.id;
    } else {
      id = addCustomPlace({
        name: item.title,
        address: item.roadAddress || item.address,
        lat: item.lat,
        lng: item.lng,
      });
    }
    if (dest === 'toGo') addToGo([id]);
    else addToMyDays([id]);

    setAdded(prev => {
      const cur = prev[item.title];
      const next =
        (cur === 'toGo' && dest === 'myDays') || (cur === 'myDays' && dest === 'toGo')
          ? 'both'
          : dest;
      return { ...prev, [item.title]: next };
    });
  };

  const isAdded = (title: string, dest: 'toGo' | 'myDays') => {
    const s = added[title];
    return s === dest || s === 'both';
  };

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <ThemedText style={styles.title}>검색</ThemedText>
      </View>

      {/* 검색 바 */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={styles.searchIcon}>🔍</ThemedText>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="장소 검색 (예: 카페, 식당, 산책로...)"
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(''); setResults([]); setSearched(false); }} hitSlop={8}>
              <ThemedText style={styles.clearBtn}>✕</ThemedText>
            </Pressable>
          )}
        </View>
        <Pressable onPress={handleSearch} style={styles.searchBtn}>
          <ThemedText style={styles.searchBtnText}>검색</ThemedText>
        </Pressable>
      </View>

      {/* 결과 영역 */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Brand.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText style={styles.errorEmoji}>⚠️</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            {error}
          </ThemedText>
        </View>
      ) : !searched ? (
        <View style={styles.center}>
          <ThemedText style={styles.hintEmoji}>🗺</ThemedText>
          <ThemedText type="smallBold">거제도 장소를 검색해 보세요</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            네이버 지도 기반 검색 결과
          </ThemedText>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <ThemedText style={styles.hintEmoji}>🔍</ThemedText>
          <ThemedText type="smallBold">검색 결과가 없어요</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            다른 검색어로 시도해 보세요
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + BottomTabInset + 20 },
          ]}
          keyboardDismissMode="on-drag">
          <ThemedText type="small" themeColor="textSecondary" style={styles.resultCount}>
            검색 결과 {results.length}곳 (네이버 지도)
          </ThemedText>
          {results.map((item, idx) => (
            <View key={idx} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.cardIcon}>
                <ThemedText style={styles.cardIconText}>
                  {getCategoryEmoji(item.category)}
                </ThemedText>
              </View>
              <View style={styles.cardInfo}>
                <ThemedText type="smallBold" numberOfLines={1}>{item.title}</ThemedText>
                {item.category ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {item.category}
                  </ThemedText>
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
                    <ThemedText style={styles.addBtnText}>
                      {isAdded(item.title, 'toGo') ? '✓ 찜' : '+찜'}
                    </ThemedText>
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
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

function getCategoryEmoji(category: string): string {
  if (!category) return '📍';
  const c = category.toLowerCase();
  if (c.includes('카페') || c.includes('커피')) return '☕';
  if (c.includes('음식') || c.includes('식당') || c.includes('맛집')) return '🍽';
  if (c.includes('숙박') || c.includes('펜션') || c.includes('호텔')) return '🏨';
  if (c.includes('관광') || c.includes('명소')) return '🏞';
  if (c.includes('쇼핑') || c.includes('마트')) return '🛍';
  if (c.includes('병원') || c.includes('약국')) return '🏥';
  return '📍';
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  title: { fontSize: 22, fontWeight: '800' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  clearBtn: { fontSize: 13, color: '#999' },
  searchBtn: {
    backgroundColor: Brand.primary,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Spacing.two,
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.six,
  },
  hintEmoji: { fontSize: 48 },
  errorEmoji: { fontSize: 36 },
  resultCount: { marginBottom: Spacing.two },
  list: { paddingHorizontal: Spacing.four, paddingTop: Spacing.one, gap: Spacing.two },
  card: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.three,
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
