import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { getClipboardClearSeconds, setClipboardClearSeconds } from '@/lib/clipboard';
import { setScreenshotBlocking } from '@/lib/screen-security';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

const DOUBLE_TAP_LOCK_KEY = 'double_tap_lock';
const BLOCK_SCREENSHOTS_KEY = 'block_screenshots';

export default function SecuritySettings() {
  const router = useRouter();
  const { unlocked, autoLockMinutes, updateAutoLockMinutes } = useSession();
  const { colors, resolved } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  React.useEffect(() => {
    if (!unlocked) {
      router.replace('/login');
    }
  }, [unlocked, router]);

  const [doubleTapLock, setDoubleTapLock] = React.useState(false);
  const [blockScreenshots, setBlockScreenshots] = React.useState(true);
  const [showAutoLockModal, setShowAutoLockModal] = React.useState(false);
  const [clipboardClearSeconds, setClipboardClearSecondsState] = React.useState(45);
  const [showClipboardModal, setShowClipboardModal] = React.useState(false);

  const dullCardBg = resolved === 'dark' ? '#1c2027' : '#f1f3f6';
  const dullCardBorder = resolved === 'dark' ? '#2e3440' : '#d8dce2';

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const doubleTap = await SecureStore.getItemAsync(DOUBLE_TAP_LOCK_KEY);
        setDoubleTapLock(doubleTap === 'true');

        const blockSS = await SecureStore.getItemAsync(BLOCK_SCREENSHOTS_KEY);
        setBlockScreenshots(blockSS !== 'false');

        const cbSec = await getClipboardClearSeconds();
        setClipboardClearSecondsState(cbSec);
      })();
    }, [])
  );

  const toggleDoubleTapLock = async () => {
    const newValue = !doubleTapLock;
    setDoubleTapLock(newValue);
    await SecureStore.setItemAsync(DOUBLE_TAP_LOCK_KEY, newValue.toString());
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
        <View style={styles.bodyWrap}>
          {/* Header with Back Button */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Security</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={true}
            alwaysBounceVertical={true}
          >
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

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
                <Switch
                  value={blockScreenshots}
                  onValueChange={toggleBlockScreenshots}
                  trackColor={{ false: resolved === 'dark' ? '#334155' : colors.border, true: colors.primary + '60' }}
                  thumbColor={blockScreenshots ? colors.primary : (resolved === 'dark' ? '#64748b' : '#94a3b8')}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Double Tap to Lock */}
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="hand-left-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Double Tap to Lock</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>Tap empty space on Dashboard to lock</Text>
                </View>
                <Switch
                  value={doubleTapLock}
                  onValueChange={toggleDoubleTapLock}
                  trackColor={{ false: resolved === 'dark' ? '#334155' : colors.border, true: colors.primary + '60' }}
                  thumbColor={doubleTapLock ? colors.primary : (resolved === 'dark' ? '#64748b' : '#94a3b8')}
                />
              </View>
            </View>
          </ScrollView>
        </View>
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
  bodyWrap: { flex: 1, paddingHorizontal: 20, paddingTop: 14 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '900' },
  scrollContent: { paddingBottom: 28 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 64,
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    elevation: 5,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
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
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  dialogCancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
