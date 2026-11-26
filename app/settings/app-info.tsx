import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { clearAllSecure } from '@/lib/secure';
import { getVaultFilePath } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import appConfig from '../../app.json';

export default function AppInfoSettings() {
  const router = useRouter();
  const { unlocked, lock } = useSession();
  const { colors } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  React.useEffect(() => {
    if (!unlocked) {
      router.replace('/login');
    }
  }, [unlocked, router]);

  const openGitHub = async () => {
    const url = 'https://github.com/Chiranth-Janardhan-moger/vaultx-offline-password-manager';
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      showAlert({
        title: 'Error',
        message: 'Cannot open GitHub link',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    }
  };

  const openFeedbackEmail = async () => {
    const email = 'chiranthmoger000@gmail.com';
    const subject = 'VaultX Feedback';
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      showAlert({
        title: 'Error',
        message: 'Cannot open email app',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    }
  };

  const handleWipeAllData = async () => {
    try {
      // 1. Delete encrypted vault file from disk
      const path = getVaultFilePath();
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      }

      // 2. Clear all secure keys
      await clearAllSecure();
      const { clearAutoBackupConfig } = await import('@/lib/auto-backup');
      await clearAutoBackupConfig();
      await Promise.all([
        SecureStore.deleteItemAsync('vaultx_lockout_state_v1'),
        SecureStore.deleteItemAsync('vaultx_active_workspace'),
        SecureStore.deleteItemAsync('auto_lock_timer'),
        SecureStore.deleteItemAsync('vaultx_lock_on_background'),
        SecureStore.deleteItemAsync('select_workspace_on_login'),
        SecureStore.deleteItemAsync('default_delete_category'),
        SecureStore.deleteItemAsync('double_tap_lock'),
        SecureStore.deleteItemAsync('block_screenshots'),
        SecureStore.deleteItemAsync('clipboard_clear_seconds'),
      ]);

      // 3. Clear session memory and lock
      lock();

      // 4. Redirect to onboarding
      router.replace('/onboarding');
    } catch {
      showAlert({
        title: 'Error',
        message: 'Failed to erase all data. Please try again.',
        confirmText: 'OK',
      });
    }
  };

  const confirmWipeAllData = () => {
    showAlert({
      title: 'Erase All Vault Data?',
      message:
        'This will permanently delete your master password, all saved credentials, identity cards, workspaces, and encryption keys.\n\nThis action cannot be undone. Are you sure you want to completely wipe all data?',
      confirmText: 'Erase Everything',
      cancelText: 'Cancel',
      type: 'destructive',
      onConfirm: handleWipeAllData,
    });
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header with Back Button */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>App Info</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={true}
          alwaysBounceVertical={true}
        >
          {/* Centered Hero Section */}
          <View style={styles.heroSection}>
            <View style={[styles.logoWrap, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35' }]}>
              <Ionicons name="shield-checkmark" size={42} color={colors.primary} />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>VaultX</Text>
            <View style={[styles.versionBadge, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={[styles.versionText, { color: colors.primary }]}>
                Version {appConfig.expo.version}
              </Text>
            </View>
            <Text style={[styles.heroTagline, { color: colors.mutedText }]}>
              Offline • Secure • Yours
            </Text>
          </View>

          {/* Info Card with Source Code & Feedback */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: colors.cardBorderWidth }]}>
            <View style={styles.cardInner}>
              {/* Source Code */}
              <TouchableOpacity style={styles.row} onPress={openGitHub} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="logo-github" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Source Code</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>View open-source repository on GitHub</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Feedback / Support */}
              <TouchableOpacity style={styles.row} onPress={openFeedbackEmail} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="mail-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Feedback & Support</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>Report bugs or suggest new features</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Erase All Data */}
              <TouchableOpacity style={styles.row} onPress={confirmWipeAllData} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: '#ef444418' }]}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: '#ef4444' }]}>Erase All Data</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>
                    Full wipe out and factory reset
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ef444480" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Privacy & Offline Guarantee Footer Note */}
          <View style={styles.footerWrap}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.mutedText} />
            <Text style={[styles.footerText, { color: colors.mutedText }]}>
              VaultX is 100% offline. Zero cloud dependencies. All data is protected with on-device AES-256 encryption.
            </Text>
          </View>
        </ScrollView>
      </View>

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
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  versionBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 2,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  heroTagline: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  card: {
    borderRadius: 22,
    marginTop: 12,
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
    borderRadius: 21.4,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  footerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    flex: 1,
  },
});
