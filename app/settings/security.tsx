import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import ToggleSwitch from '@/components/ToggleSwitch';
import { getClipboardClearSeconds, setClipboardClearSeconds } from '@/lib/clipboard';
import { setScreenshotBlocking } from '@/lib/screen-security';
import { isBiometricEnabled, saveBiometricKey, disableBiometric } from '@/lib/secure';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const BLOCK_SCREENSHOTS_KEY = 'block_screenshots';

export default function SecuritySettings() {
  const router = useRouter();
  const { unlocked, vaultKey, autoLockMinutes, updateAutoLockMinutes, lockOnBackground, updateLockOnBackground } = useSession();
  const { colors, resolved } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  React.useEffect(() => {
    if (!unlocked) {
      router.replace('/login');
    }
  }, [unlocked, router]);

  const [blockScreenshots, setBlockScreenshots] = React.useState(true);
  const [bioSupported, setBioSupported] = React.useState(false);
  const [bioEnabled, setBioEnabled] = React.useState(false);
  const [showAutoLockModal, setShowAutoLockModal] = React.useState(false);
  const [clipboardClearSeconds, setClipboardClearSecondsState] = React.useState(45);
  const [showClipboardModal, setShowClipboardModal] = React.useState(false);

  const dullCardBg = resolved === 'dark' ? '#1c2027' : '#FFFFFF';
  const dullCardBorder = resolved === 'dark' ? '#2e3440' : '#E5E7EB';

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const blockSS = await SecureStore.getItemAsync(BLOCK_SCREENSHOTS_KEY);
        setBlockScreenshots(blockSS !== 'false');

        const cbSec = await getClipboardClearSeconds();
        setClipboardClearSecondsState(cbSec);

        const isBioOn = await isBiometricEnabled();
        setBioEnabled(isBioOn);
        try {
          const hasHw = await LocalAuthentication.hasHardwareAsync();
          const isEnr = await LocalAuthentication.isEnrolledAsync();
          setBioSupported(hasHw && isEnr);
        } catch {
          setBioSupported(false);
        }
      })();
    }, [])
  );

  const toggleBiometric = async () => {
    if (!bioSupported) {
      showAlert({
        title: 'Not Supported',
        message: 'Biometric authentication is not supported or not enrolled on this device.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    if (bioEnabled) {
      await disableBiometric();
      setBioEnabled(false);
      showAlert({
        title: 'Biometric Disabled',
        message: 'Biometric unlock has been turned off.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } else {
      if (!vaultKey) {
        showAlert({
          title: 'Error',
          message: 'Active session key is unavailable. Please lock and unlock with your master password.',
          confirmText: 'OK',
          onConfirm: () => {},
        });
        return;
      }
      try {
        await saveBiometricKey(vaultKey);
        setBioEnabled(true);
        showAlert({
          title: 'Biometric Enabled',
          message: 'Biometric unlock has been enabled for your vault.',
          confirmText: 'OK',
          onConfirm: () => {},
        });
      } catch (err: any) {
        showAlert({
          title: 'Setup Failed',
          message: err?.message ?? 'Failed to enable biometric authentication.',
          confirmText: 'OK',
          onConfirm: () => {},
        });
      }
    }
  };

  const toggleBlockScreenshots = async () => {
    const newValue = !blockScreenshots;
    setBlockScreenshots(newValue);
    await SecureStore.setItemAsync(BLOCK_SCREENSHOTS_KEY, newValue.toString());

    const success = await setScreenshotBlocking(newValue);
    if (!success) {
      showAlert({
        title: 'Rebuild Required',
        message: 'Screenshot blocking will take effect after you rebuild the app with native modules.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    }
  };

  const setAutoLockTimer = async (minutes: number) => {
    await updateAutoLockMinutes(minutes);
    setShowAutoLockModal(false);

    showAlert({
      title: 'Auto-lock Updated',
      message:
        minutes === 0
          ? 'Auto-lock has been disabled.'
          : `App will auto-lock after ${minutes} minute${minutes > 1 ? 's' : ''} of inactivity.`,
      confirmText: 'OK',
      onConfirm: () => {},
    });
  };

  const handleSetClipboardTimer = async (seconds: number) => {
    await setClipboardClearSeconds(seconds);
    setClipboardClearSecondsState(seconds);
    setShowClipboardModal(false);

    showAlert({
      title: 'Clipboard Auto-clear Updated',
      message:
        seconds === 0
          ? 'Clipboard auto-clear has been disabled.'
          : `Copied passwords will be cleared after ${seconds >= 60 ? `${seconds / 60} minute${seconds > 60 ? 's' : ''}` : `${seconds} seconds`}.`,
      confirmText: 'OK',
      onConfirm: () => {},
    });
  };

  const getAutoLockLabel = () => {
    if (autoLockMinutes === 0) return 'Disabled';
    return `${autoLockMinutes} min${autoLockMinutes > 1 ? 's' : ''}`;
  };

  const getClipboardLabel = () => {
    if (clipboardClearSeconds === 0) return 'Disabled';
    if (clipboardClearSeconds >= 60) {
      const mins = Math.floor(clipboardClearSeconds / 60);
      return `${mins} min${mins > 1 ? 's' : ''}`;
    }
    return `${clipboardClearSeconds}s`;
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header with Back Button */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Security</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={true}
          alwaysBounceVertical={true}
        >
          {/* Authentication Section */}
          <Text style={[styles.sectionHeader, { color: colors.mutedText, marginTop: 4 }]}>AUTHENTICATION</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: colors.cardBorderWidth }]}>
            <View style={styles.cardInner}>
              {/* Change Master Password */}
              <TouchableOpacity style={styles.row} onPress={() => router.push('/change-password')} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Change Master Password</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>Update your primary vault password</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Biometric Unlock */}
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="finger-print-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Biometric Unlock</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>
                    {bioSupported ? 'Unlock with fingerprint or face' : 'Not supported on this device'}
                  </Text>
                </View>
                <ToggleSwitch
                  value={bioEnabled}
                  onValueChange={toggleBiometric}
                  disabled={!bioSupported}
                  accessibilityLabel="Biometric Unlock"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Password Health */}
              <TouchableOpacity style={styles.row} onPress={() => router.push('/password-health' as any)} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="pulse-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Password Health</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>
                    Check weak, reused, and 2FA-missing passwords
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
              </TouchableOpacity>
            </View>
          </View>

          {/* App Locking Section */}
          <Text style={[styles.sectionHeader, { color: colors.mutedText }]}>APP LOCKING</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: colors.cardBorderWidth }]}>
            <View style={styles.cardInner}>
              {/* Lock on App Exit */}
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="exit-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Lock on App Exit</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>Lock immediately when leaving the app</Text>
                </View>
                <ToggleSwitch
                  value={lockOnBackground}
                  onValueChange={updateLockOnBackground}
                  accessibilityLabel="Lock on App Exit"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Auto-lock Timer */}
              <TouchableOpacity style={styles.row} onPress={() => setShowAutoLockModal(true)} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="timer-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Auto-lock Timer</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>Lock app automatically on idle</Text>
                </View>
                <View style={styles.badgeWrap}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{getAutoLockLabel()}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedText} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Privacy & Protection Section */}
          <Text style={[styles.sectionHeader, { color: colors.mutedText }]}>PRIVACY & PROTECTION</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: colors.cardBorderWidth }]}>
            <View style={styles.cardInner}>
              {/* Auto-clear Clipboard */}
              <TouchableOpacity style={styles.row} onPress={() => setShowClipboardModal(true)} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Auto-clear Clipboard</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>Wipe copied passwords from clipboard</Text>
                </View>
                <View style={styles.badgeWrap}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{getClipboardLabel()}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedText} />
                </View>
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Block Screenshots */}
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Block Screenshots</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>Hide app in recents & block captures</Text>
                </View>
                <ToggleSwitch
                  value={blockScreenshots}
                  onValueChange={toggleBlockScreenshots}
                  accessibilityLabel="Block Screenshots"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Auto-lock Selection Modal */}
      <Modal visible={showAutoLockModal} transparent animationType="fade" onRequestClose={() => setShowAutoLockModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAutoLockModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.dialogCard, { backgroundColor: dullCardBg, borderColor: dullCardBorder }]}>
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Auto-lock Timer</Text>
            <Text style={[styles.dialogSub, { color: colors.mutedText }]}>
              Select inactivity duration before the app locks
            </Text>

            <View style={{ marginTop: 12 }}>
              {[0, 1, 5, 10, 30].map((minutes) => {
                const isSelected = autoLockMinutes === minutes;
                const label = minutes === 0 ? 'Disabled' : `${minutes} minute${minutes > 1 ? 's' : ''}`;
                return (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.dialogOption,
                      isSelected && { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                    ]}
                    onPress={() => setAutoLockTimer(minutes)}
                  >
                    <Text style={[styles.dialogOptionText, { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '700' : '500' }]}>
                      {label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.dialogCancelBtn, { borderColor: dullCardBorder }]}
              onPress={() => setShowAutoLockModal(false)}
            >
              <Text style={[styles.dialogCancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Clipboard Clear Selection Modal */}
      <Modal visible={showClipboardModal} transparent animationType="fade" onRequestClose={() => setShowClipboardModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowClipboardModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.dialogCard, { backgroundColor: dullCardBg, borderColor: dullCardBorder }]}>
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Auto-clear Clipboard</Text>
            <Text style={[styles.dialogSub, { color: colors.mutedText }]}>
              Wipe copied passwords from clipboard after timeout
            </Text>

            <View style={{ marginTop: 12 }}>
              {[
                { seconds: 0, label: 'Disabled' },
                { seconds: 15, label: '15 seconds' },
                { seconds: 30, label: '30 seconds' },
                { seconds: 45, label: '45 seconds (Default)' },
                { seconds: 60, label: '1 minute' },
                { seconds: 120, label: '2 minutes' },
              ].map(({ seconds, label }) => {
                const isSelected = clipboardClearSeconds === seconds;
                return (
                  <TouchableOpacity
                    key={seconds}
                    style={[
                      styles.dialogOption,
                      isSelected && { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                    ]}
                    onPress={() => handleSetClipboardTimer(seconds)}
                  >
                    <Text style={[styles.dialogOptionText, { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '700' : '500' }]}>
                      {label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.dialogCancelBtn, { borderColor: dullCardBorder }]}
              onPress={() => setShowClipboardModal(false)}
            >
              <Text style={[styles.dialogCancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
        shadowColor: '#000000',
      },
    }),
  },
  cardInner: {
    borderRadius: 19.4,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    borderRadius: 26,
    borderWidth: 1,
    padding: 20,
    elevation: 5,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  dialogSub: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
  dialogOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 6,
  },
  dialogOptionText: {
    fontSize: 14,
  },
  dialogCancelBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
  },
  dialogCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
