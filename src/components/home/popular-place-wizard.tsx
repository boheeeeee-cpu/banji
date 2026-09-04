import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PlacePhoto } from '@/components/place-photo';
import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { RECOMMENDED_PLACES, type Activity, type Place, type PlaceType } from '@/data/places';
import { useTheme } from '@/hooks/use-theme';
import { type TourItem } from '@/lib/tour-api';
import { useTripStore } from '@/store/trip-store';

type StyleDef = {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  activities?: Activity[];
  placeTypes?: PlaceType[];
};

const TRAVEL_STYLES: StyleDef[] = [
  {
    id: 'relaxed',
    label: '여유로운',
    emoji: '🌿',
    desc: '산책·휴식 중심',
    activities: ['산책', '휴식', '포토스팟'],
  },
  {
    id: 'active',
    label: '활동적인',
    emoji: '⚡',
    desc: '수영·레저 중심',
    activities: ['수영', '레저', '낚시'],
  },
  {
    id: 'photo',
    label: '포토스팟',
    emoji: '📸',
    desc: '사진 포인트 중심',
    activities: ['포토스팟', '산책'],
  },
  {
    id: 'food',
    label: '먹방투어',
    emoji: '🍽',
    desc: '맛집·카페 중심',
    placeTypes: ['restaurant', 'cafe'],
  },
];

