import type { Href } from 'expo-router';
import {
  TabList,
  TabListProps,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
  Tabs,
} from 'expo-router/ui';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Colors, Spacing } from '@/constants/theme';

const TAB_ITEMS = [
  { name: 'home',     href: '/home',     icon: '🏠',  label: '홈'      },
  { name: 'list',     href: '/list',     icon: '📍',  label: '목록'    },
  { name: 'search',   href: '/search',   icon: '🔍',  label: '검색'    },
  { name: 'my-page',  href: '/my-page',  icon: '👤',  label: '마이'    },
] as const;

export default function AppTabs() {
  return (
    <Tabs style={styles.root as any}>
      <TabSlot style={styles.slot as any} />
      <TabList asChild>
        <BottomTabBar>
          {TAB_ITEMS.map((t) => (
            <TabTrigger key={t.name} name={t.name} href={t.href as Href} asChild>
              <TabButton icon={t.icon} label={t.label} />
            </TabTrigger>
          ))}
        </BottomTabBar>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  icon,
  label,
  isFocused,
  ...props
}: TabTriggerSlotProps & { icon: string; label: string }) {
  return (
    <Pressable {...props} style={styles.tabButton}>
      <View style={[styles.iconWrap, isFocused && styles.iconWrapFocused]}>
        <ThemedText style={styles.tabIcon}>{icon}</ThemedText>
      </View>
      <ThemedText
        themeColor={isFocused ? 'text' : 'textSecondary'}
        style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function BottomTabBar(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  return (
    <View
      {...props}
      style={[
        styles.tabBar,
        { backgroundColor: colors.background, borderTopColor: colors.backgroundElement },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'column',
  },
  slot: {
    flex: 1,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 20,
    paddingTop: Spacing.two,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.one,
    gap: 2,
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  iconWrapFocused: {
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  tabIcon: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 14,
  },
  tabLabelFocused: {
    fontWeight: '700',
  },
});
