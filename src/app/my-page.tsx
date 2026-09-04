import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import MyDaysPanel from '@/components/my-days-panel';
import ToGoPanel from '@/components/to-go-panel';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import LoginScreen from '@/components/login-screen';
import { useAuthStore } from '@/store/auth-store';
import { useTripStore } from '@/store/trip-store';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing } from '@/constants/theme';
import { Brand } from '@/constants/brand';

type ActiveView = 'togo' | 'mydays' | 'mydays-list' | 'login';

type PetProfile = {
  name: string;
  age_years: string;
};

export default function MyPage() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();
  const { toGoIds, myDaysIds, savedItineraries, deleteItinerary, renameItinerary, loadItinerary } = useTripStore();
  const params = useLocalSearchParams<{ section?: string }>();
  const [activeView, setActiveView] = useState<ActiveView | null>(
    (params.section as ActiveView) ?? null
  );
  const [pet, setPet] = useState<PetProfile>({ name: '', age_years: '' });
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  useEffect(() => {
    if (params.section) setActiveView(params.section as ActiveView);
  }, [params.section]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('pet_profiles')
      .select('name, age_years')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPet({ name: data.name ?? '', age_years: data.age_years?.toString() ?? '' });
      });
  }, [user?.id]);

  // 로그인되면 login 뷰 자동으로 닫기
  useEffect(() => {
    if (user && activeView === 'login') setActiveView(null);
  }, [user?.id]);

  // 서브 뷰 (찜 목록 / 내 일정 / 로그인)
  if (activeView) {
    if (activeView === 'login') {
      return (
        <ThemedView style={styles.screen}>
          <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
            <Pressable onPress={() => setActiveView(null)} hitSlop={12}>
              <ThemedText style={styles.backText}>← 마이</ThemedText>
            </Pressable>
          </View>
          <LoginScreen />
        </ThemedView>
      );
    }

    if (activeView === 'mydays-list') {
      const hasActive = myDaysIds.length > 0;
      return (
        <ThemedView style={styles.screen}>
          <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
            <Pressable onPress={() => setActiveView(null)} hitSlop={12}>
              <ThemedText style={styles.backText}>← 마이</ThemedText>
            </Pressable>
            <ThemedText style={styles.headerTitle}>내 일정 목록</ThemedText>
          </View>
          <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
            {/* 작업 중인 일정 */}
            {hasActive && (
              <>
                <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>작업 중</ThemedText>
                <Pressable
                  style={[styles.itineraryCard, { backgroundColor: colors.backgroundElement }]}
                  onPress={() => setActiveView('mydays')}>
                  <View style={styles.itineraryInfo}>
                    <ThemedText style={styles.itineraryName}>미저장 일정</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">{myDaysIds.length}곳</ThemedText>
                  </View>
                  <ThemedText style={styles.chevron} themeColor="textSecondary">›</ThemedText>
                </Pressable>
              </>
            )}

            {/* 저장된 일정 목록 */}
            {savedItineraries.length > 0 && (
              <>
                <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>저장된 일정</ThemedText>
                {savedItineraries.map(item => (
                  <View key={item.id} style={[styles.itineraryCard, { backgroundColor: colors.backgroundElement }]}>
                    <Pressable
                      style={styles.itineraryInfo}
                      onPress={() => {
                        loadItinerary(item);
                        setActiveView('mydays');
                      }}>
                      <ThemedText style={styles.itineraryName}>{item.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.placeIds.length}곳 · {new Date(item.savedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => { setRenamingId(item.id); setRenameText(item.name); }}
                      hitSlop={8} style={styles.actionBtn}>
                      <ThemedText type="small" themeColor="textSecondary">✏️</ThemedText>
                    </Pressable>
                    <Pressable onPress={() => deleteItinerary(item.id)} hitSlop={8} style={styles.actionBtn}>
                      <ThemedText type="small" themeColor="textSecondary">✕</ThemedText>
                    </Pressable>
                  </View>
                ))}
              </>
            )}

            {!hasActive && savedItineraries.length === 0 && (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyEmoji}>🗓</ThemedText>
                <ThemedText type="smallBold">저장된 일정이 없어요</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">찜 목록에서 장소를 골라 일정을 만들어 보세요</ThemedText>
              </View>
            )}
          </ScrollView>

          <Modal visible={renamingId !== null} transparent animationType="fade">
            <Pressable style={styles.modalOverlay} onPress={() => setRenamingId(null)}>
              <Pressable style={[styles.modalBox, { backgroundColor: colors.background }]} onPress={() => {}}>
                <ThemedText style={styles.modalTitle}>일정 이름 수정</ThemedText>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.backgroundElement, color: colors.text }]}
                  value={renameText}
                  onChangeText={setRenameText}
                  autoFocus
                  selectTextOnFocus
                />
                <View style={styles.modalButtons}>
                  <Pressable style={styles.modalCancelBtn} onPress={() => setRenamingId(null)}>
                    <ThemedText themeColor="textSecondary">취소</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.modalConfirmBtn, !renameText.trim() && { opacity: 0.4 }]}
                    disabled={!renameText.trim()}
                    onPress={() => {
                      if (renamingId && renameText.trim()) {
                        renameItinerary(renamingId, renameText.trim());
                        setRenamingId(null);
                      }
                    }}>
                    <ThemedText style={styles.modalConfirmText}>저장</ThemedText>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        </ThemedView>
      );
    }

    return (
      <ThemedView style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
          <Pressable onPress={() => setActiveView(activeView === 'mydays' ? 'mydays-list' : null)} hitSlop={12}>
            <ThemedText style={styles.backText}>
              {activeView === 'mydays' ? '← 목록' : '← 마이'}
            </ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>
            {activeView === 'togo' ? '찜 목록' : '내 일정'}
          </ThemedText>
        </View>
        {activeView === 'togo' ? <ToGoPanel /> : <MyDaysPanel />}
      </ThemedView>
    );
  }

  const displayName = user?.email?.split('@')[0] ?? '';

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
          <ThemedText style={styles.title}>마이</ThemedText>
        </View>

        {/* 프로필 카드 */}
        <View style={[styles.profileCard, { backgroundColor: colors.backgroundElement }]}>
          <View style={[styles.avatar, { backgroundColor: colors.backgroundSelected }]}>
            <ThemedText style={styles.avatarEmoji}>🐾</ThemedText>
          </View>
          {user ? (
            <View style={styles.profileInfo}>
              <ThemedText style={styles.displayName}>{displayName}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{user.email}</ThemedText>
              {pet.name ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.petText}>
                  🐶 {pet.name}{pet.age_years ? ` · ${pet.age_years}살` : ''}
                </ThemedText>
              ) : null}
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <ThemedText style={styles.emptyName} themeColor="textSecondary">—</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">로그인하면 정보가 표시됩니다</ThemedText>
            </View>
          )}
        </View>

        {/* 로그인 버튼 (비로그인 시) */}
        {!user && (
          <Pressable
            style={[styles.loginBtn, { backgroundColor: Brand.primary }]}
            onPress={() => setActiveView('login')}>
            <ThemedText style={styles.loginBtnText}>로그인 / 회원가입</ThemedText>
          </Pressable>
        )}

        {/* 메뉴 버튼 */}
        <View style={[styles.menuCard, { backgroundColor: colors.backgroundElement }]}>
          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.6 }]}
            onPress={() => setActiveView('togo')}>
            <ThemedText style={styles.menuIcon}>❤️</ThemedText>
            <ThemedText style={styles.menuLabel}>찜 목록</ThemedText>
            {toGoIds.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary">{toGoIds.length}곳</ThemedText>
            )}
            <ThemedText style={styles.chevron} themeColor="textSecondary">›</ThemedText>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />

          <Pressable
            style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.6 }]}
            onPress={() => setActiveView('mydays-list')}>
            <ThemedText style={styles.menuIcon}>🗓</ThemedText>
            <ThemedText style={styles.menuLabel}>내 일정 목록</ThemedText>
            {(savedItineraries.length + (myDaysIds.length > 0 ? 1 : 0)) > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {savedItineraries.length + (myDaysIds.length > 0 ? 1 : 0)}개
              </ThemedText>
            )}
            <ThemedText style={styles.chevron} themeColor="textSecondary">›</ThemedText>
          </Pressable>
        </View>

        {/* 로그아웃 */}
        {user && (
          <Pressable
            style={[styles.signOutBtn, { borderColor: colors.backgroundElement }]}
            onPress={signOut}>
            <ThemedText style={{ color: '#EF4444', fontSize: 15 }}>로그아웃</ThemedText>
          </Pressable>
        )}

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.four, gap: Spacing.three },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  title: { fontSize: 22, fontWeight: '800' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  backText: { fontSize: 15, color: Brand.primary, fontWeight: '600' },

  profileCard: {
    borderRadius: 16,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 28 },
  profileInfo: { flex: 1, gap: 3 },
  displayName: { fontSize: 17, fontWeight: '700' },
  emptyName: { fontSize: 17, fontWeight: '700' },
  petText: { marginTop: 2 },

  loginBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  menuCard: { borderRadius: 16, overflow: 'hidden' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  menuIcon: { fontSize: 20, width: 28 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  chevron: { fontSize: 20 },
  divider: { height: 1, marginLeft: Spacing.three + 28 + Spacing.two },

  signOutBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  sectionLabel: { marginTop: Spacing.two, marginBottom: Spacing.one },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: 300, borderRadius: 20, padding: Spacing.four, gap: Spacing.three },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalInput: { height: 48, borderRadius: 10, paddingHorizontal: Spacing.three, fontSize: 15 },
  modalButtons: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
  modalCancelBtn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  modalConfirmBtn: { backgroundColor: Brand.primary, borderRadius: 10, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  modalConfirmText: { color: '#FFF', fontWeight: '600' },
  itineraryCard: {
    borderRadius: 14,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  itineraryInfo: { flex: 1, gap: 3 },
  itineraryName: { fontSize: 15, fontWeight: '700' },
  actionBtn: { padding: Spacing.one },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: Spacing.two },
  emptyEmoji: { fontSize: 48 },
});
