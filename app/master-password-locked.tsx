import Screen from '@/components/Screen';
import { useTheme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MASTER_PASSWORD_KEY = 'master_password_v1';

export default function MasterPasswordLocked() {
  const router = useRouter();
  const { colors } = useTheme();
  const [showPassword, setShowPassword] = React.useState(false);
  const [masterPassword, setMasterPassword] = React.useState('');

  React.useEffect(() => {
    (async () => {
      const mp = await SecureStore.getItemAsync(MASTER_PASSWORD_KEY);
      setMasterPassword(mp || '');
    })();
  }, []);

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <View style={[styles.imageCircle, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
            <Image
              source={require('@/assets/images/shh.png')}
              style={styles.shhImage}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Shhh...</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>
            Your master password is already set
          </Text>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <View style={[styles.iconBadge, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="lock-closed" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>Cannot be changed</Text>
                <Text style={[styles.infoText, { color: colors.mutedText }]}>
                  This ensures your generated passwords stay the same forever
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.iconBadge, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>Secure & Consistent</Text>
                <Text style={[styles.infoText, { color: colors.mutedText }]}>
                  Same service + username = same password, always
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.iconBadge, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="refresh" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>Works Everywhere</Text>
                <Text style={[styles.infoText, { color: colors.mutedText }]}>
                  Reinstall app or use new device - passwords stay the same
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.tipCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Ionicons name="bulb" size={18} color="#f59e0b" />
            <Text style={[styles.tipText, { color: colors.mutedText }]}>
              Remember your personal info to regenerate passwords anytime
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.viewLink, { borderColor: colors.border }]}
            onPress={() => router.push('/view-master-password')}
          >
            <Text style={[styles.viewLinkText, { color: colors.primary }]}>
              Want to see your master password?
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => {
            // Navigate to dashboard or settings depending on where we came from
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/dashboard');
            }
          }}
        >
          <Text style={styles.buttonText}>Got it!</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  shhImage: {
    width: 100,
    height: 100,
  },
  title: { fontSize: 32, fontWeight: '900', marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: '600', marginBottom: 32, textAlign: 'center' },
  card: { 
    borderWidth: 1, 
    borderRadius: 16, 
    padding: 16, 
    width: '100%', 
    marginBottom: 16,
    gap: 16,
  },
  infoRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  infoText: { fontSize: 13, lineHeight: 18 },
  tipCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  tipText: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },
  viewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  viewLinkText: {
    fontSize: 15,
    fontWeight: '700',
  },
  button: { 
    width: '100%', 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
