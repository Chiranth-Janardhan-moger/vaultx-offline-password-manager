import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import {
    hasPinUnlock,
    isBiometricEnabled,
    loadBiometricKey,
    loadMeta,
    unwrapWithPin,
} from '@/lib/secure';
import { decryptVaultWithKey, vaultExists } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';

const maskPhone = (phone: string): string => {
  if (phone.length <= 4) return phone;
  const first2 = phone.slice(0, 2);
  const last2 = phone.slice(-2);
  const middle = 'X'.repeat(phone.length - 4);
  return `${first2}${middle}${last2}`;
};

export default function Login() {
  const router = useRouter();
  const { unlock } = useSession();
  const { colors } = useTheme();

  const [pin, setPin] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [pinFocused, setPinFocused] = React.useState(false);
  const inputRef = React.useRef<TextInput>(null);

  const failedAttemptsRef = React.useRef(0);
  const [lockedUntil, setLockedUntil] = React.useState<number>(0);

  const ensureNotLocked = React.useCallback(() => {
    if (Date.now() < lockedUntil) {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
      Alert.alert('Try again later', `Too many attempts. Wait ${secs}s.`);
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

  const [canPin, setCanPin] = React.useState(false);
  const [canBio, setCanBio] = React.useState(false);
  const [phoneHint, setPhoneHint] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const exists = await vaultExists();
      if (!exists) {
        router.replace('/setup');
        return;
      }
      setCanPin(await hasPinUnlock());
      
      // Check if biometric is actually available on device
      const bioEnabled = await isBiometricEnabled();
      if (bioEnabled) {
        try {
          const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: false });
          const { available, biometryType } = await rnBiometrics.isSensorAvailable();
          
          if (available && (biometryType === 'Biometrics' || biometryType === 'TouchID' || biometryType === 'FaceID')) {
            // Verify keys exist
            const { keysExist } = await rnBiometrics.biometricKeysExist();
            setCanBio(keysExist);
          } else {
            setCanBio(false);
          }
        } catch (error) {
          console.error('Biometric check error:', error);
          setCanBio(false);
        }
      } else {
        setCanBio(false);
      }
      
      const meta = await loadMeta();
      setPhoneHint(meta?.phone ? maskPhone(meta.phone) : null);
    })();
  }, [router]);

  React.useEffect(() => {
    // Auto-focus on mount
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const unlockWithVaultKey = React.useCallback(async (vaultKey: string) => {
    const data = await decryptVaultWithKey(vaultKey);
    failedAttemptsRef.current = 0;
    unlock(data, vaultKey);
    router.replace('/dashboard');
  }, [unlock, router]);

  const unlockByPin = React.useCallback(async (pinValue: string) => {
    if (!ensureNotLocked()) return;
    if (loading) return;
    
    if (!/^\d{6}$/.test(pinValue)) return;
    
    setLoading(true);
    try {
      const vaultKey = await unwrapWithPin(pinValue);
      await unlockWithVaultKey(vaultKey);
    } catch (e: any) {
      registerFailure();
      setPin('');
      Alert.alert('Error', e?.message ?? 'Incorrect PIN');
    } finally {
      setLoading(false);
    }
  }, [ensureNotLocked, loading, unlockWithVaultKey, registerFailure]);

  const handlePinChange = React.useCallback((value: string) => {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 6);
    setPin(digits);
    
    // Auto-submit when 6 digits entered
    if (digits.length === 6) {
      setTimeout(() => unlockByPin(digits), 100);
    }
  }, [unlockByPin]);

  const unlockByBio = React.useCallback(async () => {
    if (!ensureNotLocked()) return;
    if (loading) return;
    setLoading(true);
    try {
      const rnBiometrics = new ReactNativeBiometrics({
        allowDeviceCredentials: false,
      });
      
      // Check if biometric is available
      const { available } = await rnBiometrics.isSensorAvailable();
      if (!available) {
        Alert.alert('Biometric Not Available', 'Please use PIN to unlock');
        return;
      }
      
      const { success, error } = await rnBiometrics.simplePrompt({
        promptMessage: 'Unlock VaultX',
        cancelButtonText: 'Cancel',
      });
      
      if (!success) {
        if (error) {
          console.error('Biometric error:', error);
          // Only show error if it's not a user cancellation
          if (!error.includes('cancel') && !error.includes('Cancel') && !error.includes('User')) {
            Alert.alert('Biometric Error', 'Authentication failed. Please try again or use PIN');
          }
        }
        return;
      }
      
      const vaultKey = await loadBiometricKey();
      await unlockWithVaultKey(vaultKey);
    } catch (e: any) {
      console.error('Biometric unlock error:', e);
      const errorMsg = e?.message ?? '';
      // Don't show alert for user cancellation
      if (!errorMsg.toLowerCase().includes('cancel') && 
          !errorMsg.toLowerCase().includes('user') &&
          !errorMsg.toLowerCase().includes('authentication failed')) {
        registerFailure();
        Alert.alert('Biometric Error', 'Please try again or use PIN');
      }
    } finally {
      setLoading(false);
    }
  }, [ensureNotLocked, loading, unlockWithVaultKey, registerFailure]);

  const pinDigits = pin.split('');
  while (pinDigits.length < 6) {
    pinDigits.push('');
  }

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="lock-closed" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Unlock VaultX</Text>
          {phoneHint ? (
            <Text style={[styles.sub, { color: colors.mutedText }]}>Phone: {phoneHint}</Text>
          ) : null}
        </View>

        {canPin ? (
          <View style={styles.pinSection}>
            <Text style={[styles.pinLabel, { color: colors.text }]}>Enter PIN</Text>
            
            <TouchableOpacity 
              style={styles.pinBoxes}
              onPress={() => inputRef.current?.focus()}
              activeOpacity={1}
            >
              {pinDigits.map((digit, idx) => {
                const isFilled = digit !== '';
                const isCurrentBox = pinFocused && idx === pin.length;
                
                return (
                  <View
                    key={idx}
                    style={[
                      styles.pinBox,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isFilled && { borderColor: colors.primary, borderWidth: 2 },
                      isCurrentBox && { borderColor: colors.primary, borderWidth: 2 },
                    ]}
                  >
                    <Text style={[styles.pinDigit, { color: colors.text }]}>
                      {isFilled ? '●' : ''}
                    </Text>
                  </View>
                );
              })}
            </TouchableOpacity>

            {/* Hidden TextInput for keyboard */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={pin}
              onChangeText={handlePinChange}
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="off"
              textContentType="none"
              secureTextEntry={false}
              caretHidden
              autoFocus={true}
              onFocus={() => setPinFocused(true)}
              onBlur={() => setPinFocused(false)}
            />

            {canBio ? (
              <TouchableOpacity
                style={[styles.bioBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={unlockByBio}
                disabled={loading}
              >
                <Ionicons name="finger-print" size={32} color={colors.primary} />
                <Text style={[styles.bioText, { color: colors.text }]}>Use Fingerprint</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity 
              onPress={() => router.push('/unlock-password')} 
              style={styles.forgotLink}
            >
              <Text style={[styles.forgotText, { color: colors.mutedText }]}>
                Forgot PIN? Use password
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!canPin ? (
          <TouchableOpacity onPress={() => router.replace('/setup')} style={{ paddingVertical: 12 }}>
            <Text style={[styles.recoveryText, { color: colors.mutedText }]}>No unlock methods found. Create a new VaultX.</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  iconWrap: { 
    width: 56, 
    height: 56, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1, 
    marginBottom: 12 
  },
  title: { fontSize: 24, fontWeight: '900' },
  sub: { marginTop: 6, fontSize: 14, fontWeight: '600' },
  pinSection: { alignItems: 'center' },
  pinLabel: { fontSize: 16, fontWeight: '700', marginBottom: 24 },
  pinBoxes: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 32 
  },
  pinBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDigit: { 
    fontSize: 32, 
    fontWeight: '900',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
    top: 0,
    left: 0,
  },
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
  },
  bioText: {
    fontSize: 16,
    fontWeight: '700',
  },
  forgotLink: {
    marginTop: 24,
    paddingVertical: 8,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '700',
  },
  recoveryText: { 
    fontSize: 14, 
    fontWeight: '700',
  },
});
