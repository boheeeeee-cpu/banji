import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useEffect, useState } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import AppTabsWeb from '@/components/app-tabs.web';
import { AuthStoreProvider } from '@/store/auth-store';
import { TripStoreProvider } from '@/store/trip-store';
import LocalStorageBridge from '@/components/local-storage-bridge';
import SupabaseSyncBridge from '@/components/supabase-sync-bridge';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing } from '@/constants/theme';

function PasswordRecoveryModal() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setVisible(true);
        setPassword('');
        setConfirm('');
        setError(null);
        setDone(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleReset() {
    if (!password) { setError('새 비밀번호를 입력해주세요.'); return; }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return; }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError('변경 실패. 링크가 만료됐을 수 있어요.');
    } else {
      setDone(true);
      setTimeout(() => setVisible(false), 2000);
    }
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.backgroundElement, color: colors.text, borderColor: colors.backgroundSelected },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <Text style={styles.logo}>🔐</Text>
          <Text style={[styles.title, { color: colors.text }]}>새 비밀번호 설정</Text>
          {done ? (
            <Text style={styles.successText}>비밀번호가 변경됐어요!</Text>
          ) : (
            <>
              <TextInput style={inputStyle} placeholder="새 비밀번호 (6자 이상)" placeholderTextColor={colors.textSecondary} value={password} onChangeText={setPassword} secureTextEntry />
              <TextInput style={inputStyle} placeholder="비밀번호 확인" placeholderTextColor={colors.textSecondary} value={confirm} onChangeText={setConfirm} secureTextEntry />
              {error && <Text style={styles.errorText}>{error}</Text>}
              <Pressable style={[styles.button, loading && { opacity: 0.6 }]} onPress={handleReset} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>비밀번호 변경</Text>}
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <AuthStoreProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <TripStoreProvider>
          <LocalStorageBridge />
          <SupabaseSyncBridge />
          <PasswordRecoveryModal />
          <AnimatedSplashOverlay />
          {Platform.OS === 'web' ? <AppTabsWeb /> : <AppTabs />}
        </TripStoreProvider>
      </ThemeProvider>
    </AuthStoreProvider>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  sheet: { width: '100%', maxWidth: 400, borderRadius: 20, padding: Spacing.four, gap: Spacing.three, alignItems: 'center' },
  logo: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: '700' },
  input: { width: '100%', height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: Spacing.three, fontSize: 16 },
  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center' },
  successText: { color: '#4CAF50', fontSize: 16, textAlign: 'center' },
  button: { width: '100%', height: 50, borderRadius: 12, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
