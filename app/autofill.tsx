import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { getServiceColor, getServiceIcon } from '@/lib/service-icons';
import autofillService from '@/lib/autofill';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

export default function AutofillScreen() {
  const router = useRouter();
  const { unlocked, vault } = useSession();
  const { colors, resolved } = useTheme();

  const [packageName, setPackageName] = React.useState('');
  const [webDomain, setWebDomain] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    if (!unlocked) {
      router.replace('/login');
      return;
    }

    (async () => {
      try {
        const data = await autofillService.getAutofillIntentData();
        setPackageName(data.packageName);
        setWebDomain(data.webDomain);
      } catch (e) {
        console.error('Failed to get autofill intent data:', e);
      }
    })();
  }, [unlocked, router]);

  const passwords = React.useMemo(() => {
    return vault?.passwords || [];
  }, [vault]);

  // Clean domain helper for comparison (e.g. login.microsoft.com -> microsoft)
  const getDomainName = (url: string): string => {
    let hostname = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
    hostname = hostname.split('/')[0];
    const parts = hostname.split('.');
    if (parts.length > 1) {
      return parts[parts.length - 2];
    }
    return hostname;
  };

  const getAppName = (pkg: string): string => {
    if (!pkg) return '';
    const parts = pkg.toLowerCase().split('.');
    if (parts.length > 0) {
      // Return last part or second to last if last is android/com
      const last = parts[parts.length - 1];
      if ((last === 'android' || last === 'app' || last === 'client') && parts.length > 1) {
        return parts[parts.length - 2];
      }
      return last;
    }
    return pkg;
  };

  const cleanDomain = React.useMemo(() => getDomainName(webDomain), [webDomain]);
  const cleanApp = React.useMemo(() => getAppName(packageName), [packageName]);

  const suggestedPasswords = React.useMemo(() => {
    if (!packageName && !webDomain) return [];
    
    return passwords.filter(item => {
      const service = item.service.toLowerCase();
      
      // Match against domain name
      if (cleanDomain && (service.includes(cleanDomain) || cleanDomain.includes(service))) {
        return true;
      }
      
      // Match against package name
      if (cleanApp && (service.includes(cleanApp) || cleanApp.includes(service))) {
        return true;
      }
      
      return false;
    });
  }, [passwords, cleanDomain, cleanApp]);

  const filteredPasswords = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      // Exclude suggestions from the main list if no query exists
      return passwords.filter(p => !suggestedPasswords.includes(p));
    }
    
    return passwords.filter(item => 
      item.service.toLowerCase().includes(query) ||
      item.username.toLowerCase().includes(query)
    );
  }, [passwords, searchQuery, suggestedPasswords]);

  const handleSelect = async (item: typeof passwords[number]) => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await autofillService.fillCredentials(item.username, item.password);
    } catch (e) {
      console.error('Autofill fill failed:', e);
    }
  };

  const handleCancel = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await autofillService.cancelAutofill();
    } catch (e) {
      console.error('Autofill cancel failed:', e);
      router.replace('/login');
    }
  };

  const renderItem = ({ item }: { item: typeof passwords[number] }) => {
    const iconName = getServiceIcon(item.service);
    const brandColor = getServiceColor(item.service) || colors.primary;
    
    return (
      <TouchableOpacity
        style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: brandColor + '12' }]}>
          <Ionicons name={iconName as any} size={18} color={brandColor} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
            {item.service}
          </Text>
          <Text style={[styles.itemSub, { color: colors.mutedText }]} numberOfLines={1}>
            {item.username || 'No Username'}
          </Text>
        </View>
        <View style={[styles.fillIndicator, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="arrow-forward" size={14} color={colors.text} />
        </View>
      </TouchableOpacity>
    );
  };

  const targetLabel = webDomain 
    ? getDomainName(webDomain).toUpperCase() 
    : cleanApp 
      ? cleanApp.toUpperCase() 
      : 'Requested App';

  const isDark = resolved === 'dark';

  return (
    <Screen style={{ padding: 0 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Autofill</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              Select credentials for {targetLabel}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.cancelBtn, { borderColor: colors.border }]} 
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.mutedText} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search passwords..."
              placeholderTextColor={colors.mutedText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.mutedText} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <FlatList
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          data={filteredPasswords}
          keyExtractor={(item, index) => `${item.service}-${item.username}-${index}`}
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              {suggestedPasswords.length > 0 && !searchQuery ? (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="bulb-outline" size={14} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.primary }]}>Suggested</Text>
                  </View>
                  <FlatList
                    data={suggestedPasswords}
                    keyExtractor={(item, index) => `suggested-${item.service}-${item.username}-${index}`}
                    renderItem={renderItem}
                    scrollEnabled={false}
                  />
                  
                  {filteredPasswords.length > 0 && (
                    <View style={styles.sectionHeaderRow}>
                      <Ionicons name="list-outline" size={14} color={colors.mutedText} />
                      <Text style={[styles.sectionTitle, { color: colors.mutedText }]}>Other Passwords</Text>
                    </View>
                  )}
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.card }]}>
                <Ionicons name="search" size={24} color={colors.mutedText} />
              </View>
              <Text style={[styles.emptyText, { color: colors.text }]}>No Matches</Text>
              <Text style={[styles.emptySub, { color: colors.mutedText }]}>
                {passwords.length === 0 
                  ? 'Your vault has no credentials stored.' 
                  : 'Try adjusting your search terms.'}
              </Text>
            </View>
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  cancelBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    height: '100%',
    padding: 0,
  },
  listContent: {
    paddingBottom: 30,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  itemSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  fillIndicator: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
