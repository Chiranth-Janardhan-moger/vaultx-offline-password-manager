import Screen from '@/components/Screen';
import { useTheme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MASTER_PASSWORD_KEY = 'master_password_v1';

export default function MasterPasswordIntro() {
  const router = useRouter();
  const { colors } = useTheme();

  React.useEffect(() => {
    (async () => {
      const existing = await SecureStore.getItemAsync(MASTER_PASSWORD_KEY);
      if (existing) {
        // Master password already exists, go to locked screen
        router.replace('/master-password-locked');
      }
    })();
  }, [router]);

  return (
    <Screen>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
        <View style={[styles.iconWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="key" size={32} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Master Password</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>
          One password to generate them all
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.feature}>
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Ionicons name="shield-checkmark" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>Super Strong Passwords</Text>
              <Text style={[styles.featureText, { color: colors.mutedText }]}>
                Generates unique, unbreakable passwords for each account
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Ionicons name="refresh" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>Always the Same</Text>
              <Text style={[styles.featureText, { color: colors.mutedText }]}>
                Same service + username = same password, every time
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Ionicons name="lock-closed" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>No Dictionary Attacks</Text>
              <Text style={[styles.featureText, { color: colors.mutedText }]}>
                Uses your personal info to create memorable but secure passwords
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.howCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Text style={[styles.howTitle, { color: colors.text }]}>How it works</Text>
          <Text style={[styles.howText, { color: colors.mutedText }]}>
            1. Set your master password once{'\n'}
            2. When creating passwords, VaultX combines:{'\n'}
            {'   '}• Service name (e.g., Gmail){'\n'}
            {'   '}• Your username/email{'\n'}
            {'   '}• Your master password{'\n'}
            3. Generates a unique, strong password{'\n'}
            4. Same inputs = same password, always
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/master-password-setup')}
        >
          <Text style={styles.buttonText}>Set Master Password</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.skipBtn}>
          <Text style={[styles.skipText, { color: colors.mutedText }]}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center', paddingBottom: 40 },
  iconWrap: { 
    width: 72, 
    height: 72, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1, 
    marginBottom: 20,
    marginTop: 20,
  },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: '600', marginBottom: 32, textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: 20, width: '100%', marginBottom: 20 },
  feature: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  badge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  featureText: { fontSize: 14, lineHeight: 20 },
  howCard: { borderWidth: 1, borderRadius: 12, padding: 16, width: '100%', marginBottom: 24 },
  howTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase' },
  howText: { fontSize: 14, lineHeight: 22 },
  button: { width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  skipBtn: { paddingVertical: 12 },
  skipText: { fontSize: 14, fontWeight: '700' },
});
