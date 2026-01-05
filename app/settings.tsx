import Screen from '@/components/Screen';
import { useTheme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import appConfig from '../app.json';

const MASTER_PASSWORD_KEY = 'master_password_v1';

export default function Settings() {
  const router = useRouter();
  const { mode, setMode, colors, enhancedContrast, setEnhancedContrast, showBorders, setShowBorders } = useTheme();
  const [hasMasterPassword, setHasMasterPassword] = React.useState(false);
  const [showThemeOptions, setShowThemeOptions] = React.useState(false);
  const [showGeneralOptions, setShowGeneralOptions] = React.useState(false);
  const [showAppInfo, setShowAppInfo] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const mp = await SecureStore.getItemAsync(MASTER_PASSWORD_KEY);
        setHasMasterPassword(!!mp);
      })();
    }, [])
  );

  const getThemeIcon = (themeMode: 'light' | 'dark') => {
    switch (themeMode) {
      case 'light': return 'sunny-outline';
      case 'dark': return 'moon-outline';
    }
  };

  const getThemeLabel = (themeMode: 'light' | 'dark') => {
    switch (themeMode) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
    }
  };

  const openGitHub = async () => {
    const url = 'https://github.com/Chiranth-Janardhan-moger/VaultX';
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open GitHub link');
    }
  };

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowGeneralOptions(!showGeneralOptions)}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="settings" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>General</Text>
            <Text style={[styles.menuSub, { color: colors.mutedText }]}>VPin, Password & Security</Text>
          </View>
          <Ionicons 
            name={showGeneralOptions ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={colors.mutedText} 
          />
        </TouchableOpacity>

        {showGeneralOptions ? (
          <View style={[styles.optionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => router.push('/change-vpin')}
            >
              <Ionicons name="keypad" size={20} color={colors.text} />
              <Text style={[styles.optionLabel, { color: colors.text }]}>Change VPin</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => router.push('/change-password')}
            >
              <Ionicons name="lock-closed" size={20} color={colors.text} />
              <Text style={[styles.optionLabel, { color: colors.text }]}>Change Password</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowThemeOptions(!showThemeOptions)}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name={getThemeIcon(mode)} size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Theme</Text>
            <Text style={[styles.menuSub, { color: colors.mutedText }]}>{getThemeLabel(mode)}</Text>
          </View>
          <Ionicons 
            name={showThemeOptions ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={colors.mutedText} 
          />
        </TouchableOpacity>

        {showThemeOptions ? (
          <View style={[styles.optionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(['light', 'dark'] as const).map((themeMode) => (
              <TouchableOpacity
                key={themeMode}
                style={[
                  styles.optionItem,
                  mode === themeMode && { backgroundColor: colors.inputBg }
                ]}
                onPress={() => {
                  setMode(themeMode);
                }}
              >
                <Ionicons 
                  name={getThemeIcon(themeMode)} 
                  size={20} 
                  color={mode === themeMode ? colors.primary : colors.text} 
                />
                <Text style={[styles.optionLabel, { color: colors.text }]}>
                  {getThemeLabel(themeMode)}
                </Text>
                {mode === themeMode ? (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                ) : null}
              </TouchableOpacity>
            ))}
            
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setEnhancedContrast(!enhancedContrast)}
            >
              <Ionicons name="contrast" size={20} color={colors.text} />
              <Text style={[styles.optionLabel, { color: colors.text }]}>Enhanced Contrast</Text>
              <View style={[styles.toggle, { backgroundColor: enhancedContrast ? colors.primary : colors.border }]}>
                <View style={[
                  styles.toggleThumb,
                  enhancedContrast ? styles.toggleThumbActive : null
                ]} />
              </View>
            </TouchableOpacity>

            {enhancedContrast ? (
              <TouchableOpacity
                style={[styles.optionItem, { backgroundColor: colors.inputBg }]}
                onPress={() => setShowBorders(!showBorders)}
              >
                <Ionicons name="square-outline" size={20} color={colors.text} />
                <Text style={[styles.optionLabel, { color: colors.text }]}>Show Borders</Text>
                <View style={[styles.toggle, { backgroundColor: showBorders ? colors.primary : colors.border }]}>
                  <View style={[
                    styles.toggleThumb,
                    showBorders ? styles.toggleThumbActive : null
                  ]} />
                </View>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/export')}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="download-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Export Backup</Text>
            <Text style={[styles.menuSub, { color: colors.mutedText }]}>Save your data securely</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/import')}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Import Backup</Text>
            <Text style={[styles.menuSub, { color: colors.mutedText }]}>Restore from backup file</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedText} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            if (hasMasterPassword) {
              router.push('/master-password-locked');
            } else {
              router.push('/master-password-intro');
            }
          }}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="key" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Master Password</Text>
            <Text style={[styles.menuSub, { color: colors.mutedText }]}>
              {hasMasterPassword ? 'Already configured' : 'Generate strong passwords automatically'}
            </Text>
          </View>
          <Ionicons 
            name={hasMasterPassword ? 'checkmark-circle' : 'chevron-forward'} 
            size={20} 
            color={hasMasterPassword ? '#22c55e' : colors.mutedText} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setShowAppInfo(!showAppInfo)}
        >
          <View style={[styles.menuIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="information-circle" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>App Info</Text>
            <Text style={[styles.menuSub, { color: colors.mutedText }]}>Version, source code & support</Text>
          </View>
          <Ionicons 
            name={showAppInfo ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={colors.mutedText} 
          />
        </TouchableOpacity>

        {showAppInfo ? (
          <View style={[styles.optionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.appHeader, { backgroundColor: colors.inputBg }]}>
              <Text style={[styles.appName, { color: colors.text }]}>VaultX</Text>
              <Text style={[styles.appVersion, { color: colors.mutedText }]}>
                Version {appConfig.expo.version}
              </Text>
              <Text style={[styles.appAuthor, { color: colors.mutedText }]}>
                by Chiranth Moger
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={styles.infoItem}
              onPress={openGitHub}
            >
              <Ionicons name="logo-github" size={20} color={colors.text} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: colors.mutedText }]}>Source Code</Text>
                <Text style={[styles.infoValue, { color: colors.primary }]}>View on GitHub</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.mutedText} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={[styles.starCard, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="star" size={24} color="#fbbf24" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.starTitle, { color: colors.text }]}>Like this project?</Text>
                <Text style={[styles.starSub, { color: colors.mutedText }]}>
                  Don't forget to give it a ⭐ on GitHub!
                </Text>
              </View>
            </View>
          </View>
        ) : null}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  scrollContent: { paddingBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  menuSub: {
    fontSize: 12,
    marginTop: 2,
  },
  optionsCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 100,
    position: 'relative',
    overflow: 'hidden',
  },
  toggleThumb: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 26,
    height: 26,
    borderRadius: 100,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    left: 22,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  starCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    margin: 8,
    borderRadius: 12,
  },
  starTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  starSub: {
    fontSize: 12,
    marginTop: 2,
  },
  appHeader: {
    alignItems: 'center',
    padding: 20,
    gap: 4,
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
  },
  appVersion: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  appAuthor: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
});
