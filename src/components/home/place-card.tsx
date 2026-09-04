import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/brand';
import { PLACE_TYPE_LABELS, type Place } from '@/data/places';
import { Spacing } from '@/constants/theme';

type PlaceCardProps = {
  place: Place;
  onPress?: () => void;
};

export function PlaceCard({ place, onPress }: PlaceCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={[styles.thumbnail, { backgroundColor: place.imageTint }]}>
          <ThemedText style={styles.emoji}>{place.imageEmoji}</ThemedText>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <ThemedText type="smallBold" style={styles.name} numberOfLines={1}>
              {place.name}
            </ThemedText>
            <View style={[styles.badge, { backgroundColor: Brand.primaryMuted }]}>
              <ThemedText type="small" style={{ color: Brand.primary, fontSize: 11 }}>
                {PLACE_TYPE_LABELS[place.placeTypes[0]]}
              </ThemedText>
            </View>
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            {place.area}
          </ThemedText>

          <View style={styles.ratingRow}>
            <SymbolView
              name={{ ios: 'star.fill', android: 'star', web: 'star' }}
              size={14}
              tintColor="#FFB800"
            />
            <ThemedText type="smallBold">{place.rating.toFixed(1)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ({place.reviewCount})
            </ThemedText>
          </View>

          <View style={styles.petRow}>
            <SymbolView
              name={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }}
              size={13}
              tintColor={Brand.primary}
            />
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.petNote}>
              {place.petNote}
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.92,
  },
  card: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    overflow: 'hidden',
    gap: Spacing.three,
    padding: Spacing.two,
  },
  thumbnail: {
    width: 88,
    height: 88,
    borderRadius: Spacing.two + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 36,
    lineHeight: 44,
  },
  body: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    paddingRight: Spacing.one,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
    fontSize: 16,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Spacing.two,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  petRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  petNote: {
    flex: 1,
  },
});
