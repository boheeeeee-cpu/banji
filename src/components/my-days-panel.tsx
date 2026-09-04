import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, Modal, useColorScheme } from 'react-native';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';

import { PlacePhoto } from '@/components/place-photo';
import { PlaceDetailSheet } from '@/components/place-detail-sheet';
import { NaverMapView } from '@/components/map/naver-map-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { PLACE_TYPE_LABELS, RECOMMENDED_PLACES, type Place } from '@/data/places';
import type { MapPlacePayload } from '@/lib/naver-map-html';
import { type CustomPlace, useTripStore } from '@/store/trip-store';

const DEFAULT_DWELL = 60;

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `약 ${mins}분`;
  return `약 ${Math.floor(mins / 60)}시간 ${mins % 60}분`;
}

function formatDwell(minutes: number): string {
  if (minutes === 0) return '통과';
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

function addMinutes(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + Math.round(minutes);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function buildNaverMapUrl(
  points: { lat: number; lng: number; name: string }[],
): string | null {
  if (points.length < 2) return null;
  const start = points[0];
  const dest = points[points.length - 1];
  const via = points.slice(1, -1).slice(0, 5);

  if (Platform.OS === 'web') {
    // 웹: 네이버 지도 웹 경유지 경로 URL
    const startSeg = `${start.lng},${start.lat},${encodeURIComponent(start.name)},,`;
    const destSeg = `${dest.lng},${dest.lat},${encodeURIComponent(dest.name)},,`;
    const viaSeg = via.map(v => `${v.lng},${v.lat},${encodeURIComponent(v.name)},,`).join('/');
    const middle = viaSeg ? `${viaSeg}/` : '';
    return `https://map.naver.com/p/directions/${startSeg}/${middle}${destSeg}/car/summary`;
  }

  // 네이티브: nmap 딥링크
  const p = new URLSearchParams();
  p.set('slat', String(start.lat));
  p.set('slng', String(start.lng));
  p.set('sname', start.name);
  via.forEach((v, i) => {
    p.set(`v${i + 1}lat`, String(v.lat));
    p.set(`v${i + 1}lng`, String(v.lng));
    p.set(`v${i + 1}name`, v.name);
  });
  p.set('dlat', String(dest.lat));
  p.set('dlng', String(dest.lng));
  p.set('dname', dest.name);
  p.set('appname', 'com.banji.app');
  return `nmap://route/car?${p.toString()}`;
}

type Entry =
  | { type: 'curated'; id: string; name: string; lat: number; lng: number; place: typeof RECOMMENDED_PLACES[0] }
  | { type: 'custom'; id: string; name: string; lat?: number; lng?: number; custom: CustomPlace };

export default function MyDaysPanel() {
  const {
    myDaysIds, removeFromMyDays, moveMyDayItem, clearMyDays, setMyDaysRouteActive,
    departureLocation, departureTime, setDepartureLocation, setDepartureTime,
    dwellMinutes, setDwellMinutes, customPlaces, saveCurrentAsItinerary,
  } = useTripStore();
  const { user } = useAuthStore();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [legDurations, setLegDurations] = useState<(number | null)[]>([]);
  const [locLoading, setLocLoading] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [itineraryName, setItineraryName] = useState('');
  const [saving, setSaving] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [detailPlace, setDetailPlace] = useState<Place | null>(null);

  const mapPlaces: MapPlacePayload[] = useMemo(
    () => RECOMMENDED_PLACES.map(p => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, area: p.area })),
    [],
  );

  const entries: Entry[] = myDaysIds.flatMap(id => {
    const curated = RECOMMENDED_PLACES.find(p => p.id === id);
    if (curated) return [{ type: 'curated' as const, id, name: curated.name, lat: curated.lat, lng: curated.lng, place: curated }];
    const custom = customPlaces.find(p => p.id === id);
    if (custom) return [{ type: 'custom' as const, id, name: custom.name, lat: custom.lat, lng: custom.lng, custom }];
    return [];
  });

  const routeEntries = entries.filter(e => e.lat != null && e.lng != null);

  useEffect(() => {
    const allWaypoints = departureLocation
      ? [{ lat: departureLocation.lat, lng: departureLocation.lng }, ...routeEntries]
      : routeEntries;

    if (allWaypoints.length < 2) { setLegDurations([]); return; }

    let cancelled = false;
    const coords = allWaypoints.map(p => `${p.lng},${p.lat}`).join(';');
    fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const legs = (data.routes?.[0]?.legs ?? []) as { duration: number }[];
        setLegDurations(legs.map(l => l.duration));
      })
      .catch(() => { if (!cancelled) setLegDurations([]); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myDaysIds, departureLocation]);

  const arrivalByRouteIdx: string[] = [];
  let runningTime = departureTime;
  routeEntries.forEach((entry, ri) => {
    const legIdx = departureLocation ? ri : ri - 1;
    const legSec = (legIdx >= 0 ? legDurations[legIdx] : null) ?? null;
    if (legSec != null) runningTime = addMinutes(runningTime, legSec / 60);
    arrivalByRouteIdx.push(runningTime);
    runningTime = addMinutes(runningTime, dwellMinutes[entry.id] ?? DEFAULT_DWELL);
  });

  const getArrivalTime = (id: string) => {
    const ri = routeEntries.findIndex(e => e.id === id);
    return ri >= 0 ? arrivalByRouteIdx[ri] : null;
  };

  const getLegBefore = (id: string) => {
    const ri = routeEntries.findIndex(e => e.id === id);
    if (ri < 0) return null;
    const legIdx = departureLocation ? ri : ri - 1;
    return legIdx >= 0 ? (legDurations[legIdx] ?? null) : null;
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setDepartureLocation({ label: '현재 위치', lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLoading(false);
      },
      () => setLocLoading(false),
      { timeout: 8000 },
    );
  };

  const adjustDwell = (id: string, delta: number) => {
    const cur = dwellMinutes[id] ?? DEFAULT_DWELL;
    setDwellMinutes(id, Math.max(0, cur + delta));
  };

  const moveUp = (i: number) => { if (i > 0) moveMyDayItem(i, i - 1); };
  const moveDown = (i: number) => { if (i < entries.length - 1) moveMyDayItem(i, i + 1); };

  const handleSaveTap = () => {
    setItineraryName('');
    setSaveModalVisible(true);
  };

  const handleSaveConfirm = async () => {
    if (!itineraryName.trim()) return;
    setSaving(true);
    const name = itineraryName.trim();
    // 로컬 저장 (항상)
    saveCurrentAsItinerary(name);
    // 로그인된 경우 Supabase에도 저장
    if (user) {
      await supabase.from('saved_itineraries').insert({
        user_id: user.id,
        name,
        place_ids: myDaysIds,
        departure_location: departureLocation,
        departure_time: departureTime,
        dwell_minutes: dwellMinutes,
      });
    }
    setSaving(false);
    setSaveModalVisible(false);
  };

  if (entries.length === 0) {
    return (
      <ThemedView style={styles.empty}>
        <ThemedText style={styles.emptyEmoji}>🗓️</ThemedText>
        <ThemedText type="smallBold">아직 일정이 없어요</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">To Go에서 장소를 선택해 추가해 보세요</ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ThemedView type="backgroundElement" style={styles.departurePanel}>
        <View style={styles.departureRow}>
          <ThemedText style={styles.departureLabel}>📍 출발지</ThemedText>
          <View style={styles.departureRight}>
            {departureLocation ? (
              <View style={styles.locRow}>
                <ThemedText type="small" numberOfLines={1} style={styles.locText}>{departureLocation.label}</ThemedText>
                <Pressable onPress={() => setDepartureLocation(null)} hitSlop={8}>
                  <ThemedText type="small" themeColor="textSecondary"> ✕</ThemedText>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={handleGetLocation} style={[styles.locBtn, locLoading && styles.locBtnDisabled]}>
                <ThemedText type="small" style={styles.locBtnText}>
                  {locLoading ? '위치 확인 중...' : '현재 위치 사용'}
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>
        <View style={[styles.departureRow, styles.departureRowBorder]}>
          <ThemedText style={styles.departureLabel}>🕘 출발 시간</ThemedText>
          <View style={styles.departureRight}>
            {Platform.OS === 'web' ? (
              <input
                type="time"
                value={departureTime}
                onChange={e => setDepartureTime(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: Brand.primary, outline: 'none', cursor: 'pointer' }}
              />
            ) : (
              <TextInput value={departureTime} onChangeText={setDepartureTime} placeholder="09:00" style={styles.timeInput} />
            )}
          </View>
        </View>
      </ThemedView>

      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: 120 }]}>
        {departureLocation && (
          <View style={styles.departureItem}>
            <View style={[styles.orderBadge, { backgroundColor: '#666' }]}>
              <ThemedText style={styles.orderText}>출</ThemedText>
            </View>
            <ThemedText type="smallBold" style={{ flex: 1 }}>{departureLocation.label}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{departureTime} 출발</ThemedText>
          </View>
        )}

        {entries.map((entry, index) => {
          const legSec = getLegBefore(entry.id);
          const arrival = getArrivalTime(entry.id);
          const routeIdx = routeEntries.findIndex(e => e.id === entry.id);
          const showLeg = routeIdx > (departureLocation ? -1 : 0) || (departureLocation && routeIdx === 0);
          const dwell = dwellMinutes[entry.id] ?? DEFAULT_DWELL;
          const hasCoords = entry.lat != null && entry.lng != null;

          return (
            <View key={entry.id}>
              {showLeg && hasCoords && (
                <View style={styles.legRow}>
                  <View style={styles.legLine} />
                  <ThemedView type="backgroundElement" style={styles.legBadge}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {legSec != null ? `🚗 ${formatDuration(legSec)}` : '🚗 계산 중...'}
                    </ThemedText>
                  </ThemedView>
                  <View style={styles.legLine} />
                </View>
              )}

              <View style={styles.row}>
                <View style={styles.orderBadge}>
                  <ThemedText style={styles.orderText}>{index + 1}</ThemedText>
                </View>
                {entry.type === 'curated' ? (
                  <PlacePhoto place={entry.place} />
                ) : (
                  <View style={styles.customIcon}>
                    <ThemedText style={styles.customIconText}>📍</ThemedText>
                  </View>
                )}
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <ThemedText type="smallBold" numberOfLines={1} style={styles.nameText}>{entry.name}</ThemedText>
                    {entry.type === 'curated' && (
                      <View style={styles.banjiBadge}>
                        <ThemedText style={styles.banjiText}>반지</ThemedText>
                      </View>
                    )}
                  </View>
                  {entry.type === 'curated' ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {PLACE_TYPE_LABELS[entry.place.placeTypes[0]]} · {entry.place.area}
                    </ThemedText>
                  ) : entry.custom.address ? (
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{entry.custom.address}</ThemedText>
                  ) : null}
                  {arrival && <ThemedText type="small" style={{ color: Brand.primary }}>도착 {arrival}</ThemedText>}
                </View>
                <View style={styles.controls}>
                  <Pressable onPress={() => moveUp(index)} hitSlop={6} style={[styles.moveBtn, index === 0 && styles.moveBtnDisabled]}>
                    <ThemedText style={styles.moveBtnText}>▲</ThemedText>
                  </Pressable>
                  <ThemedText style={styles.handle}>≡</ThemedText>
                  <Pressable onPress={() => moveDown(index)} hitSlop={6} style={[styles.moveBtn, index === entries.length - 1 && styles.moveBtnDisabled]}>
                    <ThemedText style={styles.moveBtnText}>▼</ThemedText>
                  </Pressable>
                </View>
                <Pressable onPress={() => removeFromMyDays(entry.id)} hitSlop={8} style={styles.removeBtn}>
                  <ThemedText type="small" themeColor="textSecondary">✕</ThemedText>
                </Pressable>
              </View>

              <View style={styles.dwellRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.dwellLabel}>머무는 시간</ThemedText>
                <View style={styles.stepper}>
                  <Pressable onPress={() => adjustDwell(entry.id, -30)} hitSlop={8} style={[styles.stepBtn, dwell === 0 && styles.stepBtnDisabled]}>
                    <ThemedText style={styles.stepBtnText}>−</ThemedText>
                  </Pressable>
                  <ThemedText type="smallBold" style={styles.dwellValue}>{formatDwell(dwell)}</ThemedText>
                  <Pressable onPress={() => adjustDwell(entry.id, 30)} hitSlop={8} style={styles.stepBtn}>
                    <ThemedText style={styles.stepBtnText}>+</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.bottomButtons}>
          <Pressable
            onPress={() => setMapModalVisible(true)}
            style={[styles.mapButton, { flex: 1 }]}>
            <ThemedText style={styles.mapButtonText}>🗺 지도로 보기</ThemedText>
          </Pressable>
          <Pressable onPress={handleSaveTap} style={styles.saveButton}>
            <ThemedText style={styles.saveButtonText}>
              {user ? '💾 저장' : '🔒 저장'}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* 지도 모달 */}
      <Modal visible={mapModalVisible} animationType="slide">
        <View style={[styles.mapModal, { backgroundColor: colors.background }]}>
          <View style={[styles.mapModalHeader, { borderBottomColor: colors.backgroundElement }]}>
            <ThemedText style={styles.mapModalTitle}>🗺 내 일정 동선</ThemedText>
            <Pressable onPress={() => setMapModalVisible(false)} hitSlop={12} style={styles.mapCloseBtn}>
              <ThemedText style={{ fontSize: 16, color: Brand.primary, fontWeight: '600' }}>닫기</ThemedText>
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <NaverMapView
              routeIds={myDaysIds}
              places={mapPlaces}
              onMarkerPress={id => {
                const place = RECOMMENDED_PLACES.find(p => p.id === id);
                if (place) setDetailPlace(place);
              }}
            />
            <PlaceDetailSheet
              place={detailPlace}
              visible={!!detailPlace}
              onClose={() => setDetailPlace(null)}
            />
          </View>
          <Pressable
            style={[styles.naverNavBtn, { backgroundColor: '#03C75A' }]}
            onPress={() => {
              const geoEntries = routeEntries;
              const points: { lat: number; lng: number; name: string }[] = [];
              if (departureLocation) {
                points.push({ lat: departureLocation.lat, lng: departureLocation.lng, name: departureLocation.label });
              }
              points.push(...geoEntries.map(e => ({ lat: e.lat!, lng: e.lng!, name: e.name })));
              const url = buildNaverMapUrl(points);
              if (!url) return;
              if (Platform.OS === 'web') {
                window.open(url, '_blank');
              } else {
                Linking.openURL(url);
              }
            }}>
            <ThemedText style={styles.naverNavBtnText}>네이버 지도 앱으로 내비게이션</ThemedText>
          </Pressable>
        </View>
      </Modal>

      {/* 저장 모달 */}
      <Modal visible={saveModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSaveModalVisible(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.background }]} onPress={() => {}}>
            <ThemedText style={styles.modalTitle}>일정 이름</ThemedText>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              placeholder="예: 1박2일 거제 코스"
              placeholderTextColor={colors.textSecondary}
              value={itineraryName}
              onChangeText={setItineraryName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setSaveModalVisible(false)}>
                <ThemedText themeColor="textSecondary">취소</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, (!itineraryName.trim() || saving) && styles.btnDisabled]}
                onPress={handleSaveConfirm}
                disabled={!itineraryName.trim() || saving}>
                <ThemedText style={styles.modalConfirmText}>{saving ? '저장 중...' : '저장'}</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  emptyEmoji: { fontSize: 48 },
  departurePanel: { marginHorizontal: Spacing.four, marginBottom: Spacing.two, borderRadius: Spacing.three, overflow: 'hidden' },
  departureRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: Spacing.two },
  departureRowBorder: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  departureLabel: { fontSize: 13, fontWeight: '600', width: 90 },
  departureRight: { flex: 1, alignItems: 'flex-end' },
  locRow: { flexDirection: 'row', alignItems: 'center' },
  locText: { maxWidth: 160, fontWeight: '600', color: Brand.primary },
  locBtn: { backgroundColor: Brand.primary, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Spacing.two },
  locBtnDisabled: { opacity: 0.5 },
  locBtnText: { color: '#FFF', fontWeight: '600' },
  timeInput: { fontSize: 14, fontWeight: '600', color: Brand.primary, minWidth: 60, textAlign: 'right' },
  list: { paddingHorizontal: Spacing.four, paddingTop: Spacing.one },
  departureItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  legRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 24 + Spacing.two, gap: Spacing.two, paddingVertical: Spacing.one },
  legLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  legBadge: { paddingHorizontal: Spacing.two, paddingVertical: 3, borderRadius: Spacing.two },
  dwellRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: 24 + Spacing.two + 44 + Spacing.two, paddingRight: 24 + Spacing.one, paddingBottom: Spacing.two,
  },
  dwellLabel: { fontSize: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.07)', alignItems: 'center', justifyContent: 'center' },
  stepBtnDisabled: { opacity: 0.3 },
  stepBtnText: { fontSize: 16, fontWeight: '700', lineHeight: 20 },
  dwellValue: { minWidth: 60, textAlign: 'center', fontSize: 13 },
  orderBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: Brand.primary, alignItems: 'center', justifyContent: 'center' },
  orderText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  customIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Brand.primary + '20', alignItems: 'center', justifyContent: 'center' },
  customIconText: { fontSize: 20 },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { flexShrink: 1 },
  banjiBadge: { backgroundColor: Brand.primary + '25', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  banjiText: { fontSize: 10, color: Brand.primary, fontWeight: '700' },
  controls: { alignItems: 'center', gap: 2 },
  moveBtn: { padding: 2 },
  moveBtnDisabled: { opacity: 0.2 },
  moveBtnText: { fontSize: 10, color: '#888' },
  handle: { fontSize: 18, color: '#AAA' },
  removeBtn: { padding: Spacing.one },
  bottomBar: { position: 'absolute', bottom: Spacing.three, left: Spacing.four, right: Spacing.four },
  bottomButtons: { flexDirection: 'row', gap: Spacing.two },
  mapButton: { backgroundColor: Brand.primary, borderRadius: Spacing.three, paddingVertical: Spacing.three, alignItems: 'center' },
  mapButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  saveButton: { backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: Spacing.three, paddingVertical: Spacing.three, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { fontWeight: '700', fontSize: 14 },
  naverNavBtn: {
    margin: Spacing.three,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  naverNavBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  mapModal: { flex: 1 },
  mapModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.three,
    paddingTop: 52, borderBottomWidth: 1,
  },
  mapModalTitle: { fontSize: 17, fontWeight: '700' },
  mapCloseBtn: { paddingHorizontal: Spacing.two },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: 300, borderRadius: 20, padding: Spacing.four, gap: Spacing.three },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalInput: { height: 48, borderRadius: 10, paddingHorizontal: Spacing.three, fontSize: 15 },
  modalButtons: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
  modalCancelBtn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  modalConfirmBtn: { backgroundColor: Brand.primary, borderRadius: 10, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  modalConfirmText: { color: '#FFF', fontWeight: '600' },
  btnDisabled: { opacity: 0.4 },
});
