import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useAuthStore } from '@/store/auth-store';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { signInWithEmail, signUpWithEmail } = useAuthStore();

  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleForgot() {
    if (!email) { setError('이메일을 입력해주세요.'); return; }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setError('전송 실패. 이메일을 확인해주세요.');
    else setMessage('비밀번호 재설정 링크를 보냈어요. 이메일을 확인해주세요.');
  }

  async function handleSubmit() {
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    const err = isSignUp
      ? await signUpWithEmail(email, password)
      : await signInWithEmail(email, password);

    setLoading(false);
    if (err) {
      if (err.includes('Invalid login credentials')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (err.includes('already registered')) {
        setError('이미 가입된 이메일입니다. 로그인해주세요.');
      } else if (err.includes('Password should')) {
        setError('비밀번호는 6자 이상이어야 합니다.');
      } else if (err.includes('Email not confirmed')) {
        setError('이메일 인증이 필요합니다. 받은편지함을 확인해주세요.');
      } else {
        setError(err);
      }
    } else if (isSignUp) {
      setMessage('가입 확인 이메일을 보냈어요. 확인 후 로그인해주세요.');
    }
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.backgroundElement,
      color: colors.text,
      borderColor: colors.backgroundSelected,
    },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>
        <Text style={styles.logo}>🐾</Text>
        <Text style={[styles.title, { color: colors.text }]}>반지</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          거제도 반려동물 여행 가이드
        </Text>

        <View style={styles.form}>
          <TextInput
            style={inputStyle}
            placeholder="이메일"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          {!isForgot && (
            <TextInput
              style={inputStyle}
              placeholder="비밀번호"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
          {message && <Text style={[styles.messageText, { color: '#4CAF50' }]}>{message}</Text>}

          <Pressable
            style={[styles.button, { backgroundColor: '#3B82F6' }, loading && styles.buttonDisabled]}
            onPress={isForgot ? handleForgot : handleSubmit}
            disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>
                  {isForgot ? '재설정 링크 보내기' : isSignUp ? '가입하기' : '로그인'}
                </Text>
            }
          </Pressable>

          {!isForgot && !isSignUp && (
            <Pressable onPress={() => { setIsForgot(true); setError(null); setMessage(null); }}>
              <Text style={[styles.toggleText, { color: colors.textSecondary }]}>비밀번호를 잊으셨나요?</Text>
            </Pressable>
          )}

          <Pressable onPress={() => { setIsSignUp(v => !v); setIsForgot(false); setError(null); setMessage(null); }}>
            <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
              {isForgot
                ? '로그인으로 돌아가기'
                : isSignUp
                  ? '이미 계정이 있으신가요? 로그인'
                  : '아직 계정이 없으신가요? 회원가입'}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  logo: {
    fontSize: 64,
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: Spacing.four,
  },
  form: {
    width: '100%',
    maxWidth: 360,
    gap: Spacing.three,
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleText: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: Spacing.one,
  },
});
