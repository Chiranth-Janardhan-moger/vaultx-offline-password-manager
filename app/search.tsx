import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { categories, categorizeService, CategoryType, getCategoryById } from '@/lib/categories';
import { getServiceColor, getServiceIcon, normalizeServiceName } from '@/lib/service-icons';
import { saveVault } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import {
  Animated,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 5;

type SearchResult = {
  service: string;
  username: string;
  password: string;
  notes?: string;
  loginPin?: string;
  transactionPin?: string;
  otherPin?: string;
  category: string;
  globalIndex: number;
  matchType: 'service' | 'username' | 'notes';
  isFavorite?: boolean;
};

export default function SearchScreen() {
  const router = useRouter();
  const { vault, vaultKey, setVault } = useSession();
  const { colors, resolved } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const [showPasswordIndex, setShowPasswordIndex] = React.useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);
  const [showMoveModal, setShowMoveModal] = React.useState(false);
  const [selectedPasswordIndex, setSelectedPasswordIndex] = React.useState<number | null>(null);
  const [currentCategory, setCurrentCategory] = React.useState<string>('');

  const modalAnim = React.useRef(new Animated.Value(0)).current;
  const overlayAnim = React.useRef(new Animated.Value(0)).current;

  const searchInputRef = React.useRef<TextInput>(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    loadRecentSearches();
    setTimeout(() => searchInputRef.current?.focus(), 150);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await SecureStore.getItemAsync(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

  const saveRecentSearch = async (query: string) => {
    if (!query.trim()) return;

    const updated = [
      query,
      ...recentSearches.filter((s) => s !== query),
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(updated);
    try {
      await SecureStore.setItemAsync(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    try {
      await SecureStore.deleteItemAsync(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    showAlert({
      title: 'Copied',
      message: `${label} copied to clipboard`,
      confirmText: 'OK',
      onConfirm: () => {},
    });
  };

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

  const openMoveModal = (globalIndex: number, category: string) => {
    setSelectedPasswordIndex(globalIndex);
    setCurrentCategory(category);
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
  };

  const closeMoveModal = () => {
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
  };

  const moveToCategory = async (newCategory: CategoryType) => {
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
      showAlert({
        title: 'Success',
        message: `Moved to ${getCategoryById(newCategory).name}`,
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
  };

  const handleDelete = async (globalIndex: number) => {
    if (!vault || !vaultKey) return;

    showAlert({
      title: 'Delete Password',
      message: 'Are you sure you want to delete this password?',
      cancelText: 'Cancel',
      confirmText: 'Delete',
      type: 'destructive',
      onCancel: () => {},
      onConfirm: async () => {
        const updatedPasswords = vault.passwords.filter((_, idx) => idx !== globalIndex);
        try {
          setVault((prev) => ({ ...prev, passwords: updatedPasswords }));
          await saveVault({ ...vault, passwords: updatedPasswords }, vaultKey);
          setExpandedIndex(null);
        } catch (e: any) {
          showAlert({
            title: 'Error',
            message: e?.message ?? 'Failed to delete password',
            confirmText: 'OK',
            onConfirm: () => {},
          });
        }
      },
    });
  };

  // Search results with match highlighting
  const searchResults = React.useMemo((): SearchResult[] => {
    if (!vault?.passwords) return [];

    let results: SearchResult[] = [];

    // If showing favorites only
    if (showFavoritesOnly) {
      vault.passwords.forEach((pwd, idx) => {
        if (pwd.isFavorite) {
          const category = pwd.category || categorizeService(pwd.service);
          results.push({
            ...pwd,
            category,
            globalIndex: idx,
            matchType: 'service',
          });
        }
      });
      return results;
    }

    // Regular search
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();

    vault.passwords.forEach((pwd, idx) => {
      const category = pwd.category || categorizeService(pwd.service);
      let matchType: 'service' | 'username' | 'notes' | null = null;

      if (pwd.service.toLowerCase().includes(query)) {
        matchType = 'service';
      } else if (pwd.username.toLowerCase().includes(query)) {
        matchType = 'username';
      } else if (pwd.notes?.toLowerCase().includes(query)) {
        matchType = 'notes';
      }

      if (matchType) {
        results.push({
          ...pwd,
          category,
          globalIndex: idx,
          matchType,
        });
      }
    });

    // Sort: favorites first, then by service name
    results.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.service.localeCompare(b.service);
    });

    return results;
  }, [vault?.passwords, searchQuery, showFavoritesOnly]);

  // Popular services suggestion (normalized and grouped by icon)
  const popularServices = React.useMemo(() => {
    if (!vault?.passwords) return [];
    const serviceCounts = new Map<string, number>();

    vault.passwords.forEach((pwd) => {
      const normalized = normalizeServiceName(pwd.service);
      const count = serviceCounts.get(normalized) || 0;
      serviceCounts.set(normalized, count + 1);
    });

    // Get top services
    const topServices = Array.from(serviceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);

    // Group by icon to avoid duplicates
    const iconGroups = new Map<string, { service: string; count: number; displayName: string }>();
    
    topServices.forEach(([service, count]) => {
      const iconName = getServiceIcon(service);
      
      // If this icon already exists, keep the one with higher count
      const existing = iconGroups.get(iconName);
      if (!existing || count > existing.count) {
        // Special handling for globe icon - show as "Others"
        const displayName = iconName === 'globe-outline' ? 'Others' : service;
        iconGroups.set(iconName, { service, count, displayName });
      }
    });

    // Return unique services (one per icon type), max 8
    return Array.from(iconGroups.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [vault?.passwords]);

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;

    return (
      <>
        {text.substring(0, index)}
        <Text style={{ backgroundColor: colors.primary + '40', fontWeight: '900' }}>
          {text.substring(index, index + query.length)}
        </Text>
        {text.substring(index + query.length)}
      </>
    );
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    const iconName = getServiceIcon(item.service);
    const iconColor = getServiceColor(item.service, resolved === 'dark');
    const categoryInfo = getCategoryById(item.category as any);
    const isExpanded = expandedIndex === item.globalIndex;

    return (
      <TouchableOpacity
        style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setExpandedIndex(isExpanded ? null : item.globalIndex)}
        onLongPress={() => openMoveModal(item.globalIndex, item.category)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={styles.resultHeader}>
          <View style={[styles.resultIcon, { backgroundColor: iconColor + '15' }]}>
            <Ionicons name={iconName as any} size={22} color={iconColor} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.resultService, { color: colors.text }]} numberOfLines={1}>
              {highlightMatch(item.service, searchQuery)}
            </Text>
            <View style={styles.resultMeta}>
              <Text style={[styles.resultUsername, { color: colors.mutedText }]} numberOfLines={1}>
                {highlightMatch(item.username, searchQuery)}
              </Text>
              <View style={styles.categoryBadge}>
                <Ionicons name={categoryInfo.icon as any} size={10} color={colors.mutedText} />
                <Text style={[styles.categoryText, { color: colors.mutedText }]}>
                  {categoryInfo.name}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: item.isFavorite ? '#fbbf24' + '20' : colors.inputBg }]}
              onPress={() => toggleFavorite(item.globalIndex)}
            >
              <Ionicons 
                name={item.isFavorite ? "star" : "star-outline"} 
                size={16} 
                color={item.isFavorite ? "#fbbf24" : colors.mutedText} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: colors.primary + '15' }]}
              onPress={() => copyToClipboard(item.username, 'Username')}
            >
              <Ionicons name="person" size={14} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickBtn, { backgroundColor: colors.primary + '15' }]}
              onPress={() => copyToClipboard(item.password, 'Password')}
            >
              <Ionicons name="key" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {isExpanded ? (
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
                      onPress={() =>
                        setShowPasswordIndex(
                          showPasswordIndex === item.globalIndex ? null : item.globalIndex
                        )
                      }
                    >
                      <Ionicons
                        name={
                          showPasswordIndex === item.globalIndex ? 'eye-off-outline' : 'eye-outline'
                        }
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

            {item.loginPin ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.mutedText }]}>Login PIN</Text>
                <View style={styles.detailValue}>
                  <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                    {showPasswordIndex === item.globalIndex
                      ? item.loginPin
                      : '●'.repeat(item.loginPin.length)}
                  </Text>
                  <TouchableOpacity onPress={() => copyToClipboard(item.loginPin!, 'Login PIN')}>
                    <Ionicons name="copy-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {item.transactionPin ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.mutedText }]}>
                  Transaction PIN
                </Text>
                <View style={styles.detailValue}>
                  <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                    {showPasswordIndex === item.globalIndex
                      ? item.transactionPin
                      : '●'.repeat(item.transactionPin.length)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(item.transactionPin!, 'Transaction PIN')}
                  >
                    <Ionicons name="copy-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {item.notes ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.mutedText }]}>Notes</Text>
                <Text style={[styles.detailText, { color: colors.text }]}>{item.notes}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: '#ef4444' }]}
              onPress={() => handleDelete(item.globalIndex)}
            >
              <Ionicons name="trash" size={16} color="#fff" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <Animated.View style={[
        styles.container, 
        { 
          backgroundColor: colors.background, 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.mutedText} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search usernames,passwords..."
              placeholderTextColor={colors.mutedText}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (showFavoritesOnly) setShowFavoritesOnly(false);
              }}
              onSubmitEditing={() => {
                saveRecentSearch(searchQuery);
                Keyboard.dismiss();
              }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.mutedText} />
              </TouchableOpacity>
            ) : null}
          </View>
          
          <TouchableOpacity 
            onPress={() => {
              setShowFavoritesOnly(!showFavoritesOnly);
              setSearchQuery('');
            }}
            style={[
              styles.favoriteBtn, 
              { 
                backgroundColor: showFavoritesOnly ? colors.primary : colors.card,
                borderColor: showFavoritesOnly ? colors.primary : colors.border
              }
            ]}
          >
            <Ionicons 
              name={showFavoritesOnly ? "star" : "star-outline"} 
              size={22} 
              color={showFavoritesOnly ? "#fff" : colors.text} 
            />
          </TouchableOpacity>
        </View>

        {searchQuery.trim() || showFavoritesOnly ? (
          <View style={styles.content}>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsCount, { color: colors.text }]}>
                {showFavoritesOnly ? '⭐ Favorites' : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}
              </Text>
            </View>

            <FlatList
              bounces={true}
              alwaysBounceVertical={true}
              data={searchResults}
              keyExtractor={(item) => `${item.service}-${item.username}-${item.globalIndex}`}
              renderItem={renderSearchResult}
              contentContainerStyle={styles.resultsList}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={64} color={colors.mutedText} />
                  <Text style={[styles.emptyText, { color: colors.text }]}>No results found</Text>
                  <Text style={[styles.emptySubtext, { color: colors.mutedText }]}>
                    Try a different search term
                  </Text>
                </View>
              }
            />
          </View>
        ) : (
          <View style={styles.content}>
            {recentSearches.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Searches</Text>
                  <TouchableOpacity onPress={clearRecentSearches}>
                    <Text style={[styles.clearBtn, { color: colors.primary }]}>Clear</Text>
                  </TouchableOpacity>
                </View>
                {recentSearches.map((search, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.recentItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setSearchQuery(search)}
                  >
                    <Ionicons name="time-outline" size={18} color={colors.mutedText} />
                    <Text style={[styles.recentText, { color: colors.text }]}>{search}</Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.mutedText} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {popularServices.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Access</Text>
                <View style={styles.chipsContainer}>
                  {popularServices.map((item, idx) => {
                    const iconName = getServiceIcon(item.service);
                    const iconColor = getServiceColor(item.service, resolved === 'dark');
                    return (
                      <TouchableOpacity
                        key={`${iconName}-${idx}`}
                        style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => setSearchQuery(item.service)}
                      >
                        <Ionicons name={iconName as any} size={16} color={iconColor} />
                        <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
                          {item.displayName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.tipsSection}>
              <Ionicons name="bulb-outline" size={24} color={colors.primary} />
              <Text style={[styles.tipsText, { color: colors.mutedText }]}>
                Search by service name, username, or notes to quickly find your passwords
              </Text>
            </View>
          </View>
        )}
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
              <Ionicons name="move" size={24} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Move to Category</Text>
              <TouchableOpacity onPress={closeMoveModal}>
                <Ionicons name="close" size={24} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <View style={styles.categoryGrid}>
              {categories
                .filter(cat => cat.id !== currentCategory && cat.id !== 'other')
                .map((cat) => (
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 20,
    height: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsHeader: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultsList: {
    paddingBottom: 20,
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
  },
  resultService: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultUsername: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 6,
  },
  quickBtn: {
    width: 32,
    height: 32,
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
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  clearBtn: {
    fontSize: 14,
    fontWeight: '700',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  recentText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: '48%',
    minHeight: 20,
    paddingLeft: 16,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  tipsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginTop: 20,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
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
