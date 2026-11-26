import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import ToggleSwitch from '@/components/ToggleSwitch';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import {
  type AutoBackupConfig,
  type AutoBackupFrequency,
  formatSafDirectoryName,
  getAutoBackupConfig,
  pickBackupDirectory,
  runAutoBackup,
  setAutoBackupEnabled,
  setAutoBackupFrequency,
  setAutoBackupPassword,
} from '@/lib/auto-backup';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const FREQUENCY_OPTIONS: { value: AutoBackupFrequency; label: string; sub: string }[] = [
  { value: 'on_change', label: 'On every change', sub: 'Back up automatically after saving items' },
  { value: 'daily', label: 'Daily', sub: 'Back up automatically once a day when unlocked' },
  { value: 'weekly', label: 'Weekly', sub: 'Back up automatically once a week when unlocked' },
];

export default function BackupSettings() {
  const router = useRouter();
  const { unlocked, vault, runWithBackgroundLockSuppressed } = useSession();
  const { colors, resolved } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [config, setConfig] = React.useState<AutoBackupConfig>({
    enabled: false,
    directoryUri: null,
    hasPassword: false,
    frequency: 'on_change',
    lastBackupAt: 0,
    lastError: null,
  });
  const [backingUp, setBackingUp] = React.useState(false);
  const [showFrequencyModal, setShowFrequencyModal] = React.useState(false);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [pendingEnableAfterPw, setPendingEnableAfterPw] = React.useState(false);
  const [pwInput, setPwInput] = React.useState('');
  const [pwConfirm, setPwConfirm] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);

  const dullCardBg = resolved === 'dark' ? '#1c2027' : '#FFFFFF';
  const dullCardBorder = resolved === 'dark' ? '#2e3440' : '#E5E7EB';

  React.useEffect(() => {
    if (!unlocked) {
      router.replace('/login');
    }
  }, [unlocked, router]);

  const reloadConfig = React.useCallback(async () => {
    const next = await getAutoBackupConfig();
    setConfig(next);
    return next;
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      reloadConfig();
    }, [reloadConfig])
  );

  const performImmediateBackup = React.useCallback(
    async (silent = false) => {
      if (!vault || backingUp) return;
      setBackingUp(true);
      try {
        const res = await runAutoBackup(vault, { trigger: 'manual' });
        const latest = await reloadConfig();
        if (!silent) {
          if (res.ok && !res.skipped) {
            showAlert({
              title: 'Backup Complete',
              message: `Encrypted backup saved to ${formatSafDirectoryName(latest.directoryUri)}.`,
              confirmText: 'OK',
              onConfirm: () => {},
            });
          } else if (!res.ok) {
            showAlert({
              title: 'Auto Backup Failed',
              message: res.error,
              confirmText: 'OK',
              onConfirm: () => {},
            });
          }
        }
      } finally {
        setBackingUp(false);
      }
    },
    [vault, backingUp, reloadConfig, showAlert]
  );

  const handleSelectFolder = React.useCallback(async () => {
    try {
      const picked = await runWithBackgroundLockSuppressed(() => pickBackupDirectory());
      if (!picked.granted || !picked.directoryUri) return null;
      const updated = await reloadConfig();
      if (updated.enabled && updated.hasPassword && vault) {
        setBackingUp(true);
        await runAutoBackup(vault, { trigger: 'manual' });
        await reloadConfig();
        setBackingUp(false);
      }
      return picked.directoryUri;
    } catch (e: any) {
      setBackingUp(false);
      showAlert({
        title: 'Folder Selection Failed',
        message: e?.message ?? 'Could not access the selected folder.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return null;
    }
  }, [runWithBackgroundLockSuppressed, reloadConfig, vault, showAlert]);

  const toggleAutoBackup = async () => {
    if (config.enabled) {
      await setAutoBackupEnabled(false);
      await reloadConfig();
      return;
    }

    let current = config;
    if (!current.directoryUri) {
      const pickedUri = await handleSelectFolder();
      if (!pickedUri) return;
      current = await reloadConfig();
    }

    if (!current.hasPassword) {
      setPendingEnableAfterPw(true);
      setPwInput('');
      setPwConfirm('');
      setShowPasswordModal(true);
      return;
    }

    await setAutoBackupEnabled(true);
    await reloadConfig();
    if (vault) {
      await performImmediateBackup(true);
    }
  };

  const handleSaveAutoBackupPassword = async () => {
    if (pwInput.length < 6) {
      showAlert({
        title: 'Password Too Short',
        message: 'Backup password must be at least 6 characters.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    if (pwInput !== pwConfirm) {
      showAlert({
        title: "Passwords Don't Match",
        message: 'Please make sure both passwords match.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    await setAutoBackupPassword(pwInput);
    const shouldEnable = pendingEnableAfterPw;
    setPendingEnableAfterPw(false);
    setPwInput('');
    setPwConfirm('');
    setShowPasswordModal(false);

    if (shouldEnable) {
      await setAutoBackupEnabled(true);
    }
    const updated = await reloadConfig();
    if (updated.enabled && updated.directoryUri && vault) {
      await performImmediateBackup(false);
    }
  };

  const handleSelectFrequency = async (frequency: AutoBackupFrequency) => {
    await setAutoBackupFrequency(frequency);
    setShowFrequencyModal(false);
    await reloadConfig();
  };

  const handleBackupNow = async () => {
    if (!config.directoryUri) {
      showAlert({
        title: 'Folder Required',
        message: 'Please select a backup folder first.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    if (!config.hasPassword) {
      setPendingEnableAfterPw(false);
      setPwInput('');
      setPwConfirm('');
      setShowPasswordModal(true);
      return;
    }
    if (!config.enabled) {
      await setAutoBackupEnabled(true);
      await reloadConfig();
    }
    await performImmediateBackup(false);
  };

  const getFrequencyLabel = () =>
    FREQUENCY_OPTIONS.find((o) => o.value === config.frequency)?.label ?? 'On every change';

  const getLastBackupSubtitle = () => {
    if (backingUp) return 'Writing encrypted backup...';
    if (config.lastError) return `Error: ${config.lastError}`;
    if (!config.lastBackupAt) return 'No automatic backup taken yet';
    return `Last backup: ${new Date(config.lastBackupAt).toLocaleString()}`;
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header with Back Button */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Backup & Restore</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={true}
          alwaysBounceVertical={true}
        >
          <Text style={[styles.sectionHeader, { color: colors.mutedText, marginTop: 4 }]}>AUTO BACKUP</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: colors.cardBorderWidth }]}>
            <View style={styles.cardInner}>
              {/* Enable Auto Backup */}
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="sync-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Automatic Backup</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>
                    Save encrypted .vxb backups to a folder automatically
                  </Text>
                </View>
                <ToggleSwitch
                  value={config.enabled}
                  onValueChange={toggleAutoBackup}
                  accessibilityLabel="Automatic Backup"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Backup Folder */}
              <TouchableOpacity style={styles.row} onPress={handleSelectFolder} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="folder-open-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Backup Folder</Text>
                  <Text style={[styles.itemSub, { color: config.directoryUri ? colors.primary : colors.mutedText }]} numberOfLines={1}>
                    {formatSafDirectoryName(config.directoryUri)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Frequency */}
              <TouchableOpacity style={styles.row} onPress={() => setShowFrequencyModal(true)} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Backup Schedule</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>When automatic backups run</Text>
                </View>
                <View style={styles.badgeWrap}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{getFrequencyLabel()}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedText} />
                </View>
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Auto-Backup Password */}
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  setPendingEnableAfterPw(false);
                  setPwInput('');
                  setPwConfirm('');
                  setShowPasswordModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="key-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Backup Password</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>
                    {config.hasPassword ? 'Configured (tap to update)' : 'Required to encrypt auto-backups'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Back Up Now */}
              <TouchableOpacity style={styles.row} onPress={handleBackupNow} disabled={backingUp} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="cloud-done-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>
                    {backingUp ? 'Backing Up...' : 'Back Up Now'}
                  </Text>
                  <Text
                    style={[
                      styles.itemSub,
                      { color: config.lastError ? '#ef4444' : colors.mutedText },
                    ]}
                    numberOfLines={2}
                  >
                    {getLastBackupSubtitle()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.sectionHeader, { color: colors.mutedText }]}>MANUAL BACKUP</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: colors.cardBorderWidth }]}>
            <View style={styles.cardInner}>
              {/* Export Backup */}
              <TouchableOpacity style={styles.row} onPress={() => router.push('/export')} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="download-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Export Backup</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>Save encrypted backup file or CSV</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Import Backup */}
              <TouchableOpacity style={styles.row} onPress={() => router.push('/import')} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Import Backup</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>Restore vault items from a backup file</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Frequency Modal */}
      <Modal visible={showFrequencyModal} transparent animationType="fade" onRequestClose={() => setShowFrequencyModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFrequencyModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.dialogCard, { backgroundColor: dullCardBg, borderColor: dullCardBorder }]}>
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Backup Schedule</Text>
            <Text style={[styles.dialogSub, { color: colors.mutedText }]}>
              Choose when automatic backups are created
            </Text>
            <View style={{ marginTop: 12 }}>
              {FREQUENCY_OPTIONS.map((opt) => {
                const isSelected = config.frequency === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.dialogOption,
                      isSelected && { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                    ]}
                    onPress={() => handleSelectFrequency(opt.value)}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text
                        style={[
                          styles.dialogOptionText,
                          { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '700' : '500' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.mutedText, marginTop: 2 }}>{opt.sub}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[styles.dialogCancelBtn, { borderColor: dullCardBorder }]}
              onPress={() => setShowFrequencyModal(false)}
            >
              <Text style={[styles.dialogCancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Auto Backup Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPendingEnableAfterPw(false);
          setShowPasswordModal(false);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setPendingEnableAfterPw(false);
            setShowPasswordModal(false);
          }}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.dialogCard, { backgroundColor: dullCardBg, borderColor: dullCardBorder }]}>
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Auto-Backup Password</Text>
            <Text style={[styles.dialogSub, { color: colors.mutedText }]}>
              Used to encrypt your automatic .vxb backups. Remember this password to restore on another device.
            </Text>

            <View style={styles.modalInputWrap}>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, paddingRight: 44 }]}
                placeholder="Backup password (min 6 chars)"
                placeholderTextColor={colors.mutedText}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                value={pwInput}
                onChangeText={setPwInput}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.modalEyeBtn}>
                <Ionicons name={showPw ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Confirm backup password"
              placeholderTextColor={colors.mutedText}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              value={pwConfirm}
              onChangeText={setPwConfirm}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { borderColor: dullCardBorder, borderWidth: 1 }]}
                onPress={() => {
                  setPendingEnableAfterPw(false);
                  setShowPasswordModal(false);
                }}
              >
                <Text style={[styles.dialogCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveAutoBackupPassword}
              >
                <Text style={[styles.dialogCancelText, { color: '#FFFFFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '900' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
        shadowColor: '#000000',
      },
    }),
  },
  cardInner: {
    borderRadius: 17.4,
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
  modalInputWrap: {
    position: 'relative',
    marginTop: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginBottom: 10,
  },
  modalEyeBtn: {
    position: 'absolute',
    right: 2,
    top: 2,
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
});
