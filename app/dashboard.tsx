import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { useToast } from '@/context/ToastProvider';
import { categories, categorizeService, DEFAULT_DELETE_CATEGORY_KEY, getCategoryById, getEffectiveCategories, type CategoryType } from '@/lib/categories';
import { getServiceColor, getServiceIcon } from '@/lib/service-icons';
import { copyToClipboardWithAutoClear } from '@/lib/clipboard';
import { triggerLightHaptic } from '@/lib/haptics';
import { getTOTPDetails } from '@/lib/totp';
import {
  getWorkspaceCustomTags,
  getWorkspaceDeletedCategories,
  saveVault,
  type PasswordItem,
  type VaultData,
} from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import {
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const DOUBLE_TAP_LOCK_KEY = 'double_tap_lock';

function TotpCodeDisplay({
  secret,
  colors,
  copyToClipboard,
}: {
  secret: string;
  colors: any;
  copyToClipboard: (text: string, label: string) => void;
}) {
  const [details, setDetails] = React.useState(() => getTOTPDetails(secret));

  React.useEffect(() => {
    setDetails(getTOTPDetails(secret));
    const timer = setInterval(() => {
      setDetails(getTOTPDetails(secret));
    }, 1000);
    return () => clearInterval(timer);
  }, [secret]);

  const formattedCode =
    details.code.length === 6
      ? `${details.code.slice(0, 3)} ${details.code.slice(3)}`
      : details.code;

  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.mutedText }]}>2FA Code (TOTP)</Text>
      <View style={styles.detailValue}>
        <Text style={[styles.detailText, { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 1 }]}>
          {formattedCode}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: colors.mutedText, fontSize: 11, fontWeight: '600' }}>
            {details.remainingSeconds}s
          </Text>
          <TouchableOpacity onPress={() => copyToClipboard(details.code, '2FA Code')}>
            <Ionicons name="copy-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function TotpMediumCard({
  item,
  colors,
  resolved,
  onCopy,
}: {
  item: PasswordItem;
  colors: any;
  resolved: string;
  onCopy: (code: string) => void;
}) {
  const [details, setDetails] = React.useState(() => getTOTPDetails(item.totpSecret));
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setDetails(getTOTPDetails(item.totpSecret));
    const timer = setInterval(() => {
      setDetails(getTOTPDetails(item.totpSecret));
    }, 1000);
    return () => clearInterval(timer);
  }, [item.totpSecret]);

  const handleCopy = React.useCallback(() => {
    onCopy(details.code);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }, [details.code, onCopy]);

  const iconName = getServiceIcon(item.service);
  const iconColor = getServiceColor(item.service, resolved === 'dark');
  const isUrgent = details.remainingSeconds <= 5;
  const progressPercent = Math.max(0, Math.min(100, (details.remainingSeconds / 30) * 100));

  const formattedCode =
    details.code.length === 6
      ? `${details.code.slice(0, 3)} ${details.code.slice(3)}`
      : details.code;

  const cardBg = resolved === 'dark' ? '#242426' : '#FFFFFF';
  const copyBtnBg = copied
    ? (resolved === 'dark' ? '#0F3820' : '#DCFCE7')
    : (resolved === 'dark' ? '#1A2E44' : '#E0EEFF');
  const copyBtnColor = copied ? '#16a34a' : colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.totpCard,
        {
          backgroundColor: cardBg,
          borderColor: colors.border,
        },
      ]}
      onPress={handleCopy}
      activeOpacity={0.7}
      accessibilityLabel={`Copy 2FA code for ${item.service}`}
    >
      {/* Top Row: Icon, Service, Username, and Countdown Timer */}
      <View style={styles.totpCardTopRow}>
        <View style={styles.totpCardServiceWrap}>
          <View style={[styles.totpCardIconWrap, { backgroundColor: iconColor + '18' }]}>
            <Ionicons name={iconName as any} size={20} color={iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.totpCardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.service}
            </Text>
            <Text style={[styles.totpCardSub, { color: colors.mutedText }]} numberOfLines={1}>
              {item.username}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.totpTimerBadge,
            { backgroundColor: isUrgent ? '#ef444418' : (resolved === 'dark' ? '#1A2E44' : '#E0EEFF') },
          ]}
        >
          <Ionicons
            name="time-outline"
            size={13}
            color={isUrgent ? '#ef4444' : colors.primary}
          />
          <Text
            style={[
              styles.totpTimerText,
              { color: isUrgent ? '#ef4444' : colors.primary },
            ]}
          >
            {details.remainingSeconds}s
          </Text>
        </View>
      </View>

      {/* Code Row: Large Bold Code + 1-Tap Copy Button */}
      <View style={styles.totpCardCodeRow}>
        <Text style={[styles.totpLargeCode, { color: colors.text }]}>
          {formattedCode}
        </Text>

        <TouchableOpacity
          style={[
            styles.totpCopyBtn,
            {
              backgroundColor: copyBtnBg,
              borderColor: copied ? '#22c55e' : colors.primary,
            },
          ]}
          onPress={handleCopy}
          activeOpacity={0.7}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={14}
            color={copyBtnColor}
          />
          <Text style={[styles.totpCopyBtnText, { color: copyBtnColor }]}>
            {copied ? 'Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Track */}
      <View style={[styles.totpProgressBarBg, { backgroundColor: resolved === 'dark' ? '#333336' : '#EEF2F6' }]}>
        <View
          style={[
            styles.totpProgressBarFill,
            {
              width: `${progressPercent}%`,
              backgroundColor: isUrgent ? '#ef4444' : colors.primary,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

interface FilterPillProps {
  isSelected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  children: (props: { isHighlighted: boolean }) => React.ReactNode;
}

function FilterPill({
  isSelected,
  onPress,
  onLongPress,
  accessibilityLabel,
  children,
}: FilterPillProps) {
  const { colors, showBorders, resolved } = useTheme();
  const [isHovered, setIsHovered] = React.useState(false);
  const activePillBg = resolved === 'dark' ? 'rgba(77, 150, 255, 0.16)' : 'rgba(59, 125, 237, 0.12)';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => {
        const isHighlighted = isSelected || isHovered || pressed;
        return [
          styles.pill,
          isHighlighted
            ? {
                backgroundColor: activePillBg,
                borderColor: showBorders
                  ? (resolved === 'dark' ? '#3A3A3C' : '#000000')
                  : 'transparent',
                borderWidth: colors.borderWidth,
                elevation: 0,
              }
            : {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: colors.borderWidth,
                elevation: 0,
              },
        ];
      }}
    >
      {({ pressed }) => {
        const isHighlighted = isSelected || isHovered || pressed;
        return children({ isHighlighted });
      }}
    </Pressable>
  );
}

function PillCountBadge({ count, isHighlighted }: { count: number; isHighlighted: boolean }) {
  const { colors, resolved } = useTheme();
  const bg = isHighlighted
    ? (resolved === 'dark' ? 'rgba(77, 150, 255, 0.22)' : 'rgba(59, 125, 237, 0.16)')
    : (resolved === 'dark' ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)');

  return (
    <View style={[styles.pillCountCircle, { backgroundColor: bg }]}>
      <Text style={[styles.pillCountText, { color: isHighlighted ? colors.primary : colors.mutedText }]}>
        {count}
      </Text>
    </View>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { unlocked, vault, vaultKey, setVault, lock, resetAutoLockTimer, activeWorkspace } = useSession();
  const { colors, showBorders, resolved } = useTheme();

  // Light-gray / clean card tokens for dialogs matching webstack
  const dullCardBg = resolved === 'dark' ? '#1c2027' : '#FFFFFF';
  const actionTileBg = resolved === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#F5F5F7';
  const dullCardBorder = resolved === 'dark' ? '#2e3440' : '#E5E7EB';
  const dullInputBg = resolved === 'dark' ? '#13161c' : '#F9FAFB';
  const dullInputBorder = resolved === 'dark' ? '#2e3440' : '#E5E7EB';
  const dullCancelBg = resolved === 'dark' ? '#252a34' : '#F3F4F6';
  const dullCancelBorder = resolved === 'dark' ? '#333a48' : '#E5E7EB';
  const { showAlert, AlertComponent } = useCustomAlert();
  const { showToast } = useToast();

  // Selected filter: 'all' | 'favorites' | CategoryType | `folder:${string}`
  const [selectedPill, setSelectedPill] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);
  const [showPasswordIndex, setShowPasswordIndex] = React.useState<number | null>(null);
  const [selectedPasswordForAction, setSelectedPasswordForAction] = React.useState<{
    item: PasswordItem;
    globalIndex: number;
  } | null>(null);
  const [showPasswordActionModal, setShowPasswordActionModal] = React.useState(false);
  const [showTotpModal, setShowTotpModal] = React.useState(false);
  const [showAddTagModal, setShowAddTagModal] = React.useState(false);
  const [showTagActionModal, setShowTagActionModal] = React.useState(false);
  const [showEditTagModal, setShowEditTagModal] = React.useState(false);
  const [selectedItemToManage, setSelectedItemToManage] = React.useState<{ type: 'category' | 'tag'; id: string; name: string } | null>(null);
  const [newTagName, setNewTagName] = React.useState('');
  const [editTagName, setEditTagName] = React.useState('');
  const [isAddTagHovered, setIsAddTagHovered] = React.useState(false);

  // Move Modal state (Material 3 Bottom Sheet)
  const [showMoveModal, setShowMoveModal] = React.useState(false);
  const [selectedPasswordIndex, setSelectedPasswordIndex] = React.useState<number | null>(null);
  const [currentCategory, setCurrentCategory] = React.useState<string>('');
  const [currentTag, setCurrentTag] = React.useState<string | null>(null);
  const [moveNewTagInput, setMoveNewTagInput] = React.useState<string>('');

  const [doubleTapEnabled, setDoubleTapEnabled] = React.useState(false);
  const [lastTap, setLastTap] = React.useState(0);

  React.useEffect(() => {
    if (!unlocked) {
      router.replace('/login');
    }
  }, [unlocked, router]);

  useFocusEffect(
    React.useCallback(() => {
      resetAutoLockTimer();
      (async () => {
        const doubleTap = await SecureStore.getItemAsync(DOUBLE_TAP_LOCK_KEY);
        setDoubleTapEnabled(doubleTap === 'true');
      })();
    }, [resetAutoLockTimer])
  );


  // Unique custom folders & user created tags (filtered to active workspace, excluding built-in categories)
  const uniqueFolders = React.useMemo(() => {
    if (!vault) return [];
    const currentWs = activeWorkspace || 'Personal';
    const currentWsDeleted = getWorkspaceDeletedCategories(vault, currentWs);
    const effectiveCats = getEffectiveCategories(currentWsDeleted, vault.categoryOverrides);
    const builtInNames = new Set<string>();
    effectiveCats.forEach((c) => {
      builtInNames.add(c.name.toLowerCase());
      builtInNames.add(c.id.toLowerCase());
    });
    const pFolders = (vault.passwords || [])
      .filter((p) => (p.workspace || 'Personal') === currentWs)
      .map((p) => p.folder)
      .filter(Boolean) as string[];
    const cFolders = (vault.cards || [])
      .filter((c) => (c.workspace || 'Personal') === currentWs)
      .map((c) => c.folder)
      .filter(Boolean) as string[];
    const custom = getWorkspaceCustomTags(vault, currentWs);
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of [...custom, ...pFolders, ...cFolders]) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (builtInNames.has(lower) || seen.has(lower)) continue;
      seen.add(lower);
      result.push(trimmed);
    }
    return result;
  }, [vault, activeWorkspace]);

  // Total passwords in the active workspace
  const activeWorkspacePasswordsCount = React.useMemo(() => {
    if (!vault?.passwords) return 0;
    const currentWs = activeWorkspace || 'Personal';
    return vault.passwords.filter((pwd) => (pwd.workspace || 'Personal') === currentWs).length;
  }, [vault?.passwords, activeWorkspace]);

  // Total favorites in the active workspace
  const activeWorkspaceFavoritesCount = React.useMemo(() => {
    if (!vault?.passwords) return 0;
    const currentWs = activeWorkspace || 'Personal';
    return vault.passwords.filter(
      (pwd) => (pwd.workspace || 'Personal') === currentWs && Boolean(pwd.isFavorite)
    ).length;
  }, [vault?.passwords, activeWorkspace]);

  React.useEffect(() => {
    if (selectedPill === 'favorites' && activeWorkspaceFavoritesCount === 0) {
      setSelectedPill('all');
    }
  }, [selectedPill, activeWorkspaceFavoritesCount]);

  // Total secure notes in the active workspace
  const activeWorkspaceNotesCount = React.useMemo(() => {
    if (!vault?.passwords) return 0;
    const currentWs = activeWorkspace || 'Personal';
    return vault.passwords.filter(
      (pwd) => (pwd.workspace || 'Personal') === currentWs && pwd.itemType === 'note'
    ).length;
  }, [vault?.passwords, activeWorkspace]);

  React.useEffect(() => {
    if (selectedPill === 'notes' && activeWorkspaceNotesCount === 0) {
      setSelectedPill('all');
    }
  }, [selectedPill, activeWorkspaceNotesCount]);

  // All 2FA enabled accounts in the active workspace
  const activeWorkspace2faAccounts = React.useMemo(() => {
    if (!vault?.passwords) return [];
    const currentWs = activeWorkspace || 'Personal';
    return vault.passwords
      .map((pwd, idx) => ({ ...pwd, globalIndex: idx }))
      .filter((pwd) => (pwd.workspace || 'Personal') === currentWs && Boolean(pwd.totpSecret?.trim()));
  }, [vault?.passwords, activeWorkspace]);

  // Effective active categories (excluding deleted ones for active workspace, applying custom names)
  const effectiveCategories = React.useMemo(() => {
    const wsDeleted = getWorkspaceDeletedCategories(vault, activeWorkspace || 'Personal');
    return getEffectiveCategories(wsDeleted, vault?.categoryOverrides);
  }, [vault, activeWorkspace]);

  // Category counts
  const categoryCounts = React.useMemo(() => {
    if (!vault?.passwords) return {};
    const currentWs = activeWorkspace || 'Personal';
    const wsDeleted = getWorkspaceDeletedCategories(vault, currentWs);
    const counts: { [key: string]: number } = {};
    vault.passwords.forEach((pwd) => {
      const itemWs = pwd.workspace || 'Personal';
      if (itemWs !== currentWs) return;
      const cat = pwd.category || categorizeService(pwd.service, wsDeleted);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [vault, activeWorkspace]);

  // Folder counts
  const folderCounts = React.useMemo(() => {
    if (!vault?.passwords) return {};
    const counts: { [key: string]: number } = {};
    vault.passwords.forEach((pwd) => {
      const itemWs = pwd.workspace || 'Personal';
      if (itemWs !== (activeWorkspace || 'Personal')) return;
      const key = pwd.folder?.trim().toLowerCase();
      if (key) {
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [vault?.passwords, activeWorkspace]);

  // Filtered passwords list
  const filteredPasswords = React.useMemo(() => {
    if (!vault?.passwords) return [];
    const q = searchQuery.trim().toLowerCase();

    return vault.passwords
      .map((pwd, idx) => ({ ...pwd, globalIndex: idx }))
      .filter((pwd) => {
        const itemWs = pwd.workspace || 'Personal';
        if (itemWs !== (activeWorkspace || 'Personal')) return false;

        if (selectedPill === 'favorites') {
          if (!pwd.isFavorite) return false;
        } else if (selectedPill === 'notes') {
          if (pwd.itemType !== 'note') return false;
        } else if (selectedPill !== 'all') {
          if (selectedPill.startsWith('folder:')) {
            const folderName = selectedPill.replace('folder:', '').trim().toLowerCase();
            if ((pwd.folder || '').trim().toLowerCase() !== folderName) return false;
          } else {
            const wsDeleted = getWorkspaceDeletedCategories(vault, activeWorkspace || 'Personal');
            const pwdCategory = pwd.category || categorizeService(pwd.service, wsDeleted);
            if (pwdCategory !== selectedPill) return false;
          }
        }

        if (q) {
          const matchService = pwd.service.toLowerCase().includes(q);
          const matchUsername = pwd.username.toLowerCase().includes(q);
          const matchWebsite = pwd.website?.toLowerCase().includes(q);
          const matchFolder = pwd.folder?.toLowerCase().includes(q);
          const matchNotes = pwd.notes?.toLowerCase().includes(q);
          return matchService || matchUsername || matchWebsite || matchFolder || matchNotes;
        }

        return true;
      })
      .sort((a, b) => {
        if (selectedPill !== 'favorites') {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
        }
        return a.service.toLowerCase().localeCompare(b.service.toLowerCase());
      });
  }, [vault?.passwords, vault?.deletedCategories, selectedPill, searchQuery, activeWorkspace]);

  const handleToggleFavorite = React.useCallback(
    async (globalIndex: number) => {
      if (!vault || !vaultKey) return;
      const currentItem = vault.passwords[globalIndex];
      if (!currentItem) return;

      const nextFavorite = !currentItem.isFavorite;
      const updatedPasswords = [...vault.passwords];
      updatedPasswords[globalIndex] = {
        ...currentItem,
        isFavorite: nextFavorite,
        modifiedAt: Date.now(),
      };

      const updatedVault: VaultData = { ...vault, passwords: updatedPasswords };
      try {
        await saveVault(updatedVault, vaultKey);
        setVault(() => updatedVault);
      } catch {
        showAlert({
          title: 'Error',
          message: 'Failed to update favorite status.',
          confirmText: 'OK',
          onConfirm: () => {},
        });
      }
    },
    [vault, vaultKey, setVault, showAlert]
  );

  const handleDoubleTap = () => {
    if (!doubleTapEnabled) return;
    const now = Date.now();
    if (now - lastTap < 300) {
      lock();
      router.replace('/login');
    }
    setLastTap(now);
  };

  const copyToClipboard = React.useCallback(
    async (text: string, label: string) => {
      await copyToClipboardWithAutoClear(text);
      triggerLightHaptic();
      showToast(`${label} copied`);
    },
    [showToast]
  );

  const openWebsite = React.useCallback(
    async (rawUrl: string) => {
      const trimmed = rawUrl.trim();
      if (!trimmed) return;
      const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed);
      const targetUrl = schemeMatch ? trimmed : `https://${trimmed}`;
      if (!/^https?:\/\//i.test(targetUrl)) {
        showAlert({
          title: 'Invalid URL',
          message: 'Only http:// and https:// links can be opened.',
          confirmText: 'OK',
          onConfirm: () => {},
        });
        return;
      }
      try {
        await Linking.openURL(targetUrl);
      } catch {
        showAlert({
          title: 'Unable to Open',
          message: 'Could not open this website in your browser.',
          confirmText: 'OK',
          onConfirm: () => {},
        });
      }
    },
    [showAlert]
  );

  const handleDelete = React.useCallback(
    async (globalIndex: number) => {
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
          const updatedVault = { ...vault, passwords: updatedPasswords };
          try {
            await saveVault(updatedVault, vaultKey);
            setVault(() => updatedVault);
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
    },
    [vault, vaultKey, setVault, showAlert]
  );

  const handleOpenItemActions = React.useCallback((item: { type: 'category' | 'tag'; id: string; name: string }) => {
    setSelectedItemToManage(item);
    setShowTagActionModal(true);
  }, []);

  const handleCreateTag = React.useCallback(async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) {
      showAlert({
        title: 'Empty Name',
        message: 'Please enter a name for the tag.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    const activeCats = getEffectiveCategories(vault?.deletedCategories, vault?.categoryOverrides);
    if (activeCats.some((c) => c.name.toLowerCase() === trimmed.toLowerCase() || c.id === trimmed.toLowerCase())) {
      showAlert({
        title: 'Reserved Name',
        message: 'This name matches an active tag. Please choose a different name.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    const existingTags = uniqueFolders.map((t) => t.toLowerCase());
    if (existingTags.includes(trimmed.toLowerCase())) {
      showAlert({
        title: 'Tag Already Exists',
        message: `A tag named "${trimmed}" already exists.`,
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    if (!vault || !vaultKey) return;
    const currentWs = activeWorkspace || 'Personal';

    const currentWsCustom = getWorkspaceCustomTags(vault, currentWs);
    const updatedWsCustom = currentWsCustom.includes(trimmed) ? currentWsCustom : [...currentWsCustom, trimmed];
    const updatedWorkspaceCustomTags = {
      ...(vault.workspaceCustomTags || {}),
      [currentWs]: updatedWsCustom,
    };

    const currentCustom = vault.customTags || [];
    const updatedCustom = currentCustom.includes(trimmed) ? currentCustom : [...currentCustom, trimmed];
    const updatedVault: VaultData = {
      ...vault,
      customTags: updatedCustom,
      workspaceCustomTags: updatedWorkspaceCustomTags,
    };

    try {
      await saveVault(updatedVault, vaultKey);
      setVault(() => updatedVault);
      setShowAddTagModal(false);
      setNewTagName('');
      setSelectedPill(`folder:${trimmed}`);
    } catch {
      showAlert({
        title: 'Error',
        message: 'Failed to create tag. Please try again.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    }
  }, [newTagName, uniqueFolders, vault, vaultKey, setVault, showAlert, activeWorkspace]);

  const handleStartEditItem = React.useCallback(() => {
    if (!selectedItemToManage) return;
    setEditTagName(selectedItemToManage.name);
    setShowTagActionModal(false);
    setShowEditTagModal(true);
  }, [selectedItemToManage]);

  const handleSaveEditItem = React.useCallback(async () => {
    if (!selectedItemToManage || !vault || !vaultKey) return;
    const trimmed = editTagName.trim();
    if (!trimmed || trimmed === selectedItemToManage.name) {
      setShowEditTagModal(false);
      return;
    }

    const activeCats = getEffectiveCategories(vault.deletedCategories, vault.categoryOverrides);
    const otherCatNames = activeCats
      .filter((c) => selectedItemToManage.type !== 'category' || c.id !== selectedItemToManage.id)
      .map((c) => c.name.toLowerCase());
    const otherTagNames = uniqueFolders
      .filter((t) => selectedItemToManage.type !== 'tag' || t.toLowerCase() !== selectedItemToManage.name.toLowerCase())
      .map((t) => t.toLowerCase());

    if (otherCatNames.includes(trimmed.toLowerCase()) || otherTagNames.includes(trimmed.toLowerCase())) {
      showAlert({
        title: 'Name Already Exists',
        message: `A tag named "${trimmed}" already exists.`,
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    let updatedVault: VaultData;

    if (selectedItemToManage.type === 'tag') {
      const oldName = selectedItemToManage.name;
      const currentWs = activeWorkspace || 'Personal';

      // Update workspace custom tags for current workspace
      const currentWsCustom = getWorkspaceCustomTags(vault, currentWs);
      const updatedWsCustom = currentWsCustom.map((t) => (t === oldName ? trimmed : t));
      if (!updatedWsCustom.includes(trimmed)) {
        updatedWsCustom.push(trimmed);
      }
      const updatedWorkspaceCustomTags = {
        ...(vault.workspaceCustomTags || {}),
        [currentWs]: updatedWsCustom,
      };

      // Only rename passwords in the active workspace
      const updatedPasswords = (vault.passwords || []).map((p) => {
        const itemWs = p.workspace || 'Personal';
        if (itemWs === currentWs && p.folder === oldName) {
          return { ...p, folder: trimmed, modifiedAt: Date.now() };
        }
        return p;
      });

      // Only rename cards in the active workspace
      const updatedCards = (vault.cards || []).map((c) => {
        const itemWs = c.workspace || 'Personal';
        if (itemWs === currentWs && c.folder === oldName) {
          return { ...c, folder: trimmed };
        }
        return c;
      });

      // If other workspaces still use oldName, keep oldName in legacy customTags
      const otherWsUseOldName =
        updatedPasswords.some((p) => (p.workspace || 'Personal') !== currentWs && p.folder === oldName) ||
        updatedCards.some((c) => (c.workspace || 'Personal') !== currentWs && c.folder === oldName);

      const currentCustom = vault.customTags || [];
      let updatedCustom = currentCustom.map((t) => (t === oldName && !otherWsUseOldName ? trimmed : t));
      if (!updatedCustom.includes(trimmed)) {
        updatedCustom.push(trimmed);
      }

      updatedVault = {
        ...vault,
        customTags: updatedCustom,
        workspaceCustomTags: updatedWorkspaceCustomTags,
        passwords: updatedPasswords,
        cards: updatedCards,
      };

      if (selectedPill === `folder:${oldName}`) {
        setSelectedPill(`folder:${trimmed}`);
      }
    } else {
      // Category override
      const catId = selectedItemToManage.id;
      const updatedOverrides = {
        ...(vault.categoryOverrides || {}),
        [catId]: trimmed,
      };

      updatedVault = {
        ...vault,
        categoryOverrides: updatedOverrides,
      };
    }

    try {
      await saveVault(updatedVault, vaultKey);
      setVault(() => updatedVault);
      setShowEditTagModal(false);
      setSelectedItemToManage(null);
    } catch {
      showAlert({
        title: 'Error',
        message: 'Failed to update name.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    }
  }, [selectedItemToManage, editTagName, uniqueFolders, vault, vaultKey, setVault, selectedPill, showAlert, activeWorkspace]);

  const handleDeleteItem = React.useCallback(
    async (item: { type: 'category' | 'tag'; id: string; name: string }, fallbackId: CategoryType, fallbackName: string) => {
      if (!vault || !vaultKey) return;
      const currentWs = activeWorkspace || 'Personal';

      let updatedVault: VaultData;

      if (item.type === 'tag') {
        const currentWsCustom = getWorkspaceCustomTags(vault, currentWs).filter((t) => t !== item.name);
        const updatedWorkspaceCustomTags = {
          ...(vault.workspaceCustomTags || {}),
          [currentWs]: currentWsCustom,
        };

        // ONLY update passwords belonging to the active workspace!
        const updatedPasswords = (vault.passwords || []).map((p) => {
          const itemWs = p.workspace || 'Personal';
          if (itemWs === currentWs && p.folder === item.name) {
            return {
              ...p,
              folder: undefined,
              category: fallbackId,
              modifiedAt: Date.now(),
            };
          }
          return p;
        });

        // ONLY update cards belonging to the active workspace!
        const updatedCards = (vault.cards || []).map((c) => {
          const itemWs = c.workspace || 'Personal';
          if (itemWs === currentWs && c.folder === item.name) {
            return { ...c, folder: undefined };
          }
          return c;
        });

        // Check if other workspaces still have items or tags with this name
        const isUsedInOtherWorkspace =
          updatedPasswords.some((p) => (p.workspace || 'Personal') !== currentWs && p.folder === item.name) ||
          updatedCards.some((c) => (c.workspace || 'Personal') !== currentWs && c.folder === item.name) ||
          Object.entries(updatedWorkspaceCustomTags).some(([ws, tags]) => ws !== currentWs && tags.includes(item.name));

        const currentCustom = isUsedInOtherWorkspace
          ? (vault.customTags || [])
          : (vault.customTags || []).filter((t) => t !== item.name);

        updatedVault = {
          ...vault,
          customTags: currentCustom,
          workspaceCustomTags: updatedWorkspaceCustomTags,
          passwords: updatedPasswords,
          cards: updatedCards,
        };
      } else {
        const currentWsDeleted = getWorkspaceDeletedCategories(vault, currentWs);
        const updatedWsDeleted = currentWsDeleted.includes(item.id)
          ? currentWsDeleted
          : [...currentWsDeleted, item.id];

        const updatedWorkspaceDeletedCategories = {
          ...(vault.workspaceDeletedCategories || {}),
          [currentWs]: updatedWsDeleted,
        };

        // ONLY update passwords in the active workspace!
        const updatedPasswords = (vault.passwords || []).map((p) => {
          const itemWs = p.workspace || 'Personal';
          if (itemWs === currentWs) {
            const cat = p.category || categorizeService(p.service, updatedWsDeleted);
            if (cat === item.id) {
              return {
                ...p,
                category: fallbackId,
                modifiedAt: Date.now(),
              };
            }
          }
          return p;
        });

        updatedVault = {
          ...vault,
          workspaceDeletedCategories: updatedWorkspaceDeletedCategories,
          passwords: updatedPasswords,
        };
      }

      try {
        await saveVault(updatedVault, vaultKey);
        setVault(() => updatedVault);

        if (
          (item.type === 'tag' && selectedPill === `folder:${item.name}`) ||
          (item.type === 'category' && selectedPill === item.id)
        ) {
          setSelectedPill('all');
        }
        setSelectedItemToManage(null);

        showAlert({
          title: 'Deleted Successfully',
          message: `"${item.name}" was deleted. All associated accounts were moved to "${fallbackName}".`,
          confirmText: 'OK',
          onConfirm: () => {},
        });
      } catch {
        showAlert({
          title: 'Error',
          message: 'Failed to delete tag. Please try again.',
          confirmText: 'OK',
          onConfirm: () => {},
        });
      }
    },
    [vault, vaultKey, setVault, selectedPill, showAlert, activeWorkspace]
  );

  const handleConfirmDeleteItem = React.useCallback(async () => {
    if (!selectedItemToManage || !vault || !vaultKey) return;
    const targetItem = selectedItemToManage;
    setShowTagActionModal(false);

    const savedFallback = await SecureStore.getItemAsync(DEFAULT_DELETE_CATEGORY_KEY);
    const fallbackId: CategoryType =
      savedFallback && categories.some((c) => c.id === savedFallback && !(vault.deletedCategories || []).includes(c.id))
        ? (savedFallback as CategoryType)
        : 'google';
    const fallbackCat = categories.find((c) => c.id === fallbackId) || categories[0];
    const fallbackName = vault.categoryOverrides?.[fallbackCat.id] || fallbackCat.name;

    showAlert({
      title: `Delete "${targetItem.name}"`,
      message: `Are you sure you want to delete this ${targetItem.type}? All accounts in it will automatically be moved to "${fallbackName}".`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: () => handleDeleteItem(targetItem, fallbackId, fallbackName),
    });
  }, [selectedItemToManage, vault, vaultKey, handleDeleteItem, showAlert]);

  const selectedPasswordForMove = React.useMemo(() => {
    if (selectedPasswordIndex === null || !vault?.passwords) return null;
    return vault.passwords[selectedPasswordIndex] || null;
  }, [selectedPasswordIndex, vault?.passwords]);

  const openMoveSheet = React.useCallback(
    (globalIndex: number, category: string, folder?: string) => {
      setSelectedPasswordIndex(globalIndex);
      setCurrentCategory(category);
      setCurrentTag(folder || null);
      setMoveNewTagInput('');
      setShowMoveModal(true);
    },
    []
  );

  const closeMoveSheet = React.useCallback(() => {
    setShowMoveModal(false);
    setSelectedPasswordIndex(null);
    setCurrentCategory('');
    setCurrentTag(null);
    setMoveNewTagInput('');
  }, []);

  const moveToCategory = React.useCallback(
    async (newCategory: CategoryType) => {
      if (!vault || !vaultKey || selectedPasswordIndex === null) return;

      const updatedPasswords = [...vault.passwords];
      updatedPasswords[selectedPasswordIndex] = {
        ...updatedPasswords[selectedPasswordIndex],
        category: newCategory,
        folder: undefined,
        modifiedAt: Date.now(),
      };

      const updatedVault = { ...vault, passwords: updatedPasswords };

      try {
        await saveVault(updatedVault, vaultKey);
        setVault(() => updatedVault);
        closeMoveSheet();

        const targetCategory = getCategoryById(newCategory);
        showAlert({
          title: 'Moved Successfully',
          message: `Account moved to tag "${targetCategory.name}".`,
          confirmText: 'OK',
          onConfirm: () => {},
        });
      } catch {
        showAlert({
          title: 'Error',
          message: 'Failed to move password',
          confirmText: 'OK',
          onConfirm: () => {},
        });
      }
    },
    [vault, vaultKey, selectedPasswordIndex, setVault, closeMoveSheet, showAlert]
  );

  const moveToTag = React.useCallback(
    async (targetTag: string | null) => {
      if (!vault || !vaultKey || selectedPasswordIndex === null) return;

      const updatedPasswords = [...vault.passwords];
      updatedPasswords[selectedPasswordIndex] = {
        ...updatedPasswords[selectedPasswordIndex],
        folder: targetTag || undefined,
        modifiedAt: Date.now(),
      };

      const updatedVault = { ...vault, passwords: updatedPasswords };

      try {
        await saveVault(updatedVault, vaultKey);
        setVault(() => updatedVault);
        closeMoveSheet();

        showAlert({
          title: targetTag ? 'Tag Assigned' : 'Tag Cleared',
          message: targetTag
            ? `Account moved to tag "${targetTag}".`
            : 'Custom tag removed from account.',
          confirmText: 'OK',
          onConfirm: () => {},
        });
      } catch {
        showAlert({
          title: 'Error',
          message: 'Failed to update tag for password',
          confirmText: 'OK',
          onConfirm: () => {},
        });
      }
    },
    [vault, vaultKey, selectedPasswordIndex, setVault, closeMoveSheet, showAlert]
  );

  const handleCreateAndMoveToTag = React.useCallback(async () => {
    const trimmed = moveNewTagInput.trim();
    if (!trimmed) return;
    if (!vault || !vaultKey || selectedPasswordIndex === null) return;

    const activeCats = getEffectiveCategories(vault?.deletedCategories, vault?.categoryOverrides);
    if (activeCats.some((c) => c.name.toLowerCase() === trimmed.toLowerCase() || c.id === trimmed.toLowerCase())) {
      showAlert({
        title: 'Reserved Name',
        message: 'This name matches an active tag. Please choose a different name.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    const targetWs = vault.passwords[selectedPasswordIndex]?.workspace || activeWorkspace || 'Personal';
    const currentWsCustom = getWorkspaceCustomTags(vault, targetWs);
    const updatedWsCustom = currentWsCustom.some((t) => t.toLowerCase() === trimmed.toLowerCase())
      ? currentWsCustom
      : [...currentWsCustom, trimmed];
    const updatedWorkspaceCustomTags = {
      ...(vault.workspaceCustomTags || {}),
      [targetWs]: updatedWsCustom,
    };

    const currentCustom = vault.customTags || [];
    const updatedCustom = currentCustom.some((t) => t.toLowerCase() === trimmed.toLowerCase())
      ? currentCustom
      : [...currentCustom, trimmed];

    const updatedPasswords = [...vault.passwords];
    updatedPasswords[selectedPasswordIndex] = {
      ...updatedPasswords[selectedPasswordIndex],
      folder: trimmed,
      modifiedAt: Date.now(),
    };

    const updatedVault: VaultData = {
      ...vault,
      customTags: updatedCustom,
      workspaceCustomTags: updatedWorkspaceCustomTags,
      passwords: updatedPasswords,
    };

    try {
      await saveVault(updatedVault, vaultKey);
      setVault(() => updatedVault);
      setMoveNewTagInput('');
      closeMoveSheet();

      showAlert({
        title: 'Tag Created & Assigned',
        message: `Created tag "${trimmed}" and assigned account to it.`,
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } catch {
      showAlert({
        title: 'Error',
        message: 'Failed to create and assign tag.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    }
  }, [moveNewTagInput, vault, vaultKey, selectedPasswordIndex, setVault, closeMoveSheet, showAlert, activeWorkspace]);

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <TouchableOpacity onPress={handleDoubleTap} activeOpacity={0.7}>
              <Text style={[styles.title, { color: colors.text }]}>VaultX</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.spacePill, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: colors.borderWidth }]}
              onPress={() => router.push('/spaces')}
              onLongPress={() => router.push('/spaces')}
              activeOpacity={0.7}
              accessibilityLabel={`Workspace: ${activeWorkspace || 'Personal'}`}
            >
              <Text style={[styles.spacePillText, { color: colors.text }]} numberOfLines={1}>
                {activeWorkspace || 'Personal'}
              </Text>
              <Ionicons name="chevron-down" size={12} color={colors.mutedText} style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerActions}>
            {activeWorkspace2faAccounts.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.totpHeaderBtn,
                  { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' },
                ]}
                onPress={() => setShowTotpModal(true)}
                accessibilityLabel="Open 2FA Authenticator"
                activeOpacity={0.7}
              >
                <Ionicons name="timer-outline" size={16} color={colors.primary} />
                <Text style={[styles.totpHeaderBtnText, { color: colors.primary }]}>2FA</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.addHeaderBtn, { backgroundColor: colors.primary }]}
              onPress={() =>
                router.push({
                  pathname: '/add',
                  params: { workspace: activeWorkspace || 'Personal' },
                })
              }
              accessibilityLabel="Add Password"
            >
              <Ionicons name="add" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: colors.borderWidth }]}>
            <Ionicons name="search" size={18} color={colors.mutedText} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search passwords, services..."
              placeholderTextColor={colors.mutedText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={colors.mutedText} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category & Tag Filter Pills */}
        <View style={styles.pillsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            overScrollMode="never"
            contentContainerStyle={styles.pillsScroll}
          >
            {/* "All" Pill */}
            <FilterPill
              isSelected={selectedPill === 'all'}
              onPress={() => setSelectedPill('all')}
              accessibilityLabel={`All (${activeWorkspacePasswordsCount})`}
            >
              {({ isHighlighted }) => (
                <>
                  <Text
                    style={[
                      styles.pillText,
                      { color: isHighlighted ? colors.primary : colors.text },
                    ]}
                  >
                    All
                  </Text>
                  <PillCountBadge count={activeWorkspacePasswordsCount} isHighlighted={isHighlighted} />
                </>
              )}
            </FilterPill>

            {/* Favorites Pill (only shown when at least 1 favorite exists) */}
            {activeWorkspaceFavoritesCount > 0 ? (
              <FilterPill
                isSelected={selectedPill === 'favorites'}
                onPress={() => setSelectedPill('favorites')}
                accessibilityLabel={`Favorites (${activeWorkspaceFavoritesCount})`}
              >
                {({ isHighlighted }) => (
                  <>
                    <Ionicons
                      name={selectedPill === 'favorites' ? 'star' : 'star-outline'}
                      size={16}
                      color={selectedPill === 'favorites' ? '#f59e0b' : isHighlighted ? colors.primary : colors.mutedText}
                    />
                    <PillCountBadge count={activeWorkspaceFavoritesCount} isHighlighted={isHighlighted} />
                  </>
                )}
              </FilterPill>
            ) : null}

            {/* Notes Pill (only shown when at least 1 secure note exists) */}
            {activeWorkspaceNotesCount > 0 ? (
              <FilterPill
                isSelected={selectedPill === 'notes'}
                onPress={() => setSelectedPill('notes')}
                accessibilityLabel={`Notes (${activeWorkspaceNotesCount})`}
              >
                {({ isHighlighted }) => (
                  <>
                    <Ionicons
                      name={selectedPill === 'notes' ? 'document-text' : 'document-text-outline'}
                      size={15}
                      color={isHighlighted ? colors.primary : colors.mutedText}
                    />
                    <Text
                      style={[
                        styles.pillText,
                        { color: isHighlighted ? colors.primary : colors.text },
                      ]}
                    >
                      Notes
                    </Text>
                    <PillCountBadge count={activeWorkspaceNotesCount} isHighlighted={isHighlighted} />
                  </>
                )}
              </FilterPill>
            ) : null}

            {/* Standard Category Pills */}
            {effectiveCategories.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              const isSelected = selectedPill === cat.id;
              const isManageable = cat.id !== 'google';

              return (
                <FilterPill
                  key={cat.id}
                  isSelected={isSelected}
                  onPress={() => setSelectedPill(cat.id)}
                  onLongPress={
                    isManageable
                      ? () => handleOpenItemActions({ type: 'category', id: cat.id, name: cat.name })
                      : undefined
                  }
                  accessibilityLabel={`${cat.name} (${count})`}
                >
                  {({ isHighlighted }) => (
                    <>
                      <Text
                        style={[
                          styles.pillText,
                          { color: isHighlighted ? colors.primary : colors.text },
                        ]}
                      >
                        {cat.name}
                      </Text>
                      <PillCountBadge count={count} isHighlighted={isHighlighted} />
                    </>
                  )}
                </FilterPill>
              );
            })}

            {/* Custom Folders & Tags Pills */}
            {uniqueFolders.map((folderName) => {
              const count = folderCounts[folderName.trim().toLowerCase()] || 0;
              const pillId = `folder:${folderName}`;
              const isSelected = selectedPill === pillId;

              return (
                <FilterPill
                  key={pillId}
                  isSelected={isSelected}
                  onPress={() => setSelectedPill(pillId)}
                  onLongPress={() => handleOpenItemActions({ type: 'tag', id: folderName, name: folderName })}
                  accessibilityLabel={`${folderName} (${count})`}
                >
                  {({ isHighlighted }) => (
                    <>
                      <Text
                        style={[
                          styles.pillText,
                          { color: isHighlighted ? colors.primary : colors.text },
                        ]}
                      >
                        {folderName}
                      </Text>
                      <PillCountBadge count={count} isHighlighted={isHighlighted} />
                    </>
                  )}
                </FilterPill>
              );
            })}

            {/* "+" Tag Add Button Pill */}
            <Pressable
              style={({ pressed }) => {
                const isHighlighted = pressed || isAddTagHovered;
                return [
                  styles.pill,
                  {
                    backgroundColor: isHighlighted
                      ? (resolved === 'dark' ? '#1A2E44' : '#E0EEFF')
                      : colors.card,
                    borderColor: colors.primary,
                    borderStyle: 'dashed',
                    elevation: isHighlighted ? 0 : 1,
                  },
                ];
              }}
              onHoverIn={() => setIsAddTagHovered(true)}
              onHoverOut={() => setIsAddTagHovered(false)}
              onPress={() => {
                setNewTagName('');
                setShowAddTagModal(true);
              }}
              accessibilityLabel="Create custom tag"
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.pillText, { color: colors.primary, fontWeight: '700' }]}>
                Tag
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Direct Password Cards List */}
        <FlatList
          data={filteredPasswords}
          keyExtractor={(item) => `${item.service}-${item.username}-${item.globalIndex}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={resetAutoLockTimer}
          scrollEventThrottle={1000}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconCircle, { backgroundColor: (selectedPill === 'favorites' ? '#f59e0b' : colors.primary) + '15' }]}>
                <Ionicons
                  name={selectedPill === 'favorites' ? 'star-outline' : 'key-outline'}
                  size={44}
                  color={selectedPill === 'favorites' ? '#f59e0b' : colors.primary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {selectedPill === 'favorites' ? 'No Favorites Yet' : 'No Passwords Found'}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.mutedText }]}>
                {searchQuery.trim()
                  ? `No accounts match "${searchQuery.trim()}"`
                  : selectedPill === 'favorites'
                  ? 'Tap the star icon on any account card to pin it to favorites.'
                  : selectedPill === 'all'
                  ? 'Tap the + button to add your first password'
                  : selectedPill.startsWith('folder:')
                  ? `No passwords saved with tag "${selectedPill.replace('folder:', '')}" yet`
                  : 'No passwords saved with this tag yet'}
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push({ pathname: '/add', params: { workspace: activeWorkspace || 'Personal' } })}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Add Password</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const isNote = item.itemType === 'note';
            const iconName = isNote ? 'document-text-outline' : getServiceIcon(item.service);
            const iconColor = isNote ? colors.primary : getServiceColor(item.service, resolved === 'dark');
            const isExpanded = expandedIndex === item.globalIndex;

            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: colors.cardBorderWidth }]}>
                {/* Collapsed Card Row (Tap to expand, Long-press for Material 3 actions sheet) */}
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => {
                    setExpandedIndex(isExpanded ? null : item.globalIndex);
                  }}
                  onLongPress={() => {
                    setSelectedPasswordForAction({ item, globalIndex: item.globalIndex });
                    setShowPasswordActionModal(true);
                  }}
                  delayLongPress={300}
                  activeOpacity={0.7}
                >
                  <View style={[styles.badge, { backgroundColor: iconColor + '15' }]}>
                    <Ionicons name={iconName as any} size={20} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.service}
                    </Text>
                    <Text style={[styles.cardSub, { color: colors.mutedText }]} numberOfLines={1}>
                      {isNote ? 'Secure Note' : item.username}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.cardHeaderStarBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(item.globalIndex);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                    accessibilityLabel={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Ionicons
                      name={item.isFavorite ? 'star' : 'star-outline'}
                      size={18}
                      color={item.isFavorite ? '#f59e0b' : colors.mutedText + '80'}
                    />
                  </TouchableOpacity>

                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.mutedText}
                  />
                </TouchableOpacity>

                {/* Dropdown Content (Expands on Click) */}
                {isExpanded ? (
                  <View style={styles.expandedContent}>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Username */}
                    {item.username ? (
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
                    ) : null}

                    {/* Website */}
                    {item.website ? (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.mutedText }]}>Website</Text>
                        <View style={styles.detailValue}>
                          <Text style={[styles.detailText, { color: colors.primary }]} numberOfLines={1}>
                            {item.website}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                              onPress={() => openWebsite(item.website!)}
                              accessibilityLabel="Open website"
                            >
                              <Ionicons name="open-outline" size={18} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => copyToClipboard(item.website!, 'Website')}
                              accessibilityLabel="Copy website"
                            >
                              <Ionicons name="copy-outline" size={18} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ) : null}

                    {/* Password */}
                    {item.password ? (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.mutedText }]}>Password</Text>
                        <View style={styles.detailValue}>
                          <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                            {showPasswordIndex === item.globalIndex
                              ? item.password
                              : '●'.repeat(Math.min(item.password.length, 14))}
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

                    {/* 2FA Code (TOTP) */}
                    {item.totpSecret ? (
                      <TotpCodeDisplay secret={item.totpSecret} colors={colors} copyToClipboard={copyToClipboard} />
                    ) : null}

                    {/* 2FA Backup / Recovery Codes */}
                    {item.totpBackupCodes ? (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.mutedText }]}>2FA Backup Codes</Text>
                        <View style={styles.detailValue}>
                          <Text style={[styles.detailText, { color: colors.text }]}>
                            {showPasswordIndex === item.globalIndex
                              ? item.totpBackupCodes
                              : '●●●●-●●●●  ●●●●-●●●●'}
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
                                name={showPasswordIndex === item.globalIndex ? 'eye-off-outline' : 'eye-outline'}
                                size={18}
                                color={colors.primary}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => copyToClipboard(item.totpBackupCodes!, 'Backup Codes')}>
                              <Ionicons name="copy-outline" size={18} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ) : null}

                    {/* Notes */}
                    {item.notes ? (
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: colors.mutedText }]}>
                          {isNote ? 'Secure Note' : 'Notes'}
                        </Text>
                        <View style={styles.detailValue}>
                          <Text style={[styles.detailText, { color: colors.text }]}>
                            {isNote && showPasswordIndex !== item.globalIndex
                              ? '●●●●●●●●●●●●'
                              : item.notes}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            {isNote ? (
                              <TouchableOpacity
                                onPress={() =>
                                  setShowPasswordIndex(
                                    showPasswordIndex === item.globalIndex ? null : item.globalIndex
                                  )
                                }
                              >
                                <Ionicons
                                  name={showPasswordIndex === item.globalIndex ? 'eye-off-outline' : 'eye-outline'}
                                  size={18}
                                  color={colors.primary}
                                />
                              </TouchableOpacity>
                            ) : null}
                            <TouchableOpacity onPress={() => copyToClipboard(item.notes!, isNote ? 'Note' : 'Notes')}>
                              <Ionicons name="copy-outline" size={18} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                        </View>
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
                              onPress={() =>
                                setShowPasswordIndex(
                                  showPasswordIndex === item.globalIndex ? null : item.globalIndex
                                )
                              }
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
                            {!item.loginPin ? (
                              <TouchableOpacity
                                onPress={() =>
                                  setShowPasswordIndex(
                                    showPasswordIndex === item.globalIndex ? null : item.globalIndex
                                  )
                                }
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

                    {/* Custom Fields / Additional PINs */}
                    {item.otherPin
                      ? (() => {
                          try {
                            const otherPins = JSON.parse(item.otherPin) as { label: string; pin: string }[];
                            return otherPins.map((customField, idx) => (
                              <View key={idx} style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: colors.mutedText }]}>{customField.label}</Text>
                                <View style={styles.detailValue}>
                                  <Text style={[styles.detailText, { color: colors.text }]} numberOfLines={1}>
                                    {showPasswordIndex === item.globalIndex
                                      ? customField.pin
                                      : '●'.repeat(Math.min(customField.pin.length, 14))}
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
                                        name={showPasswordIndex === item.globalIndex ? 'eye-off-outline' : 'eye-outline'}
                                        size={18}
                                        color={colors.primary}
                                      />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => copyToClipboard(customField.pin, customField.label)}>
                                      <Ionicons name="copy-outline" size={18} color={colors.primary} />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </View>
                            ));
                          } catch {
                            return null;
                          }
                        })()
                      : null}

                    {/* Timestamps */}
                    {item.createdAt || item.modifiedAt ? (
                      <View style={[styles.timestampSection, { borderColor: colors.border, backgroundColor: colors.inputBg }]}>
                        {item.createdAt ? (
                          <View style={styles.timestampRow}>
                            <Ionicons name="time-outline" size={12} color={colors.mutedText} />
                            <Text style={[styles.timestampLabel, { color: colors.mutedText }]}>
                              Created {formatTimestamp(item.createdAt)}
                            </Text>
                          </View>
                        ) : null}
                        {item.modifiedAt && item.modifiedAt !== item.createdAt ? (
                          <View style={styles.timestampRow}>
                            <Ionicons name="create-outline" size={12} color={colors.mutedText} />
                            <Text style={[styles.timestampLabel, { color: colors.mutedText }]}>
                              Modified {formatTimestamp(item.modifiedAt)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      </View>

      {/* Tag Actions Material 3 Bottom Sheet (Edit / Delete) */}
      <Modal
        visible={showTagActionModal && !!selectedItemToManage}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTagActionModal(false)}
      >
        {selectedItemToManage ? (
          <View style={styles.bottomSheetOverlay}>
            <TouchableOpacity
              style={styles.bottomSheetBackdrop}
              activeOpacity={1}
              onPress={() => setShowTagActionModal(false)}
            />
            <View style={[styles.bottomSheetContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Material 3 Drag Handle */}
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

              {/* Header with Icon, Name, Subtitle & Close Button */}
              <View style={styles.bottomSheetHeader}>
                <View style={styles.bottomSheetHeaderLeft}>
                  <View style={[styles.bottomSheetIconWrap, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons
                      name={
                        selectedItemToManage.type === 'category'
                          ? (categories.find((c) => c.id === selectedItemToManage.id)?.icon as any) || 'pricetag'
                          : 'pricetag'
                      }
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bottomSheetTitle, { color: colors.text }]} numberOfLines={1}>
                      {selectedItemToManage.name}
                    </Text>
                    <Text style={[styles.bottomSheetSubtitle, { color: colors.mutedText }]}>
                      {selectedItemToManage.type === 'category'
                        ? `Default Tag • ${categoryCounts[selectedItemToManage.id as CategoryType] || 0} accounts`
                        : `Custom Tag • ${folderCounts[(selectedItemToManage.name || '').trim().toLowerCase()] || 0} accounts`}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.bottomSheetCloseBtn, { backgroundColor: actionTileBg, borderColor: colors.border }]}
                  onPress={() => setShowTagActionModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={18} color={colors.mutedText} />
                </TouchableOpacity>
              </View>

              <View style={[styles.bottomSheetDivider, { backgroundColor: colors.border }]} />

              {/* 1 row 2 columns: Rename & Delete */}
              <View style={styles.m3ActionRow2Col}>
                <TouchableOpacity
                  style={[
                    styles.m3ActionColCard,
                    { backgroundColor: actionTileBg, borderColor: colors.border, borderWidth: colors.borderWidth },
                  ]}
                  onPress={handleStartEditItem}
                  activeOpacity={0.7}
                >
                  <View style={[styles.m3ActionColIconWrap, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons name="pencil" size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.m3ActionColTitle, { color: colors.text }]} numberOfLines={1}>
                    Rename
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.m3ActionColCard,
                    {
                      backgroundColor: '#ef444410',
                      borderColor: showBorders ? colors.border : '#ef444430',
                      borderWidth: colors.borderWidth,
                    },
                  ]}
                  onPress={handleConfirmDeleteItem}
                  activeOpacity={0.7}
                >
                  <View style={[styles.m3ActionColIconWrap, { backgroundColor: '#ef444420' }]}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </View>
                  <Text style={[styles.m3ActionColTitle, { color: '#ef4444' }]} numberOfLines={1}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
      </Modal>

      {/* Password Card Actions Material 3 Bottom Sheet (Edit & Move in 1 row 2 cols, Delete below) */}
      <Modal
        visible={showPasswordActionModal && !!selectedPasswordForAction}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPasswordActionModal(false);
          setSelectedPasswordForAction(null);
        }}
      >
        {selectedPasswordForAction ? (
          <View style={styles.bottomSheetOverlay}>
            <TouchableOpacity
              style={styles.bottomSheetBackdrop}
              activeOpacity={1}
              onPress={() => {
                setShowPasswordActionModal(false);
                setSelectedPasswordForAction(null);
              }}
            />
            <View style={[styles.bottomSheetContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Material 3 Drag Handle */}
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

              {/* Header with Icon, Name, Subtitle & Close Button */}
              <View style={styles.bottomSheetHeader}>
                <View style={styles.bottomSheetHeaderLeft}>
                  <View
                    style={[
                      styles.bottomSheetIconWrap,
                      {
                        backgroundColor:
                          getServiceColor(selectedPasswordForAction.item.service, resolved === 'dark') + '18',
                      },
                    ]}
                  >
                    <Ionicons
                      name={(getServiceIcon(selectedPasswordForAction.item.service) as any) || 'key'}
                      size={22}
                      color={getServiceColor(selectedPasswordForAction.item.service, resolved === 'dark')}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bottomSheetTitle, { color: colors.text }]} numberOfLines={1}>
                      {selectedPasswordForAction.item.service}
                    </Text>
                    <Text style={[styles.bottomSheetSubtitle, { color: colors.mutedText }]} numberOfLines={1}>
                      {selectedPasswordForAction.item.username} • {
                        selectedPasswordForAction.item.folder
                          ? `Tag: ${selectedPasswordForAction.item.folder}`
                          : (effectiveCategories.find(
                              (c) =>
                                c.id ===
                                (selectedPasswordForAction.item.category ||
                                  categorizeService(selectedPasswordForAction.item.service || ''))
                            )?.name || 'General')
                      }
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.bottomSheetCloseBtn, { backgroundColor: actionTileBg, borderColor: colors.border }]}
                  onPress={() => {
                    setShowPasswordActionModal(false);
                    setSelectedPasswordForAction(null);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={18} color={colors.mutedText} />
                </TouchableOpacity>
              </View>

              <View style={[styles.bottomSheetDivider, { backgroundColor: colors.border }]} />

              {/* Actions: 2 columns and 2 rows for Edit, Move, Favorite, Delete */}
              {/* Row 1: Edit & Move */}
              <View style={styles.m3ActionRow2Col}>
                {/* Column 1: Edit */}
                <TouchableOpacity
                  style={[
                    styles.m3ActionColCard,
                    { backgroundColor: actionTileBg, borderColor: colors.border, borderWidth: colors.borderWidth },
                  ]}
                  onPress={() => {
                    const targetIdx = selectedPasswordForAction.globalIndex;
                    setShowPasswordActionModal(false);
                    setSelectedPasswordForAction(null);
                    if (targetIdx !== undefined) {
                      router.push(`/edit/${targetIdx}` as any);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.m3ActionColIconWrap, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons name="pencil" size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.m3ActionColTitle, { color: colors.text }]} numberOfLines={1}>
                    Edit
                  </Text>
                </TouchableOpacity>

                {/* Column 2: Move */}
                <TouchableOpacity
                  style={[
                    styles.m3ActionColCard,
                    { backgroundColor: actionTileBg, borderColor: colors.border, borderWidth: colors.borderWidth },
                  ]}
                  onPress={() => {
                    const target = selectedPasswordForAction;
                    setShowPasswordActionModal(false);
                    setSelectedPasswordForAction(null);
                    if (target) {
                      openMoveSheet(
                        target.globalIndex,
                        target.item.category || categorizeService(target.item.service),
                        target.item.folder
                      );
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.m3ActionColIconWrap, { backgroundColor: '#8b5cf618' }]}>
                    <Ionicons name="pricetag-outline" size={18} color="#8b5cf6" />
                  </View>
                  <Text style={[styles.m3ActionColTitle, { color: colors.text }]} numberOfLines={1}>
                    Move
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Row 2: Favorite / Add & Delete */}
              <View style={styles.m3ActionRow2Col}>
                {/* Column 1: Favorite */}
                <TouchableOpacity
                  style={[
                    styles.m3ActionColCard,
                    { backgroundColor: actionTileBg, borderColor: colors.border, borderWidth: colors.borderWidth },
                  ]}
                  onPress={() => {
                    const targetIdx = selectedPasswordForAction.globalIndex;
                    setShowPasswordActionModal(false);
                    setSelectedPasswordForAction(null);
                    if (targetIdx !== undefined) {
                      handleToggleFavorite(targetIdx);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.m3ActionColIconWrap, { backgroundColor: '#f59e0b18' }]}>
                    <Ionicons
                      name={selectedPasswordForAction.item.isFavorite ? 'star' : 'star-outline'}
                      size={18}
                      color="#f59e0b"
                    />
                  </View>
                  <Text style={[styles.m3ActionColTitle, { color: colors.text }]} numberOfLines={1}>
                    {selectedPasswordForAction.item.isFavorite ? 'Unfavorite' : 'Favorite'}
                  </Text>
                </TouchableOpacity>

                {/* Column 2: Delete */}
                <TouchableOpacity
                  style={[
                    styles.m3ActionColCard,
                    {
                      backgroundColor: '#ef444410',
                      borderColor: showBorders ? colors.border : '#ef444430',
                      borderWidth: colors.borderWidth,
                    },
                  ]}
                  onPress={() => {
                    const targetIdx = selectedPasswordForAction.globalIndex;
                    setShowPasswordActionModal(false);
                    setSelectedPasswordForAction(null);
                    if (targetIdx !== undefined) {
                      handleDelete(targetIdx);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.m3ActionColIconWrap, { backgroundColor: '#ef444420' }]}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </View>
                  <Text style={[styles.m3ActionColTitle, { color: '#ef4444' }]} numberOfLines={1}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
      </Modal>

      {/* Move Account Material 3 Bottom Sheet (Categories & Tags) */}
      <Modal
        visible={showMoveModal}
        transparent
        animationType="slide"
        onRequestClose={closeMoveSheet}
      >
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity
            style={styles.bottomSheetBackdrop}
            activeOpacity={1}
            onPress={closeMoveSheet}
          />
          <View
            style={[
              styles.bottomSheetContainer,
              styles.moveSheetContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Material 3 Drag Handle */}
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={styles.bottomSheetHeader}>
              <View style={styles.bottomSheetHeaderLeft}>
                <View style={[styles.bottomSheetIconWrap, { backgroundColor: '#8b5cf618' }]}>
                  <Ionicons name="folder-outline" size={22} color="#8b5cf6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>Move Account</Text>
                  <Text style={[styles.bottomSheetSubtitle, { color: colors.mutedText }]} numberOfLines={1}>
                    {selectedPasswordForMove
                      ? `${selectedPasswordForMove.service} • ${selectedPasswordForMove.username}`
                      : 'Select destination tag'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.bottomSheetCloseBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={closeMoveSheet}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <View style={[styles.bottomSheetDivider, { backgroundColor: colors.border }]} />

            {/* Quick Add Tag Input */}
            <View style={[styles.inlineAddTagWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="add-circle-outline" size={20} color="#8b5cf6" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.inlineAddTagInput, { color: colors.text }]}
                placeholder="Create and move to new tag..."
                placeholderTextColor={colors.mutedText}
                value={moveNewTagInput}
                onChangeText={setMoveNewTagInput}
                returnKeyType="done"
                onSubmitEditing={handleCreateAndMoveToTag}
                autoCapitalize="words"
              />
              <TouchableOpacity
                style={[
                  styles.inlineAddTagBtn,
                  { backgroundColor: moveNewTagInput.trim() ? '#8b5cf6' : colors.border },
                ]}
                disabled={!moveNewTagInput.trim()}
                onPress={handleCreateAndMoveToTag}
                accessibilityLabel="Create and move"
              >
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content: All merged as Tags */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Single Unified TAGS Header */}
              <View style={styles.moveSectionHeaderRow}>
                <Text style={[styles.moveSectionTitle, { color: colors.mutedText }]}>TAGS</Text>
                <Text style={[styles.moveSectionCount, { color: colors.mutedText }]}>
                  ({effectiveCategories.length + uniqueFolders.length})
                </Text>
              </View>

              <View style={styles.moveCategoriesList}>
                {/* Built-in Categories treated as Tags */}
                {effectiveCategories.map((cat) => {
                  const isCurrent = !currentTag
                    ? (currentCategory === cat.id ||
                       (selectedPasswordForMove &&
                         categorizeService(selectedPasswordForMove.service) === cat.id))
                    : currentTag.toLowerCase() === cat.name.toLowerCase();
                  const count = categoryCounts[cat.id] || 0;
                  return (
                    <TouchableOpacity
                      key={`cat-${cat.id}`}
                      style={[
                        styles.moveCategoryCard,
                        {
                          backgroundColor: isCurrent ? colors.primary + '14' : actionTileBg,
                          borderColor: isCurrent ? colors.primary : colors.border,
                          borderWidth: isCurrent ? 1 : colors.borderWidth,
                        },
                      ]}
                      onPress={() => moveToCategory(cat.id)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.moveCategoryName, { color: isCurrent ? colors.primary : colors.text }]} numberOfLines={1}>
                          {cat.name}
                        </Text>
                        <Text style={[styles.moveCategoryCount, { color: colors.mutedText }]} numberOfLines={1}>
                          {count} {count === 1 ? 'account' : 'accounts'}
                        </Text>
                      </View>
                      {isCurrent ? (
                        <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                          <Ionicons name="checkmark" size={14} color="#ffffff" />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}

                {/* Custom User Tags */}
                {uniqueFolders.map((folderName) => {
                  const isCurrent = currentTag?.toLowerCase() === folderName.toLowerCase();
                  const count = folderCounts[folderName.trim().toLowerCase()] || 0;
                  return (
                    <TouchableOpacity
                      key={`tag-${folderName}`}
                      style={[
                        styles.moveCategoryCard,
                        {
                          backgroundColor: isCurrent ? colors.primary + '14' : actionTileBg,
                          borderColor: isCurrent ? colors.primary : colors.border,
                          borderWidth: isCurrent ? 1 : colors.borderWidth,
                        },
                      ]}
                      onPress={() => moveToTag(folderName)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.moveCategoryName, { color: isCurrent ? colors.primary : colors.text }]} numberOfLines={1}>
                          {folderName}
                        </Text>
                        <Text style={[styles.moveCategoryCount, { color: colors.mutedText }]} numberOfLines={1}>
                          {count} {count === 1 ? 'account' : 'accounts'}
                        </Text>
                      </View>
                      {isCurrent ? (
                        <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                          <Ionicons name="checkmark" size={14} color="#ffffff" />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Tag Modal */}
      <Modal
        visible={showAddTagModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddTagModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowAddTagModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: dullCardBg, borderColor: dullCardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="add" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                  Create New Tag
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: dullCancelBg, borderColor: dullCancelBorder }]}
                onPress={() => setShowAddTagModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: colors.mutedText, marginBottom: 14 }}>
              Create a custom tag to group and filter your accounts.
            </Text>

            <TextInput
              style={[
                styles.tagInput,
                {
                  backgroundColor: dullInputBg,
                  borderColor: dullInputBorder,
                  color: colors.text,
                },
              ]}
              placeholder="Tag name (e.g., Personal, Subscriptions)"
              placeholderTextColor={colors.mutedText}
              value={newTagName}
              onChangeText={setNewTagName}
              autoFocus
              maxLength={25}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: dullCancelBg, borderColor: dullCancelBorder }]}
                onPress={() => setShowAddTagModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={handleCreateTag}
              >
                <Text style={[styles.modalBtnText, { color: '#fff', fontWeight: '700' }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Tag Modal */}
      <Modal
        visible={showEditTagModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditTagModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowEditTagModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: dullCardBg, borderColor: dullCardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="pencil" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                  Edit Tag Name
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: dullCancelBg, borderColor: dullCancelBorder }]}
                onPress={() => setShowEditTagModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.tagInput,
                {
                  backgroundColor: dullInputBg,
                  borderColor: dullInputBorder,
                  color: colors.text,
                },
              ]}
              placeholder="Tag name"
              placeholderTextColor={colors.mutedText}
              value={editTagName}
              onChangeText={setEditTagName}
              autoFocus
              maxLength={25}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: dullCancelBg, borderColor: dullCancelBorder }]}
                onPress={() => setShowEditTagModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={handleSaveEditItem}
              >
                <Text style={[styles.modalBtnText, { color: '#fff', fontWeight: '700' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2FA Authenticator Bottom Sheet Modal */}
      <Modal
        visible={showTotpModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTotpModal(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity
            style={styles.bottomSheetBackdrop}
            activeOpacity={1}
            onPress={() => setShowTotpModal(false)}
          />
          <View
            style={[
              styles.bottomSheetContainer,
              styles.totpSheetContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Material 3 Drag Handle */}
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

            {/* Header with Title, Count badge, and Close Button */}
            <View style={styles.totpSheetHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.totpSheetTitle, { color: colors.text }]}>
                    Authenticator
                  </Text>
                  <View style={[styles.totpSheetCountBadge, { backgroundColor: colors.primary + '18' }]}>
                    <Text style={[styles.totpSheetCountText, { color: colors.primary }]}>
                      {activeWorkspace2faAccounts.length}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.totpSheetSub, { color: colors.mutedText }]}>
                  {activeWorkspace2faAccounts.length === 1 ? '1 active code' : `${activeWorkspace2faAccounts.length} active codes`} in {activeWorkspace || 'Personal'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.bottomSheetCloseBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => setShowTotpModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Close Authenticator"
              >
                <Ionicons name="close" size={18} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <View style={[styles.bottomSheetDivider, { backgroundColor: colors.border }]} />

            {/* List of Medium 2FA Cards */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 28 }}
            >
              {activeWorkspace2faAccounts.length === 0 ? (
                <View style={styles.totpEmptyState}>
                  <View style={[styles.totpEmptyIconWrap, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons name="timer-outline" size={38} color={colors.primary} />
                  </View>
                  <Text style={[styles.totpEmptyTitle, { color: colors.text }]}>
                    No 2FA Codes Yet
                  </Text>
                  <Text style={[styles.totpEmptySub, { color: colors.mutedText }]}>
                    Add a 2FA secret key to any account to view live one-time verification codes here.
                  </Text>
                </View>
              ) : (
                activeWorkspace2faAccounts.map((item) => (
                  <TotpMediumCard
                    key={`totp-${item.globalIndex}-${item.service}`}
                    item={item}
                    colors={colors}
                    resolved={resolved}
                    onCopy={async (code) => {
                      await copyToClipboardWithAutoClear(code);
                    }}
                  />
                ))
              )}

              {activeWorkspace2faAccounts.length > 0 && (
                <View style={styles.totpFooterNotice}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.mutedText} />
                  <Text style={[styles.totpFooterText, { color: colors.mutedText }]}>
                    Tap any card to instantly copy the 6-digit code
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 0.6,
    maxWidth: 140,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
        shadowColor: '#000000',
      },
    }),
  },
  spacePillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totpHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
  },
  totpHeaderBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.14,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.6,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 999,
    borderWidth: 0.6,
    paddingHorizontal: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
        shadowColor: '#000000',
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  pillsContainer: {
    paddingVertical: 4,
  },
  pillsScroll: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 0.6,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
        shadowColor: '#000000',
      },
    }),
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  pillCountCircle: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillCountText: {
    fontSize: 11,
    fontWeight: '600',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  card: {
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
        shadowColor: '#000000',
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSub: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
  },
  m3ActionRow2Col: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  m3ActionColCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  m3ActionColIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  m3ActionColTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    flexShrink: 1,
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
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  timestampSection: {
    marginTop: 8,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '500',
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
    borderRadius: 999,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 998,
  },
  fabMenuCircular: {
    position: 'absolute',
    bottom: 96,
    right: 20,
    zIndex: 999,
    alignItems: 'flex-end',
    gap: 14,
  },
  fabItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fabCircleBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  fabLabel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  fabLabelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomSheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomSheetContainer: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bottomSheetHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  },
  bottomSheetIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  bottomSheetSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  bottomSheetCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetDivider: {
    height: 1,
    marginBottom: 14,
  },
  bottomSheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 14,
  },
  bottomSheetActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheetActionTextWrap: {
    flex: 1,
  },
  bottomSheetActionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  bottomSheetActionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 12,
  },
  modalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveSheetContainer: {
    maxHeight: '85%',
  },
  moveSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginTop: 6,
  },
  moveSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  moveSectionCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  moveCategoriesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moveCategoryCard: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  moveCategoryName: {
    fontSize: 14,
    fontWeight: '600',
  },
  moveCategoryCount: {
    fontSize: 12,
    marginTop: 2,
  },
  currentBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveTagsContainer: {
    gap: 10,
  },
  inlineAddTagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 6,
  },
  inlineAddTagInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
  },
  inlineAddTagBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveTagCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  moveTagIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveTagName: {
    fontSize: 15,
    fontWeight: '700',
  },
  moveTagCount: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyTagsNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTagsText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardHeaderStarBtn: {
    padding: 6,
    marginRight: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totpSheetContainer: {
    maxHeight: '85%',
    paddingHorizontal: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 0.6,
    borderBottomWidth: 0,
  },
  totpSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  totpSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  totpSheetCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  totpSheetCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  totpSheetSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  totpCard: {
    borderRadius: 18,
    borderWidth: 0.6,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
        shadowColor: '#000000',
      },
    }),
  },
  totpCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totpCardServiceWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 10,
  },
  totpCardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totpCardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  totpCardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  totpTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  totpTimerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  totpCardCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  totpLargeCode: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  totpCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 0.6,
  },
  totpCopyBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  totpProgressBarBg: {
    height: 3,
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 14,
  },
  totpProgressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  totpEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  totpEmptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  totpEmptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  totpEmptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  totpFooterNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  totpFooterText: {
    fontSize: 12,
  },
});
