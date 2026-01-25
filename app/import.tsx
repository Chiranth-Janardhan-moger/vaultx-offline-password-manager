import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import CryptoJS from 'crypto-js';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const MASTER_PASSWORD_KEY = 'master_password_v1';

export default function ImportScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { unlocked, vaultKey, setVault } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [backupFile, setBackupFile] = React.useState<string | null>(null);
  const [backupPassword, setBackupPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const pickFile = React.useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      
      const file = result.assets[0];
      
      // Validate file extension
      if (!file.name.toLowerCase().endsWith('.vxb')) {
        showAlert({
          title: 'Invalid File',
          message: 'Please select a VaultX backup file (.vxb)',
          confirmText: 'OK',
          onConfirm: () => {},
        });
        return;
      }
      
      setBackupFile(file.uri);
      showAlert({
        title: 'File Selected',
        message: file.name,
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } catch (e: any) {
      showAlert({
        title: 'Error',
        message: e?.message ?? 'Failed to pick file',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    }
  }, []);

  const handleImport = React.useCallback(async () => {
    if (!backupFile) {
      showAlert({
        title: 'No File Selected',
        message: 'Please select a backup file first',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    if (!backupPassword) {
      showAlert({
        title: 'Password Required',
        message: 'Enter your backup password',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    setBusy(true);
    try {
      // Read backup file
      const content = await FileSystem.readAsStringAsync(backupFile);
      const backup = JSON.parse(content);

      if (!backup.version) {
        showAlert({
          title: 'Invalid Backup',
          message: 'This file is not a valid VaultX backup',
          confirmText: 'OK',
          onConfirm: () => {},
        });
        return;
      }

      // Handle different backup versions
      let passwordsToRestore = [];
      
      if (backup.version === '2.0') {
        // New format: passwords only
        if (!backup.passwords) {
          showAlert({
            title: 'Invalid Backup',
            message: 'No passwords found in backup',
            confirmText: 'OK',
            onConfirm: () => {},
          });
          return;
        }
        
        try {
          const decryptedPasswords = CryptoJS.AES.decrypt(backup.passwords, backupPassword).toString(CryptoJS.enc.Utf8);
          if (!decryptedPasswords) {
            showAlert({
              title: 'Incorrect Password',
              message: 'The backup password you entered is incorrect',
              confirmText: 'OK',
              onConfirm: () => {},
            });
            return;
          }
          const passwordsData = JSON.parse(decryptedPasswords);
          passwordsToRestore = passwordsData.passwords || [];
        } catch {
          showAlert({
            title: 'Incorrect Password',
            message: 'The backup password you entered is incorrect',
            confirmText: 'OK',
            onConfirm: () => {},
          });
          return;
        }
      } else {
        // Old format: full vault (for backward compatibility)
        showAlert({
          title: 'Old Backup Format',
          message: 'This backup format is no longer supported. Please create a new backup.',
          confirmText: 'OK',
          onConfirm: () => {},
        });
        return;
      }

      // Get current vault and merge passwords
      if (!unlocked || !vaultKey) {
        showAlert({
          title: 'Error',
          message: 'Not logged in. Please unlock your vault first.',
          confirmText: 'OK',
          onConfirm: () => {},
        });
        router.replace('/login');
        return;
      }

      const { decryptVaultWithKey, saveVault } = await import('@/lib/vault');
      const currentVault = await decryptVaultWithKey(vaultKey);
      
      // Replace passwords with backup
      currentVault.passwords = passwordsToRestore;
      
      // Save updated vault
      await saveVault(currentVault, vaultKey);
      
      // Update session
      setVault(() => currentVault);

      // Decrypt and save master password if present
      if (backup.encryptedMasterPassword) {
        try {
          const decryptedMP = CryptoJS.AES.decrypt(backup.encryptedMasterPassword, backupPassword).toString(CryptoJS.enc.Utf8);
          if (decryptedMP) {
            await SecureStore.setItemAsync(MASTER_PASSWORD_KEY, decryptedMP);
          }
        } catch {
          // Master password decryption failed, but passwords were restored
        }
      }

      showAlert({
        title: 'Restore Complete!',
        message: 'Your passwords have been restored successfully.',
        confirmText: 'OK',
        onConfirm: () => router.replace('/dashboard'),
      });
    } catch (e: any) {
      showAlert({
        title: 'Error',
        message: e?.message ?? 'Failed to import backup',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } finally {
      setBusy(false);
    }
  }, [backupFile, backupPassword, router, unlocked, vaultKey, setVault]);

  return (
    <Screen>
      <ScrollView 
        style={{ flex: 1, backgroundColor: colors.background }} 
        contentContainerStyle={styles.container}
        bounces={true}
        alwaysBounceVertical={true}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Import Backup</Text>
          <View style={styles.NoiconBtn} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Backup File</Text>
          
          <TouchableOpacity
            style={[styles.pickButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={pickFile}
          >
            <Ionicons name="document-outline" size={24} color={colors.text} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.pickText, { color: colors.text }]}>
                {backupFile ? 'File selected ✓' : 'Choose backup file'}
              </Text>
              <Text style={[styles.pickSubtext, { color: colors.mutedText }]}>
                Only .vxb files
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.label, { color: colors.mutedText }]}>Backup Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter backup password"
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

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, busy && { opacity: 0.6 }]}
            disabled={busy}
            onPress={handleImport}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>{busy ? 'Restoring...' : 'Restore Backup'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '900' },
    NoiconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
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
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  pickButton: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pickText: { fontSize: 15, fontWeight: '700' },
  pickSubtext: { fontSize: 12, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '800', marginBottom: 8 },
  hint: { fontSize: 11, fontWeight: '600', marginBottom: 12, marginTop: -8 },
  input: { borderWidth: 1, padding: 12, borderRadius: 12, fontSize: 15 },
  inputWrap: { position: 'relative', marginBottom: 16 },
  eyeBtn: { position: 'absolute', right: 2, top: 0, height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
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
