import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useColorScheme, View } from 'react-native';

import { PlacePhoto } from '@/components/place-photo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/brand';
import { Colors, Spacing } from '@/constants/theme';
import { PLACE_TYPE_LABELS, RECOMMENDED_PLACES } from '@/data/places';
import { useTripStore } from '@/store/trip-store';

export default function ToGoPanel() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const {
    toGoIds, myDaysIds, savedItineraries,
    removeFromToGo, addToMyDays, startNewItinerary, addToSavedItinerary,
    customPlaces, removeCustomPlace,
  } = useTripStore();

  const toGoPlaces = RECOMMENDED_PLACES.filter(p => toGoIds.includes(p.id));
  const toGoCustom = customPlaces.filter(p => toGoIds.includes(p.id));
  const isEmpty = toGoPlaces.length === 0 && toGoCustom.length === 0;

  const toggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getPlaceNames = (placeIds: string[]) => {
    const names = placeIds.slice(0, 4).map(id => {
      const c = RECOMMENDED_PLACES.find(p => p.id === id);
      if (c) return c.name;
      const cu = customPlaces.find(p => p.id === id);
      return cu?.name ?? '';
    }).filter(Boolean);
    const suffix = placeIds.length > 4 ? ` 외 ${placeIds.length - 4}곳` : '';
    return names.join(' · ') + suffix;
  };

  const handleAddTap = () => {
    if (myDaysIds.length > 0 || savedItineraries.length > 0) {
      setPickerVisible(true);
    } else {
      addToMyDays(selectedIds);
      setSelectedIds([]);
    }
  };

  const selectItinerary = (targetId: 'current' | string) => {
    if (targetId === 'current') {
      addToMyDays(selectedIds);
    } else {
      addToSavedItinerary(targetId, selectedIds);
    }
    setSelectedIds([]);
    setPickerVisible(false);
  };

  const handleStartNew = () => {
    startNewItinerary(selectedIds);
    setSelectedIds([]);
    setPickerVisible(false);
  };

  if (isEmpty) {
    return (
      <ThemedView style={styles.empty}>
        <ThemedText style={styles.emptyEmoji}>📍</ThemedText>
        <ThemedText type="smallBold">아직 추가된 장소가 없어요</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">목록이나 검색에서 가고 싶은 곳을 추가해 보세요</ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: 120 }]}>
        {toGoPlaces.map(place => {
          const checked = selectedIds.includes(place.id);
          const alreadyInMyDays = myDaysIds.includes(place.id);
          return (
            <Pressable key={place.id} onPress={() => toggle(place.id)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={[
                styles.checkbox,
                checked && { backgroundColor: Brand.primary, borderColor: Brand.primary },
                alreadyInMyDays && !checked && { borderColor: Brand.primary },
              ]}>
                {checked && <ThemedText style={styles.checkmark}>✓</ThemedText>}
                {alreadyInMyDays && !checked && <ThemedText style={[styles.checkmark, { color: Brand.primary }]}>·</ThemedText>}
              </View>
              <PlacePhoto place={place} />
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <ThemedText type="smallBold" numberOfLines={1} style={styles.nameText}>{place.name}</ThemedText>
                  <ThemedText style={styles.petEmoji}>🐶</ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {PLACE_TYPE_LABELS[place.placeTypes[0]]} · {place.area}
                </ThemedText>
              </View>
              <Pressable onPress={() => removeFromToGo(place.id)} hitSlop={8} style={styles.removeBtn}>
                <ThemedText type="small" themeColor="textSecondary">✕</ThemedText>
              </Pressable>
            </Pressable>
          );
        })}

        {toGoCustom.length > 0 && (
          <>
            {toGoPlaces.length > 0 && <View style={styles.sectionDivider} />}
            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>직접 추가한 장소</ThemedText>
            {toGoCustom.map(place => {
              const checked = selectedIds.includes(place.id);
              return (
                <Pressable key={place.id} onPress={() => toggle(place.id)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <View style={[styles.checkbox, checked && { backgroundColor: Brand.primary, borderColor: Brand.primary }]}>
                    {checked && <ThemedText style={styles.checkmark}>✓</ThemedText>}
                  </View>
                  <View style={styles.customIcon}>
                    <ThemedText style={styles.customIconText}>📍</ThemedText>
                  </View>
                  <View style={styles.info}>
                    <ThemedText type="smallBold" numberOfLines={1}>{place.name}</ThemedText>
                    {place.address ? <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{place.address}</ThemedText> : null}
                  </View>
                  <Pressable onPress={() => removeCustomPlace(place.id)} hitSlop={8} style={styles.removeBtn}>
                    <ThemedText type="small" themeColor="textSecondary">✕</ThemedText>
                  </Pressable>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>

      {selectedIds.length > 0 && (
        <View style={styles.bottomBar}>
          <Pressable onPress={handleAddTap} style={styles.addButton}>
            <ThemedText style={styles.addButtonText}>내 일정에 추가 ({selectedIds.length})</ThemedText>
          </Pressable>
        </View>
      )}

      {/* 일정 선택 모달 */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <Pressable style={styles.pickerOverlay} onPress={() => setPickerVisible(false)}>
          <Pressable style={[styles.pickerSheet, { backgroundColor: colors.background }]} onPress={() => {}}>
            <View style={styles.pickerHandle} />
            <ThemedText style={styles.pickerTitle}>어느 일정에 추가할까요?</ThemedText>

            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              {/* 현재 작업 중 일정 */}
              {myDaysIds.length > 0 && (
                <Pressable
                  style={[styles.itinRow, { borderColor: colors.backgroundElement }]}
                  onPress={() => selectItinerary('current')}>
                  <View style={styles.itinLeft}>
                    <View style={[styles.itinBadge, { backgroundColor: Brand.primary }]}>
                      <ThemedText style={styles.itinBadgeText}>진행 중</ThemedText>
                    </View>
                    <ThemedText style={styles.itinName}>미저장 일정</ThemedText>
                  </View>
                  {myDaysIds.length > 0 && (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.itinPlaces} numberOfLines={2}>
                      {getPlaceNames(myDaysIds)}
                    </ThemedText>
                  )}
                </Pressable>
              )}

              {/* 저장된 일정들 */}
              {savedItineraries.map((itin, idx) => (
                <Pressable
                  key={itin.id}
                  style={[styles.itinRow, { borderColor: colors.backgroundElement }]}
                  onPress={() => selectItinerary(itin.id)}>
                  <View style={styles.itinLeft}>
                    <View style={[styles.itinBadge, { backgroundColor: colors.backgroundElement }]}>
                      <ThemedText style={[styles.itinBadgeText, { color: colors.text }]}>{idx + 1}</ThemedText>
                    </View>
                    <ThemedText style={styles.itinName} numberOfLines={1}>{itin.name}</ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.itinPlaces} numberOfLines={2}>
                    {getPlaceNames(itin.placeIds)}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={[styles.newBtn, { borderColor: colors.backgroundElement }]}
              onPress={handleStartNew}>
              <ThemedText style={styles.newBtnText}>＋ 새 일정으로 시작</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  emptyEmoji: { fontSize: 48 },
  list: { paddingHorizontal: Spacing.four, gap: Spacing.two, paddingTop: Spacing.two },
  sectionDivider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: Spacing.one },
  sectionLabel: { marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  pressed: { opacity: 0.7 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#CCC', alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { flexShrink: 1 },
  petEmoji: { fontSize: 14 },
  customIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Brand.primary + '20', alignItems: 'center', justifyContent: 'center' },
  customIconText: { fontSize: 20 },
  removeBtn: { padding: Spacing.one },
  bottomBar: { position: 'absolute', bottom: Spacing.three, left: Spacing.four, right: Spacing.four },
  addButton: { backgroundColor: Brand.primary, borderRadius: Spacing.three, paddingVertical: Spacing.three, alignItems: 'center' },
  addButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },

  // 일정 선택 모달 (바텀시트)
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  pickerSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: Spacing.two, paddingBottom: 36, maxHeight: '80%' },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CCC', alignSelf: 'center', marginBottom: Spacing.three },
  pickerTitle: { fontSize: 17, fontWeight: '700', paddingHorizontal: Spacing.four, marginBottom: Spacing.two },
  pickerScroll: { maxHeight: 420 },
  itinRow: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderRadius: 14,
    padding: Spacing.three,
    gap: 6,
  },
  itinLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  itinBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  itinBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  itinName: { fontSize: 15, fontWeight: '700', flex: 1 },
  itinPlaces: { fontSize: 12, lineHeight: 18 },
  newBtn: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.one,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  newBtnText: { fontSize: 15, fontWeight: '600' },
});
