import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing } from '@/constants/theme';

export default function ResetPassword() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleReset() {
    if (!password) { setError('새 비밀번호를 입력해주세요.'); return; }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (password !== confirm) { setError('비밀번호가 일치하지 않습니다.'); return; }

    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError('변경 실패. 링크가 만료됐을 수 있어요. 다시 요청해주세요.');
    } else {
      setDone(true);
      setTimeout(() => router.replace('/home'), 2000);
    }
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.backgroundElement, color: colors.text, borderColor: colors.backgroundSelected },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.logo}>🔐</Text>
      <Text style={[styles.title, { color: colors.text }]}>새 비밀번호 설정</Text>

      {done ? (
        <Text style={[styles.successText, { color: '#4CAF50' }]}>
          비밀번호가 변경됐어요! 잠시 후 이동합니다...
        </Text>
      ) : (
        <View style={styles.form}>
          <TextInput
            style={inputStyle}
            placeholder="새 비밀번호 (6자 이상)"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          <TextInput
            style={inputStyle}
            placeholder="비밀번호 확인"
            placeholderTextColor={colors.textSecondary}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Pressable
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleReset}
            disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>비밀번호 변경</Text>
            }
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  logo: { fontSize: 64 },
  title: { fontSize: 24, fontWeight: '700' },
  form: { width: '100%', maxWidth: 360, gap: Spacing.three },
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: Spacing.three, fontSize: 16 },
  errorText: { color: '#EF4444', fontSize: 13, textAlign: 'center' },
  successText: { fontSize: 16, textAlign: 'center' },
  button: { height: 50, borderRadius: 12, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
