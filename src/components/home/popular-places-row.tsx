import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PopularPlaceWizard } from '@/components/home/popular-place-wizard';
import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchGeojePopular, type TourItem } from '@/lib/tour-api';

export function PopularPlacesRow() {
  const [places, setPlaces] = useState<TourItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<TourItem | null>(null);
  const theme = useTheme();

  useEffect(() => {
    fetchGeojePopular(10)
      .then((data) => {
        setPlaces(data);
        setFailed(data.length === 0);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && failed) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText style={styles.sectionTitle}>🏆 인기 여행지</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">한국관광공사 추천</ThemedText>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Brand.primary} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scroll}>
          {places.map((item) => (
            <Pressable
              key={item.contentid}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}
              onPress={() => setSelectedPlace(item)}>
              {item.firstimage ? (
                <Image
                  source={{ uri: item.firstimage }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.cardImage, styles.noImage]}>
                  <ThemedText style={styles.noImageEmoji}>🏞</ThemedText>
                </View>
              )}
              <View style={styles.cardBody}>
                <ThemedText style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </ThemedText>
                {item.addr1 ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {item.addr1.replace('경상남도 거제시 ', '').replace('경남 거제시 ', '')}
                  </ThemedText>
                ) : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <PopularPlaceWizard
        place={selectedPlace}
        visible={!!selectedPlace}
        onClose={() => setSelectedPlace(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  loadingBox: {
    height: 168,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  card: {
    width: 140,
    borderRadius: 14,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.75 },
  cardImage: {
    width: 140,
    height: 100,
  },
  noImage: {
    backgroundColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageEmoji: { fontSize: 32 },
  cardBody: {
    padding: Spacing.two,
    gap: 3,
    minHeight: 68,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
});
