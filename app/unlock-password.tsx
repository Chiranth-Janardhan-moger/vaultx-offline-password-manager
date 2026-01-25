import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { hasPasswordUnlock, loadMeta, unwrapWithPassword } from '@/lib/secure';
import { decryptVaultWithKey } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const maskPhone = (phone: string): string => {
  if (phone.length <= 4) return phone;
  const first2 = phone.slice(0, 2);
  const last2 = phone.slice(-2);
  const middle = 'X'.repeat(phone.length - 4);
  return `${first2}${middle}${last2}`;
};

export default function UnlockPassword() {
  const router = useRouter();
  const { unlock } = useSession();
  const { colors } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [phoneHint, setPhoneHint] = React.useState<string | null>(null);

  const failedAttemptsRef = React.useRef(0);
  const [lockedUntil, setLockedUntil] = React.useState<number>(0);

  React.useEffect(() => {
    (async () => {
      const hasPassword = await hasPasswordUnlock();
      if (!hasPassword) {
        showAlert({
          title: 'Password not configured',
          message: 'Please use PIN or recovery.',
          confirmText: 'OK',
          onConfirm: () => {},
        });
        router.back();
        return;
      }
      const meta = await loadMeta();
      setPhoneHint(meta?.phone ? maskPhone(meta.phone) : null);
    })();
  }, [router]);

  const ensureNotLocked = React.useCallback(() => {
    if (Date.now() < lockedUntil) {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
      showAlert({
        title: 'Try again later',
        message: `Too many attempts. Wait ${secs}s.`,
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return false;
    }
    return true;
  }, [lockedUntil]);

  const registerFailure = React.useCallback(() => {
    failedAttemptsRef.current += 1;
    if (failedAttemptsRef.current >= 5) {
      failedAttemptsRef.current = 0;
      setLockedUntil(Date.now() + 30_000);
    }
  }, []);

  const unlockWithVaultKey = React.useCallback(async (vaultKey: string) => {
    const data = await decryptVaultWithKey(vaultKey);
    failedAttemptsRef.current = 0;
    unlock(data, vaultKey);
    router.replace('/dashboard');
  }, [unlock, router]);

  const handleUnlock = React.useCallback(async () => {
    if (!ensureNotLocked()) return;
    if (loading) return;
    if (!password.trim()) {
      showAlert({
        title: 'Required',
        message: 'Enter password',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    setLoading(true);
    try {
      const vaultKey = await unwrapWithPassword(password);
      await unlockWithVaultKey(vaultKey);
    } catch (e: any) {
      registerFailure();
      showAlert({
        title: 'Error',
        message: e?.message ?? 'Incorrect password',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } finally {
      setLoading(false);
    }
  }, [ensureNotLocked, loading, password, unlockWithVaultKey, registerFailure]);

  const inputStyle = [styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }];

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="key" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Unlock with Password</Text>
          {phoneHint ? (
            <Text style={[styles.sub, { color: colors.mutedText }]}>Phone: {phoneHint}</Text>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>Enter your password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[...inputStyle, { paddingRight: 44 }]}
              placeholder="Password"
              placeholderTextColor={colors.mutedText}
              secureTextEntry={!showPassword}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
              autoFocus
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eyeBtn}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={handleUnlock}
          >
            <Text style={styles.primaryBtnText}>{loading ? 'Unlocking...' : 'Unlock'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/recover')} style={styles.linkBtn}>
            <Text style={[styles.linkText, { color: colors.mutedText }]}>Forgot password? Use security question</Text>
          </TouchableOpacity>
        </View>
      </View>

      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  iconWrap: { 
    width: 56, 
    height: 56, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1, 
    marginBottom: 12 
  },
  title: { fontSize: 22, fontWeight: '900' },
  sub: { marginTop: 6, fontSize: 14, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  input: { borderWidth: 1, padding: 12, borderRadius: 12, marginBottom: 10, fontSize: 15 },
  inputWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 2, top: 0, bottom: 10, height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  linkBtn: { marginTop: 12, paddingVertical: 10 },
  linkText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
