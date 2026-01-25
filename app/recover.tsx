import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { loadRecoveryQuestions, unwrapWithRecovery } from '@/lib/secure';
import { decryptVaultWithKey } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Recover() {
  const router = useRouter();
  const { unlock } = useSession();
  const { colors } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [questions, setQuestions] = React.useState<string[] | null>(null);
  const [answer, setAnswer] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const q = await loadRecoveryQuestions();
      if (!q || q.length === 0) {
        showAlert({
          title: 'Recovery not configured',
          message: 'Please unlock using PIN or fingerprint.',
          confirmText: 'OK',
          onConfirm: () => {},
        });
        router.back();
        return;
      }
      setQuestions(q);
    })();
  }, [router]);

  const onRecover = React.useCallback(async () => {
    if (loading) return;
    if (!questions) return;
    if (!answer.trim()) {
      showAlert({
        title: 'Required',
        message: 'Please answer the security question',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    setLoading(true);
    try {
      const vaultKey = await unwrapWithRecovery([answer]);
      const vault = await decryptVaultWithKey(vaultKey);
      unlock(vault, vaultKey);
      router.replace('/dashboard');
    } catch (e: any) {
      const errorMsg = e?.message ?? 'Incorrect answer';
      if (errorMsg.includes('malformed') || errorMsg.includes('utf-8')) {
        showAlert({
          title: 'Recovery Error',
          message: 'Your answer is incorrect. Make sure to type it exactly as you set it up.',
          confirmText: 'OK',
          onConfirm: () => {},
        });
      } else {
        showAlert({
          title: 'Error',
          message: errorMsg,
          confirmText: 'OK',
          onConfirm: () => {},
        });
      }
    } finally {
      setLoading(false);
    }
  }, [loading, questions, answer, unlock, router]);

  const inputStyle = [styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }];

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="help-circle" size={20} color={colors.text} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Recovery</Text>
          <Text style={[styles.sub, { color: colors.mutedText }]}>Answer your security question to unlock.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {questions && questions.length > 0 ? (
            <View style={{ marginBottom: 10 }}>
              <Text style={[styles.question, { color: colors.text }]}>{questions[0]}</Text>
              <TextInput
                style={inputStyle}
                placeholder="Your answer"
                placeholderTextColor={colors.mutedText}
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
                autoCorrect={false}
                value={answer}
                onChangeText={setAnswer}
              />
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={onRecover}
          >
            <Text style={styles.primaryBtnText}>{loading ? 'Unlocking...' : 'Unlock'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 10 }}>
            <Text style={[styles.link, { color: colors.mutedText }]}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>

      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 14 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '900' },
  sub: { marginTop: 6, fontSize: 13, textAlign: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  question: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  input: { borderWidth: 1, padding: 12, borderRadius: 12, marginBottom: 4, fontSize: 15 },
  primaryBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  link: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
