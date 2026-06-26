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

export default function AddPassword() {
  const router = useRouter();
  const { unlocked, vault, vaultKey, setVault } = useSession();
  const { colors } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();
  const params = useLocalSearchParams();

  const [service, setService] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [loginPin, setLoginPin] = React.useState('');
  const [showLoginPin, setShowLoginPin] = React.useState(false);
  const [transactionPin, setTransactionPin] = React.useState('');
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
    // Only show if it's different from what user typed
    if (normalized.toLowerCase() === service.toLowerCase()) return null;
    return normalized;
  }, [service]);

  // Handle deep link with password from clipboard
  React.useEffect(() => {
    if (params.password && typeof params.password === 'string') {
      setPw(decodeURIComponent(params.password));
      setShowPw(true); // Show password so user can verify
    }
  }, [params.password]);

  const addOtherPin = () => {
    setOtherPins([...otherPins, { label: '', pin: '', show: false }]);
  };

  const removeOtherPin = (index: number) => {
    setOtherPins(otherPins.filter((_, i) => i !== index));
  };

  const updateOtherPinLabel = (index: number, label: string) => {
    const updated = [...otherPins];
    updated[index].label = label;
    setOtherPins(updated);
  };

  const updateOtherPinValue = (index: number, pin: string) => {
    const updated = [...otherPins];
    updated[index].pin = pin.replace(/[^0-9]/g, '');
    setOtherPins(updated);
  };

  const toggleOtherPinVisibility = (index: number) => {
    const updated = [...otherPins];
    updated[index].show = !updated[index].show;
    setOtherPins(updated);
  };

  React.useEffect(() => {
    if (!unlocked) router.replace('/login');
  }, [unlocked, router]);

  const onSave = React.useCallback(async () => {
    if (loading) return;
    if (!vault || !vaultKey) return;
    if (!service.trim()) {
      showAlert({
        title: 'Required',
        message: 'Service is required',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    if (!username.trim()) {
      showAlert({
        title: 'Required',
        message: 'Username/Email is required',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    
    // Check if at least password OR any PIN is provided
    const hasLoginPin = loginPin.trim().length > 0;
    const hasTransactionPin = transactionPin.trim().length > 0;
    const hasOtherPins = otherPins.some(p => p.pin.trim().length > 0);
    const hasAnyPin = hasLoginPin || hasTransactionPin || hasOtherPins;
    
    if (!pw && !hasAnyPin) {
      showAlert({
        title: 'Required',
        message: 'Please provide either a password or at least one PIN',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    setLoading(true);
    try {
      // Auto-categorize based on service name
      const category = categorizeService(service);
      
      // Prepare other pins data
      const otherPinsData = otherPins
        .filter(p => p.label.trim() && p.pin.trim())
        .map(p => ({ label: p.label.trim(), pin: p.pin.trim() }));
      
      const item: PasswordItem = { 
        service: service.trim(), 
        username: username.trim(), 
        password: pw || '', 
        notes,
        category,
        loginPin: loginPin.trim() || undefined,
        transactionPin: transactionPin.trim() || undefined,
        otherPin: otherPinsData.length > 0 ? JSON.stringify(otherPinsData) : undefined,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      };
      const next = { ...vault, passwords: [...vault.passwords, item] };
      await saveVault(next, vaultKey);
      setVault(() => next);
      router.replace('/dashboard');
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
  }, [loading, vault, vaultKey, service, username, pw, notes, loginPin, transactionPin, otherPins, setVault, router]);

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
            <TouchableOpacity
              onPress={() => setShowPw((v) => !v)}
              style={styles.eyeBtn}
              accessibilityRole="button"
              accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
            >
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
            <Ionicons name="keypad" size={20} color={colors.primary} />
            <Text style={[styles.pinToggleText, { color: colors.text }]}>
              {showPinSection ? 'Hide' : 'Add'} PINs (Banking, UPI, etc.)
            </Text>
            <Ionicons 
              name={showPinSection ? 'chevron-up' : 'chevron-down'} 
              size={18} 
              color={colors.mutedText} 
            />
          </TouchableOpacity>

          {showPinSection ? (
            <View style={styles.pinSection}>
              <Text style={[styles.pinSectionTitle, { color: colors.text }]}>
                Store your app PINs securely
              </Text>
              <Text style={[styles.pinSectionSub, { color: colors.mutedText }]}>
                Never forget your banking, UPI, or transaction PINs again
              </Text>

              {/* Login PIN */}
              <Text style={[styles.label, { color: colors.mutedText }]}>Login PIN (Optional)</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[...inputStyle, { paddingRight: 44 }]}
                  placeholder="e.g. 1234 or 123456"
                  placeholderTextColor={colors.mutedText}
                  secureTextEntry={!showLoginPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="off"
                  textContentType="none"
                  value={loginPin}
                  onChangeText={(text) => setLoginPin(text.replace(/[^0-9]/g, ''))}
                />
                <TouchableOpacity
                  onPress={() => setShowLoginPin((v) => !v)}
                  style={styles.eyeBtn}
                >
                  <Ionicons name={showLoginPin ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
                </TouchableOpacity>
              </View>

              {/* Transaction PIN */}
              <Text style={[styles.label, { color: colors.mutedText }]}>Transaction PIN (Optional)</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[...inputStyle, { paddingRight: 44 }]}
                  placeholder="e.g. 1234 or 123456"
                  placeholderTextColor={colors.mutedText}
                  secureTextEntry={!showTransactionPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="off"
                  textContentType="none"
                  value={transactionPin}
                  onChangeText={(text) => setTransactionPin(text.replace(/[^0-9]/g, ''))}
                />
                <TouchableOpacity
                  onPress={() => setShowTransactionPin((v) => !v)}
                  style={styles.eyeBtn}
                >
                  <Ionicons name={showTransactionPin ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
                </TouchableOpacity>
              </View>

              {/* Other PIN with custom label */}
              <Text style={[styles.label, { color: colors.mutedText, marginTop: 12 }]}>Additional PINs</Text>
              
              {otherPins.map((otherPin, index) => (
                <View key={index} style={styles.otherPinItem}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[inputStyle, { marginBottom: 8 }]}
                      placeholder="PIN Label (e.g. Booking PIN)"
                      placeholderTextColor={colors.mutedText}
                      value={otherPin.label}
                      onChangeText={(text) => updateOtherPinLabel(index, text)}
                    />
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={[...inputStyle, { paddingRight: 44 }]}
                        placeholder="Enter PIN"
                        placeholderTextColor={colors.mutedText}
                        secureTextEntry={!otherPin.show}
                        keyboardType="number-pad"
                        maxLength={6}
                        autoComplete="off"
                        textContentType="none"
                        value={otherPin.pin}
                        onChangeText={(text) => updateOtherPinValue(index, text)}
                      />
                      <TouchableOpacity
                        onPress={() => toggleOtherPinVisibility(index)}
                        style={styles.eyeBtn}
                      >
                        <Ionicons name={otherPin.show ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeOtherPin(index)}
                    style={[styles.removeBtn, { backgroundColor: colors.inputBg }]}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.addPinBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={addOtherPin}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.addPinText, { color: colors.primary }]}>Add Another PIN</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={onSave}
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
  pinToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  pinToggleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  pinSection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  pinSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  pinSectionSub: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  otherPinItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  removeBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addPinText: {
    fontSize: 14,
    fontWeight: '700',
  },
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
