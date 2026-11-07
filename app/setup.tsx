import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { generateVaultKey, saveBiometricKey, saveMeta, savePasswordWrap, saveRecoveryWrap } from '@/lib/secure';
import { createNewVault, generateSaltHex, hashPasswordAsync, vaultExists } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

const QUESTIONS = [
  'What is your pet\'s name?',
  'What is your favorite dish/food?',
  'What city were you born in?',
  'What is your mother\'s maiden name?',
  'What was the name of your first school?',
  'What is your favorite movie?',
];

export default function Setup() {
  const router = useRouter();
  const { unlock } = useSession();
  const { colors, resolved } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [step, setStep] = React.useState<0 | 1 | 2>(0);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const [selectedQuestion, setSelectedQuestion] = React.useState(0);
  const [answer, setAnswer] = React.useState('');
  const [showQuestionPicker, setShowQuestionPicker] = React.useState(false);

  const [bioSupported, setBioSupported] = React.useState(false);
  const [enableBio, setEnableBio] = React.useState(false);

  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const exists = await vaultExists();
      if (exists) {
        router.replace('/login');
        return;
      }
      
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setBioSupported(hasHardware && isEnrolled);
      } catch (error) {
        console.error('Biometric check failed:', error);
        setBioSupported(false);
      }
    })();
  }, [router]);

  const nextFromAccount = React.useCallback(async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showAlert({
        title: 'Email Required',
        message: 'Please enter your email address',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showAlert({
        title: 'Invalid Email',
        message: 'Please enter a valid email address',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    if (password.length < 8) {
      showAlert({
        title: 'Password Too Short',
        message: 'Password must be at least 8 characters',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    if (password !== confirm) {
      showAlert({
        title: 'Passwords Don\'t Match',
        message: 'Passwords do not match',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    setStep(1);
  }, [email, password, confirm, showAlert]);

  const nextFromRecovery = React.useCallback(() => {
    if (!answer.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please answer the security question',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    setStep(2);
  }, [answer, showAlert]);

  const finishSetup = React.useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const vaultKey = await generateVaultKey();
      const passwordSaltHex = generateSaltHex();
      const passwordHash = await hashPasswordAsync(password, passwordSaltHex);
      const cleanEmail = email.trim().toLowerCase();

      await saveMeta({ email: cleanEmail, passwordHash, passwordSaltHex });
      await savePasswordWrap(vaultKey, password);
      await saveRecoveryWrap(vaultKey, [QUESTIONS[selectedQuestion]], [answer]);
      if (enableBio && bioSupported) await saveBiometricKey(vaultKey);

      const vault = await createNewVault(password, vaultKey, passwordSaltHex, { email: cleanEmail });
      unlock(vault, vaultKey);
      router.replace('/dashboard');
    } catch (e: any) {
      showAlert({
        title: 'Error',
        message: e?.message ?? 'Failed to create VaultX',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } finally {
      setLoading(false);
    }
  }, [loading, email, password, selectedQuestion, answer, enableBio, bioSupported, unlock, router, showAlert]);

  const passwordStrength = React.useMemo(() => {
    const pw = password;
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
    if (/\d/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;
    const label = score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';
    return { score, label };
  }, [password]);

  const inputStyle = [styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }];

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.kicker, { color: colors.mutedText }]}>Setup</Text>
          <Text style={[styles.title, { color: colors.text }]}>Create your secure VaultX</Text>
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === step ? colors.primary : colors.border },
                ]}
              />
            ))}
          </View>
        </View>

        {step === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Credentials</Text>
            <Text style={[styles.helper, { color: colors.mutedText, marginBottom: 16 }]}>
              Enter your email and master password. You will use this password to log in.
            </Text>

            <TextInput
              style={inputStyle}
              placeholder="Email address"
              placeholderTextColor={colors.mutedText}
              autoComplete="email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              selectionColor={colors.primary}
              value={email}
              onChangeText={setEmail}
            />

            <View style={styles.inputWrap}>
              <TextInput
                style={[...inputStyle, { paddingRight: 44 }]}
                placeholder="Master Password (8+ characters)"
                placeholderTextColor={colors.mutedText}
                secureTextEntry={!showPassword}
                autoComplete="password-new"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                keyboardType={showPassword ? 'visible-password' : 'default'}
                selectionColor={colors.primary}
                underlineColorAndroid="transparent"
                returnKeyType="next"
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            {password.length > 0 ? (
              <View style={styles.strengthRow}>
                <View style={[styles.strengthTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${(passwordStrength.score / 4) * 100}%`,
                        backgroundColor: passwordStrength.score >= 3 ? '#22c55e' : passwordStrength.score === 2 ? '#f59e0b' : '#ef4444',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthText, { color: colors.mutedText }]}>Strength: {passwordStrength.label}</Text>
              </View>
            ) : null}

            <View style={styles.inputWrap}>
              <TextInput
                style={[...inputStyle, { paddingRight: 44 }]}
                placeholder="Confirm Master Password"
                placeholderTextColor={colors.mutedText}
                secureTextEntry={!showConfirm}
                autoComplete="password-new"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                keyboardType={showConfirm ? 'visible-password' : 'default'}
                selectionColor={colors.primary}
                underlineColorAndroid="transparent"
                returnKeyType="done"
                value={confirm}
                onChangeText={setConfirm}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((v) => !v)}
                style={styles.eyeBtn}
                accessibilityRole="button"
                accessibilityLabel={showConfirm ? 'Hide password confirmation' : 'Show password confirmation'}
              >
                <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={nextFromAccount}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Security Question</Text>
            <Text style={[styles.helper, { color: colors.mutedText }]}>This helps you recover access if you ever forget your password.</Text>

            <Text style={[styles.question, { color: colors.text }]}>Select a question</Text>
            <TouchableOpacity
              style={[styles.dropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={() => setShowQuestionPicker(!showQuestionPicker)}
            >
              <Text style={[styles.dropdownText, { color: colors.text }]}>{QUESTIONS[selectedQuestion]}</Text>
              <Ionicons name={showQuestionPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.mutedText} />
            </TouchableOpacity>

            {showQuestionPicker ? (
              <View style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {QUESTIONS.map((q, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.pickerItem, idx === selectedQuestion && { backgroundColor: colors.inputBg }]}
                    onPress={() => {
                      setSelectedQuestion(idx);
                      setShowQuestionPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerText, { color: colors.text }]}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <Text style={[styles.question, { color: colors.text, marginTop: 12 }]}>Your answer</Text>
            <TextInput
              style={inputStyle}
              placeholder="Type your answer"
              placeholderTextColor={colors.mutedText}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              autoCorrect={false}
              value={answer}
              onChangeText={setAnswer}
            />

            <View style={styles.row}>
              <TouchableOpacity onPress={() => setStep(0)} style={styles.linkBtn}>
                <Text style={[styles.linkText, { color: colors.mutedText }]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, styles.primaryBtnRow, { backgroundColor: colors.primary }]}
                onPress={nextFromRecovery}
              >
                <Text style={styles.primaryBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Biometric Unlock</Text>
            <Text style={[styles.helper, { color: colors.mutedText }]}>You can enable fingerprint or biometric unlock for quick access.</Text>

            <View style={[styles.switchRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchTitle, { color: colors.text }]}>Enable biometric unlock</Text>
                <Text style={[styles.switchSub, { color: colors.mutedText }]}>
                  {bioSupported ? 'Uses your device biometrics.' : 'Not available on this device.'}
                </Text>
              </View>
              <Switch
                value={enableBio}
                onValueChange={setEnableBio}
                disabled={!bioSupported}
                trackColor={{ false: resolved === 'dark' ? '#334155' : colors.border, true: colors.primary + '60' }}
                thumbColor={enableBio ? colors.primary : (resolved === 'dark' ? '#64748b' : '#94a3b8')}
              />
            </View>

            <View style={styles.row}>
              <TouchableOpacity onPress={() => setStep(1)} style={styles.linkBtn}>
                <Text style={[styles.linkText, { color: colors.mutedText }]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, styles.primaryBtnRow, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
                disabled={loading}
                onPress={finishSetup}
              >
                <Text style={styles.primaryBtnText}>{loading ? 'Creating...' : 'Create Vault'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>

      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 14 },
  kicker: { fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 12 },
  dot: { width: 10, height: 10, borderRadius: 10 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  helper: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  question: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, padding: 12, borderRadius: 12, marginBottom: 10, fontSize: 15 },
  inputWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 2, top: 0, bottom: 10, height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  strengthRow: { marginTop: -2, marginBottom: 10 },
  strengthTrack: { height: 6, borderRadius: 10, overflow: 'hidden' },
  strengthFill: { height: 6, borderRadius: 10 },
  strengthText: { marginTop: 6, fontSize: 12, fontWeight: '700' },
  primaryBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  primaryBtnRow: { marginTop: 0, paddingHorizontal: 18, minWidth: 140 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 6 },
  linkBtn: { padding: 10 },
  linkText: { fontSize: 15, fontWeight: '700' },
  dropdown: { borderWidth: 1, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dropdownText: { fontSize: 14, fontWeight: '600' },
  picker: { borderWidth: 1, borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  pickerItem: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  pickerText: { fontSize: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 },
  switchTitle: { fontSize: 15, fontWeight: '700' },
  switchSub: { fontSize: 12, marginTop: 2 },
});
