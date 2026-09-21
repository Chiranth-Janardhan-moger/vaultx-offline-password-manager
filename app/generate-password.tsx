import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { normalizeServiceName } from '@/lib/service-icons';
import { getRandomBytes } from '@/lib/crypto-shim';
import { PasswordItem, saveVault } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const generateSecurePassword = (length = 16): string => {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*';
  const randomBytes = getRandomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
};

export default function GeneratePassword() {
  const router = useRouter();
  const { unlocked, vault, vaultKey, setVault } = useSession();
  const { colors } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [service, setService] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [generatedPassword, setGeneratedPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // Show normalized service name suggestion
  const normalizedSuggestion = React.useMemo(() => {
    if (!service.trim() || service.length < 2) return null;
    const normalized = normalizeServiceName(service);
    if (normalized.toLowerCase() === service.toLowerCase()) return null;
    return normalized;
  }, [service]);

  React.useEffect(() => {
    if (!unlocked) router.replace('/login');
  }, [unlocked, router]);

  const handleGenerate = React.useCallback(() => {
    const password = generateSecurePassword(16);
    setGeneratedPassword(password);
  }, []);

  const handleSave = React.useCallback(async () => {
    if (loading) return;
    if (!vault || !vaultKey) return;
    if (!service.trim()) {
      showAlert({
        title: 'Required',
        message: 'Service name is required',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    if (!generatedPassword) {
      showAlert({
        title: 'Required',
        message: 'Generate a password first',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    setLoading(true);
    try {
      const item: PasswordItem = {
        service: service.trim(),
        username: username.trim(),
        password: generatedPassword,
        notes: notes || 'Generated password',
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };
      const next = { ...vault, passwords: [...vault.passwords, item] };
      await saveVault(next, vaultKey);
      setVault(() => next);
      showAlert({
        title: 'Success',
        message: 'Password saved!',
        confirmText: 'OK',
        onConfirm: () => router.replace('/dashboard'),
      });
    } catch (e: any) {
      showAlert({
        title: 'Error',
        message: e?.message ?? 'Failed to save',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } finally {
      setLoading(false);
    }
  }, [loading, vault, vaultKey, service, username, generatedPassword, notes, setVault, router, showAlert]);

  const copyPassword = React.useCallback(async () => {
    if (!generatedPassword) return;
    await Clipboard.setStringAsync(generatedPassword);
    showAlert({
      title: 'Copied',
      message: 'Password copied to clipboard',
      confirmText: 'OK',
      onConfirm: () => {},
    });
  }, [generatedPassword, showAlert]);

  const inputStyle = [styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }];

  return (
    <Screen>
      <ScrollView 
        style={{ flex: 1, backgroundColor: colors.background }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        bounces={true}
        alwaysBounceVertical={true}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Generate Password</Text>
          <View style={styles.NoiconBtn} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedText }]}>Website / App name</Text>
          <TextInput
            style={inputStyle}
            placeholder="e.g. Gmail"
            placeholderTextColor={colors.mutedText}
            value={service}
            onChangeText={setService}
          />
          {normalizedSuggestion ? (
            <TouchableOpacity 
              style={[styles.suggestionChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
              onPress={() => setService(normalizedSuggestion)}
            >
              <Ionicons name="sparkles" size={14} color={colors.primary} />
              <Text style={[styles.suggestionText, { color: colors.primary }]}>
                Use &quot;{normalizedSuggestion}&quot; instead?
              </Text>
            </TouchableOpacity>
          ) : null}

          <Text style={[styles.label, { color: colors.mutedText }]}>Username / Email / Phone</Text>
          <TextInput
            style={inputStyle}
            placeholder="e.g. you@email.com"
            placeholderTextColor={colors.mutedText}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: colors.primary }]}
            onPress={handleGenerate}
          >
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={styles.generateBtnText}>Generate Password</Text>
          </TouchableOpacity>

          {generatedPassword ? (
            <View style={[styles.passwordCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={[styles.passwordLabel, { color: colors.mutedText }]}>Generated Password</Text>
              <View style={styles.passwordRow}>
                <Text style={[styles.passwordText, { color: colors.text }]} selectable>{generatedPassword}</Text>
                <TouchableOpacity onPress={copyPassword}>
                  <Ionicons name="copy-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <Text style={[styles.label, { color: colors.mutedText }]}>Notes (Optional)</Text>
          <TextInput
            style={[...inputStyle, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Optional notes"
            placeholderTextColor={colors.mutedText}
            multiline
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, (!generatedPassword || loading) && { opacity: 0.6 }]}
            disabled={!generatedPassword || loading}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '900' },
  NoiconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center',borderColor: 'transparent'},
  warningCard: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 12, alignItems: 'center' },
  warningText: { fontSize: 14, fontWeight: '700', flex: 1 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  label: { fontSize: 12, fontWeight: '800', marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, padding: 12, borderRadius: 12, fontSize: 15 },
  generateBtn: { flexDirection: 'row', gap: 8, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  passwordCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 14 },
  passwordLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  passwordText: { fontSize: 16, fontWeight: '700', flex: 1, fontFamily: 'monospace' },
  button: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 14 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
