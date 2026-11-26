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
            <View style={[styles.logoWrap, { backgroundColor: colors.primary + '16' }]}>
              <Ionicons name="shield-checkmark" size={38} color={colors.primary} />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>VaultX</Text>
            <View style={[styles.versionBadge, { backgroundColor: colors.primary + '14' }]}>
              <Text style={[styles.versionText, { color: colors.primary }]}>
                Version {appConfig.expo.version}
              </Text>
            </View>
            <Text style={[styles.heroTagline, { color: colors.mutedText }]}>
              Offline. Secure. Yours.
            </Text>
          </View>

          {/* Security Architecture Summary */}
          <Text style={[styles.sectionHeader, { color: colors.mutedText }]}>SECURITY ARCHITECTURE</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: colors.cardBorderWidth }]}>
            <View style={styles.cardInner}>
              <View style={styles.specRow}>
                <Text style={[styles.specLabel, { color: colors.mutedText }]}>Encryption</Text>
                <Text style={[styles.specValue, { color: colors.text }]}>AES-256 + PBKDF2-HMAC</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.specRow}>
                <Text style={[styles.specLabel, { color: colors.mutedText }]}>Network</Text>
                <Text style={[styles.specValue, { color: '#30D158' }]}>100% Offline</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.specRow}>
                <Text style={[styles.specLabel, { color: colors.mutedText }]}>Storage</Text>
                <Text style={[styles.specValue, { color: colors.text }]}>On-Device Vault</Text>
              </View>
            </View>
          </View>

          {/* Community & Support */}
          <Text style={[styles.sectionHeader, { color: colors.mutedText }]}>PROJECT & SUPPORT</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: colors.cardBorderWidth }]}>
            <View style={styles.cardInner}>
              {/* Source Code */}
              <TouchableOpacity style={styles.row} onPress={openGitHub} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="logo-github" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Source Code</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>Open-source repository on GitHub</Text>
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
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>Report bugs or suggest features</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Danger Zone */}
          <Text style={[styles.sectionHeader, { color: '#ef4444' }]}>DANGER ZONE</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: colors.cardBorderWidth }]}>
            <View style={styles.cardInner}>
              <TouchableOpacity style={styles.row} onPress={confirmWipeAllData} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: '#ef444418' }]}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: '#ef4444' }]}>Erase All Data</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>
                    Permanently wipe vault, keys, and settings
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ef444480" />
              </TouchableOpacity>
            </View>
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
    paddingVertical: 18,
    gap: 8,
  },
  logoWrap: {
    width: 76,
    height: 76,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  versionBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 2,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  heroTagline: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 8,
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
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  specLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    width: '100%',
  },
});
