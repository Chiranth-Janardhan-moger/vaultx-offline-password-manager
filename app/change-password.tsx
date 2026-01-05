import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { savePasswordWrap, unwrapWithPin } from '@/lib/secure';
import { decryptVaultWithKey, hashPassword, saveVault } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ChangePassword() {
  const router = useRouter();
  const { colors } = useTheme();
  const { unlocked } = useSession();

  const [currentPin, setCurrentPin] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const [pinFocused, setPinFocused] = React.useState(false);
  const pinRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    if (!unlocked) router.replace('/login');
  }, [unlocked, router]);

  const handleChangePassword = async () => {
    if (!/^\d{6}$/.test(currentPin)) {
      Alert.alert('Invalid VPin', 'VPin must be exactly 6 digits');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Password Too Short', 'Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Don\'t Match', 'Please make sure both passwords match');
      return;
    }

    setLoading(true);
    try {
      // Verify current PIN and get vault key
      const vaultKey = await unwrapWithPin(currentPin);
      
      // Get current vault
      const vault = await decryptVaultWithKey(vaultKey);
      
      // Update password hash in vault
      vault.user.passwordHash = hashPassword(newPassword);
      
      // Save vault with updated password hash
      await saveVault(vault, vaultKey);
      
      // Save new password wrap
      await savePasswordWrap(vaultKey, newPassword);
      
      Alert.alert('Success', 'Your password has been changed successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Incorrect VPin or failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const pinDigits = currentPin.split('');
  while (pinDigits.length < 6) pinDigits.push('');

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Change Password</Text>
          <View style={styles.NoiconBtn} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedText }]}>Current VPin</Text>
          <TouchableOpacity 
            style={styles.pinBoxes}
            onPress={() => pinRef.current?.focus()}
            activeOpacity={1}
          >
            {pinDigits.map((digit, idx) => {
              const isFilled = digit !== '';
              const isCurrentBox = pinFocused && idx === currentPin.length;
              
              return (
                <View
                  key={idx}
                  style={[
                    styles.pinBox,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isFilled && { borderColor: colors.primary, borderWidth: 2 },
                    isCurrentBox && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                >
                  <Text style={[styles.pinDigit, { color: colors.text }]}>
                    {isFilled ? '●' : ''}
                  </Text>
                </View>
              );
            })}
          </TouchableOpacity>
          <TextInput
            ref={pinRef}
            style={styles.hiddenInput}
            value={currentPin}
            onChangeText={setCurrentPin}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="off"
            textContentType="none"
            secureTextEntry={false}
            caretHidden
            autoFocus={true}
            onFocus={() => setPinFocused(true)}
            onBlur={() => setPinFocused(false)}
          />

          <Text style={[styles.label, { color: colors.mutedText }]}>New Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter new password (min 8 chars)"
              placeholderTextColor={colors.mutedText}
              secureTextEntry={!showPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.mutedText }]}>Confirm New Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="Confirm new password"
            placeholderTextColor={colors.mutedText}
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={handleChangePassword}
          >
            <Text style={styles.buttonText}>{loading ? 'Changing...' : 'Change Password'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    NoiconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900' },
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  label: { fontSize: 12, fontWeight: '800', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, padding: 12, borderRadius: 12, fontSize: 15, marginBottom: 12 },
  inputWrap: { position: 'relative', marginBottom: 8 },
  eyeBtn: { position: 'absolute', right: 2, top: 0, height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  pinBoxes: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pinBox: { width: 48, height: 56, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pinDigit: { fontSize: 32, fontWeight: '900' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1, top: 0, left: 0 },
  button: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
