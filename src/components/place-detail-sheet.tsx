import { useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';

import { PlacePhoto } from '@/components/place-photo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/brand';
import { Colors, Spacing } from '@/constants/theme';
import { PLACE_TYPE_LABELS, type Place } from '@/data/places';
import { useTripStore } from '@/store/trip-store';

type Props = {
  place: Place | null;
  visible: boolean;
  onClose: () => void;
};

export function PlaceDetailSheet({ place, visible, onClose }: Props) {
  const [showItineraryChoice, setShowItineraryChoice] = useState(false);
  const { toGoIds, myDaysIds, addToGo, addToMyDays, startNewItinerary } = useTripStore();
  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const sheetBg = Colors[scheme].background;
  const handleColor = scheme === 'dark' ? '#555' : '#DDD';
  const router = useRouter();

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

            {/* 체중 제한 */}
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
