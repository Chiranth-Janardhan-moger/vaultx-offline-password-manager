import BottomNavBar from '@/components/BottomNavBar';
import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { categories, categorizeService, DEFAULT_DELETE_CATEGORY_KEY, getCategoryById, getEffectiveCategories, type CategoryType } from '@/lib/categories';
import { getServiceColor, getServiceIcon } from '@/lib/service-icons';
import { copyToClipboardWithAutoClear } from '@/lib/clipboard';
import { saveVault, type PasswordItem, type VaultData } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import {
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const DOUBLE_TAP_LOCK_KEY = 'double_tap_lock';

export default function Dashboard() {
  const router = useRouter();
  const { unlocked, vault, vaultKey, setVault, lock, resetAutoLockTimer, activeWorkspace } = useSession();
  const { colors, resolved } = useTheme();

  // Dull / light-gray card tokens for dialogs
  const dullCardBg = resolved === 'dark' ? '#1c2027' : '#f1f3f6';
  const dullCardBorder = resolved === 'dark' ? '#2e3440' : '#d8dce2';
  const dullInputBg = resolved === 'dark' ? '#13161c' : '#ffffff';
  const dullInputBorder = resolved === 'dark' ? '#2e3440' : '#cfd4dc';
  const dullCancelBg = resolved === 'dark' ? '#252a34' : '#e4e7eb';
  const dullCancelBorder = resolved === 'dark' ? '#333a48' : '#d1d6de';
  const { showAlert, AlertComponent } = useCustomAlert();

  // Selected filter: 'all' | CategoryType | `folder:${string}`
  const [selectedPill, setSelectedPill] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);
  const [showPasswordIndex, setShowPasswordIndex] = React.useState<number | null>(null);
  const [selectedPasswordForAction, setSelectedPasswordForAction] = React.useState<{
    item: PasswordItem;
    globalIndex: number;
  } | null>(null);
  const [showPasswordActionModal, setShowPasswordActionModal] = React.useState(false);
  const [showAddTagModal, setShowAddTagModal] = React.useState(false);
  const [showTagActionModal, setShowTagActionModal] = React.useState(false);
  const [showEditTagModal, setShowEditTagModal] = React.useState(false);
  const [selectedItemToManage, setSelectedItemToManage] = React.useState<{ type: 'category' | 'tag'; id: string; name: string } | null>(null);
  const [newTagName, setNewTagName] = React.useState('');
  const [editTagName, setEditTagName] = React.useState('');

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


  // Unique custom folders & user created tags
  const uniqueFolders = React.useMemo(() => {
    if (!vault) return [];
    const pFolders = (vault.passwords || []).map((p) => p.folder).filter(Boolean) as string[];
    const cFolders = (vault.cards || []).map((c) => c.folder).filter(Boolean) as string[];
    const custom = vault.customTags || [];
    return Array.from(new Set([...custom, ...pFolders, ...cFolders]));
  }, [vault]);

  // Effective active categories (excluding deleted ones, applying custom names)
  const effectiveCategories = React.useMemo(() => {
    return getEffectiveCategories(vault?.deletedCategories, vault?.categoryOverrides);
  }, [vault?.deletedCategories, vault?.categoryOverrides]);

  // Category counts
  const categoryCounts = React.useMemo(() => {
    if (!vault?.passwords) return {};
    const counts: { [key: string]: number } = {};
    vault.passwords.forEach((pwd) => {
      const itemWs = pwd.workspace || 'Personal';
      if (itemWs !== (activeWorkspace || 'Personal')) return;
      const cat = pwd.category || categorizeService(pwd.service, vault?.deletedCategories);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [vault?.passwords, vault?.deletedCategories, activeWorkspace]);

  // Folder counts
  const folderCounts = React.useMemo(() => {
    if (!vault?.passwords) return {};
    const counts: { [key: string]: number } = {};
    vault.passwords.forEach((pwd) => {
      const itemWs = pwd.workspace || 'Personal';
      if (itemWs !== (activeWorkspace || 'Personal')) return;
      if (pwd.folder) {
        counts[pwd.folder] = (counts[pwd.folder] || 0) + 1;
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

        if (selectedPill !== 'all') {
          if (selectedPill.startsWith('folder:')) {
            const folderName = selectedPill.replace('folder:', '');
            if (pwd.folder !== folderName) return false;
          } else {
            const pwdCategory = pwd.category || categorizeService(pwd.service, vault?.deletedCategories);
            if (pwdCategory !== selectedPill) return false;
          }
        }

        if (q) {
          const matchService = pwd.service.toLowerCase().includes(q);
          const matchUsername = pwd.username.toLowerCase().includes(q);
          const matchFolder = pwd.folder?.toLowerCase().includes(q);
          const matchNotes = pwd.notes?.toLowerCase().includes(q);
          return matchService || matchUsername || matchFolder || matchNotes;
        }

        return true;
      })
      .sort((a, b) => a.service.toLowerCase().localeCompare(b.service.toLowerCase()));
  }, [vault?.passwords, vault?.deletedCategories, selectedPill, searchQuery, activeWorkspace]);

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
      showAlert({
        title: 'Copied',
        message: `${label} copied to clipboard (auto-clears in 45s)`,
        confirmText: 'OK',
        onConfirm: () => {},
      });
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

    const currentCustom = vault.customTags || [];
    const updatedCustom = [...currentCustom, trimmed];
    const updatedVault: VaultData = { ...vault, customTags: updatedCustom };

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
  }, [newTagName, uniqueFolders, vault, vaultKey, setVault, showAlert]);

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
      const currentCustom = vault.customTags || [];
      const updatedCustom = currentCustom.map((t) => (t === oldName ? trimmed : t));
      if (!updatedCustom.includes(trimmed)) {
        updatedCustom.push(trimmed);
      }

      const updatedPasswords = (vault.passwords || []).map((p) => {
        if (p.folder === oldName) {
          return { ...p, folder: trimmed, modifiedAt: Date.now() };
        }
        return p;
      });

      const updatedCards = (vault.cards || []).map((c) => {
        if (c.folder === oldName) {
          return { ...c, folder: trimmed };
        }
        return c;
      });

      updatedVault = {
        ...vault,
        customTags: updatedCustom,
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
  }, [selectedItemToManage, editTagName, uniqueFolders, vault, vaultKey, setVault, selectedPill, showAlert]);

  const handleDeleteItem = React.useCallback(
    async (item: { type: 'category' | 'tag'; id: string; name: string }, fallbackId: CategoryType, fallbackName: string) => {
      if (!vault || !vaultKey) return;

      let updatedVault: VaultData;

      if (item.type === 'tag') {
        const currentCustom = (vault.customTags || []).filter((t) => t !== item.name);

        const updatedPasswords = (vault.passwords || []).map((p) => {
          if (p.folder === item.name) {
            return {
              ...p,
              folder: undefined,
              category: fallbackId,
              modifiedAt: Date.now(),
            };
          }
          return p;
        });

        const updatedCards = (vault.cards || []).map((c) => {
          if (c.folder === item.name) {
            return { ...c, folder: undefined };
          }
          return c;
        });

        updatedVault = {
          ...vault,
          customTags: currentCustom,
          passwords: updatedPasswords,
          cards: updatedCards,
        };
      } else {
        const currentDeleted = vault.deletedCategories || [];
        const updatedDeleted = currentDeleted.includes(item.id)
          ? currentDeleted
          : [...currentDeleted, item.id];

        const updatedPasswords = (vault.passwords || []).map((p) => {
          const cat = p.category || categorizeService(p.service, vault.deletedCategories);
          if (cat === item.id) {
            return {
              ...p,
              category: fallbackId,
              modifiedAt: Date.now(),
            };
          }
          return p;
        });

        updatedVault = {
          ...vault,
          deletedCategories: updatedDeleted,
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
    [vault, vaultKey, setVault, selectedPill, showAlert]
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
  }, [moveNewTagInput, vault, vaultKey, selectedPasswordIndex, setVault, closeMoveSheet, showAlert]);

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
              style={[styles.spacePill, { backgroundColor: colors.card, borderColor: colors.border }]}
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
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
            contentContainerStyle={styles.pillsScroll}
          >
            {/* "All" Pill */}
            <TouchableOpacity
              style={[
                styles.pill,
                selectedPill === 'all'
                  ? [styles.pillActive, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]
                  : { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => setSelectedPill('all')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="grid-outline"
                size={16}
                color={selectedPill === 'all' ? colors.primary : colors.mutedText}
              />
              <Text
                style={[
                  styles.pillText,
                  { color: selectedPill === 'all' ? colors.primary : colors.text },
                ]}
              >
                All ({vault?.passwords.length || 0})
              </Text>
            </TouchableOpacity>

            {/* Standard Category Pills */}
            {effectiveCategories.map((cat) => {
              const count = categoryCounts[cat.id] || 0;
              const isSelected = selectedPill === cat.id;
              const isManageable = cat.id !== 'google';

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.pill,
                    isSelected
                      ? [styles.pillActive, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => setSelectedPill(cat.id)}
                  onLongPress={
                    isManageable
                      ? () => handleOpenItemActions({ type: 'category', id: cat.id, name: cat.name })
                      : undefined
                  }
                  delayLongPress={300}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={16}
                    color={isSelected ? colors.primary : colors.mutedText}
                  />
                  <Text
                    style={[
                      styles.pillText,
                      { color: isSelected ? colors.primary : colors.text },
                    ]}
                  >
                    {cat.name} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Custom Folders & Tags Pills */}
            {uniqueFolders.map((folderName) => {
              const count = folderCounts[folderName] || 0;
              const pillId = `folder:${folderName}`;
              const isSelected = selectedPill === pillId;

              return (
                <TouchableOpacity
                  key={pillId}
                  style={[
                    styles.pill,
                    isSelected
                      ? [styles.pillActive, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => setSelectedPill(pillId)}
                  onLongPress={() => handleOpenItemActions({ type: 'tag', id: folderName, name: folderName })}
                  delayLongPress={300}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={15}
                    color={isSelected ? colors.primary : colors.mutedText}
                  />
                  <Text
                    style={[
                      styles.pillText,
                      { color: isSelected ? colors.primary : colors.text },
                    ]}
                  >
                    {folderName} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* "+" Tag Add Button Pill */}
            <TouchableOpacity
              style={[
                styles.pill,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.primary,
                  borderStyle: 'dashed',
                },
              ]}
              onPress={() => {
                setNewTagName('');
                setShowAddTagModal(true);
              }}
              activeOpacity={0.7}
              accessibilityLabel="Create custom tag"
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.pillText, { color: colors.primary, fontWeight: '700' }]}>
                Tag
              </Text>
            </TouchableOpacity>
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
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.primary + '10' }]}>
                <Ionicons name="key-outline" size={44} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Passwords Found</Text>
              <Text style={[styles.emptySubtext, { color: colors.mutedText }]}>
                {searchQuery.trim()
                  ? `No accounts match "${searchQuery.trim()}"`
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
            const iconName = getServiceIcon(item.service);
            const iconColor = getServiceColor(item.service, resolved === 'dark');
            const isExpanded = expandedIndex === item.globalIndex;

            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                      {item.username}
                    </Text>
                  </View>

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

                    {/* Notes */}
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
                                  <TouchableOpacity onPress={() => copyToClipboard(customField.pin, customField.label)}>
                                    <Ionicons name="copy-outline" size={18} color={colors.primary} />
                                  </TouchableOpacity>
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

        {/* Bottom Navigation Bar */}
        <BottomNavBar activeTab="vault" />
      </View>

      {/* Tag Actions Material 3 Bottom Sheet (Edit / Delete) */}
      <Modal
        visible={showTagActionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTagActionModal(false)}
      >
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
                      selectedItemToManage?.type === 'category'
                        ? (categories.find((c) => c.id === selectedItemToManage.id)?.icon as any) || 'pricetag'
                        : 'pricetag'
                    }
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bottomSheetTitle, { color: colors.text }]} numberOfLines={1}>
                    {selectedItemToManage?.name}
                  </Text>
                  <Text style={[styles.bottomSheetSubtitle, { color: colors.mutedText }]}>
                    {selectedItemToManage?.type === 'category'
                      ? `Default Tag • ${categoryCounts[selectedItemToManage.id as CategoryType] || 0} accounts`
                      : `Custom Tag • ${folderCounts[selectedItemToManage?.name || ''] || 0} accounts`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.bottomSheetCloseBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => setShowTagActionModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={colors.mutedText} />
              </TouchableOpacity>
            </View>

            <View style={[styles.bottomSheetDivider, { backgroundColor: colors.border }]} />

            {/* Action 1: Edit Name */}
            <TouchableOpacity
              style={[styles.bottomSheetActionRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={handleStartEditItem}
              activeOpacity={0.7}
            >
              <View style={[styles.bottomSheetActionIconWrap, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="pencil" size={18} color={colors.primary} />
              </View>
              <View style={styles.bottomSheetActionTextWrap}>
                <Text style={[styles.bottomSheetActionTitle, { color: colors.text }]}>Edit Name</Text>
                <Text style={[styles.bottomSheetActionSubtitle, { color: colors.mutedText }]}>
                  Rename this tag
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
            </TouchableOpacity>

            {/* Action 2: Delete Tag / Category */}
            <TouchableOpacity
              style={[styles.bottomSheetActionRow, { backgroundColor: '#ef444412', borderColor: '#ef444430' }]}
              onPress={handleConfirmDeleteItem}
              activeOpacity={0.7}
            >
              <View style={[styles.bottomSheetActionIconWrap, { backgroundColor: '#ef444420' }]}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </View>
              <View style={styles.bottomSheetActionTextWrap}>
                <Text style={[styles.bottomSheetActionTitle, { color: '#ef4444' }]}>
                  Delete Tag
                </Text>
                <Text style={[styles.bottomSheetActionSubtitle, { color: '#ef4444aa' }]}>
                  Accounts will move to default tag
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Card Actions Material 3 Bottom Sheet (Edit & Move in 1 row 2 cols, Delete below) */}
      <Modal
        visible={showPasswordActionModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPasswordActionModal(false);
          setSelectedPasswordForAction(null);
        }}
      >
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
                        (selectedPasswordForAction
                          ? getServiceColor(selectedPasswordForAction.item.service, resolved === 'dark')
                          : colors.primary) + '18',
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      selectedPasswordForAction
                        ? (getServiceIcon(selectedPasswordForAction.item.service) as any)
                        : 'key'
                    }
                    size={22}
                    color={
                      selectedPasswordForAction
                        ? getServiceColor(selectedPasswordForAction.item.service, resolved === 'dark')
                        : colors.primary
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bottomSheetTitle, { color: colors.text }]} numberOfLines={1}>
                    {selectedPasswordForAction?.item.service}
                  </Text>
                  <Text style={[styles.bottomSheetSubtitle, { color: colors.mutedText }]} numberOfLines={1}>
                    {selectedPasswordForAction?.item.username} • {
                      selectedPasswordForAction?.item.folder
                        ? `Tag: ${selectedPasswordForAction.item.folder}`
                        : (effectiveCategories.find(
                            (c) =>
                              c.id ===
                              (selectedPasswordForAction?.item.category ||
                                categorizeService(selectedPasswordForAction?.item.service || ''))
                          )?.name || 'General')
                    }
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.bottomSheetCloseBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
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

            {/* Actions: 1 row, 2 columns for Edit and Move */}
            <View style={styles.m3ActionRow2Col}>
              {/* Column 1: Edit */}
              <TouchableOpacity
                style={[styles.m3ActionColCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => {
                  const targetIdx = selectedPasswordForAction?.globalIndex;
                  setShowPasswordActionModal(false);
                  setSelectedPasswordForAction(null);
                  if (targetIdx !== undefined) {
                    router.push(`/edit/${targetIdx}` as any);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.m3ActionColIconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="pencil" size={20} color={colors.primary} />
                </View>
                <View style={styles.m3ActionColTextWrap}>
                  <Text style={[styles.m3ActionColTitle, { color: colors.text }]}>Edit</Text>
                  <Text style={[styles.m3ActionColSubtitle, { color: colors.mutedText }]} numberOfLines={1}>
                    Update details
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Column 2: Move */}
              <TouchableOpacity
                style={[styles.m3ActionColCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
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
                  <Ionicons name="pricetag-outline" size={20} color="#8b5cf6" />
                </View>
                <View style={styles.m3ActionColTextWrap}>
                  <Text style={[styles.m3ActionColTitle, { color: colors.text }]}>Move</Text>
                  <Text style={[styles.m3ActionColSubtitle, { color: colors.mutedText }]} numberOfLines={1}>
                    Change tag
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Row 2: Delete Password (Full Width Destructive Row) */}
            <TouchableOpacity
              style={[
                styles.bottomSheetActionRow,
                { backgroundColor: '#ef444412', borderColor: '#ef444430', marginTop: 10 },
              ]}
              onPress={() => {
                const targetIdx = selectedPasswordForAction?.globalIndex;
                setShowPasswordActionModal(false);
                setSelectedPasswordForAction(null);
                if (targetIdx !== undefined) {
                  handleDelete(targetIdx);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.bottomSheetActionIconWrap, { backgroundColor: '#ef444420' }]}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </View>
              <View style={styles.bottomSheetActionTextWrap}>
                <Text style={[styles.bottomSheetActionTitle, { color: '#ef4444' }]}>Delete Password</Text>
                <Text style={[styles.bottomSheetActionSubtitle, { color: '#ef4444aa' }]}>
                  Permanently remove from vault
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
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
                <Ionicons name="pricetag-outline" size={14} color={colors.primary} />
                <Text style={[styles.moveSectionTitle, { color: colors.mutedText }]}>TAGS</Text>
                <Text style={[styles.moveSectionCount, { color: colors.mutedText }]}>
                  ({effectiveCategories.length + uniqueFolders.filter((f) => !effectiveCategories.some((c) => c.name.toLowerCase() === f.toLowerCase())).length})
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
                          backgroundColor: isCurrent ? colors.primary + '12' : colors.inputBg,
                          borderColor: isCurrent ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => moveToCategory(cat.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.categoryIconWrap, { backgroundColor: cat.gradient[0] + '20' }]}>
                        <Ionicons name={(cat.icon || 'folder-outline') as any} size={22} color={cat.gradient[0]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.moveCategoryName, { color: colors.text }]} numberOfLines={1}>
                          {cat.name}
                        </Text>
                        <Text style={[styles.moveCategoryCount, { color: colors.mutedText }]}>
                          {count} {count === 1 ? 'account' : 'accounts'}
                        </Text>
                      </View>
                      {isCurrent ? (
                        <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                          <Ionicons name="checkmark" size={14} color="#ffffff" />
                        </View>
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Custom User Tags */}
                {uniqueFolders
                  .filter((folderName) => !effectiveCategories.some((c) => c.name.toLowerCase() === folderName.toLowerCase()))
                  .map((folderName) => {
                    const isCurrent = currentTag?.toLowerCase() === folderName.toLowerCase();
                    const count = folderCounts[folderName] || 0;
                    return (
                      <TouchableOpacity
                        key={`tag-${folderName}`}
                        style={[
                          styles.moveCategoryCard,
                          {
                            backgroundColor: isCurrent ? '#8b5cf615' : colors.inputBg,
                            borderColor: isCurrent ? '#8b5cf6' : colors.border,
                          },
                        ]}
                        onPress={() => moveToTag(folderName)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.categoryIconWrap, { backgroundColor: '#8b5cf620' }]}>
                          <Ionicons name="pricetag" size={20} color="#8b5cf6" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.moveCategoryName, { color: colors.text }]} numberOfLines={1}>
                            {folderName}
                          </Text>
                          <Text style={[styles.moveCategoryCount, { color: colors.mutedText }]}>
                            {count} {count === 1 ? 'account' : 'accounts'}
                          </Text>
                        </View>
                        {isCurrent ? (
                          <View style={[styles.currentBadge, { backgroundColor: '#8b5cf6' }]}>
                            <Ionicons name="checkmark" size={14} color="#ffffff" />
                          </View>
                        ) : (
                          <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
                        )}
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
    borderWidth: 1,
    maxWidth: 140,
  },
  spacePillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
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
  addHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  pillsContainer: {
    paddingVertical: 10,
  },
  pillsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillActive: {
    borderWidth: 1.5,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardSub: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
  },
  m3ActionRow2Col: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  m3ActionColCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 10,
  },
  m3ActionColIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  m3ActionColTextWrap: {
    gap: 2,
  },
  m3ActionColTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  m3ActionColSubtitle: {
    fontSize: 12,
    fontWeight: '500',
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
    gap: 10,
  },
  moveCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  moveCategoryName: {
    fontSize: 15,
    fontWeight: '700',
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
});
