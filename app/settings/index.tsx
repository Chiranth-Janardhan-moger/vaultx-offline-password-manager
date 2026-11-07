import BottomNavBar from '@/components/BottomNavBar';
import Screen from '@/components/Screen';
import { useTheme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SettingCategoryItem {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: '/settings/general' | '/settings/security' | '/settings/backup' | '/settings/app-info';
}

const SETTING_CATEGORIES: SettingCategoryItem[] = [
  {
    key: 'general',
    title: 'General',
    subtitle: 'Theme, workspaces & tag deletion',
    icon: 'options-outline',
    route: '/settings/general',
  },
  {
    key: 'security',
    title: 'Security',
    subtitle: 'Master password, auto-lock & protection',
    icon: 'shield-checkmark-outline',
    route: '/settings/security',
  },
  {
    key: 'backup',
    title: 'Backup & Restore',
    subtitle: 'Export & import encrypted vault data',
    icon: 'cloud-upload-outline',
    route: '/settings/backup',
  },
  {
    key: 'app-info',
    title: 'App Info',
    subtitle: 'Version, open-source repository & support',
    icon: 'information-circle-outline',
    route: '/settings/app-info',
  },
];

export default function SettingsIndex() {
  const router = useRouter();
  const { colors, resolved } = useTheme();

  const footerColor = resolved === 'dark' ? '#D1D5DB' : '#9CA3AF';
  const lineColor = resolved === 'dark' ? '#2e3440' : '#E5E7EB';

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.bodyWrap}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={true}
            alwaysBounceVertical={true}
          >
            <View style={[styles.cardGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {SETTING_CATEGORIES.map((item, idx) => {
                const isLast = idx === SETTING_CATEGORIES.length - 1;
                return (
                  <React.Fragment key={item.key}>
                    <TouchableOpacity
                      style={styles.menuRow}
                      onPress={() => router.push(item.route)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                        <Ionicons name={item.icon} size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.menuSubtitle, { color: colors.mutedText }]}>{item.subtitle}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
                    </TouchableOpacity>
                    {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  </React.Fragment>
                );
              })}
            </View>

            {/* Hero Brand Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerHero, { color: footerColor }]}>
                Your last{'\n'}password manager
              </Text>
              
              <View style={[styles.dividerLine, { backgroundColor: lineColor }]} />
              
              <Text style={[styles.footerBrand, { color: footerColor }]}>VaultX</Text>
              <Text style={[styles.footerTagline, { color: footerColor }]}>
                Offline. Secure. Yours.
              </Text>
            </View>
          </ScrollView>
        </View>

        {/* Bottom Navigation Bar */}
        <BottomNavBar activeTab="settings" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bodyWrap: { flex: 1, paddingHorizontal: 20, paddingTop: 14 },
  headerRow: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '900' },
  scrollContent: { paddingBottom: 28 },
  cardGroup: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 6,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  menuSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  divider: {
    height: 1,
    marginLeft: 72,
  },
  footer: {
    alignItems: 'flex-start',
    paddingVertical: 32,
    marginTop: 24,
  },
  footerHero: {
    fontSize: 44,
    fontWeight: '600',
    textAlign: 'left',
    lineHeight: 52,
    marginBottom: 32,
  },
  dividerLine: {
    width: '80%',
    height: 1,
    marginBottom: 20,
  },
  footerBrand: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'left',
    marginBottom: 4,
  },
  footerTagline: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'left',
  },
});