function suggestRoute(style: StyleDef): Place[] {
  const scored = RECOMMENDED_PLACES.map((p) => {
    let score = 0;
    if (style.activities) {
      score += style.activities.filter((a) => p.activities.includes(a)).length * 2;
    }
    if (style.placeTypes) {
      score += style.placeTypes.filter((t) => p.placeTypes.includes(t)).length * 2;
    }
    return { p, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || Math.random() - 0.5)
    .slice(0, 4)
    .map((x) => x.p);
}

type Props = {
  place: TourItem | null;
  visible: boolean;
  onClose: () => void;
};

export function PopularPlaceWizard({ place, visible, onClose }: Props) {
  const [step, setStep] = useState<'style' | 'route'>('style');
  const [selectedStyle, setSelectedStyle] = useState<StyleDef | null>(null);
  const [suggested, setSuggested] = useState<Place[]>([]);
  const [added, setAdded] = useState(false);
  const theme = useTheme();
  const router = useRouter();
  const { startNewItinerary, addCustomPlace, addToGo } = useTripStore();

  const handleStyleSelect = (style: StyleDef) => {
    const route = suggestRoute(style);
    setSelectedStyle(style);
    setSuggested(route);
    setStep('route');
  };

  const handleStartRoute = () => {
    startNewItinerary(suggested.map((p) => p.id));
    onClose();
    router.navigate({ pathname: '/my-page', params: { section: 'mydays' } });
  };

  const handleClose = () => {
    setStep('style');
    setSelectedStyle(null);
    setSuggested([]);
    setAdded(false);
    onClose();
  };

  const handleAddToWishlist = () => {
    if (!place) return;
    const id = addCustomPlace({
      name: place.title,
      address: place.addr1,
      lat: parseFloat(place.mapy),
      lng: parseFloat(place.mapx),
    });
    addToGo([id]);
    setAdded(true);
  };

  if (!place) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={[styles.handle, { backgroundColor: theme.backgroundElement }]} />

        {/* 선택된 여행지 헤더 */}
        <View style={styles.header}>
          {place.firstimage ? (
            <Image source={{ uri: place.firstimage }} style={styles.headerThumb} resizeMode="cover" />
          ) : (
            <View style={[styles.headerThumb, styles.noImage]}>
              <ThemedText style={{ fontSize: 28 }}>🏞</ThemedText>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.placeName} numberOfLines={1}>{place.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {place.addr1?.replace('경상남도 거제시 ', '') ?? '거제'}
            </ThemedText>
          </View>
          <Pressable onPress={handleClose} hitSlop={12}>
            <ThemedText themeColor="textSecondary" style={{ fontSize: 18 }}>✕</ThemedText>
          </Pressable>
        </View>

        {step === 'style' ? (
          <StyleStep onSelect={handleStyleSelect} onAddToWishlist={handleAddToWishlist} added={added} />
        ) : (
          <RouteStep
            anchor={place}
            style={selectedStyle!}
            places={suggested}
            onBack={() => setStep('style')}
            onStart={handleStartRoute}
          />
        )}
      </View>
    </Modal>
  );
}

function StyleStep({
  onSelect,
  onAddToWishlist,
  added,
}: {
  onSelect: (s: StyleDef) => void;
  onAddToWishlist: () => void;
  added: boolean;
}) {
  return (
    <View style={styles.stepBody}>
      <ThemedText style={styles.stepTitle}>어떤 여행을 원하세요?</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.three }}>
        스타일에 맞는 코스를 조합해드릴게요
      </ThemedText>
      <View style={styles.styleGrid}>
        {TRAVEL_STYLES.map((s) => (
          <Pressable
            key={s.id}
            style={({ pressed }) => [styles.styleCard, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => onSelect(s)}>
            <ThemedText style={styles.styleEmoji}>{s.emoji}</ThemedText>
            <ThemedText style={styles.styleLabel}>{s.label}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{s.desc}</ThemedText>
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={onAddToWishlist}
        disabled={added}
        style={[styles.wishlistBtn, added && styles.wishlistBtnDone]}>
        <ThemedText style={styles.wishlistBtnText}>
          {added ? '✓ 찜 목록에 추가됨' : '🤍 찜 목록에 추가'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function RouteStep({
  anchor,
  style,
  places,
  onBack,
  onStart,
}: {
  anchor: TourItem;
  style: StyleDef;
  places: Place[];
  onBack: () => void;
  onStart: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.routeHeader}>
        <Pressable onPress={onBack} hitSlop={8}>
          <ThemedText style={{ color: Brand.primary }}>← 다시 선택</ThemedText>
        </Pressable>
        <View style={[styles.styleBadge, { backgroundColor: Brand.primary + '18' }]}>
          <ThemedText style={{ color: Brand.primary, fontSize: 13, fontWeight: '700' }}>
            {style.emoji} {style.label} 코스
          </ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.routeList} showsVerticalScrollIndicator={false}>
        {/* 출발지: API 인기 여행지 */}
        <View style={[styles.routeItem, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.stepBadge, { backgroundColor: Brand.primary }]}>
            <ThemedText style={styles.stepNum}>1</ThemedText>
          </View>
          {anchor.firstimage ? (
            <Image source={{ uri: anchor.firstimage }} style={styles.routeThumb} resizeMode="cover" />
          ) : (
            <View style={[styles.routeThumb, styles.noImage]}>
              <ThemedText>🏞</ThemedText>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <ThemedText type="smallBold" numberOfLines={1}>{anchor.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">출발지 · 관광공사 인기 여행지</ThemedText>
          </View>
        </View>

        {places.map((place, idx) => (
          <View key={place.id} style={[styles.routeItem, { backgroundColor: theme.backgroundElement }]}>
            <View style={[styles.stepBadge, { backgroundColor: Brand.primary }]}>
              <ThemedText style={styles.stepNum}>{idx + 2}</ThemedText>
            </View>
            <PlacePhoto place={place} size={48} />
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold" numberOfLines={1}>{place.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{place.area}</ThemedText>
            </View>
          </View>
        ))}

        {places.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', paddingVertical: 24 }}>
            조건에 맞는 장소가 없어요
          </ThemedText>
        )}
      </ScrollView>

      <Pressable style={[styles.startBtn, { backgroundColor: Brand.primary }]} onPress={onStart}>
        <ThemedText style={styles.startBtnText}>이 코스로 일정 만들기</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CCC4',
  },
  headerThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  noImage: {
    backgroundColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeName: { fontSize: 15, fontWeight: '700' },

  stepBody: {
    padding: Spacing.four,
  },
  stepTitle: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  styleCard: {
    width: '47%',
    borderRadius: 16,
    padding: Spacing.three,
    backgroundColor: Brand.primary + '10',
    gap: 4,
  },
  styleEmoji: { fontSize: 28 },
  styleLabel: { fontSize: 15, fontWeight: '700' },
  wishlistBtn: {
    marginTop: Spacing.three,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Brand.primary,
  },
  wishlistBtnDone: {
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  wishlistBtnText: { color: Brand.primary, fontWeight: '700', fontSize: 15 },

  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  styleBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 20,
  },
  routeList: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: 14,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  routeThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  startBtn: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
