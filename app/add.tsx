import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { categorizeService } from '@/lib/categories';
import { PasswordItem, saveVault } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function AddPassword() {
  const router = useRouter();
  const { unlocked, vault, vaultKey, setVault } = useSession();
  const { colors } = useTheme();

  const [service, setService] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!unlocked) router.replace('/login');
  }, [unlocked, router]);

  const onSave = React.useCallback(async () => {
    if (loading) return;
    if (!vault || !vaultKey) return;
    if (!service.trim()) return Alert.alert('Service is required');
    if (!username.trim()) return Alert.alert('Username/Email is required');
    if (!pw) return Alert.alert('Password is required');

    setLoading(true);
    try {
      // Auto-categorize based on service name
      const category = categorizeService(service);
      const item: PasswordItem = { 
        service: service.trim(), 
        username: username.trim(), 
        password: pw, 
        notes,
        category 
      };
      const next = { ...vault, passwords: [...vault.passwords, item] };
      await saveVault(next, vaultKey);
      setVault(() => next);
      router.replace('/dashboard');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save');
    } finally {
      setLoading(false);
    }
  }, [loading, vault, vaultKey, service, username, pw, notes, setVault, router]);

  const inputStyle = [styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }];

  return (
    <Screen>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Add Password</Text>
          <View style={styles.NoiconBtn} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedText }]}>Website / App name</Text>
          <TextInput
            style={inputStyle}
            placeholder="e.g. Google"
            placeholderTextColor={colors.mutedText}
            value={service}
            onChangeText={setService}
          />

          <Text style={[styles.label, { color: colors.mutedText }]}>Username / Email</Text>
          <TextInput
            style={inputStyle}
            placeholder="e.g. you@email.com"
            placeholderTextColor={colors.mutedText}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            autoCorrect={false}
          />

          <Text style={[styles.label, { color: colors.mutedText }]}>Password</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[...inputStyle, { paddingRight: 44 }]}
              placeholder="Enter password"
              placeholderTextColor={colors.mutedText}
              secureTextEntry={!showPw}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              autoCapitalize="none"
              autoCorrect={false}
              value={pw}
              onChangeText={setPw}
            />
            <TouchableOpacity
              onPress={() => setShowPw((v) => !v)}
              style={styles.eyeBtn}
              accessibilityRole="button"
              accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
            >
              <Ionicons name={showPw ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.mutedText }]}>Notes</Text>
          <TextInput
            style={[...inputStyle, { height: 110, textAlignVertical: 'top' }]}
            placeholder="Optional"
            placeholderTextColor={colors.mutedText}
            multiline
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            value={notes}
            onChangeText={setNotes}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={onSave}
          >
            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  NoiconBtn: { width: 40, height: 40 ,borderColor: 'transparent'},
  iconBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '900' },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  label: { fontSize: 12, fontWeight: '800', marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, padding: 12, borderRadius: 12, fontSize: 15 },
  inputWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 2, top: 0, bottom: 0, height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  button: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 14 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
