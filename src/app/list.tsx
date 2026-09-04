import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceDetailSheet } from '@/components/place-detail-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/brand';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { PLACE_TYPE_LABELS, RECOMMENDED_PLACES, type Place } from '@/data/places';
import { useTheme } from '@/hooks/use-theme';
import { useTripStore } from '@/store/trip-store';

export default function ListScreen() {
  const [detailPlace, setDetailPlace] = useState<Place | null>(null);
  const [query, setQuery] = useState('');
  const { toGoIds, myDaysIds } = useTripStore();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RECOMMENDED_PLACES;
    return RECOMMENDED_PLACES.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.area.toLowerCase().includes(q) ||
        p.placeTypes.some(t => PLACE_TYPE_LABELS[t].includes(q)),
    );
  }, [query]);

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <ThemedText style={styles.title}>업체 목록</ThemedText>
        <ThemedText type="small" style={{ color: Brand.primary }}>
          {toGoIds.length > 0 ? `찜 ${toGoIds.length}곳` : `총 ${RECOMMENDED_PLACES.length}곳`}
        </ThemedText>
      </View>

      <View style={[styles.searchBarWrap, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText style={styles.searchIcon}>🔍</ThemedText>
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="장소명, 지역, 카테고리..."
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <ThemedText style={styles.clearBtn}>✕</ThemedText>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + BottomTabInset + Spacing.four },
        ]}
        keyboardDismissMode="on-drag">
        {filtered.length === 0 && (
          <View style={styles.noResults}>
            <ThemedText type="small" themeColor="textSecondary">검색 결과 없음</ThemedText>
          </View>
        )}
        {filtered.map(place => {
          const inToGo = toGoIds.includes(place.id);
          const inMyDays = myDaysIds.includes(place.id);
          return (
            <Pressable
              key={place.id}
              onPress={() => setDetailPlace(place)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <ThemedText style={styles.name} numberOfLines={1}>{place.name}</ThemedText>
                  {(inToGo || inMyDays) && (
                    <View style={[styles.badge, { backgroundColor: Brand.primary + '22' }]}>
                      <ThemedText style={[styles.badgeText, { color: Brand.primary }]}>
                        {inMyDays ? '일정' : '찜'}
                      </ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {PLACE_TYPE_LABELS[place.placeTypes[0]]} · {place.area}
                </ThemedText>
              </View>
              <ThemedText themeColor="textSecondary" style={styles.arrow}>›</ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <PlaceDetailSheet
        place={detailPlace}
        visible={!!detailPlace}
        onClose={() => setDetailPlace(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  title: { fontSize: 22, fontWeight: '800' },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  clearBtn: { fontSize: 14, color: '#999' },
  noResults: { paddingVertical: Spacing.six, alignItems: 'center' },
  list: { paddingHorizontal: Spacing.four, gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CCC4',
  },
  pressed: { opacity: 0.6 },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 16, fontWeight: '700' },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  arrow: { fontSize: 22, fontWeight: '300', paddingLeft: Spacing.two },
});
