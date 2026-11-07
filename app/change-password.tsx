import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { loadMeta, saveMeta, savePasswordWrap, unwrapWithPassword } from '@/lib/secure';
import { decryptVaultWithKey, generateSaltHex, hashPasswordAsync, saveVault } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ChangePassword() {
  const router = useRouter();
  const { colors } = useTheme();
  const { unlocked } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!unlocked) router.replace('/login');
  }, [unlocked, router]);

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      showAlert({
        title: 'Current Password Required',
        message: 'Please enter your current master password',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    if (newPassword.length < 8) {
      showAlert({
        title: 'Password Too Short',
        message: 'New password must be at least 8 characters',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert({
        title: 'Passwords Don\'t Match',
        message: 'New password and confirmation do not match',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    setLoading(true);
    try {
      // Verify current password and get vault key
      const vaultKey = await unwrapWithPassword(currentPassword.trim());
      
      // Get current vault
      const vault = await decryptVaultWithKey(vaultKey);
      
      // Update password hash and salt in vault
      const newSaltHex = generateSaltHex();
      vault.user.passwordSaltHex = newSaltHex;
      vault.user.passwordHash = await hashPasswordAsync(newPassword, newSaltHex);
      
      // Save vault with updated password hash
      await saveVault(vault, vaultKey);
      
      // Save new password wrap
      await savePasswordWrap(vaultKey, newPassword);

      const meta = await loadMeta();
      if (meta) {
        meta.passwordSaltHex = newSaltHex;
        meta.passwordHash = vault.user.passwordHash;
        await saveMeta(meta);
      }
      
      showAlert({
        title: 'Success',
        message: 'Your master password has been changed successfully',
        confirmText: 'OK',
        onConfirm: () => router.back(),
      });
    } catch {
      showAlert({
        title: 'Error',
        message: 'Incorrect current password or failed to change password',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }];

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Change Master Password</Text>
          <View style={styles.noIconBtn} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedText }]}>Current Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[...inputStyle, { paddingRight: 44 }]}
              placeholder="Enter current password"
              placeholderTextColor={colors.mutedText}
              secureTextEntry={!showCurrent}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
              <Ionicons name={showCurrent ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.mutedText }]}>New Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[...inputStyle, { paddingRight: 44 }]}
              placeholder="Enter new password (min 8 chars)"
              placeholderTextColor={colors.mutedText}
              secureTextEntry={!showNew}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
              <Ionicons name={showNew ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.mutedText }]}>Confirm New Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[...inputStyle, { paddingRight: 44 }]}
              placeholder="Confirm new password"
              placeholderTextColor={colors.mutedText}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
              <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={handleChangePassword}
          >
            <Text style={styles.buttonText}>{loading ? 'Changing...' : 'Update Password'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  noIconBtn: { width: 40, height: 40 },
  title: { fontSize: 20, fontWeight: '900' },
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, padding: 12, borderRadius: 12, fontSize: 15 },
  inputWrap: { position: 'relative', marginBottom: 6 },
  eyeBtn: { position: 'absolute', right: 2, top: 0, height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  button: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
