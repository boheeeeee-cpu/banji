import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/brand';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { SEASON_CARDS, SEASON_LABELS, seasonOf } from '@/data/seasons';
import { useTheme } from '@/hooks/use-theme';
import { fetchNowFestivals, formatPeriod, type NowFestival } from '@/lib/festivals';
import { fetchGeojeTrails, type TrailItem } from '@/lib/trails-api';

function trailDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

function trailLevel(level: number): { label: string; color: string } {
  if (level === 1) return { label: '쉬움', color: '#10B981' };
  if (level === 2) return { label: '보통', color: '#F59E0B' };
  return { label: '어려움', color: '#EF4444' };
}

export default function NowScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const month = new Date().getMonth() + 1;
  const season = seasonOf(month);

  const [festivals, setFestivals] = useState<NowFestival[] | null>(null);
  const [trails, setTrails] = useState<TrailItem[] | null>(null);
  const [trailError, setTrailError] = useState(false);
  const [selectedTrail, setSelectedTrail] = useState<TrailItem | null>(null);

  useEffect(() => {
    fetchNowFestivals().then(setFestivals).catch(() => setFestivals([]));
    fetchGeojeTrails().then(setTrails).catch(() => { setTrails([]); setTrailError(true); });
  }, []);

  const ongoing = festivals?.filter(f => f.status === 'ongoing') ?? [];
  const upcoming = festivals?.filter(f => f.status === 'upcoming') ?? [];

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.four,
          paddingBottom: insets.bottom + BottomTabInset + Spacing.five,
        }}>
        {/* 머리말 */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>지금 거제</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {month}월 · {SEASON_LABELS[season]}에 강아지와 즐기기 좋은 것들
          </ThemedText>
        </View>

        {/* 계절 카드 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardRow}>
          {SEASON_CARDS[season].map(card => (
            <View
              key={card.title}
              style={[
                styles.seasonCard,
                { backgroundColor: card.kind === 'caution' ? '#FEF3C7' : theme.backgroundElement },
              ]}>
              <ThemedText style={styles.seasonEmoji}>{card.emoji}</ThemedText>
              <ThemedText
                type="smallBold"
                style={card.kind === 'caution' ? { color: '#92400E' } : undefined}>
                {card.kind === 'caution' ? '주의 · ' : ''}{card.title}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor={card.kind === 'caution' ? undefined : 'textSecondary'}
                style={[styles.seasonBody, card.kind === 'caution' && { color: '#92400E' }]}>
                {card.body}
              </ThemedText>
            </View>
          ))}
        </ScrollView>

        {/* 축제·행사 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>🎉 축제·행사</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            지금 열리는 중이거나 두 달 안에 열리는 거제 행사예요
          </ThemedText>
          <View style={[styles.notice, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">
              🐶 반려동물 동반은 행사마다 달라요. 사람이 많은 행사는 가기 전에 주최 측에 확인해 주세요.
            </ThemedText>
          </View>

          {festivals === null ? (
            <ThemedText type="small" themeColor="textSecondary">불러오는 중...</ThemedText>
          ) : festivals.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">두 달 안에 예정된 축제가 없어요.</ThemedText>
          ) : (
            <>
              {[...ongoing, ...upcoming].map(f => (
                <View key={f.contentid} style={[styles.festivalRow, { borderColor: theme.backgroundElement }]}>
                  <View style={styles.festivalTop}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: f.status === 'ongoing' ? Brand.primary : theme.backgroundElement },
                    ]}>
                      <ThemedText style={[
                        styles.statusText,
                        { color: f.status === 'ongoing' ? '#FFF' : theme.text },
                      ]}>
                        {f.status === 'ongoing' ? '진행 중' : '예정'}
                      </ThemedText>
                    </View>
                    <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>{f.title}</ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">{formatPeriod(f)}</ThemedText>
                  {f.addr1 ? (
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{f.addr1}</ThemedText>
                  ) : null}
                </View>
              ))}
            </>
          )}
        </View>

        {/* 남파랑길 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>🥾 남파랑길 거제 구간</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            부산에서 해남까지 남해안을 따라 걷는 길 중 거제를 지나는 코스예요
          </ThemedText>
          <View style={[styles.notice, { backgroundColor: '#FEF3C7' }]}>
            <ThemedText type="small" style={{ color: '#92400E' }}>
              ⚠️ 일부 구간은 국립공원(한려해상)을 지나요. 국립공원 안에서는 반려동물 출입이 제한되니 걷기 전에 확인해 주세요.
            </ThemedText>
          </View>

          {trails === null ? (
            <ThemedText type="small" themeColor="textSecondary">불러오는 중...</ThemedText>
          ) : trailError || trails.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">코스 정보를 불러오지 못했어요.</ThemedText>
          ) : (
            trails.map(trail => {
              const lv = trailLevel(trail.level);
              return (
                <Pressable
                  key={trail.id}
                  onPress={() => setSelectedTrail(trail)}
                  style={({ pressed }) => [styles.trailRow, pressed && styles.pressed]}>
                  <View style={styles.flex}>
                    <View style={styles.festivalTop}>
                      <ThemedText type="smallBold">{trail.name}</ThemedText>
                      <View style={[styles.levelBadge, { backgroundColor: lv.color + '22' }]}>
                        <ThemedText style={[styles.levelText, { color: lv.color }]}>{lv.label}</ThemedText>
                      </View>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {trail.distance}km · {trailDuration(trail.durationMin)}
                    </ThemedText>
                  </View>
                  <ThemedText themeColor="textSecondary" style={styles.arrow}>›</ThemedText>
                </Pressable>
              );
            })
          )}
          <ThemedText type="small" themeColor="textSecondary" style={styles.source}>
            자료: 한국관광공사 두루누비
          </ThemedText>
        </View>

        {/* 섬앤섬길 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>🏝️ 거제섬앤섬길</ThemedText>
          <View style={[styles.notice, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">
              거제시가 만든 걷기 길로, 1코스 칠천량해전길부터 14코스 대금산진달래길까지 이어져요. 코스별 거리와 반려견 동반 정보는 정리하는 중이에요.
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      {/* 남파랑길 코스 자세히 */}
      <Modal
        visible={!!selectedTrail}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTrail(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelectedTrail(null)} />
        {selectedTrail && (
          <View style={[styles.sheet, { backgroundColor: theme.background }]}>
            <View style={styles.handle} />
            <ThemedText style={styles.sheetTitle}>{selectedTrail.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {selectedTrail.distance}km · {trailDuration(selectedTrail.durationMin)} · {trailLevel(selectedTrail.level).label}
            </ThemedText>
            <ScrollView style={styles.sheetScroll}>
              <ThemedText type="small" style={styles.sheetBody}>
                {selectedTrail.summary || selectedTrail.contents || '코스 설명이 없어요.'}
              </ThemedText>
            </ScrollView>
            <Pressable onPress={() => setSelectedTrail(null)} style={styles.closeBtn}>
              <ThemedText style={styles.closeText}>닫기</ThemedText>
            </Pressable>
          </View>
        )}
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  header: { paddingHorizontal: Spacing.four, gap: Spacing.one, marginBottom: Spacing.three },
  title: { fontSize: 26, lineHeight: 34, fontWeight: '800' },

  cardRow: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  seasonCard: { width: 220, borderRadius: 16, padding: Spacing.three, gap: Spacing.one },
  seasonEmoji: { fontSize: 28, lineHeight: 36 },
  seasonBody: { lineHeight: 20 },

  section: { paddingHorizontal: Spacing.four, marginTop: Spacing.five, gap: Spacing.two },
  sectionTitle: { fontSize: 19, lineHeight: 26, fontWeight: '700' },
  notice: { borderRadius: 12, padding: Spacing.three },
  source: { fontSize: 12, marginTop: Spacing.one },

  festivalRow: { borderWidth: 1, borderRadius: 14, padding: Spacing.three, gap: 2 },
  festivalTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 11, lineHeight: 16, fontWeight: '700' },

  trailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.two, gap: Spacing.two },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  levelText: { fontSize: 11, lineHeight: 16, fontWeight: '700' },
  arrow: { fontSize: 22 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.four, paddingBottom: 36, gap: Spacing.two, maxHeight: '75%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CCC', alignSelf: 'center', marginBottom: Spacing.two },
  sheetTitle: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  sheetScroll: { marginTop: Spacing.two },
  sheetBody: { lineHeight: 22 },
  closeBtn: { marginTop: Spacing.two, backgroundColor: Brand.primary, borderRadius: 14, paddingVertical: Spacing.three, alignItems: 'center' },
  closeText: { color: '#FFF', fontWeight: '700' },
});
