import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { PLACE_TYPE_LABELS, type Place } from '@/data/places';
import { useTheme } from '@/hooks/use-theme';

type RoutePlacePickerProps = {
  places: Place[];
  routeIds: string[];
  routeDuration?: number | null;
  onTogglePlace: (placeId: string) => void;
  onClearRoute: () => void;
};

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '1분 미만';
  if (mins < 60) return `약 ${mins}분`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `약 ${h}시간 ${m}분` : `약 ${h}시간`;
}

export function RoutePlacePicker({
  places,
  routeIds,
  routeDuration,
  onTogglePlace,
  onClearRoute,
}: RoutePlacePickerProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.panel}>
      <View style={styles.header}>
        <View>
          <ThemedText type="smallBold" style={styles.title}>
            동선 만들기
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            장소를 눌러 순서대로 추가하세요
          </ThemedText>
        </View>
        {routeIds.length > 0 && (
          <Pressable onPress={onClearRoute} hitSlop={8}>
            <ThemedText type="small" style={{ color: Brand.primary }}>
              초기화
            </ThemedText>
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}>
        {places.map((place) => {
          const order = routeIds.indexOf(place.id);
          const selected = order >= 0;

          return (
            <Pressable
              key={place.id}
              onPress={() => onTogglePlace(place.id)}
              style={({ pressed }) => [pressed && styles.pressed]}>
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? Brand.primary : theme.backgroundElement,
                    borderColor: selected ? Brand.primary : theme.backgroundSelected,
                  },
                ]}>
                {selected && (
                  <View style={styles.orderBadge}>
                    <ThemedText style={styles.orderText}>{order + 1}</ThemedText>
                  </View>
                )}
                <View style={styles.chipBody}>
                  <ThemedText
                    type="smallBold"
                    numberOfLines={1}
                    style={{ color: selected ? '#FFFFFF' : theme.text }}>
                    {place.name}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    numberOfLines={1}
                    style={{ color: selected ? 'rgba(255,255,255,0.85)' : undefined }}
                    themeColor={selected ? undefined : 'textSecondary'}>
                    {PLACE_TYPE_LABELS[place.placeTypes[0]]} · {place.area}
                  </ThemedText>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {routeIds.length >= 2 && (
        <View style={styles.routeInfo}>
          <ThemedText type="small" themeColor="textSecondary">
            {routeIds.length}곳 경로
          </ThemedText>
          {routeDuration != null ? (
            <ThemedText type="smallBold" style={{ color: Brand.primary }}>
              🚗 {formatDuration(routeDuration)}
            </ThemedText>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              경로 계산 중…
            </ThemedText>
          )}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  title: {
    fontSize: 16,
  },
  list: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    maxWidth: 220,
  },
  orderBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  chipBody: {
    gap: 2,
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.88,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
});
