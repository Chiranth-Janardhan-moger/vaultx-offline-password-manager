import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useTheme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import appConfig from '../../app.json';

export default function AppInfoSettings() {
  const router = useRouter();
  const { colors, resolved } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

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

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.bodyWrap}>
          {/* Header with Back Button */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>App Info</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
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

            {/* Larger, Enhanced Info Card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Architecture / Offline Guarantee */}
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="lock-closed" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Architecture</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>
                    Zero cloud dependencies • 100% on-device AES-256 encryption
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Source Code */}
              <TouchableOpacity style={styles.row} onPress={openGitHub} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="logo-github" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Source Code</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>View open-source repository on GitHub</Text>
                </View>
                <Ionicons name="open-outline" size={18} color={colors.mutedText} />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Star on GitHub */}
              <TouchableOpacity style={styles.row} onPress={openGitHub} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: '#fbbf2418' }]}>
                  <Ionicons name="star" size={20} color="#fbbf24" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Star on GitHub</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>Support this project with a ⭐</Text>
                </View>
                <Ionicons name="open-outline" size={18} color={colors.mutedText} />
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
                <Ionicons name="send-outline" size={18} color={colors.mutedText} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

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
  scrollContent: { paddingBottom: 36 },
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
    fontWeight: '900',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  versionBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 2,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  heroTagline: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.4,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 12,
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginLeft: 78,
  },
});
