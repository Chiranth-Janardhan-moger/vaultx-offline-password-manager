import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import {
  hasPinUnlock,
  isBiometricEnabled,
  loadBiometricKey,
  unwrapWithPin,
} from '@/lib/secure';
import { decryptVaultWithKey, vaultExists } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Animated, Easing, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ReactNativeBiometrics from 'react-native-biometrics';

export default function Login() {
  const router = useRouter();
  const { unlock } = useSession();
  const { colors, resolved } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [pin, setPin] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [pinFocused, setPinFocused] = React.useState(false);
  const inputRef = React.useRef<TextInput>(null);

  const failedAttemptsRef = React.useRef(0);
  const [lockedUntil, setLockedUntil] = React.useState<number>(0);

  // Advanced animations
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const lockRotate = React.useRef(new Animated.Value(0)).current;
  const glowPulse = React.useRef(new Animated.Value(0)).current;
  
  // Particle animations (floating elements)
  const particle1 = React.useRef(new Animated.Value(0)).current;
  const particle2 = React.useRef(new Animated.Value(0)).current;
  const particle3 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Lock rotation animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(lockRotate, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(lockRotate, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating particles
    const createParticleAnimation = (particle: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(particle, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(particle, {
            toValue: 0,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    createParticleAnimation(particle1, 0).start();
    createParticleAnimation(particle2, 1300).start();
    createParticleAnimation(particle3, 2600).start();
  }, []);

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
  }, [lockedUntil, showAlert]);

  const registerFailure = React.useCallback(() => {
    failedAttemptsRef.current += 1;
    
    // Shake animation on failure
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
    
    if (failedAttemptsRef.current >= 5) {
      failedAttemptsRef.current = 0;
      setLockedUntil(Date.now() + 30_000);
    }
  }, [slideAnim]);

  const [canPin, setCanPin] = React.useState(false);
  const [canBio, setCanBio] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const exists = await vaultExists();
      if (!exists) {
        router.replace('/setup');
        return;
      }
      setCanPin(await hasPinUnlock());
      
      const bioEnabled = await isBiometricEnabled();
      let biometricAvailable = false;
      
      if (bioEnabled) {
        try {
          const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: false });
          const { available, biometryType } = await rnBiometrics.isSensorAvailable();
          
          if (available && (biometryType === 'Biometrics' || biometryType === 'TouchID' || biometryType === 'FaceID')) {
            const { keysExist } = await rnBiometrics.biometricKeysExist();
            biometricAvailable = keysExist;
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
      
      if (biometricAvailable) {
        setTimeout(() => unlockByBio(), 500);
      } else {
        setTimeout(() => inputRef.current?.focus(), 300);
      }
    })();
  }, [router]);

  const unlockWithVaultKey = React.useCallback(async (vaultKey: string) => {
    // Success animation
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    const data = await decryptVaultWithKey(vaultKey);
    failedAttemptsRef.current = 0;
    unlock(data, vaultKey);
    router.replace('/dashboard');
  }, [unlock, router, scaleAnim, fadeAnim]);

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
      showAlert({
        title: 'Error',
        message: e?.message ?? 'Incorrect PIN',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } finally {
      setLoading(false);
    }
  }, [ensureNotLocked, loading, unlockWithVaultKey, registerFailure]);

  const handlePinChange = React.useCallback((value: string) => {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 6);
    setPin(digits);
    
    if (digits.length === 6) {
      setTimeout(() => unlockByPin(digits), 100);
    }
  }, [unlockByPin]);

  const unlockByBio = React.useCallback(async () => {
    if (!ensureNotLocked()) return;
    if (loading) return;
    setLoading(true);
    
    let shouldFocusInput = false;
    
    try {
      const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: false });
      const { available } = await rnBiometrics.isSensorAvailable();
      
      if (!available) {
        showAlert({
          title: 'Biometric Not Available',
          message: 'Please use PIN to unlock',
          confirmText: 'OK',
          onConfirm: () => {},
        });
        shouldFocusInput = true;
        return;
      }
      
      const { success, error } = await rnBiometrics.simplePrompt({
        promptMessage: 'Unlock VaultX',
        cancelButtonText: 'Cancel',
      });
      
      if (!success) {
        shouldFocusInput = true;
        if (error && !error.includes('cancel') && !error.includes('Cancel') && !error.includes('User')) {
          showAlert({
            title: 'Biometric Error',
            message: 'Authentication failed. Please try again or use PIN',
            confirmText: 'OK',
            onConfirm: () => {},
          });
        }
        return;
      }
      
      const vaultKey = await loadBiometricKey();
      await unlockWithVaultKey(vaultKey);
    } catch (e: any) {
      console.error('Biometric unlock error:', e);
      const errorMsg = e?.message ?? '';
      shouldFocusInput = true;
      
      if (!errorMsg.toLowerCase().includes('cancel') && 
          !errorMsg.toLowerCase().includes('user') &&
          !errorMsg.toLowerCase().includes('authentication failed')) {
        registerFailure();
        showAlert({
          title: 'Biometric Error',
          message: 'Please try again or use PIN',
          confirmText: 'OK',
          onConfirm: () => {},
        });
      }
    } finally {
      setLoading(false);
      if (shouldFocusInput) {
        setTimeout(() => inputRef.current?.focus(), 500);
      }
    }
  }, [ensureNotLocked, loading, unlockWithVaultKey, registerFailure]);

  const pinDigits = pin.split('');
  while (pinDigits.length < 6) {
    pinDigits.push('');
  }

  const lockRotation = lockRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '5deg'],
  });

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <Screen>
      <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim }]}>
        {/* Floating particles background */}
        <Animated.View
          style={[
            styles.particle,
            {
              backgroundColor: colors.primary + '20',
              top: '10%',
              left: '10%',
              opacity: particle1.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] }),
              transform: [{
                translateY: particle1.interpolate({ inputRange: [0, 1], outputRange: [0, -30] })
              }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.particle,
            {
              backgroundColor: colors.primary + '15',
              top: '70%',
              right: '15%',
              width: 80,
              height: 80,
              opacity: particle2.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] }),
              transform: [{
                translateY: particle2.interpolate({ inputRange: [0, 1], outputRange: [0, 40] })
              }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.particle,
            {
              backgroundColor: colors.primary + '10',
              top: '40%',
              right: '10%',
              width: 60,
              height: 60,
              opacity: particle3.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.4] }),
              transform: [{
                translateY: particle3.interpolate({ inputRange: [0, 1], outputRange: [0, -20] })
              }],
            },
          ]}
        />

        <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
          {/* Lock icon with gradient glow */}
          <View style={styles.lockSection}>
            <Animated.View style={[styles.glowCircle, { opacity: glowOpacity }]}>
              <LinearGradient
                colors={[colors.primary + '40', colors.primary + '00']}
                style={styles.gradient}
                start={{ x: 0.5, y: 0.5 }}
                end={{ x: 1, y: 1 }}
              />
            </Animated.View>
            
            <Animated.View
              style={[
                styles.lockContainer,
                {
                  backgroundColor: colors.card,
                  shadowColor: colors.primary,
                  transform: [{ rotate: lockRotation }],
                },
              ]}
            >
              <Ionicons name="lock-closed" size={56} color={colors.primary} />
            </Animated.View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>
            Unlock your vault to continue
          </Text>

          {canPin ? (
            <View style={styles.pinSection}>
              <View style={styles.pinBoxes}>
                {pinDigits.map((digit, idx) => {
                  const isFilled = digit !== '';
                  const isCurrentBox = pinFocused && idx === pin.length;
                  
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => inputRef.current?.focus()}
                      activeOpacity={0.7}
                    >
                      <Animated.View
                        style={[
                          styles.pinBox,
                          { backgroundColor: colors.card, borderColor: colors.border },
                          isFilled && { 
                            borderColor: colors.primary, 
                            borderWidth: 2.5,
                            backgroundColor: colors.primary + '10',
                          },
                          isCurrentBox && { 
                            borderColor: colors.primary, 
                            borderWidth: 2.5,
                            shadowColor: colors.primary,
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 4,
                          },
                        ]}
                      >
                        {isFilled ? (
                          <View style={[styles.filledDot, { backgroundColor: colors.primary }]} />
                        ) : null}
                      </Animated.View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                keyboardType="number-pad"
                autoComplete="off"
                textContentType="none"
                maxLength={6}
                value={pin}
                onChangeText={handlePinChange}
                onFocus={() => setPinFocused(true)}
                onBlur={() => setPinFocused(false)}
              />

              {canBio ? (
                <TouchableOpacity
                  style={[styles.bioBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={unlockByBio}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[colors.primary + '15', colors.primary + '05']}
                    style={styles.bioBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="finger-print" size={28} color={colors.primary} />
                    <Text style={[styles.bioText, { color: colors.text }]}>Use Biometric</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity 
                onPress={() => router.push('/unlock-password')} 
                style={styles.forgotLink}
                activeOpacity={0.7}
              >
                <Text style={[styles.forgotText, { color: colors.mutedText }]}>
                  Forgot PIN? Use password →
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!canPin ? (
            <TouchableOpacity onPress={() => router.replace('/setup')} style={styles.setupLink}>
              <Text style={[styles.setupText, { color: colors.mutedText }]}>
                No unlock methods found. Create a new VaultX.
              </Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      </Animated.View>

      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  particle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    height: 180,
    width: 180,
  },
  glowCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
    height: '100%',
  },
  lockContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  title: { 
    fontSize: 32, 
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: { 
    fontSize: 15, 
    fontWeight: '600',
    marginBottom: 48,
  },
  pinSection: { 
    alignItems: 'center', 
    width: '100%',
  },
  pinBoxes: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 32,
  },
  pinBox: {
    width: 52,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
    top: -1000,
  },
  bioBtn: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 20,
  },
  bioBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  bioText: {
    fontSize: 16,
    fontWeight: '800',
  },
  forgotLink: {
    paddingVertical: 12,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '700',
  },
  setupLink: {
    paddingVertical: 12,
  },
  setupText: { 
    fontSize: 14, 
    fontWeight: '700',
    textAlign: 'center',
  },
});

