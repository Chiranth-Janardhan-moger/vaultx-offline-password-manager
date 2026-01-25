import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { savePinWrap, unwrapWithPassword } from '@/lib/secure';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ChangeVPin() {
  const router = useRouter();
  const { colors } = useTheme();
  const { unlocked } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPin, setNewPin] = React.useState('');
  const [confirmPin, setConfirmPin] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const [newPinFocused, setNewPinFocused] = React.useState(false);
  const [confirmPinFocused, setConfirmPinFocused] = React.useState(false);
  const newPinRef = React.useRef<TextInput>(null);
  const confirmPinRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    if (!unlocked) router.replace('/login');
  }, [unlocked, router]);

  const handleChangePin = async () => {
    if (!currentPassword) {
      showAlert({
        title: 'Password Required',
        message: 'Enter your current password to verify',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    if (!/^\d{6}$/.test(newPin)) {
      showAlert({
        title: 'Invalid VPin',
        message: 'VPin must be exactly 6 digits',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    if (newPin !== confirmPin) {
      showAlert({
        title: 'VPins Don\'t Match',
        message: 'Please make sure both VPins match',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    setLoading(true);
    try {
      // Verify current password and get vault key
      const vaultKey = await unwrapWithPassword(currentPassword);
      
      // Save new PIN wrap
      await savePinWrap(vaultKey, newPin);
      
      showAlert({
        title: 'Success',
        message: 'Your VPin has been changed successfully',
        confirmText: 'OK',
        onConfirm: () => router.back(),
      });
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Incorrect password or failed to change VPin',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } finally {
      setLoading(false);
    }
  };

  const newPinDigits = newPin.split('');
  while (newPinDigits.length < 6) newPinDigits.push('');

  const confirmPinDigits = confirmPin.split('');
  while (confirmPinDigits.length < 6) confirmPinDigits.push('');

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Change VPin</Text>
          <View style={styles.NoiconBtn} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedText }]}>Current Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter current password"
              placeholderTextColor={colors.mutedText}
              secureTextEntry={!showPassword}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.mutedText }]}>New VPin</Text>
          <TouchableOpacity 
            style={styles.pinBoxes}
            onPress={() => newPinRef.current?.focus()}
            activeOpacity={1}
          >
            {newPinDigits.map((digit, idx) => {
              const isFilled = digit !== '';
              const isCurrentBox = newPinFocused && idx === newPin.length;
              
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
            ref={newPinRef}
            style={styles.hiddenInput}
            value={newPin}
            onChangeText={setNewPin}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="off"
            textContentType="none"
            secureTextEntry={false}
            caretHidden
            onFocus={() => setNewPinFocused(true)}
            onBlur={() => setNewPinFocused(false)}
          />

          <Text style={[styles.label, { color: colors.mutedText }]}>Confirm New VPin</Text>
          <TouchableOpacity 
            style={styles.pinBoxes}
            onPress={() => confirmPinRef.current?.focus()}
            activeOpacity={1}
          >
            {confirmPinDigits.map((digit, idx) => {
              const isFilled = digit !== '';
              const isCurrentBox = confirmPinFocused && idx === confirmPin.length;
              
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
            ref={confirmPinRef}
            style={styles.hiddenInput}
            value={confirmPin}
            onChangeText={setConfirmPin}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="off"
            textContentType="none"
            secureTextEntry={false}
            caretHidden
            onFocus={() => setConfirmPinFocused(true)}
            onBlur={() => setConfirmPinFocused(false)}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={handleChangePin}
          >
            <Text style={styles.buttonText}>{loading ? 'Changing...' : 'Change VPin'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <AlertComponent />
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
  input: { borderWidth: 1, padding: 12, borderRadius: 12, fontSize: 15 },
  inputWrap: { position: 'relative', marginBottom: 8 },
  eyeBtn: { position: 'absolute', right: 2, top: 0, height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  pinBoxes: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pinBox: { width: 48, height: 56, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pinDigit: { fontSize: 32, fontWeight: '900' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1, top: 0, left: 0 },
  button: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
