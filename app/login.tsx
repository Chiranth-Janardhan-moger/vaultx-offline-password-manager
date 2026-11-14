import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import {
  hasPasswordUnlock,
  isBiometricEnabled,
  loadBiometricKey,
  unwrapWithPassword,
  isSelectWorkspaceOnLoginEnabled,
  getLockoutState,
  recordFailedAttempt,
  clearLockoutState,
} from '@/lib/secure';
import { decryptVaultWithKey, vaultExists } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export default function Login() {
  const router = useRouter();
  const { unlock } = useSession();
  const { colors } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [lockedUntil, setLockedUntil] = React.useState<number>(0);
  const [canBio, setCanBio] = React.useState(false);
  const [hasUnlockMethod, setHasUnlockMethod] = React.useState(false);
  const inputRef = React.useRef<TextInput>(null);

  // Smooth, high-performance UI animations
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.94)).current;
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Elegant, crisp entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 65,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const ensureNotLocked = React.useCallback(async () => {
    const lockout = await getLockoutState();
    const now = Date.now();
    if (lockout.lockedUntil > now) {
      setLockedUntil(lockout.lockedUntil);
      const secs = Math.ceil((lockout.lockedUntil - now) / 1000);
      showAlert({
        title: 'Account Locked',
        message: `Too many failed attempts. Please wait ${secs} seconds before trying again.`,
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return false;
    }
    return true;
  }, [showAlert]);

  const registerFailure = React.useCallback(async () => {
    // Natural horizontal shake animation on incorrect password
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -14, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 14, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();

    const state = await recordFailedAttempt(5, 30_000);
    if (state.lockedUntil > Date.now()) {
      setLockedUntil(state.lockedUntil);
    }
  }, [shakeAnim]);

  React.useEffect(() => {
    (async () => {
      const exists = await vaultExists();
      if (!exists) {
        router.replace('/setup');
        return;
      }

      // Check persistent lockout state
      const lockout = await getLockoutState();
      if (lockout.lockedUntil > Date.now()) {
        setLockedUntil(lockout.lockedUntil);
      }

      const hasPass = await hasPasswordUnlock();
      setHasUnlockMethod(hasPass);

      const bioEnabled = await isBiometricEnabled();
      let biometricAvailable = false;

      if (bioEnabled) {
        try {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          biometricAvailable = hasHardware && isEnrolled;
          setCanBio(biometricAvailable);
        } catch {
          setCanBio(false);
        }
      } else {
        setCanBio(false);
      }

      if (biometricAvailable) {
        setTimeout(() => unlockByBio(), 400);
      } else {
        setTimeout(() => inputRef.current?.focus(), 300);
      }
    })();
  }, [router]);

  const unlockWithVaultKey = React.useCallback(
    async (vaultKey: string) => {
      // Smooth exit transition
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.04,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      await clearLockoutState();
      const data = await decryptVaultWithKey(vaultKey);
      unlock(data, vaultKey);

      const showSpaces = await isSelectWorkspaceOnLoginEnabled();
      if (showSpaces) {
        router.replace({ pathname: '/spaces', params: { fromLogin: '1' } });
      } else {
        router.replace('/dashboard');
      }
    },
    [unlock, router, scaleAnim, fadeAnim]
  );

  const handleUnlock = React.useCallback(async () => {
    if (!(await ensureNotLocked())) return;
    if (loading) return;

    const trimmed = password.trim();
    if (!trimmed) {
      showAlert({
        title: 'Password Required',
        message: 'Please enter your master password to unlock your vault',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    setLoading(true);
    let vaultKey: string | null = null;

    try {
      vaultKey = await unwrapWithPassword(trimmed);
    } catch {
      vaultKey = null;
    }

    if (vaultKey) {
      await unlockWithVaultKey(vaultKey);
    } else {
      await registerFailure();
      setPassword('');
      showAlert({
        title: 'Incorrect Password',
        message: 'The password you entered is incorrect. Please try again.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    }
    setLoading(false);
  }, [ensureNotLocked, loading, password, unlockWithVaultKey, registerFailure, showAlert]);

  const unlockByBio = React.useCallback(async () => {
    if (!(await ensureNotLocked())) return;
    if (loading) return;

    try {
      setLoading(true);
      const vaultKey = await loadBiometricKey();
      await unlockWithVaultKey(vaultKey);
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase();
      if (
        msg.includes('cancel') ||
        msg.includes('user_cancel') ||
        e?.code === 'ERR_SECURE_STORE_USER_CANCELED' ||
        e?.code === 'ERR_KEYSTORE_USER_CANCELED' ||
        e?.code === 'ERR_AUTH_CANCELLED'
      ) {
        return;
      }
      showAlert({
        title: 'Biometric Failed',
        message: e?.message ?? 'Biometric verification unsuccessful. Please enter your master password.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } finally {
      setLoading(false);
    }
  }, [ensureNotLocked, loading, showAlert, unlockWithVaultKey]);

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }, { translateX: shakeAnim }],
              },
            ]}
          >
            {/* Stable, Premium Lock Badge */}
            <View style={styles.lockSection}>
              <View
                style={[
                  styles.lockContainer,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    shadowColor: colors.primary,
                  },
                ]}
              >
                <LinearGradient
                  colors={[colors.primary + '22', colors.primary + '06']}
                  style={styles.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Ionicons name="lock-closed" size={42} color={colors.primary} />
              </View>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>VaultX</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              Sign in with your master password
            </Text>

            {hasUnlockMethod ? (
              <View style={styles.formSection}>
                {/* Master Password */}
                <View
                  style={[
                    styles.inputCard,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="key-outline" size={20} color={colors.primary} style={styles.inputIcon} />
                  <TextInput
                    ref={inputRef}
                    style={[styles.inputField, { color: colors.text }]}
                    placeholder="Master password"
                    placeholderTextColor={colors.mutedText}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={password}
                    onChangeText={setPassword}
                    returnKeyType="go"
                    onSubmitEditing={handleUnlock}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    style={styles.eyeBtn}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.mutedText} />
                  </TouchableOpacity>
                </View>

                {/* Primary Unlock Button */}
                <TouchableOpacity
                  style={[
                    styles.unlockBtn,
                    { backgroundColor: colors.primary },
                    loading && { opacity: 0.7 },
                  ]}
                  onPress={handleUnlock}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.unlockBtnText}>{loading ? 'Unlocking...' : 'Unlock Vault'}</Text>
                </TouchableOpacity>

                {/* Biometric Button */}
                {canBio ? (
                  <TouchableOpacity
                    style={[
                      styles.bioBtn,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                    onPress={unlockByBio}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="finger-print" size={22} color={colors.primary} />
                    <Text style={[styles.bioText, { color: colors.text }]}>Unlock with Biometrics</Text>
                  </TouchableOpacity>
                ) : null}

                {/* Recovery Link */}
                <TouchableOpacity
                  onPress={async () => {
                    const lockout = await getLockoutState();
                    if (lockout.lockedUntil > Date.now()) {
                      const secs = Math.ceil((lockout.lockedUntil - Date.now()) / 1000);
                      showAlert({
                        title: 'Account Locked',
                        message: `Too many failed attempts. Please wait ${secs} seconds before trying again.`,
                        confirmText: 'OK',
                        onConfirm: () => {},
                      });
                      return;
                    }
                    router.push('/recover');
                  }}
                  disabled={lockedUntil > Date.now()}
                  style={[styles.forgotLink, lockedUntil > Date.now() && { opacity: 0.5 }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.forgotText, { color: colors.mutedText }]}>
                    Forgot password? Use Recovery Questions →
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {!hasUnlockMethod ? (
              <TouchableOpacity onPress={() => router.replace('/setup')} style={styles.setupLink}>
                <Text style={[styles.setupText, { color: colors.mutedText }]}>
                  No unlock methods found. Create a new VaultX.
                </Text>
              </TouchableOpacity>
            ) : null}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  lockSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lockContainer: {
    width: 88,
    height: 88,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  gradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 25,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    marginBottom: 28,
    textAlign: 'center',
  },
  formSection: {
    width: '100%',
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    height: 56,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 4,
  },
  inputField: {
    flex: 1,
    height: 56,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  eyeBtn: {
    height: 56,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockBtn: {
    marginTop: 20,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  unlockBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
  },
  bioText: {
    fontSize: 15,
    fontWeight: '600',
  },
  forgotLink: {
    marginTop: 22,
    alignItems: 'center',
    paddingVertical: 8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  setupLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  setupText: {
    fontSize: 14,
  },
});
