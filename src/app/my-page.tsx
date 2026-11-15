import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, useColorScheme, View } from 'react-native';
import { useNavPreference } from '@/hooks/use-nav-preference';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';

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

type ActiveView = 'togo' | 'mydays' | 'mydays-list' | 'login' | 'settings';
type MainTab = 'togo' | 'itineraries';

type PetProfile = {
  name: string;
  age_years: string;
};

export default function MyPage() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { toGoIds, myDaysIds, savedItineraries, activeItineraryId, deleteItinerary, renameItinerary, loadItinerary } = useTripStore();
  const params = useLocalSearchParams<{ section?: string }>();
  // 예전 링크(section=togo / mydays-list)는 메인 화면의 찜·일정 칸으로 바로 보냄
  const sectionToView = (s?: string): ActiveView | null =>
    s === 'mydays' || s === 'login' || s === 'settings' ? s : null;
  const sectionToTab = (s?: string): MainTab | null =>
    s === 'togo' ? 'togo' : s === 'mydays-list' ? 'itineraries' : null;
  const [activeView, setActiveView] = useState<ActiveView | null>(sectionToView(params.section));
  const [mainTab, setMainTab] = useState<MainTab>(sectionToTab(params.section) ?? 'togo');
  const [pet, setPet] = useState<PetProfile>({ name: '', age_years: '' });
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  // 이미 마이 탭에 있을 때 탭 버튼을 누르면 서브뷰에서 마이 메인으로 복귀
  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('tabPress', () => {
      setActiveView(null);
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (!params.section) return;
    const tab = sectionToTab(params.section);
    if (tab) { setMainTab(tab); setActiveView(null); }
    else setActiveView(sectionToView(params.section));
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (activeView === 'settings') {
      return <SettingsView onBack={() => setActiveView(null)} />;
    }

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
      return (
        <ThemedView style={styles.screen}>
          <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
            <Pressable onPress={() => setActiveView(null)} hitSlop={12}>
              <ThemedText style={styles.backText}>← 마이</ThemedText>
            </Pressable>
            <ThemedText style={styles.headerTitle}>내 일정 목록</ThemedText>
          </View>
          <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
            {savedItineraries.map((item, idx) => (
              <View key={item.id} style={[styles.itineraryCard, { backgroundColor: colors.backgroundElement }]}>
                <View style={[styles.itineraryBadge, { backgroundColor: colors.backgroundSelected }]}>
                  <ThemedText style={[styles.itineraryBadgeText, { color: colors.text }]}>
                    {idx + 1}
                  </ThemedText>
                </View>
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
                <Pressable onPress={() => deleteItinerary(item.id)} hitSlop={8} style={styles.actionBtn}>
                  <ThemedText type="small" themeColor="textSecondary">✕</ThemedText>
                </Pressable>
              </View>
            ))}

            {savedItineraries.length === 0 && (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyEmoji}>🗓</ThemedText>
                <ThemedText type="smallBold">저장된 일정이 없어요</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">찜 목록에서 장소를 골라 일정을 만들어 보세요</ThemedText>
              </View>
            )}
          </ScrollView>
        </ThemedView>
      );
    }

    const activeItinerary = activeView === 'mydays'
      ? savedItineraries.find(i => i.id === activeItineraryId)
      : undefined;

    return (
      <ThemedView style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
          <Pressable
            onPress={() => {
              if (activeView === 'mydays') setMainTab('itineraries');
              setActiveView(null);
            }}
            hitSlop={12}>
            <ThemedText style={styles.backText}>
              {activeView === 'mydays' ? '← 일정' : '← 마이'}
            </ThemedText>
          </Pressable>
          {activeItinerary ? (
            <Pressable
              style={styles.titleEdit}
              hitSlop={8}
              onPress={() => { setRenamingId(activeItinerary.id); setRenameText(activeItinerary.name); }}>
              <ThemedText style={styles.headerTitle} numberOfLines={1}>{activeItinerary.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">✏️</ThemedText>
            </Pressable>
          ) : (
            <ThemedText style={styles.headerTitle}>
              {activeView === 'togo' ? '찜 목록' : '내 일정'}
            </ThemedText>
          )}
        </View>
        {activeView === 'togo' ? <ToGoPanel /> : <MyDaysPanel />}

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

  const displayName = user?.email?.split('@')[0] ?? '';
  const showDraft = myDaysIds.length > 0 && !activeItineraryId;
  const itineraryCount = savedItineraries.length + (showDraft ? 1 : 0);

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.mainTop, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.header}>
          <ThemedText style={[styles.title, { flex: 1 }]}>마이</ThemedText>
          <Pressable onPress={() => setActiveView('settings')} hitSlop={10}>
            <ThemedText style={styles.settingsIcon}>⚙️</ThemedText>
          </Pressable>
        </View>

        {/* 계정 카드: 로그인 여부에 따라 저장 위치 안내 */}
        <View style={[styles.profileCard, { backgroundColor: colors.backgroundElement }]}>
          <View style={[styles.avatar, { backgroundColor: colors.backgroundSelected }]}>
            <ThemedText style={styles.avatarEmoji}>🐾</ThemedText>
          </View>
          {user ? (
            <View style={styles.profileInfo}>
              <ThemedText style={styles.displayName}>{displayName}</ThemedText>
              {pet.name ? (
                <ThemedText type="small" themeColor="textSecondary">
                  🐶 {pet.name}{pet.age_years ? ` · ${pet.age_years}살` : ''}
                </ThemedText>
              ) : null}
              <ThemedText type="small" themeColor="textSecondary">☁️ 계정에 저장돼요 · 다른 기기에서도 볼 수 있어요</ThemedText>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <ThemedText style={styles.displayName}>로그인 안 함</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">📱 찜과 일정이 이 기기에만 저장돼요</ThemedText>
            </View>
          )}
        </View>
        {!user && (
          <Pressable
            style={[styles.loginBtn, { backgroundColor: Brand.primary }]}
            onPress={() => setActiveView('login')}>
            <ThemedText style={styles.loginBtnText}>로그인하고 다른 기기에서도 보기</ThemedText>
          </Pressable>
        )}

        {/* 찜 / 일정 전환 */}
        <View style={[styles.segment, { backgroundColor: colors.backgroundElement }]}>
          {([
            { id: 'togo', label: `❤️ 찜 ${toGoIds.length}` },
            { id: 'itineraries', label: `🗓 일정 ${itineraryCount}` },
          ] as const).map(seg => {
            const selected = mainTab === seg.id;
            return (
              <Pressable
                key={seg.id}
                onPress={() => setMainTab(seg.id)}
                style={[styles.segmentBtn, selected && { backgroundColor: colors.background }]}>
                <ThemedText style={[styles.segmentText, selected && { color: Brand.primary }]}>{seg.label}</ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {mainTab === 'togo' ? (
        <ToGoPanel />
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
          {showDraft && (
            <Pressable
              style={[styles.itineraryCard, { backgroundColor: colors.backgroundElement }]}
              onPress={() => setActiveView('mydays')}>
              <View style={[styles.itineraryBadge, { backgroundColor: Brand.primary }]}>
                <ThemedText style={styles.itineraryBadgeText}>✏️</ThemedText>
              </View>
              <View style={styles.itineraryInfo}>
                <ThemedText style={styles.itineraryName}>지금 짜는 일정</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{myDaysIds.length}곳 · 아직 저장 전</ThemedText>
              </View>
              <ThemedText style={styles.chevron} themeColor="textSecondary">›</ThemedText>
            </Pressable>
          )}
          {savedItineraries.map((item, idx) => (
            <View key={item.id} style={[styles.itineraryCard, { backgroundColor: colors.backgroundElement }]}>
              <View style={[styles.itineraryBadge, { backgroundColor: colors.backgroundSelected }]}>
                <ThemedText style={[styles.itineraryBadgeText, { color: colors.text }]}>{idx + 1}</ThemedText>
              </View>
              <Pressable
                style={styles.itineraryInfo}
                onPress={() => { loadItinerary(item); setActiveView('mydays'); }}>
                <ThemedText style={styles.itineraryName}>{item.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.placeIds.length}곳 · {new Date(item.savedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => deleteItinerary(item.id)} hitSlop={8} style={styles.actionBtn}>
                <ThemedText type="small" themeColor="textSecondary">✕</ThemedText>
              </Pressable>
            </View>
          ))}
          {itineraryCount === 0 && (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyEmoji}>🗓</ThemedText>
              <ThemedText type="smallBold">아직 일정이 없어요</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">찜에서 장소를 골라 일정을 만들어 보세요</ThemedText>
            </View>
          )}
        </ScrollView>
      )}
    </ThemedView>
  );
}

// 설정 화면 (길찾기 앱, 로그아웃) — MyPage 안에서 activeView === 'settings'일 때 사용
function SettingsView({ onBack }: { onBack: () => void }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuthStore();
  const { navApp, setNavApp } = useNavPreference();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.three }]}>
          <Pressable onPress={onBack} hitSlop={12}>
            <ThemedText style={styles.backText}>← 마이</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>설정</ThemedText>
        </View>

        <View style={[styles.menuCard, { backgroundColor: colors.backgroundElement }]}>
          <View style={styles.menuRow}>
            <ThemedText style={styles.menuIcon}>🧭</ThemedText>
            <ThemedText style={styles.menuLabel}>길찾기 앱</ThemedText>
            <View style={[styles.navToggle, { backgroundColor: colors.backgroundSelected }]}>
              <Pressable
                style={[styles.navToggleBtn, navApp === 'naver' && { backgroundColor: '#03C75A' }]}
                onPress={() => setNavApp('naver')}>
                <ThemedText style={[styles.navToggleBtnText, navApp === 'naver' && { color: '#fff' }]}>
                  네이버
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.navToggleBtn, navApp === 'kakao' && { backgroundColor: '#FAE100' }]}
                onPress={() => setNavApp('kakao')}>
                <ThemedText style={[styles.navToggleBtnText, navApp === 'kakao' && { color: '#3A1D1D' }]}>
                  카카오
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        {user && (
          <>
            <ThemedText type="small" themeColor="textSecondary" style={{ paddingHorizontal: Spacing.one }}>
              {user.email}로 로그인됨 · 로그아웃해도 이 기기의 찜과 일정은 남아요
            </ThemedText>
            <Pressable
              style={[styles.signOutBtn, { borderColor: colors.backgroundElement }]}
              onPress={() => { signOut(); onBack(); }}>
              <ThemedText style={{ color: '#EF4444', fontSize: 15 }}>로그아웃</ThemedText>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.four, gap: Spacing.three },
  mainTop: { paddingHorizontal: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.three },
  settingsIcon: { fontSize: 20 },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  segmentText: { fontSize: 15, fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  title: { fontSize: 22, fontWeight: '800' },
  headerTitle: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  titleEdit: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
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
  navToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  navToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  navToggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
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
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  itineraryBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itineraryBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  itineraryInfo: { flex: 1, gap: 3 },
  itineraryName: { fontSize: 15, fontWeight: '700' },
  actionBtn: { padding: Spacing.one },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: Spacing.two },
  emptyEmoji: { fontSize: 48 },
});
