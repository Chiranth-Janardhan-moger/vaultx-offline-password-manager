import Screen from '@/components/Screen';
import { useTheme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const MASTER_PASSWORD_KEY = 'master_password_v1';

export default function MasterPasswordSetup() {
  const router = useRouter();
  const { colors } = useTheme();

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [birthYear, setBirthYear] = React.useState('');
  const [favoriteColor, setFavoriteColor] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const existing = await SecureStore.getItemAsync(MASTER_PASSWORD_KEY);
      if (existing) {
        // Master password already exists, go to locked screen
        router.replace('/master-password-locked');
      }
    })();
  }, [router]);

  const handleSave = React.useCallback(async () => {
    if (!firstName.trim()) return Alert.alert('First name is required');
    if (!lastName.trim()) return Alert.alert('Last name is required');
    if (!birthYear.trim() || birthYear.length !== 4) return Alert.alert('Enter valid birth year (4 digits)');
    if (!favoriteColor.trim()) return Alert.alert('Favorite color is required');

    setLoading(true);
    try {
      // Double check it doesn't exist
      const existing = await SecureStore.getItemAsync(MASTER_PASSWORD_KEY);
      if (existing) {
        router.replace('/master-password-locked');
        return;
      }

      const masterPassword = `${firstName.trim().replace(/\s+/g, '').toLowerCase()}${lastName.trim().replace(/\s+/g, '').toLowerCase()}${birthYear}${favoriteColor.trim().replace(/\s+/g, '').toLowerCase()}`;
      await SecureStore.setItemAsync(MASTER_PASSWORD_KEY, masterPassword);
      Alert.alert('Success', 'Master password created!', [
        { text: 'OK', onPress: () => router.replace('/master-password-locked') }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save');
    } finally {
      setLoading(false);
    }
  }, [firstName, lastName, birthYear, favoriteColor, router]);

  const inputStyle = [styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }];

  return (
    <Screen>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Master Password</Text>
          <View style={styles.NoiconBtn} />
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.mutedText }]}>
            This info creates your master password. Keep it memorable!
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedText }]}>First Name</Text>
          <TextInput
            style={inputStyle}
            placeholder="e.g. John"
            placeholderTextColor={colors.mutedText}
            value={firstName}
            onChangeText={(text) => setFirstName(text.replace(/\s+/g, ''))}
            autoCapitalize="words"
          />

          <Text style={[styles.label, { color: colors.mutedText }]}>Last Name</Text>
          <TextInput
            style={inputStyle}
            placeholder="e.g. Doe"
            placeholderTextColor={colors.mutedText}
            value={lastName}
            onChangeText={(text) => setLastName(text.replace(/\s+/g, ''))}
            autoCapitalize="words"
          />

          <Text style={[styles.label, { color: colors.mutedText }]}>Birth Year</Text>
          <TextInput
            style={inputStyle}
            placeholder="e.g. 1990"
            placeholderTextColor={colors.mutedText}
            keyboardType="number-pad"
            maxLength={4}
            value={birthYear}
            onChangeText={(t) => setBirthYear(t.replace(/[^0-9]/g, ''))}
          />

          <Text style={[styles.label, { color: colors.mutedText }]}>Favorite Color</Text>
          <TextInput
            style={inputStyle}
            placeholder="e.g. Blue"
            placeholderTextColor={colors.mutedText}
            value={favoriteColor}
            onChangeText={(text) => setFavoriteColor(text.replace(/\s+/g, ''))}
            autoCapitalize="words"
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Master Password'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '900' },
    NoiconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  infoCard: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16, alignItems: 'center' },
  infoText: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  label: { fontSize: 12, fontWeight: '800', marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, padding: 12, borderRadius: 12, fontSize: 15 },
  button: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 14 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
