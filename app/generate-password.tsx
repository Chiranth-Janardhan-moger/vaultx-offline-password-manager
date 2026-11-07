import BottomNavBar from '@/components/BottomNavBar';
import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { getRandomBytes } from '@/lib/crypto-shim';
import { checkPasswordStrength, generateSecurePassword, getStrengthLabel } from '@/lib/password-strength';
import { copyToClipboardWithAutoClear } from '@/lib/clipboard';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  PanResponder,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface GeneratorOptions {
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

const MIN_LENGTH = 8;
const MAX_LENGTH = 64;
const DEFAULT_LENGTH = 16;
const TICKS = [8, 16, 24, 32, 40, 48, 56, 64];

export default function GeneratePassword() {
  const router = useRouter();
  const { unlocked } = useSession();
  const { colors, resolved } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [passwordLength, setPasswordLength] = React.useState<number>(DEFAULT_LENGTH);
  const [options, setOptions] = React.useState<GeneratorOptions>({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });

  const [generatedPassword, setGeneratedPassword] = React.useState('');
  const [copied, setCopied] = React.useState(false);

  // M2 Vertical slider layout measurement
  const [trackHeight, setTrackHeight] = React.useState(180);
  const trackHeightRef = React.useRef(180);
  trackHeightRef.current = trackHeight;
  const trackTopPageYRef = React.useRef(0);

  const [isDragging, setIsDragging] = React.useState(false);

  const lengthRef = React.useRef(passwordLength);
  lengthRef.current = passwordLength;

  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  const handleGenerate = React.useCallback(
    (len = lengthRef.current, opts = optionsRef.current) => {
      const password = generateSecurePassword(len, opts);
      setGeneratedPassword(password);
      setCopied(false);
    },
    []
  );

  React.useEffect(() => {
    if (!unlocked) {
      router.replace('/login');
    } else {
      handleGenerate(DEFAULT_LENGTH, options);
    }
  }, [unlocked, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateLength = React.useCallback(
    (newLen: number) => {
      const clamped = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, Math.round(newLen)));
      setPasswordLength(clamped);
      handleGenerate(clamped, options);
    },
    [handleGenerate, options]
  );

  const toggleOption = (key: keyof GeneratorOptions) => {
    const currentActiveCount = Object.values(options).filter(Boolean).length;
    // Don't allow turning off all toggles
    if (options[key] && currentActiveCount <= 1) {
      showAlert({
        title: 'Requirement',
        message: 'At least one character type must remain selected.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    const nextOptions = { ...options, [key]: !options[key] };
    setOptions(nextOptions);
    handleGenerate(passwordLength, nextOptions);
  };

  // PanResponder for smooth Material Design 2 vertical slider dragging/touching
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt, gestureState) => {
          setIsDragging(true);
          const h = trackHeightRef.current;
          if (h <= 0) return;
          const pageY = evt.nativeEvent.pageY || gestureState.y0;
          const locY = evt.nativeEvent.locationY;
          trackTopPageYRef.current = pageY - locY;

          const touchY = Math.max(10, Math.min(h - 10, locY));
          const usable = h - 20;
          const ratio = 1 - (touchY - 10) / usable;
          const val = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, Math.round(MIN_LENGTH + ratio * (MAX_LENGTH - MIN_LENGTH))));
          updateLength(val);
        },
        onPanResponderMove: (evt, gestureState) => {
          const h = trackHeightRef.current;
          if (h <= 0) return;
          const pageY = evt.nativeEvent.pageY || gestureState.moveY;
          const locY = pageY - trackTopPageYRef.current;
          const touchY = Math.max(10, Math.min(h - 10, locY));
          const usable = h - 20;
          const ratio = 1 - (touchY - 10) / usable;
          const val = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, Math.round(MIN_LENGTH + ratio * (MAX_LENGTH - MIN_LENGTH))));
          updateLength(val);
        },
        onPanResponderRelease: () => {
          setIsDragging(false);
        },
        onPanResponderTerminate: () => {
          setIsDragging(false);
        },
      }),
    [updateLength]
  );

  const copyPassword = React.useCallback(async () => {
    if (!generatedPassword) return;
    await copyToClipboardWithAutoClear(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedPassword]);

  // Password strength
  const strengthInfo = React.useMemo(() => {
    return checkPasswordStrength(generatedPassword);
  }, [generatedPassword]);

  const sliderProgress = (passwordLength - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH);
  const usableHeight = Math.max(20, trackHeight - 20);
  const thumbBottom = 10 + sliderProgress * usableHeight - 11;
  const activeTrackHeight = 10 + sliderProgress * usableHeight;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
          scrollEnabled={!isDragging}
        >
          {/* Top-Level Tab Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Generator</Text>
              <Text style={{ fontSize: 13, color: colors.mutedText, marginTop: 2 }}>
                Create strong, cryptographically secure passwords
              </Text>
            </View>
          </View>

          {/* Generated Password Card with Fixed Height to Prevent Shaking */}
          <View style={[styles.card, styles.passwordCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
            <View style={styles.passwordHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="key" size={16} color={colors.primary} />
                <Text style={[styles.passwordLabel, { color: colors.mutedText }]}>Generated Password</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleGenerate(passwordLength, options)}
                style={styles.regenBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Regenerate password"
              >
                <Ionicons name="refresh" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700', marginLeft: 4 }}>
                  Regenerate
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.passwordBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={[styles.passwordText, { color: colors.text }]} selectable numberOfLines={3}>
                {generatedPassword || 'Generating...'}
              </Text>
              <TouchableOpacity
                onPress={copyPassword}
                style={[
                  styles.copyBtn,
                  { backgroundColor: copied ? '#10b981' : colors.primary },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Copy password"
              >
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#fff" />
                <Text style={styles.copyBtnText}>{copied ? 'Copied' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>

            {/* Password Strength Meter */}
            <View style={styles.strengthContainer}>
              <View style={styles.strengthRow}>
                <Text style={[styles.strengthTitle, { color: colors.mutedText }]}>Strength</Text>
                <Text style={[styles.strengthValue, { color: strengthInfo.color }]}>
                  {getStrengthLabel(strengthInfo.strength)}
                </Text>
              </View>
              <View style={[styles.strengthTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: `${Math.max(10, strengthInfo.score)}%`,
                      backgroundColor: strengthInfo.color,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* 2-Column Options Card: Character Types (Left) + Vertical Length Slider (Right) */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
            <View style={styles.twoColumnRow}>
              {/* Left Column: 4 Character Types */}
              <View style={styles.leftCol}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>
                  Character Types
                </Text>

                {/* Uppercase Toggle */}
                <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.toggleInfo}>
                    <View style={[styles.toggleIconWrap, { backgroundColor: colors.primary + '18' }]}>
                      <Text style={[styles.toggleIconText, { color: colors.primary }]}>A</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.toggleLabel, { color: colors.text }]}>Uppercase</Text>
                      <Text style={[styles.toggleSample, { color: colors.mutedText }]}>A, B, C, D...</Text>
                    </View>
                  </View>
                  <Switch
                    value={options.uppercase}
                    onValueChange={() => toggleOption('uppercase')}
                    trackColor={{ false: resolved === 'dark' ? '#334155' : colors.border, true: colors.primary + '60' }}
                    thumbColor={options.uppercase ? colors.primary : (resolved === 'dark' ? '#64748b' : '#94a3b8')}
                  />
                </View>

                {/* Lowercase Toggle */}
                <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.toggleInfo}>
                    <View style={[styles.toggleIconWrap, { backgroundColor: colors.primary + '18' }]}>
                      <Text style={[styles.toggleIconText, { color: colors.primary }]}>a</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.toggleLabel, { color: colors.text }]}>Lowercase</Text>
                      <Text style={[styles.toggleSample, { color: colors.mutedText }]}>a, b, c, d...</Text>
                    </View>
                  </View>
                  <Switch
                    value={options.lowercase}
                    onValueChange={() => toggleOption('lowercase')}
                    trackColor={{ false: resolved === 'dark' ? '#334155' : colors.border, true: colors.primary + '60' }}
                    thumbColor={options.lowercase ? colors.primary : (resolved === 'dark' ? '#64748b' : '#94a3b8')}
                  />
                </View>

                {/* Numbers Toggle */}
                <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.toggleInfo}>
                    <View style={[styles.toggleIconWrap, { backgroundColor: colors.primary + '18' }]}>
                      <Text style={[styles.toggleIconText, { color: colors.primary }]}>1</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.toggleLabel, { color: colors.text }]}>Numbers</Text>
                      <Text style={[styles.toggleSample, { color: colors.mutedText }]}>0, 1, 2, 3...</Text>
                    </View>
                  </View>
                  <Switch
                    value={options.numbers}
                    onValueChange={() => toggleOption('numbers')}
                    trackColor={{ false: resolved === 'dark' ? '#334155' : colors.border, true: colors.primary + '60' }}
                    thumbColor={options.numbers ? colors.primary : (resolved === 'dark' ? '#64748b' : '#94a3b8')}
                  />
                </View>

                {/* Symbols Toggle */}
                <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.toggleInfo}>
                    <View style={[styles.toggleIconWrap, { backgroundColor: colors.primary + '18' }]}>
                      <Text style={[styles.toggleIconText, { color: colors.primary }]}>#</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.toggleLabel, { color: colors.text }]}>Symbols</Text>
                      <Text style={[styles.toggleSample, { color: colors.mutedText }]}>! @ # $ % & *</Text>
                    </View>
                  </View>
                  <Switch
                    value={options.symbols}
                    onValueChange={() => toggleOption('symbols')}
                    trackColor={{ false: resolved === 'dark' ? '#334155' : colors.border, true: colors.primary + '60' }}
                    thumbColor={options.symbols ? colors.primary : (resolved === 'dark' ? '#64748b' : '#94a3b8')}
                  />
                </View>
              </View>

              {/* Vertical Column Divider */}
              <View style={[styles.columnDivider, { backgroundColor: colors.border }]} />

              {/* Right Column: Length with Material Design 2 Vertical Slider */}
              <View style={styles.rightCol}>
                <View style={styles.lengthHeader}>
                  <Text style={[styles.lengthHeaderLabel, { color: colors.mutedText }]}>LENGTH</Text>
                  <View style={[styles.lengthBadge, { backgroundColor: colors.primary + '18' }]}>
                    <Text style={[styles.lengthBadgeNumber, { color: colors.primary }]}>{passwordLength}</Text>
                    <Text style={[styles.lengthBadgeUnit, { color: colors.primary }]}>chars</Text>
                  </View>
                </View>

                {/* Top Limit (Max: 64) */}
                <Text style={[styles.sliderLimitLabel, { color: colors.mutedText }]}>64</Text>

                {/* Material Design 2 Vertical Slider Track Container */}
                <View
                  style={styles.m2SliderContainer}
                  onLayout={(e) => {
                    const h = e.nativeEvent.layout.height;
                    setTrackHeight(h);
                    trackHeightRef.current = h;
                  }}
                  pointerEvents="box-only"
                  {...panResponder.panHandlers}
                >
                  {/* Inactive Track (Full height background) */}
                  <View pointerEvents="none" style={[styles.m2InactiveTrack, { backgroundColor: colors.border }]} />

                  {/* Active Track (From bottom up to thumb) */}
                  <View
                    pointerEvents="none"
                    style={[
                      styles.m2ActiveTrack,
                      {
                        backgroundColor: colors.primary,
                        height: Math.max(4, activeTrackHeight),
                      },
                    ]}
                  />

                  {/* Discrete Ticks */}
                  {TICKS.map((t) => {
                    const tRatio = (t - MIN_LENGTH) / (MAX_LENGTH - MIN_LENGTH);
                    const tBottom = 10 + tRatio * usableHeight - 2;
                    const isPassed = passwordLength >= t;
                    return (
                      <View
                        key={t}
                        pointerEvents="none"
                        style={[
                          styles.m2Tick,
                          {
                            bottom: tBottom,
                            backgroundColor: isPassed ? '#ffffff' : colors.mutedText,
                            opacity: isPassed ? 0.9 : 0.35,
                          },
                        ]}
                      />
                    );
                  })}

                  {/* Thumb Halo (M2 State Layer while dragging) */}
                  {isDragging && (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.m2ThumbHalo,
                        {
                          bottom: thumbBottom - 7,
                          backgroundColor: colors.primary + '28',
                        },
                      ]}
                    />
                  )}

                  {/* M2 Thumb Knob */}
                  <View
                    pointerEvents="none"
                    style={[
                      styles.m2Thumb,
                      {
                        bottom: thumbBottom,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />

                  {/* M2 Discrete Value Pin Tooltip (Floating beside thumb when dragging) */}
                  {isDragging && (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.m2ValuePin,
                        {
                          backgroundColor: colors.primary,
                          bottom: thumbBottom - 4,
                        },
                      ]}
                    >
                      <Text style={styles.m2ValuePinText}>{passwordLength}</Text>
                      <View style={[styles.m2ValuePinArrow, { borderLeftColor: colors.primary }]} />
                    </View>
                  )}
                </View>

                {/* Bottom Limit (Min: 8) */}
                <Text style={[styles.sliderLimitLabel, { color: colors.mutedText }]}>8</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <BottomNavBar activeTab="generator" />
      </View>

      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    paddingVertical: 4,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  passwordCard: {
    minHeight: 188,
  },
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  passwordLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  regenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: 84,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  passwordText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    flex: 1,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  strengthContainer: {
    marginTop: 2,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  strengthTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  strengthValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  strengthTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 3,
  },
  twoColumnRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  leftCol: {
    flex: 1,
    paddingRight: 6,
  },
  columnDivider: {
    width: 1,
    marginHorizontal: 8,
    borderRadius: 1,
  },
  rightCol: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  lengthHeader: {
    alignItems: 'center',
    marginBottom: 6,
  },
  lengthHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  lengthBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  lengthBadgeNumber: {
    fontSize: 16,
    fontWeight: '900',
  },
  lengthBadgeUnit: {
    fontSize: 10,
    fontWeight: '700',
  },
  m2SliderContainer: {
    width: 60,
    flex: 1,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  m2InactiveTrack: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    width: 4,
    borderRadius: 2,
  },
  m2ActiveTrack: {
    position: 'absolute',
    bottom: 10,
    width: 4,
    borderRadius: 2,
  },
  m2Tick: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  m2ThumbHalo: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  m2Thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  m2ValuePin: {
    position: 'absolute',
    right: 44,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  m2ValuePinText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  m2ValuePinArrow: {
    position: 'absolute',
    right: -5,
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  sliderLimitLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  toggleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIconText: {
    fontSize: 13,
    fontWeight: '900',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  toggleSample: {
    fontSize: 10,
    marginTop: 1,
  },
});
