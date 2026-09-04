import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Place } from '@/data/places';

type Props = { place: Place; size?: number };

export function PlacePhoto({ place, size = 52 }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!place.photoUrl && !imgFailed;
  const radius = size / 2;

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: radius, backgroundColor: place.imageTint },
      ]}>
      {showImage ? (
        <Image
          source={{ uri: place.photoUrl }}
          style={{ width: size, height: size, borderRadius: radius }}
          onError={() => setImgFailed(true)}
          resizeMode="cover"
        />
      ) : (
        <ThemedText style={styles.emoji}>{place.imageEmoji}</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  emoji: { fontSize: 24 },
});
