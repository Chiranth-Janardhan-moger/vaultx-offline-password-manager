import Screen from '@/components/Screen';
import { useTheme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MASTER_PASSWORD_KEY = 'master_password_v1';

export default function ViewMasterPassword() {
  const router = useRouter();
  const { colors } = useTheme();
  const [masterPassword, setMasterPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const mp = await SecureStore.getItemAsync(MASTER_PASSWORD_KEY);
      if (mp) {
        setMasterPassword(mp);
      }
    })();
  }, []);

  return (
    <Screen>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Master Password</Text>
          <View style={styles.NoiconBtn} />
        </View>

        <View style={[styles.lockIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="lock-closed" size={32} color={colors.primary} />
        </View>

        <View style={[styles.warningCard, { backgroundColor: '#fef3c7', borderColor: '#fbbf24' }]}>
          <Ionicons name="warning" size={24} color="#f59e0b" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.warningTitle, { color: '#92400e' }]}>Cannot be changed!</Text>
            <Text style={[styles.warningText, { color: '#92400e' }]}>
              These details are part of your password identity. Even a small change will generate completely new passwords.
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.mutedText }]}>
              Editing is disabled to protect you from accidental lock-out
            </Text>
          </View>
        </View>

        <View style={[styles.passwordCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.passwordHeader}>
            <Text style={[styles.label, { color: colors.mutedText }]}>Your Master Password</Text>
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons 
                name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                size={22} 
                color={colors.primary} 
              />
            </TouchableOpacity>
          </View>
          <View style={[styles.passwordBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Text style={[styles.passwordText, { color: colors.text }]} selectable>
              {showPassword ? masterPassword : '●'.repeat(masterPassword.length)}
            </Text>
          </View>
          <Text style={[styles.hint, { color: colors.mutedText }]}>
            This is generated from your personal info (name, birth year, favorite color)
          </Text>
        </View>

        <View style={[styles.resetCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Ionicons name="refresh-circle" size={24} color="#ef4444" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.resetTitle, { color: colors.text }]}>Want to change it?</Text>
            <Text style={[styles.resetText, { color: colors.mutedText }]}>
              You must reinstall the app without exporting. This will delete all your data and start fresh.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Got it</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
    NoiconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '900' },
  lockIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    alignSelf: 'center',
    marginBottom: 24,
  },
  warningCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  warningTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  warningText: { fontSize: 13, lineHeight: 18 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  infoRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  infoText: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },
  passwordCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  passwordBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  passwordText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  hint: { fontSize: 12, lineHeight: 16 },
  resetCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  resetTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  resetText: { fontSize: 13, lineHeight: 18 },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
