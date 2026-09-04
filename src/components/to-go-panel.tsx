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
  const [addModalVisible, setAddModalVisible] = useState(false);
  const { toGoIds, myDaysIds, removeFromToGo, addToMyDays, startNewItinerary, customPlaces, removeCustomPlace } = useTripStore();

  const toGoPlaces = RECOMMENDED_PLACES.filter(p => toGoIds.includes(p.id));
  const toGoCustom = customPlaces.filter(p => toGoIds.includes(p.id));
  const isEmpty = toGoPlaces.length === 0 && toGoCustom.length === 0;

  const toggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleAddToMyDays = () => {
    if (myDaysIds.length > 0) {
      // 작업 중인 일정이 있으면 모달 표시
      setAddModalVisible(true);
    } else {
      addToMyDays(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleAddToCurrent = () => {
    addToMyDays(selectedIds);
    setSelectedIds([]);
    setAddModalVisible(false);
  };

  const handleStartNew = () => {
    startNewItinerary(selectedIds);
    setSelectedIds([]);
    setAddModalVisible(false);
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
          <Pressable onPress={handleAddToMyDays} style={styles.addButton}>
            <ThemedText style={styles.addButtonText}>내 일정에 추가 ({selectedIds.length})</ThemedText>
          </Pressable>
        </View>
      )}

      <Modal visible={addModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setAddModalVisible(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.background }]} onPress={() => {}}>
            <ThemedText style={styles.modalTitle}>어떻게 추가할까요?</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.modalDesc}>
              지금 작업 중인 일정이 있어요
            </ThemedText>
            <Pressable style={[styles.modalBtn, { backgroundColor: Brand.primary }]} onPress={handleAddToCurrent}>
              <ThemedText style={styles.modalBtnText}>현재 일정에 추가</ThemedText>
            </Pressable>
            <Pressable style={[styles.modalBtn, { backgroundColor: colors.backgroundElement }]} onPress={handleStartNew}>
              <ThemedText style={styles.modalBtnTextAlt}>새 일정으로 시작</ThemedText>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: 300, borderRadius: 20, padding: Spacing.four, gap: Spacing.two },
  modalTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  modalDesc: { textAlign: 'center', marginBottom: Spacing.one },
  modalBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  modalBtnTextAlt: { fontWeight: '600', fontSize: 15 },
});
