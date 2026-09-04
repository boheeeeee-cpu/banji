import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';

import { PlacePhoto } from '@/components/place-photo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/brand';
import { Colors, Spacing } from '@/constants/theme';
import { PLACE_TYPE_LABELS, type Place } from '@/data/places';
import { searchNaverLocal, type NaverLocalResult } from '@/lib/naver-search';
import { useTripStore } from '@/store/trip-store';

type ParkingResult = NaverLocalResult & { distanceKm: number; isFree: boolean };

const FREE_KEYWORDS = ['무료', '학동', '해금강', '구조라', '조선해양', '김영삼', '칠천량', '맹종죽', '스포츠파크', '대금산', '국립공원'];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

type Props = {
  place: Place | null;
  visible: boolean;
  onClose: () => void;
};

export function PlaceDetailSheet({ place, visible, onClose }: Props) {
  const [showItineraryChoice, setShowItineraryChoice] = useState(false);
  const [parkingList, setParkingList] = useState<ParkingResult[]>([]);
  const [parkingLoading, setParkingLoading] = useState(false);
  const [addedParkingTitles, setAddedParkingTitles] = useState<Set<string>>(new Set());
  const parkingCache = useRef<Record<string, ParkingResult[]>>({});

  const { toGoIds, myDaysIds, addToGo, addToMyDays, startNewItinerary, addCustomPlace } = useTripStore();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const sheetBg = Colors[scheme].background;
  const handleColor = scheme === 'dark' ? '#555' : '#DDD';
  const router = useRouter();

  useEffect(() => {
    if (!visible || !place) return;

    const cacheKey = place.id;
    if (parkingCache.current[cacheKey]) {
      setParkingList(parkingCache.current[cacheKey]);
      return;
    }

    setParkingLoading(true);
    const query = `거제 ${place.area} 공영주차장`;
    searchNaverLocal(query, 10)
      .then(results => {
        const withDist = results
          .filter(r => r.lat !== 0 && r.lng !== 0)
          .map(r => ({
            ...r,
            distanceKm: haversineKm(place.lat, place.lng, r.lat, r.lng),
            isFree: FREE_KEYWORDS.some(kw => r.title.includes(kw)),
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, 3);
        parkingCache.current[cacheKey] = withDist;
        setParkingList(withDist);
      })
      .catch(() => setParkingList([]))
      .finally(() => setParkingLoading(false));
  }, [visible, place?.id]);

  if (!place) return null;

  const inToGo = toGoIds.includes(place.id);
  const inMyDays = myDaysIds.includes(place.id);
  const hasCurrentItinerary = myDaysIds.length > 0;

  const openNaverMap = () => {
    const url = `https://map.naver.com/p/search/${encodeURIComponent(place.name + ' 거제')}`;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const handleClose = () => {
    setShowItineraryChoice(false);
    setAddedParkingTitles(new Set());
    onClose();
  };

  const handleAddToMyDays = () => {
    if (!hasCurrentItinerary) {
      addToMyDays([place.id]);
      handleClose();
      router.navigate('/my-days' as any);
    } else {
      setShowItineraryChoice(true);
    }
  };

  const handleAddToExisting = () => {
    addToMyDays([place.id]);
    handleClose();
    router.navigate('/my-days' as any);
  };

  const handleStartNew = () => {
    startNewItinerary([place.id]);
    handleClose();
    router.navigate('/my-days' as any);
  };

  const handleAddParking = (parking: ParkingResult) => {
    const id = addCustomPlace({
      name: parking.title,
      address: parking.roadAddress || parking.address,
      lat: parking.lat,
      lng: parking.lng,
    });
    addToMyDays([id]);
    setAddedParkingTitles(prev => new Set([...prev, parking.title]));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={[styles.sheet, { backgroundColor: sheetBg }]}>
        <View style={[styles.handleBar, { backgroundColor: handleColor }]} />

        {/* 대표사진 */}
        {place.photoUrl ? (
          <Image source={{ uri: place.photoUrl }} style={styles.headerPhoto} resizeMode="cover" />
        ) : (
          <View style={styles.emojiHeader}>
            <PlacePhoto place={place} size={72} />
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          bounces={false}>

          {/* 이름 + 분류 */}
          <View style={styles.titleRow}>
            <ThemedText style={styles.name}>{place.name}</ThemedText>
            <View style={styles.tagRow}>
              {place.placeTypes.map(t => (
                <View key={t} style={styles.tag}>
                  <ThemedText style={styles.tagText}>{PLACE_TYPE_LABELS[t]}</ThemedText>
                </View>
              ))}
              <ThemedText type="small" themeColor="textSecondary">{place.area}</ThemedText>
            </View>
          </View>

          {/* 운영시간 · 휴무일 */}
          {(place.operatingHours || place.closedDays) && (
            <ThemedView type="backgroundElement" style={styles.infoBlock}>
              {place.operatingHours && (
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoIcon}>🕐</ThemedText>
                  <ThemedText type="small" style={styles.infoText}>{place.operatingHours}</ThemedText>
                </View>
              )}
              {place.closedDays && (
                <View style={styles.infoRow}>
                  <ThemedText style={styles.infoIcon}>🚫</ThemedText>
                  <ThemedText type="small" style={styles.infoText}>휴무 {place.closedDays}</ThemedText>
                </View>
              )}
            </ThemedView>
          )}

          {/* 주소 */}
          {place.address && (
            <View style={styles.infoBlock}>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoIcon}>📍</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.infoText}>
                  {place.address}
                </ThemedText>
              </View>
            </View>
          )}

          {/* 강아지 동반 정보 */}
          <ThemedView type="backgroundElement" style={styles.infoBlock}>
            <ThemedText type="smallBold" style={styles.sectionLabel}>🐾 반려동물 동반 정보</ThemedText>

            {(place.entryMethod || place.dogSizes?.length || place.weightLimitKg) && (
              <View style={styles.badgeRow}>
                {place.entryMethod && (
                  <View style={styles.petBadge}>
                    <ThemedText style={styles.petBadgeText}>
                      {place.entryMethod === '실내' ? '🏠 실내' : place.entryMethod === '실외' ? '🌳 실외' : '✅ 실내외 전체'}
                    </ThemedText>
                  </View>
                )}
                {place.dogSizes?.map(size => (
                  <View key={size} style={styles.petBadge}>
                    <ThemedText style={styles.petBadgeText}>🐶 {size}</ThemedText>
                  </View>
                ))}
              </View>
            )}

            <ThemedText type="small">{place.petNote}</ThemedText>

            {place.weightLimitKg && (
              <View style={[styles.infoRow, { marginTop: 6 }]}>
                <ThemedText style={styles.infoIcon}>⚖️</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.infoText}>
                  {place.weightLimitKg}kg 이하 입장 가능
                </ThemedText>
              </View>
            )}

            {place.entryRestrictions && (
              <View style={[styles.infoRow, { marginTop: 4 }]}>
                <ThemedText style={styles.infoIcon}>⚠️</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.infoText}>
                  {place.entryRestrictions}
                </ThemedText>
              </View>
            )}
          </ThemedView>

          {/* 주차 안내 */}
          {place.parkingNote && (
            <ThemedView type="backgroundElement" style={styles.infoBlock}>
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoIcon}>🅿️</ThemedText>
                <ThemedText type="small" style={styles.infoText}>{place.parkingNote}</ThemedText>
              </View>
            </ThemedView>
          )}

          {/* 근처 공영주차장 */}
          <ThemedView type="backgroundElement" style={styles.infoBlock}>
            <ThemedText type="smallBold" style={styles.sectionLabel}>🏛️ 근처 공영주차장</ThemedText>
            {parkingLoading ? (
              <ThemedText type="small" themeColor="textSecondary">검색 중…</ThemedText>
            ) : parkingList.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">주변 공영주차장 정보가 없습니다</ThemedText>
            ) : (
              parkingList.map((p, i) => {
                const added = addedParkingTitles.has(p.title);
                const distLabel = p.distanceKm < 1
                  ? `${Math.round(p.distanceKm * 1000)}m`
                  : `${p.distanceKm.toFixed(1)}km`;
                return (
                  <View key={i} style={[styles.parkingRow, i === 0 && styles.parkingRowFirst]}>
                    <View style={styles.parkingInfo}>
                      <View style={styles.parkingNameRow}>
                        <ThemedText type="small" style={styles.parkingName} numberOfLines={1}>{p.title}</ThemedText>
                        <View style={[styles.parkingBadge, p.isFree ? styles.freeBadge : styles.paidBadge]}>
                          <ThemedText style={[styles.parkingBadgeText, p.isFree ? styles.freeText : styles.paidText]}>
                            {p.isFree ? '무료' : '유료'}
                          </ThemedText>
                        </View>
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">{distLabel}</ThemedText>
                    </View>
                    <Pressable
                      onPress={() => { if (!added) handleAddParking(p); }}
                      style={[styles.parkingAddBtn, added && styles.parkingAddBtnDone]}>
                      <ThemedText style={[styles.parkingAddBtnText, added && styles.parkingAddBtnTextDone]}>
                        {added ? '✓ 추가됨' : '+ 일정 추가'}
                      </ThemedText>
                    </Pressable>
                  </View>
                );
              })
            )}
          </ThemedView>

          {/* 네이버 지도 */}
          <Pressable onPress={openNaverMap} style={styles.naverBtn}>
            <ThemedText style={styles.naverBtnText}>네이버 지도에서 보기 →</ThemedText>
          </Pressable>
        </ScrollView>

        {/* ── 일정 추가 선택 패널 ── */}
        {showItineraryChoice ? (
          <View style={[styles.choicePanel, { backgroundColor: sheetBg }]}>
            <ThemedText style={styles.choiceTitle}>어느 일정에 추가할까요?</ThemedText>
            <View style={styles.choiceBtns}>
              <Pressable
                onPress={handleAddToExisting}
                style={[styles.choiceBtn, { backgroundColor: Brand.primary }]}>
                <ThemedText style={styles.choiceBtnText}>현재 일정에 추가</ThemedText>
                <ThemedText style={[styles.choiceBtnSub, { color: '#FFF9' }]}>
                  {myDaysIds.length}곳 포함된 일정
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleStartNew}
                style={[styles.choiceBtn, styles.choiceBtnOutline]}>
                <ThemedText style={[styles.choiceBtnText, { color: Brand.primary }]}>새 일정 만들기</ThemedText>
                <ThemedText style={[styles.choiceBtnSub, { color: Brand.primary + '88' }]}>
                  기존 일정은 저장됩니다
                </ThemedText>
              </Pressable>
            </View>
            <Pressable onPress={() => setShowItineraryChoice(false)} style={styles.choiceCancel}>
              <ThemedText themeColor="textSecondary" style={{ fontSize: 14 }}>취소</ThemedText>
            </Pressable>
          </View>
        ) : (
          /* ── 액션 버튼 ── */
          <View style={[styles.actions, { backgroundColor: sheetBg }]}>
            <Pressable
              onPress={() => { if (!inToGo) addToGo([place.id]); }}
              style={[styles.actionBtn, styles.outlineBtn, inToGo && styles.doneOutline]}>
              <ThemedText style={[styles.actionBtnText, { color: inToGo ? '#AAA' : Brand.primary }]}>
                {inToGo ? '✓ 찜 완료' : '🤍 찜 목록에 추가'}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleAddToMyDays}
              style={[styles.actionBtn, styles.fillBtn, inMyDays && styles.doneFill]}>
              <ThemedText style={[styles.actionBtnText, { color: '#FFF' }]}>
                {inMyDays ? '✓ 일정에 있음' : '+ 내 일정에 추가'}
              </ThemedText>
            </Pressable>
          </View>
        )}

        <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
          <ThemedText style={styles.closeBtnText}>✕</ThemedText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleBar: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 4,
  },
  headerPhoto: { width: '100%', height: 200 },
  emojiHeader: { alignItems: 'center', paddingVertical: Spacing.three },
  body: { padding: Spacing.four, paddingBottom: Spacing.three, gap: Spacing.three },

  titleRow: { gap: 6 },
  name: { fontSize: 22, fontWeight: '800' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  tag: {
    backgroundColor: Brand.primary + '18',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: { fontSize: 12, color: Brand.primary, fontWeight: '600' },

  infoBlock: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: 6,
  },
  infoRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  infoIcon: { fontSize: 14, lineHeight: 20 },
  infoText: { flex: 1, lineHeight: 20 },
  sectionLabel: { marginBottom: 4 },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  petBadge: {
    backgroundColor: Brand.primary + '18',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  petBadgeText: { fontSize: 12, color: Brand.primary, fontWeight: '600' },

  /* 공영주차장 */
  parkingRowFirst: { borderTopWidth: 0 },
  parkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CCC4',
  },
  parkingInfo: { flex: 1, gap: 3 },
  parkingNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  parkingName: { flex: 1, fontWeight: '600' },
  parkingBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexShrink: 0 },
  freeBadge: { backgroundColor: '#DCFCE7' },
  paidBadge: { backgroundColor: '#FEF3C7' },
  parkingBadgeText: { fontSize: 10, fontWeight: '700' },
  freeText: { color: '#16A34A' },
  paidText: { color: '#B45309' },
  parkingAddBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Brand.primary,
    flexShrink: 0,
  },
  parkingAddBtnDone: { backgroundColor: '#E5E7EB' },
  parkingAddBtnText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  parkingAddBtnTextDone: { color: '#9CA3AF' },

  naverBtn: { alignItems: 'center', paddingVertical: Spacing.two },
  naverBtnText: { color: Brand.primary, fontWeight: '600', fontSize: 14 },

  /* 액션 버튼 */
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    paddingBottom: Spacing.four,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CCC4',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  outlineBtn: { borderWidth: 1.5, borderColor: Brand.primary },
  fillBtn: { backgroundColor: Brand.primary },
  doneOutline: { borderColor: '#CCC' },
  doneFill: { backgroundColor: '#CCC' },
  actionBtnText: { fontWeight: '700', fontSize: 15 },

  /* 일정 선택 패널 */
  choicePanel: {
    padding: Spacing.four,
    paddingBottom: Spacing.five,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CCC4',
    gap: Spacing.two,
  },
  choiceTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  choiceBtns: { gap: Spacing.two },
  choiceBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 2,
  },
  choiceBtnOutline: {
    borderWidth: 1.5,
    borderColor: Brand.primary,
  },
  choiceBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  choiceBtnSub: { fontSize: 12 },
  choiceCancel: { alignItems: 'center', paddingVertical: Spacing.two },

  closeBtn: { position: 'absolute', top: 14, right: 16 },
  closeBtnText: { fontSize: 18, color: '#999' },
});
