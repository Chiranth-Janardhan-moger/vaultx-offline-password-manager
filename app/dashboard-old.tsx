import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { getServiceColor, getServiceIcon } from '@/lib/service-icons';
import { saveVault } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Alert, Animated, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MASTER_PASSWORD_KEY = 'master_password_v1';

const maskPhone = (phone: string): string => {
  if (phone.length <= 4) return phone;
  const first2 = phone.slice(0, 2);
  const last2 = phone.slice(-2);
  const middle = 'X'.repeat(phone.length - 4);
  return `${first2}${middle}${last2}`;
};

export default function Dashboard() {
  const router = useRouter();
  const { unlocked, vault, lock, vaultKey, setVault } = useSession();
  const { colors } = useTheme();
  
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);
  const [showPasswordIndex, setShowPasswordIndex] = React.useState<number | null>(null);
  const [showFabMenu, setShowFabMenu] = React.useState(false);
  const [hasMasterPassword, setHasMasterPassword] = React.useState(false);
  const [longPressedIndex, setLongPressedIndex] = React.useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = React.useState<number | null>(null);

  // Animation values for each card
  const animatedValues = React.useRef<{ [key: number]: Animated.Value }>({}).current;

  React.useEffect(() => {
    if (!unlocked) router.replace('/login');
  }, [unlocked, router]);

  // Check for master password whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const mp = await SecureStore.getItemAsync(MASTER_PASSWORD_KEY);
        setHasMasterPassword(!!mp);
      })();
    }, [])
  );

  const copyToClipboard = React.useCallback(async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  }, []);

  const getAnimatedValue = React.useCallback((index: number) => {
    if (!animatedValues[index]) {
      animatedValues[index] = new Animated.Value(1);
    }
    return animatedValues[index];
  }, [animatedValues]);

  const handleDelete = React.useCallback(async (globalIndex: number) => {
    if (!vault || !vaultKey) return;

    Alert.alert(
      'Delete Password',
      'Are you sure you want to delete this password?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingIndex(globalIndex);
            const animValue = getAnimatedValue(globalIndex);

            // Animate out
            Animated.parallel([
              Animated.timing(animValue, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start(async () => {
              // Remove from vault
              const updatedPasswords = vault.passwords.filter((_, idx) => idx !== globalIndex);
              
              try {
                // Update vault in session and save
                setVault((prev) => ({ ...prev, passwords: updatedPasswords }));
                await saveVault({ ...vault, passwords: updatedPasswords }, vaultKey);
                
                // Reset states
                setLongPressedIndex(null);
                setExpandedIndex(null);
                setDeletingIndex(null);
                delete animatedValues[globalIndex];
              } catch (e: any) {
                Alert.alert('Error', e?.message ?? 'Failed to delete password');
                // Reset animation
                Animated.timing(animValue, {
                  toValue: 1,
                  duration: 200,
                  useNativeDriver: true,
                }).start();
                setDeletingIndex(null);
              }
            });
          },
        },
      ]
    );
  }, [vault, vaultKey, getAnimatedValue, animatedValues]);

  // Group passwords by service (normalize instagram/insta, etc.)
  const groupedPasswords = React.useMemo(() => {
    if (!vault?.passwords) return [];
    
    const groups: { [key: string]: typeof vault.passwords } = {};
    vault.passwords.forEach(pwd => {
      let service = pwd.service.toLowerCase().trim();
      
      // Normalize common service names
      if (service.includes('instagram') || service === 'insta') service = 'instagram';
      if (service.includes('facebook') || service === 'fb') service = 'facebook';
      if (service.includes('twitter') || service === 'x.com') service = 'twitter';
      
      if (!groups[service]) {
        groups[service] = [];
      }
      groups[service].push(pwd);
    });
    
    // Convert to array and sort by service name
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([service, passwords]) => ({ service, passwords }));
  }, [vault?.passwords]);

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>VaultX</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              {vault?.user.phone ? maskPhone(vault.user.phone) : ''}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/settings')}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                lock();
                router.replace('/login');
              }}
            >
              <Ionicons name="lock-closed-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={groupedPasswords}
          keyExtractor={(item) => item.service}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.inputBg }]}>
                <Ionicons name="lock-closed-outline" size={48} color={colors.mutedText} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Passwords Yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedText }]}>
                Tap the + button below to add your first password
              </Text>
            </View>
          }
          renderItem={({ item: group }) => {
            const iconName = getServiceIcon(group.service);
            const iconColor = getServiceColor(group.service);
            
            return (
            <View style={styles.groupContainer}>
              <View style={styles.groupHeader}>
                <Text style={[styles.groupTitle, { color: colors.text }]}>
                  {group.service.charAt(0).toUpperCase() + group.service.slice(1)}
                </Text>
                <View style={[styles.countBadge, { backgroundColor: colors.inputBg }]}>
                  <Text style={[styles.countText, { color: colors.mutedText }]}>{group.passwords.length}</Text>
                </View>
              </View>
              {group.passwords.map((item, index) => {
                const globalIndex = vault?.passwords.findIndex(p => p === item) ?? index;
                const isExpanded = expandedIndex === globalIndex;
                const isLongPressed = longPressedIndex === globalIndex;
                const animValue = getAnimatedValue(globalIndex);
            
                return (
                  <Animated.View
                    key={`${item.service}-${item.username}-${index}`}
                    style={{
                      opacity: animValue,
                      transform: [
                        {
                          scale: animValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                      ],
                    }}
                  >
                  <TouchableOpacity
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => {
                      if (isLongPressed) {
                        setLongPressedIndex(null);
                      } else {
                        setExpandedIndex(isExpanded ? null : globalIndex);
                      }
                    }}
                    onLongPress={() => {
                      setLongPressedIndex(globalIndex);
                      setExpandedIndex(null);
                    }}
                    activeOpacity={0.7}
                  >
                <View style={styles.cardRow}>
                  <View style={[styles.badge, { backgroundColor: iconColor + '15' }]}>
                    <Ionicons name={iconName as any} size={18} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.service}</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedText }]} numberOfLines={1}>{item.username}</Text>
                  </View>
                  {isLongPressed ? (
                    <TouchableOpacity
                      onPress={() => handleDelete(globalIndex)}
                      style={[styles.deleteBtn, { backgroundColor: '#ef4444' }]}
                    >
                      <Ionicons name="trash" size={18} color="#fff" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons 
                      name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color={colors.mutedText} 
                    />
                  )}
                </View>

                {isExpanded && !isLongPressed ? (
                  <View style={styles.expandedContent}>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.mutedText }]}>Username</Text>
                      <View style={styles.detailValue}>
                        <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>{item.username}</Text>
                        <TouchableOpacity onPress={() => copyToClipboard(item.username, 'Username')} style={styles.actionBtn}>
                          <Ionicons name="copy-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.mutedText }]}>Password</Text>
                      <View style={styles.detailValue}>
                        <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                          {showPasswordIndex === globalIndex ? item.password : '●'.repeat(Math.min(item.password.length, 12))}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <TouchableOpacity onPress={() => setShowPasswordIndex(showPasswordIndex === globalIndex ? null : globalIndex)} style={styles.actionBtn}>
                            <Ionicons 
                              name={showPasswordIndex === globalIndex ? 'eye-off-outline' : 'eye-outline'} 
                              size={18} 
                              color={colors.primary} 
                            />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => copyToClipboard(item.password, 'Password')} style={styles.actionBtn}>
                            <Ionicons name="copy-outline" size={18} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {item.notes ? (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.mutedText }]}>Notes</Text>
                        <Text style={[styles.detailText, { color: colors.text }]}>{item.notes}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </TouchableOpacity>
              </Animated.View>
            );
          })}
            </View>
          );
          }}
          contentContainerStyle={{ paddingBottom: 96 }}
          showsVerticalScrollIndicator={false}
        />

        {showFabMenu ? (
          <>
            <TouchableOpacity
              style={styles.fabOverlay}
              activeOpacity={1}
              onPress={() => setShowFabMenu(false)}
            />
            <View style={styles.fabMenu}>
              <TouchableOpacity
                style={[styles.fabMenuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  setShowFabMenu(false);
                  router.push('/add');
                }}
              >
                <View style={[styles.fabMenuIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="key" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fabMenuText, { color: colors.text }]}>Add Password</Text>
                  <Text style={[styles.fabMenuSubtext, { color: colors.mutedText }]}>Save existing password</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fabMenuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  setShowFabMenu(false);
                  if (!hasMasterPassword) {
                    Alert.alert(
                      'Master Password Required',
                      'Set up your master password to generate strong passwords',
                      [
                        { text: 'Set Up Now', onPress: () => router.push('/master-password-intro') },
                        { text: 'Cancel', style: 'cancel' }
                      ]
                    );
                  } else {
                    router.push('/generate-password');
                  }
                }}
              >
                <View style={[styles.fabMenuIcon, { backgroundColor: '#8b5cf6' + '15' }]}>
                  <Ionicons name="sparkles" size={22} color="#8b5cf6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fabMenuText, { color: colors.text }]}>Generate Password</Text>
                  <Text style={[styles.fabMenuSubtext, { color: colors.mutedText }]}>
                    {hasMasterPassword ? 'Create strong password' : 'Setup required'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setShowFabMenu(!showFabMenu)}
          activeOpacity={0.9}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: showFabMenu ? '45deg' : '0deg',
                },
              ],
            }}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { marginTop: 4, fontSize: 13, fontWeight: '600' },
  iconBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  emptyText: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  groupContainer: { marginBottom: 16 },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupTitle: { 
    fontSize: 14, 
    fontWeight: '800',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: { fontSize: 12, fontWeight: '700' },
  card: { borderWidth: 1, padding: 12, borderRadius: 14, marginBottom: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardSub: { marginTop: 2, fontSize: 13, fontWeight: '600' },
  expandedContent: { marginTop: 12 },
  divider: { height: 1, marginBottom: 12 },
  detailRow: { marginBottom: 10 },
  detailLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  detailValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  detailText: { fontSize: 14, fontWeight: '600', flex: 1 },
  actionBtn: { padding: 4 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  fabMenu: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    gap: 12,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  fabMenuIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabMenuText: {
    fontSize: 16,
    fontWeight: '800',
  },
  fabMenuSubtext: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 18,
    right: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
