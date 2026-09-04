import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceDetailSheet } from '@/components/place-detail-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/brand';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { PLACE_TYPES, PLACE_TYPE_LABELS, RECOMMENDED_PLACES, type Place, type PlaceType } from '@/data/places';
import { fetchGeojePetPharmacies, type VetPharmacy } from '@/lib/vet-pharmacy-api';
import { useTheme } from '@/hooks/use-theme';
import { useTripStore } from '@/store/trip-store';

type ListItem =
  | { kind: 'place'; data: Place }
  | { kind: 'pharmacy'; data: VetPharmacy };

type CategoryFilter = PlaceType | 'pharmacy' | 'all';

const CATEGORY_OPTIONS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  ...PLACE_TYPES,
  { id: 'pharmacy', label: '동물약국' },
];

export default function ListScreen() {
  const [detailPlace, setDetailPlace] = useState<Place | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<VetPharmacy | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [pharmacies, setPharmacies] = useState<VetPharmacy[]>([]);
  const [addedPharmacyNames, setAddedPharmacyNames] = useState<Set<string>>(new Set());
  const pharmacyCache = useRef<VetPharmacy[] | null>(null);
  const { toGoIds, myDaysIds, addCustomPlace, addToMyDays } = useTripStore();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  useEffect(() => {
    if (pharmacyCache.current) { setPharmacies(pharmacyCache.current); return; }
    fetchGeojePetPharmacies()
      .then(data => { pharmacyCache.current = data; setPharmacies(data); })
      .catch(() => {});
  }, []);

  const allItems = useMemo<ListItem[]>(() => {
    const places: ListItem[] = RECOMMENDED_PLACES.map(p => ({ kind: 'place', data: p }));
    const pharms: ListItem[] = pharmacies.map(p => ({ kind: 'pharmacy', data: p }));
    return [...places, ...pharms].sort((a, b) => {
      const nameA = a.kind === 'place' ? a.data.name : a.data.name;
      const nameB = b.kind === 'place' ? b.data.name : b.data.name;
      return nameA.localeCompare(nameB, 'ko');
    });
  }, [pharmacies]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter(item => {
      if (item.kind === 'place') {
        const p = item.data;
        const matchCat = category === 'all' || (category !== 'pharmacy' && p.placeTypes.includes(category as PlaceType));
        const matchQ = !q || p.name.toLowerCase().includes(q) || p.area.toLowerCase().includes(q) || p.placeTypes.some(t => PLACE_TYPE_LABELS[t].includes(q));
        return matchCat && matchQ;
      } else {
        const p = item.data;
        const matchCat = category === 'all' || category === 'pharmacy';
        const matchQ = !q || p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
        return matchCat && matchQ;
      }
    });
  }, [allItems, query, category]);

  const selectedCategoryLabel = CATEGORY_OPTIONS.find(c => c.id === category)?.label ?? '전체';

  const handleAddPharmacy = (p: VetPharmacy) => {
    const id = addCustomPlace({ name: p.name, address: p.address, lat: p.lat, lng: p.lng });
    addToMyDays([id]);
    setAddedPharmacyNames(prev => new Set([...prev, p.name]));
  };

  const openPhone = (phone: string) => {
    const tel = `tel:${phone.replace(/[^0-9]/g, '')}`;
    if (Platform.OS === 'web') { window.open(tel); } else { Linking.openURL(tel); }
  };

  const totalCount = category === 'all'
    ? RECOMMENDED_PLACES.length + pharmacies.length
    : filtered.length;

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
        <ThemedText style={styles.title}>업체 목록</ThemedText>
        <ThemedText type="small" style={{ color: Brand.primary }}>
          {toGoIds.length > 0 ? `찜 ${toGoIds.length}곳` : `총 ${totalCount}곳`}
        </ThemedText>
      </View>

      {/* 검색 + 카테고리 */}
      <View style={styles.filterRow}>
        <View style={[styles.searchBarWrap, { backgroundColor: theme.backgroundElement, flex: 1 }]}>
          <ThemedText style={styles.searchIcon}>🔍</ThemedText>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="장소명, 지역..."
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

        <Pressable
          onPress={() => setCategoryModalVisible(true)}
          style={[styles.categoryBtn, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={[styles.categoryBtnText, { color: category !== 'all' ? Brand.primary : theme.textSecondary }]} numberOfLines={1}>
            {selectedCategoryLabel}
          </ThemedText>
          <ThemedText style={[styles.categoryArrow, { color: theme.textSecondary }]}>▾</ThemedText>
        </Pressable>
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
        {filtered.map((item, i) => {
          if (item.kind === 'place') {
            const place = item.data;
            const inToGo = toGoIds.includes(place.id);
            const inMyDays = myDaysIds.includes(place.id);
            return (
              <Pressable
                key={`place-${place.id}`}
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
          } else {
            const p = item.data;
            return (
              <Pressable
                key={`pharmacy-${i}`}
                onPress={() => setSelectedPharmacy(p)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <ThemedText style={styles.name} numberOfLines={1}>{p.name}</ThemedText>
                    <View style={[styles.badge, { backgroundColor: '#EFF6FF' }]}>
                      <ThemedText style={[styles.badgeText, { color: '#3B82F6' }]}>동물약국</ThemedText>
                    </View>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{p.address}</ThemedText>
                </View>
                <ThemedText themeColor="textSecondary" style={styles.arrow}>›</ThemedText>
              </Pressable>
            );
          }
        })}
      </ScrollView>

      {/* 카테고리 선택 모달 */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCategoryModalVisible(false)} />
        <View style={[styles.categoryModal, { backgroundColor: theme.background }]}>
          <ThemedText style={styles.categoryModalTitle}>카테고리</ThemedText>
          <View style={styles.categoryGrid}>
            {CATEGORY_OPTIONS.map(opt => {
              const selected = category === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => { setCategory(opt.id); setCategoryModalVisible(false); }}
                  style={[
                    styles.categoryChip,
                    { borderColor: selected ? Brand.primary : theme.textSecondary + '44' },
                    selected && { backgroundColor: Brand.primary },
                  ]}>
                  <ThemedText style={[styles.categoryChipText, selected && { color: '#FFF' }]}>
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* 동물약국 상세 모달 */}
      <Modal
        visible={!!selectedPharmacy}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPharmacy(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedPharmacy(null)} />
        {selectedPharmacy && (
          <View style={[styles.pharmacySheet, { backgroundColor: theme.background }]}>
            <View style={[styles.handleBar, { backgroundColor: theme.textSecondary + '44' }]} />
            <ThemedText style={styles.pharmacySheetName}>{selectedPharmacy.name}</ThemedText>
            <View style={[styles.pharmacySheetTag, { backgroundColor: '#EFF6FF' }]}>
              <ThemedText style={[styles.pharmacySheetTagText, { color: '#3B82F6' }]}>🏥 동물약국</ThemedText>
            </View>
            {selectedPharmacy.address ? (
              <View style={styles.pharmacySheetRow}>
                <ThemedText style={styles.pharmacySheetIcon}>📍</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>{selectedPharmacy.address}</ThemedText>
              </View>
            ) : null}
            {selectedPharmacy.phone ? (
              <View style={styles.pharmacySheetRow}>
                <ThemedText style={styles.pharmacySheetIcon}>📞</ThemedText>
                <Pressable onPress={() => openPhone(selectedPharmacy.phone)}>
                  <ThemedText type="small" style={{ color: Brand.primary }}>{selectedPharmacy.phone}</ThemedText>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.pharmacySheetActions}>
              {selectedPharmacy.phone ? (
                <Pressable
                  onPress={() => openPhone(selectedPharmacy.phone)}
                  style={[styles.pharmacySheetBtn, styles.pharmacySheetBtnOutline]}>
                  <ThemedText style={[styles.pharmacySheetBtnText, { color: Brand.primary }]}>📞 전화하기</ThemedText>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => { handleAddPharmacy(selectedPharmacy); setSelectedPharmacy(null); }}
                style={[styles.pharmacySheetBtn, { backgroundColor: Brand.primary }]}>
                <ThemedText style={[styles.pharmacySheetBtnText, { color: '#FFF' }]}>
                  {addedPharmacyNames.has(selectedPharmacy.name) ? '✓ 일정에 추가됨' : '+ 내 일정에 추가'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>

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

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  clearBtn: { fontSize: 14, color: '#999' },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    gap: 4,
    minWidth: 80,
  },
  categoryBtnText: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  categoryArrow: { fontSize: 10 },

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
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  arrow: { fontSize: 22, fontWeight: '300', paddingLeft: Spacing.two },

  /* 카테고리 모달 */
  modalBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  categoryModal: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  categoryModalTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  categoryChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  categoryChipText: { fontSize: 14, fontWeight: '600' },

  /* 동물약국 상세 모달 */
  pharmacySheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  handleBar: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.two,
  },
  pharmacySheetName: { fontSize: 20, fontWeight: '800' },
  pharmacySheetTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pharmacySheetTagText: { fontSize: 13, fontWeight: '700' },
  pharmacySheetRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  pharmacySheetIcon: { fontSize: 14, lineHeight: 20 },
  pharmacySheetActions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  pharmacySheetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  pharmacySheetBtnOutline: { borderWidth: 1.5, borderColor: Brand.primary },
  pharmacySheetBtnText: { fontWeight: '700', fontSize: 15 },
});
