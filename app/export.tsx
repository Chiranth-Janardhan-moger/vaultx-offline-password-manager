import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import CryptoJS from 'crypto-js';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const MASTER_PASSWORD_KEY = 'master_password_v1';

export default function ExportScreen() {
  const router = useRouter();
  const { unlocked, vault, vaultKey } = useSession();
  const { colors } = useTheme();

  const [busy, setBusy] = React.useState(false);
  const [backupPassword, setBackupPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    if (!unlocked) router.replace('/login');
  }, [unlocked, router]);

  const ensureShare = async (path: string, mimeType?: string) => {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Saved', `File saved: ${path}`);
      return;
    }
    await Sharing.shareAsync(path, mimeType ? { mimeType } : undefined);
  };

  const exportEncrypted = React.useCallback(async () => {
    if (busy) return;
    
    // Validate backup password
    if (!backupPassword) {
      Alert.alert('Backup Password Required', 'Please enter a backup password to secure your export');
      return;
    }
    if (backupPassword.length < 6) {
      Alert.alert('Password Too Short', 'Backup password must be at least 6 characters');
      return;
    }
    if (backupPassword !== confirmPassword) {
      Alert.alert('Passwords Don\'t Match', 'Please make sure both passwords match');
      return;
    }
    
    setBusy(true);
    try {
      // Get vault key from session
      if (!unlocked || !vaultKey) {
        Alert.alert('Error', 'Not logged in. Please unlock your vault first.');
        router.replace('/login');
        return;
      }

      // Decrypt vault to get passwords only
      const { decryptVaultWithKey } = await import('@/lib/vault');
      const vaultData = await decryptVaultWithKey(vaultKey);
      
      // Get master password
      const masterPassword = await SecureStore.getItemAsync(MASTER_PASSWORD_KEY);
      
      // Encrypt master password with user's backup password
      const encryptedMasterPassword = masterPassword 
        ? CryptoJS.AES.encrypt(masterPassword, backupPassword).toString()
        : null;
      
      // Create backup with ONLY passwords (no phone, no password hash)
      const passwordsOnly = {
        passwords: vaultData.passwords,
      };
      
      // Encrypt the passwords with backup password
      const encryptedPasswords = CryptoJS.AES.encrypt(JSON.stringify(passwordsOnly), backupPassword).toString();
      
      // Create complete backup
      const completeBackup = {
        passwords: encryptedPasswords,
        encryptedMasterPassword,
        version: '2.0', // New version for passwords-only backup
        timestamp: Date.now(),
      };
      
      const base = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filePath = `${base}vaultx-backup-${timestamp}.vxb`;
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(completeBackup));
      await ensureShare(filePath, 'application/json');
      
      Alert.alert(
        'Backup Complete!',
        'Your passwords have been backed up. Remember your backup password - you\'ll need it to restore!',
        [{ text: 'OK' }]
      );
      
      // Clear passwords
      setBackupPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to export backup');
    } finally {
      setBusy(false);
    }
  }, [busy, backupPassword, confirmPassword, vaultKey, unlocked, router]);

  return (
    <Screen>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Export Backup</Text>
          <View style={styles.NoiconBtn} />
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Secure Backup</Text>
            <Text style={[styles.infoText, { color: colors.mutedText }]}>
              Create a backup password to encrypt your master password. You'll need this password to restore.
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedText }]}>Backup Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Create backup password (min 6 chars)"
              placeholderTextColor={colors.mutedText}
              secureTextEntry={!showPassword}
              value={backupPassword}
              onChangeText={setBackupPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: colors.mutedText }]}>Backup password is case-sensitive</Text>

          <Text style={[styles.label, { color: colors.mutedText }]}>Confirm Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="Confirm backup password"
            placeholderTextColor={colors.mutedText}
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
          />

          <View style={[styles.featureList, { borderColor: colors.border }]}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
              <Text style={[styles.featureText, { color: colors.mutedText }]}>
                All passwords backed up
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
              <Text style={[styles.featureText, { color: colors.mutedText }]}>
                Master password encrypted
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
              <Text style={[styles.featureText, { color: colors.mutedText }]}>
                Restore on any device
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }, busy && { opacity: 0.6 }]} 
            disabled={busy} 
            onPress={exportEncrypted}
          >
            <Ionicons name="download-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>{busy ? 'Creating Backup...' : 'Create Backup'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  NoiconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900' },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  infoTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  infoText: { fontSize: 13, lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  label: { fontSize: 12, fontWeight: '800', marginBottom: 8, marginTop: 8 },
  hint: { fontSize: 11, fontWeight: '600', marginBottom: 12, marginTop: -4 },
  input: { borderWidth: 1, padding: 12, borderRadius: 12, fontSize: 15, marginBottom: 12 },
  inputWrap: { position: 'relative', marginBottom: 12 },
  eyeBtn: { position: 'absolute', right: 2, top: 0, height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  featureList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginVertical: 16,
    gap: 10,
  },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, fontWeight: '600' },
  button: { 
    flexDirection: 'row',
    gap: 8,
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
