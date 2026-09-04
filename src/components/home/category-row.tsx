import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import { PLACE_TYPES, type PlaceType } from '@/data/places';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function getCategoryIcon(id: PlaceType) {
  switch (id) {
    case 'restaurant':
      return { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' } as const;
    case 'cafe':
      return { ios: 'cup.and.saucer.fill', android: 'local_cafe', web: 'local_cafe' } as const;
    case 'stay':
      return { ios: 'bed.double.fill', android: 'hotel', web: 'hotel' } as const;
    case 'beach':
      return { ios: 'water.waves', android: 'beach_access', web: 'beach_access' } as const;
    case 'park':
      return { ios: 'tree.fill', android: 'park', web: 'park' } as const;
    case 'landmark':
      return { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' } as const;
    case 'facility':
      return { ios: 'building.2.fill', android: 'domain', web: 'domain' } as const;
  }
}

type CategoryRowProps = {
  selectedId?: string;
  onSelect?: (id: string) => void;
};

export function CategoryRow({ selectedId, onSelect }: CategoryRowProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>
      {PLACE_TYPES.map((category) => {
        const selected = selectedId === category.id;
        return (
          <Pressable
            key={category.id}
            onPress={() => onSelect?.(category.id)}
            style={({ pressed }) => [pressed && styles.pressed]}>
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? Brand.primary : theme.backgroundElement,
                  borderColor: selected ? Brand.primary : 'transparent',
                },
              ]}>
              <SymbolView
                name={getCategoryIcon(category.id)}
                size={22}
                tintColor={selected ? '#FFFFFF' : Brand.primary}
              />
              <ThemedText
                type="smallBold"
                style={{ color: selected ? '#FFFFFF' : theme.text }}>
                {category.label}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Spacing.five,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.85,
  },
});
