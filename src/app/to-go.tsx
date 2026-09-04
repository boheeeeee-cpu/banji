import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlacePhoto } from '@/components/place-photo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/brand';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { PLACE_TYPE_LABELS, RECOMMENDED_PLACES } from '@/data/places';
import { useTripStore } from '@/store/trip-store';

export default function ToGoScreen() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { toGoIds, myDaysIds, removeFromToGo, addToMyDays, customPlaces, removeCustomPlace } = useTripStore();
  const insets = useSafeAreaInsets();

  const toGoPlaces = RECOMMENDED_PLACES.filter(p => toGoIds.includes(p.id));
  const toGoCustom = customPlaces.filter(p => toGoIds.includes(p.id));
  const isEmpty = toGoPlaces.length === 0 && toGoCustom.length === 0;

  const toggle = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const handleAddToMyDays = () => {
    addToMyDays(selectedIds);
    setSelectedIds([]);
  };

  if (isEmpty) {
    return (
      <ThemedView style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
          <ThemedText style={styles.title}>To Go</ThemedText>
        </View>
        <View style={styles.empty}>
          <ThemedText style={styles.emptyEmoji}>📍</ThemedText>
          <ThemedText type="smallBold">아직 추가된 장소가 없어요</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            목록이나 검색에서 가고 싶은 곳을 추가해 보세요
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <ThemedText style={styles.title}>To Go</ThemedText>
        {myDaysIds.length > 0 && (
          <ThemedText type="small" style={{ color: Brand.primary }}>
            My Days {myDaysIds.length}곳
          </ThemedText>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + BottomTabInset + 80 },
        ]}>
        {/* 큐레이션 장소 */}
        {toGoPlaces.map(place => {
          const checked = selectedIds.includes(place.id);
          const alreadyInMyDays = myDaysIds.includes(place.id);
          return (
            <Pressable
              key={place.id}
              onPress={() => toggle(place.id)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View
                style={[
                  styles.checkbox,
                  checked && { backgroundColor: Brand.primary, borderColor: Brand.primary },
                  alreadyInMyDays && !checked && { borderColor: Brand.primary },
                ]}>
                {checked && <ThemedText style={styles.checkmark}>✓</ThemedText>}
                {alreadyInMyDays && !checked && (
                  <ThemedText style={[styles.checkmark, { color: Brand.primary }]}>·</ThemedText>
                )}
              </View>

              <PlacePhoto place={place} />

              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <ThemedText type="smallBold" numberOfLines={1} style={styles.nameText}>
                    {place.name}
                  </ThemedText>
                  <View style={styles.banjiBadge}>
                    <ThemedText style={styles.banjiText}>반지</ThemedText>
                  </View>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {PLACE_TYPE_LABELS[place.placeTypes[0]]} · {place.area}
                </ThemedText>
              </View>

              <Pressable
                onPress={() => removeFromToGo(place.id)}
                hitSlop={8}
                style={styles.removeBtn}>
                <ThemedText type="small" themeColor="textSecondary">✕</ThemedText>
              </Pressable>
            </Pressable>
          );
        })}

        {/* 검색으로 추가한 장소 */}
        {toGoCustom.length > 0 && (
          <>
            {toGoPlaces.length > 0 && <View style={styles.sectionDivider} />}
            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
              직접 추가한 장소
            </ThemedText>
            {toGoCustom.map(place => {
              const checked = selectedIds.includes(place.id);
              return (
                <Pressable
                  key={place.id}
                  onPress={() => toggle(place.id)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <View
                    style={[
                      styles.checkbox,
                      checked && { backgroundColor: Brand.primary, borderColor: Brand.primary },
                    ]}>
                    {checked && <ThemedText style={styles.checkmark}>✓</ThemedText>}
                  </View>

                  <View style={styles.customIcon}>
                    <ThemedText style={styles.customIconText}>📍</ThemedText>
                  </View>

                  <View style={styles.info}>
                    <ThemedText type="smallBold" numberOfLines={1}>{place.name}</ThemedText>
                    {place.address ? (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {place.address}
                      </ThemedText>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={() => removeCustomPlace(place.id)}
                    hitSlop={8}
                    style={styles.removeBtn}>
                    <ThemedText type="small" themeColor="textSecondary">✕</ThemedText>
                  </Pressable>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>

      {selectedIds.length > 0 && (
        <View style={[styles.bottomBar, { bottom: insets.bottom + BottomTabInset + Spacing.three }]}>
          <Pressable onPress={handleAddToMyDays} style={styles.addButton}>
            <ThemedText style={styles.addButtonText}>
              My Days에 추가 ({selectedIds.length})
            </ThemedText>
          </Pressable>
        </View>
      )}
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
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  emptyEmoji: { fontSize: 48 },
  list: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  sectionDivider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: Spacing.one },
  sectionLabel: { marginBottom: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: { opacity: 0.7 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { flexShrink: 1 },
  banjiBadge: { backgroundColor: Brand.primary + '25', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  banjiText: { fontSize: 10, color: Brand.primary, fontWeight: '700' },
  customIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customIconText: { fontSize: 20 },
  removeBtn: { padding: Spacing.one },
  bottomBar: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
  },
  addButton: {
    backgroundColor: Brand.primary,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  addButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
