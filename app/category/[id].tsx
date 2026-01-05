import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { categorizeService, getCategoryById, type CategoryType } from '@/lib/categories';
import { getServiceColor, getServiceIcon } from '@/lib/service-icons';
import { saveVault } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Animated, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CategoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { vault, vaultKey, setVault } = useSession();
  const { colors, resolved } = useTheme();
  
  const category = getCategoryById(id as CategoryType);
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);
  const [showPasswordIndex, setShowPasswordIndex] = React.useState<number | null>(null);
  const [longPressedIndex, setLongPressedIndex] = React.useState<number | null>(null);
  
  const animatedValues = React.useRef<{ [key: number]: Animated.Value }>({}).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
            const animValue = getAnimatedValue(globalIndex);
            Animated.timing(animValue, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start(async () => {
              const updatedPasswords = vault.passwords.filter((_, idx) => idx !== globalIndex);
              try {
                setVault((prev) => ({ ...prev, passwords: updatedPasswords }));
                await saveVault({ ...vault, passwords: updatedPasswords }, vaultKey);
                setLongPressedIndex(null);
                setExpandedIndex(null);
                delete animatedValues[globalIndex];
              } catch (e: any) {
                Alert.alert('Error', e?.message ?? 'Failed to delete password');
              }
            });
          },
        },
      ]
    );
  }, [vault, vaultKey, getAnimatedValue, animatedValues, setVault]);

  // Filter passwords for this category
  const categoryPasswords = React.useMemo(() => {
    if (!vault?.passwords) return [];
    return vault.passwords
      .map((pwd, idx) => ({ ...pwd, globalIndex: idx }))
      .filter(pwd => {
        const pwdCategory = pwd.category || categorizeService(pwd.service);
        return pwdCategory === id;
      });
  }, [vault?.passwords, id]);

  return (
    <Screen>
      <Animated.View 
        style={[
          styles.container, 
          { backgroundColor: colors.background },
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <LinearGradient
          colors={category.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerIcon}>
              <Ionicons name={category.icon as any} size={32} color="#fff" />
            </View>
          </View>
          <Text style={styles.headerTitle}>{category.name}</Text>
          <Text style={styles.headerCount}>{categoryPasswords.length} passwords</Text>
        </LinearGradient>

        <FlatList
          data={categoryPasswords}
          keyExtractor={(item) => `${item.service}-${item.username}-${item.globalIndex}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={64} color={colors.mutedText} />
              <Text style={[styles.emptyText, { color: colors.text }]}>No passwords in this category</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const iconName = getServiceIcon(item.service);
            const iconColor = getServiceColor(item.service, resolved === 'dark');
            const isExpanded = expandedIndex === item.globalIndex;
            const isLongPressed = longPressedIndex === item.globalIndex;
            const animValue = getAnimatedValue(item.globalIndex);

            return (
              <Animated.View
                style={{
                  opacity: animValue,
                  transform: [{
                    scale: animValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  }],
                }}
              >
                <TouchableOpacity
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => {
                    if (isLongPressed) {
                      setLongPressedIndex(null);
                    } else {
                      setExpandedIndex(isExpanded ? null : item.globalIndex);
                    }
                  }}
                  onLongPress={() => {
                    setLongPressedIndex(item.globalIndex);
                    setExpandedIndex(null);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardRow}>
                    <View style={[styles.badge, { backgroundColor: iconColor + '15' }]}>
                      <Ionicons name={iconName as any} size={20} color={iconColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.service}
                      </Text>
                      <Text style={[styles.cardSub, { color: colors.mutedText }]} numberOfLines={1}>
                        {item.username}
                      </Text>
                    </View>
                    {isLongPressed ? (
                      <TouchableOpacity
                        onPress={() => handleDelete(item.globalIndex)}
                        style={styles.deleteBtn}
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
                          <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                            {item.username}
                          </Text>
                          <TouchableOpacity onPress={() => copyToClipboard(item.username, 'Username')}>
                            <Ionicons name="copy-outline" size={18} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.mutedText }]}>Password</Text>
                        <View style={styles.detailValue}>
                          <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                            {showPasswordIndex === item.globalIndex 
                              ? item.password 
                              : '●'.repeat(Math.min(item.password.length, 12))}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity 
                              onPress={() => setShowPasswordIndex(
                                showPasswordIndex === item.globalIndex ? null : item.globalIndex
                              )}
                            >
                              <Ionicons 
                                name={showPasswordIndex === item.globalIndex ? 'eye-off-outline' : 'eye-outline'} 
                                size={18} 
                                color={colors.primary} 
                              />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => copyToClipboard(item.password, 'Password')}>
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
          }}
        />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    marginLeft: 'auto',
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  headerCount: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  card: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardSub: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContent: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  detailRow: {
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
