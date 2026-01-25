import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { categorizeService } from '@/lib/categories';
import { checkPasswordStrength, getStrengthLabel } from '@/lib/password-strength';
import { normalizeServiceName } from '@/lib/service-icons';
import { PasswordItem, saveVault } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function EditPassword() {
  const router = useRouter();
  const { index } = useLocalSearchParams<{ index: string }>();
  const { vault, vaultKey, setVault } = useSession();
  const { colors } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  const passwordIndex = parseInt(index || '0', 10);
  const existingPassword = vault?.passwords[passwordIndex];

  const [service, setService] = React.useState(existingPassword?.service || '');
  const [username, setUsername] = React.useState(existingPassword?.username || '');
  const [pw, setPw] = React.useState(existingPassword?.password || '');
  const [showPw, setShowPw] = React.useState(false);
  const [notes, setNotes] = React.useState(existingPassword?.notes || '');
  const [loginPin, setLoginPin] = React.useState(existingPassword?.loginPin || '');
  const [showLoginPin, setShowLoginPin] = React.useState(false);
  const [transactionPin, setTransactionPin] = React.useState(existingPassword?.transactionPin || '');
  const [showTransactionPin, setShowTransactionPin] = React.useState(false);
  const [otherPins, setOtherPins] = React.useState<Array<{label: string; pin: string; show: boolean}>>([]);
  const [showPinSection, setShowPinSection] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Password strength check
  const passwordStrength = React.useMemo(() => {
    if (!pw) return null;
    return checkPasswordStrength(pw);
  }, [pw]);

  // Show normalized service name suggestion
  const normalizedSuggestion = React.useMemo(() => {
    if (!service.trim() || service.length < 2) return null;
    const normalized = normalizeServiceName(service);
    if (normalized.toLowerCase() === service.toLowerCase()) return null;
    return normalized;
  }, [service]);

  React.useEffect(() => {
    if (existingPassword?.otherPin) {
      try {
        const parsed = JSON.parse(existingPassword.otherPin) as Array<{label: string; pin: string}>;
        setOtherPins(parsed.map(p => ({ ...p, show: false })));
      } catch {}
    }
    if (existingPassword?.loginPin || existingPassword?.transactionPin || existingPassword?.otherPin) {
      setShowPinSection(true);
    }
  }, [existingPassword]);

  const addOtherPin = () => {
    setOtherPins([...otherPins, { label: '', pin: '', show: false }]);
  };

  const removeOtherPin = (idx: number) => {
    setOtherPins(otherPins.filter((_, i) => i !== idx));
  };

  const updateOtherPinLabel = (idx: number, label: string) => {
    const updated = [...otherPins];
    updated[idx].label = label;
    setOtherPins(updated);
  };

  const updateOtherPinValue = (idx: number, pin: string) => {
    const updated = [...otherPins];
    updated[idx].pin = pin;
    setOtherPins(updated);
  };

  const toggleOtherPinVisibility = (idx: number) => {
    const updated = [...otherPins];
    updated[idx].show = !updated[idx].show;
    setOtherPins(updated);
  };

  const handleSave = async () => {
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
    if (!username.trim()) {
      showAlert({
        title: 'Required',
        message: 'Username is required',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    const hasAnyPin = loginPin || transactionPin || otherPins.some(p => p.pin);
    if (!pw && !hasAnyPin) {
      showAlert({
        title: 'Required',
        message: 'Password or at least one PIN is required',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    setLoading(true);
    try {
      const validOtherPins = otherPins.filter(p => p.label && p.pin);
      const item: PasswordItem = {
        service: service.trim(),
        username: username.trim(),
        password: pw,
        notes: notes || undefined,
        category: categorizeService(service.trim()),
        loginPin: loginPin || undefined,
        transactionPin: transactionPin || undefined,
        otherPin: validOtherPins.length > 0 ? JSON.stringify(validOtherPins.map(p => ({ label: p.label, pin: p.pin }))) : undefined,
        createdAt: existingPassword?.createdAt || Date.now(),
        modifiedAt: Date.now(),
      };

      const updatedPasswords = [...vault.passwords];
      updatedPasswords[passwordIndex] = item;

      const next = { ...vault, passwords: updatedPasswords };
      await saveVault(next, vaultKey);
      setVault(() => next);
      showAlert({
        title: 'Success',
        message: 'Password updated!',
        confirmText: 'OK',
        onConfirm: () => router.back(),
      });
    } catch (e: any) {
      showAlert({
        title: 'Error',
        message: e?.message ?? 'Failed to update',
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
      <ScrollView 
        style={{ flex: 1, backgroundColor: colors.background }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        bounces={true}
        alwaysBounceVertical={true}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Edit Password</Text>
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
          {normalizedSuggestion ? (
            <TouchableOpacity 
              style={[styles.suggestionChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
              onPress={() => setService(normalizedSuggestion)}
            >
              <Ionicons name="sparkles" size={14} color={colors.primary} />
              <Text style={[styles.suggestionText, { color: colors.primary }]}>
                Use "{normalizedSuggestion}" instead?
              </Text>
            </TouchableOpacity>
          ) : null}

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

          <Text style={[styles.label, { color: colors.mutedText }]}>Password {loginPin || transactionPin || otherPins.length > 0 ? '(Optional if PINs provided)' : ''}</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[...inputStyle, { paddingRight: 44 }]}
              placeholder={loginPin || transactionPin || otherPins.length > 0 ? "Optional" : "Enter password"}
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
            <TouchableOpacity onPress={() => setShowPw((v) => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPw ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
            </TouchableOpacity>
          </View>
          
          {passwordStrength && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                <View 
                  style={[
                    styles.strengthBarFill, 
                    { 
                      width: `${passwordStrength.score}%`, 
                      backgroundColor: passwordStrength.color 
                    }
                  ]} 
                />
              </View>
              <View style={styles.strengthInfo}>
                <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                  {getStrengthLabel(passwordStrength.strength)}
                </Text>
                <Text style={[styles.strengthFeedback, { color: colors.mutedText }]}>
                  {passwordStrength.feedback}
                </Text>
              </View>
            </View>
          )}

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

          {/* PIN Section Toggle */}
          <TouchableOpacity
            style={[styles.pinToggle, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => setShowPinSection(!showPinSection)}
          >
            <Ionicons name="keypad" size={18} color={colors.primary} />
            <Text style={[styles.pinToggleText, { color: colors.text }]}>
              {showPinSection ? 'Hide' : 'Add'} PINs (Banking/UPI)
            </Text>
            <Ionicons name={showPinSection ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedText} />
          </TouchableOpacity>

          {showPinSection ? (
            <View style={styles.pinSection}>
              <Text style={[styles.label, { color: colors.mutedText }]}>Login PIN</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[...inputStyle, { paddingRight: 44 }]}
                  placeholder="Optional"
                  placeholderTextColor={colors.mutedText}
                  secureTextEntry={!showLoginPin}
                  keyboardType="numeric"
                  value={loginPin}
                  onChangeText={setLoginPin}
                />
                <TouchableOpacity onPress={() => setShowLoginPin(!showLoginPin)} style={styles.eyeBtn}>
                  <Ionicons name={showLoginPin ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: colors.mutedText }]}>Transaction PIN</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[...inputStyle, { paddingRight: 44 }]}
                  placeholder="Optional"
                  placeholderTextColor={colors.mutedText}
                  secureTextEntry={!showTransactionPin}
                  keyboardType="numeric"
                  value={transactionPin}
                  onChangeText={setTransactionPin}
                />
                <TouchableOpacity onPress={() => setShowTransactionPin(!showTransactionPin)} style={styles.eyeBtn}>
                  <Ionicons name={showTransactionPin ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
                </TouchableOpacity>
              </View>

              {otherPins.map((pin, idx) => (
                <View key={idx} style={styles.otherPinRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.mutedText }]}>PIN Label</Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="e.g. MPIN, ATM PIN"
                      placeholderTextColor={colors.mutedText}
                      value={pin.label}
                      onChangeText={(text) => updateOtherPinLabel(idx, text)}
                    />
                    <Text style={[styles.label, { color: colors.mutedText }]}>PIN Value</Text>
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={[...inputStyle, { paddingRight: 44 }]}
                        placeholder="Enter PIN"
                        placeholderTextColor={colors.mutedText}
                        secureTextEntry={!pin.show}
                        keyboardType="numeric"
                        value={pin.pin}
                        onChangeText={(text) => updateOtherPinValue(idx, text)}
                      />
                      <TouchableOpacity onPress={() => toggleOtherPinVisibility(idx)} style={styles.eyeBtn}>
                        <Ionicons name={pin.show ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.removeBtn, { backgroundColor: '#ef4444' }]}
                    onPress={() => removeOtherPin(idx)}
                  >
                    <Ionicons name="trash" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.addPinBtn, { borderColor: colors.primary }]}
                onPress={addOtherPin}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.addPinText, { color: colors.primary }]}>Add Another PIN</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
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
  NoiconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderColor: 'transparent' },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  label: { fontSize: 12, fontWeight: '800', marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, padding: 12, borderRadius: 12, fontSize: 15 },
  inputWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 12, top: 12 },
  button: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 14 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  pinToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  pinToggleText: { flex: 1, fontSize: 14, fontWeight: '700' },
  pinSection: { marginTop: 12 },
  otherPinRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  removeBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  addPinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', marginTop: 12 },
  addPinText: { fontSize: 14, fontWeight: '700' },
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
  strengthContainer: {
    marginTop: 8,
    gap: 6,
  },
  strengthBar: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  strengthFeedback: {
    fontSize: 11,
    fontWeight: '600',
  },
});
