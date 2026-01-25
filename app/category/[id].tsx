import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { categories, categorizeService, getCategoryById, type CategoryType } from '@/lib/categories';
import { getServiceColor, getServiceIcon } from '@/lib/service-icons';
import { saveVault } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Animated, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const formatTimestamp = (timestamp?: number): string => {
  if (!timestamp) return 'Unknown';
  
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  if (months < 12) return `${months}mo ago`;
  return `${years}y ago`;
};

export default function CategoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { vault, vaultKey, setVault } = useSession();
  const { colors, resolved } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();
  
  const category = getCategoryById(id as CategoryType);
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);
  const [showPasswordIndex, setShowPasswordIndex] = React.useState<number | null>(null);
  const [longPressedIndex, setLongPressedIndex] = React.useState<number | null>(null);
  const [showMoveModal, setShowMoveModal] = React.useState(false);
  const [selectedPasswordIndex, setSelectedPasswordIndex] = React.useState<number | null>(null);
  const [currentCategory, setCurrentCategory] = React.useState<string>('');

  const modalAnim = React.useRef(new Animated.Value(0)).current;
  const overlayAnim = React.useRef(new Animated.Value(0)).current;
  
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
    showAlert({
      title: 'Copied',
      message: `${label} copied to clipboard`,
      confirmText: 'OK',
      onConfirm: () => {},
    });
  }, [showAlert]);

  const getAnimatedValue = React.useCallback((index: number) => {
    if (!animatedValues[index]) {
      animatedValues[index] = new Animated.Value(1);
    }
    return animatedValues[index];
  }, [animatedValues]);

  const handleDelete = React.useCallback(async (globalIndex: number) => {
    if (!vault || !vaultKey) return;

    showAlert({
      title: 'Delete Password',
      message: 'Are you sure you want to delete this password?',
      cancelText: 'Cancel',
      confirmText: 'Delete',
      type: 'destructive',
      onCancel: () => {},
      onConfirm: async () => {
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
            showAlert({
              title: 'Error',
              message: e?.message ?? 'Failed to delete password',
              confirmText: 'OK',
              onConfirm: () => {},
            });
          }
        });
      },
    });
  }, [vault, vaultKey, getAnimatedValue, animatedValues, setVault, showAlert]);

  const openMoveModal = React.useCallback((globalIndex: number, category: string) => {
    setSelectedPasswordIndex(globalIndex);
    setCurrentCategory(category);
    setLongPressedIndex(null);
    setShowMoveModal(true);
    
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(modalAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [modalAnim, overlayAnim]);

  const closeMoveModal = React.useCallback(() => {
    Animated.parallel([
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowMoveModal(false);
      setSelectedPasswordIndex(null);
      setCurrentCategory('');
    });
  }, [modalAnim, overlayAnim]);

  const moveToCategory = React.useCallback(async (newCategory: CategoryType) => {
    if (!vault || !vaultKey || selectedPasswordIndex === null) return;
    
    const updatedPasswords = [...vault.passwords];
    updatedPasswords[selectedPasswordIndex] = {
      ...updatedPasswords[selectedPasswordIndex],
      category: newCategory,
      modifiedAt: Date.now(),
    };
    
    const updatedVault = { ...vault, passwords: updatedPasswords };
    
    try {
      await saveVault(updatedVault, vaultKey);
      setVault(() => updatedVault);
      closeMoveModal();
      
      const targetCategory = getCategoryById(newCategory);
      showAlert({
        title: 'Success',
        message: `Moved to ${targetCategory.name}`,
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to move password',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    }
  }, [vault, vaultKey, selectedPasswordIndex, setVault, closeMoveModal]);

  const toggleFavorite = async (globalIndex: number) => {
    if (!vault || !vaultKey) return;
    
    const updatedPasswords = [...vault.passwords];
    updatedPasswords[globalIndex] = {
      ...updatedPasswords[globalIndex],
      isFavorite: !updatedPasswords[globalIndex].isFavorite,
      modifiedAt: Date.now(),
    };
    
    const updatedVault = { ...vault, passwords: updatedPasswords };
    
    try {
      await saveVault(updatedVault, vaultKey);
      setVault(() => updatedVault);
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to update favorite',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    }
  };

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
          bounces={true}
          alwaysBounceVertical={true}
          data={categoryPasswords}
          keyExtractor={(item) => `${item.service}-${item.username}-${item.globalIndex}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.primary + '10' }]}>
                <Ionicons name={category.icon as any} size={48} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No {category.name} Passwords</Text>
              <Text style={[styles.emptySubtext, { color: colors.mutedText }]}>
                Tap the + button to add your first password
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/add')}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Add Password</Text>
              </TouchableOpacity>
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
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => openMoveModal(item.globalIndex, item.category || categorizeService(item.service))}
                          style={[styles.actionBtn, { backgroundColor: '#8b5cf6' }]}
                        >
                          <Ionicons name="move" size={18} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setLongPressedIndex(null);
                            router.push(`/edit/${item.globalIndex}` as any);
                          }}
                          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        >
                          <Ionicons name="pencil" size={18} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(item.globalIndex)}
                          style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                        >
                          <Ionicons name="trash" size={18} color="#fff" />
                        </TouchableOpacity>
                      </View>
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

                      {/* Only show password if it exists */}
                      {item.password ? (
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
                      ) : null}

                      {item.notes ? (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.mutedText }]}>Notes</Text>
                          <Text style={[styles.detailText, { color: colors.text }]}>{item.notes}</Text>
                        </View>
                      ) : null}

                      {/* Login PIN */}
                      {item.loginPin ? (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.mutedText }]}>Login PIN</Text>
                          <View style={styles.detailValue}>
                            <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                              {showPasswordIndex === item.globalIndex 
                                ? item.loginPin 
                                : '●'.repeat(item.loginPin.length)}
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
                              <TouchableOpacity onPress={() => copyToClipboard(item.loginPin!, 'Login PIN')}>
                                <Ionicons name="copy-outline" size={18} color={colors.primary} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ) : null}

                      {/* Transaction PIN */}
                      {item.transactionPin ? (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: colors.mutedText }]}>Transaction PIN</Text>
                          <View style={styles.detailValue}>
                            <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                              {showPasswordIndex === item.globalIndex 
                                ? item.transactionPin 
                                : '●'.repeat(item.transactionPin.length)}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                              {/* Only show eye icon if there's no login PIN (first PIN gets the eye) */}
                              {!item.loginPin ? (
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
                              ) : null}
                              <TouchableOpacity onPress={() => copyToClipboard(item.transactionPin!, 'Transaction PIN')}>
                                <Ionicons name="copy-outline" size={18} color={colors.primary} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ) : null}

                      {/* Other PINs */}
                      {item.otherPin ? (() => {
                        try {
                          const otherPins = JSON.parse(item.otherPin) as Array<{label: string; pin: string}>;
                          return otherPins.map((pin, idx) => (
                            <View key={idx} style={styles.detailRow}>
                              <Text style={[styles.detailLabel, { color: colors.mutedText }]}>{pin.label}</Text>
                              <View style={styles.detailValue}>
                                <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                                  {showPasswordIndex === item.globalIndex 
                                    ? pin.pin 
                                    : '●'.repeat(pin.pin.length)}
                                </Text>
                                <TouchableOpacity onPress={() => copyToClipboard(pin.pin, pin.label)}>
                                  <Ionicons name="copy-outline" size={18} color={colors.primary} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ));
                        } catch {
                          return null;
                        }
                      })() : null}
                      
                      {/* Timestamp Information */}
                      <View style={[styles.timestampSection, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                        <View style={styles.timestampRow}>
                          <Ionicons name="time-outline" size={14} color={colors.mutedText} />
                          <Text style={[styles.timestampLabel, { color: colors.mutedText }]}>
                            Added {formatTimestamp(item.createdAt)}
                          </Text>
                        </View>
                        {item.modifiedAt && item.modifiedAt !== item.createdAt ? (
                          <View style={styles.timestampRow}>
                            <Ionicons name="create-outline" size={14} color={colors.mutedText} />
                            <Text style={[styles.timestampLabel, { color: colors.mutedText }]}>
                              Modified {formatTimestamp(item.modifiedAt)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </Animated.View>
            );
          }}
        />
      </Animated.View>

      {/* Move Category Modal */}
      {showMoveModal && (
        <View style={styles.modalContainer}>
          <Animated.View 
            style={[
              styles.modalOverlay,
              {
                opacity: overlayAnim,
              }
            ]}
          >
            <TouchableOpacity 
              style={{ flex: 1 }} 
              activeOpacity={1} 
              onPress={closeMoveModal}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card },
              {
                opacity: modalAnim,
                transform: [
                  {
                    translateY: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                  {
                    scale: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Ionicons name="move" size={24} color="#8b5cf6" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Move to Category</Text>
              <TouchableOpacity onPress={closeMoveModal}>
                <Ionicons name="close" size={24} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <View style={styles.categoryGrid}>
              {categories
                .filter((cat: any) => cat.id !== currentCategory && cat.id !== 'other')
                .map((cat: any) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryOption, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                    onPress={() => moveToCategory(cat.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.categoryIconWrap, { backgroundColor: cat.gradient[0] + '20' }]}>
                      <Ionicons name={cat.icon as any} size={24} color={cat.gradient[0]} />
                    </View>
                    <Text style={[styles.categoryOptionName, { color: colors.text }]} numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </Animated.View>
        </View>
      )}

      <AlertComponent />
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
    display: 'flex',
  },
  headerIcon: {
    marginLeft: 'auto',
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
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
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
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
    display: 'flex',
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
    display: 'flex',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
  },
  expandedContent: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  timestampSection: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timestampLabel: {
    fontSize: 11,
    fontWeight: '600',
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
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryOption: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryOptionName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
});
