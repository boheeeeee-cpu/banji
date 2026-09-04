import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SearchBarProps = {
  value?: string;
  onChangeText?: (text: string) => void;
  onPress?: () => void;
  editable?: boolean;
};

export function SearchBar({
  value,
  onChangeText,
  onPress,
  editable = true,
}: SearchBarProps) {
  const theme = useTheme();

  const input = (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      <SymbolView
        name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
        size={18}
        tintColor={theme.textSecondary}
      />
      <TextInput
        style={[styles.input, { color: theme.text }]}
        placeholder="장소, 지역, 키워드 검색"
        placeholderTextColor={theme.textSecondary}
        value={value}
        onChangeText={onChangeText}
        editable={editable && !onPress}
        pointerEvents={onPress ? 'none' : 'auto'}
      />
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="search">
        {input}
      </Pressable>
    );
  }

  return input;
}

export function SearchBarHint() {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
      거제도 어디든, 반려동물과 함께
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Spacing.four,
    borderWidth: 1,
    borderColor: Brand.primaryMuted,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    padding: 0,
  },
  hint: {
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
});
