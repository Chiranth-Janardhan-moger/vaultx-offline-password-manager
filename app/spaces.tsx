import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { getEffectiveWorkspaces, saveVault, type VaultData } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function WorkspacesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromLogin = params.fromLogin === '1';

  const { unlocked, vault, vaultKey, setVault, activeWorkspace, setActiveWorkspace } = useSession();
  const { colors, resolved } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  React.useEffect(() => {
    if (!unlocked) {
      router.replace('/login');
    }
  }, [unlocked, router]);

  // Dull card theme tokens
  const dullCardBg = resolved === 'dark' ? '#1c2027' : '#f1f3f6';
  const dullCardBorder = resolved === 'dark' ? '#2e3440' : '#d8dce2';
  const dullInputBg = resolved === 'dark' ? '#13161c' : '#ffffff';
  const dullInputBorder = resolved === 'dark' ? '#2e3440' : '#cfd4dc';
  const dullCancelBg = resolved === 'dark' ? '#252a34' : '#e4e7eb';
  const dullCancelBorder = resolved === 'dark' ? '#333a48' : '#d1d6de';

  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newSpaceName, setNewSpaceName] = React.useState('');

  const [showActionSheet, setShowActionSheet] = React.useState(false);
  const [selectedSpaceToManage, setSelectedSpaceToManage] = React.useState<string | null>(null);

  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editSpaceName, setEditSpaceName] = React.useState('');

  const effectiveSpaces = React.useMemo(() => {
    return getEffectiveWorkspaces(vault);
  }, [vault]);

  // Count passwords per workspace
  const spaceCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    (vault?.passwords || []).forEach((p) => {
      const ws = p.workspace || 'Personal';
      counts[ws] = (counts[ws] || 0) + 1;
    });
    return counts;
  }, [vault?.passwords]);

  const handleSelectSpace = async (space: string) => {
    await setActiveWorkspace(space);
    if (fromLogin) {
      router.replace('/dashboard');
    } else {
      router.back();
    }
  };

  const handleLongPressSpace = (space: string) => {
    if (space === 'Personal') {
      showAlert({
        title: 'Default Workspace',
        message: '"Personal" is the primary default workspace and cannot be edited or deleted.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    setSelectedSpaceToManage(space);
    setShowActionSheet(true);
  };

  const handleCreateSpace = async () => {
    const trimmed = newSpaceName.trim();
    if (!trimmed) {
      showAlert({
        title: 'Required',
        message: 'Please enter a name for the workspace.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    if (trimmed.toLowerCase() === 'all') {
      showAlert({
        title: 'Reserved Name',
        message: '"All" is a reserved name. Please choose a different name.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    const exists = effectiveSpaces.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      showAlert({
        title: 'Already Exists',
        message: `A workspace named "${trimmed}" already exists.`,
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    if (!vault || !vaultKey) return;

    const currentCustom = vault.customSpaces || [];
    const updatedCustom = [...currentCustom, trimmed];
    const updatedVault: VaultData = { ...vault, customSpaces: updatedCustom };

    try {
      await saveVault(updatedVault, vaultKey);
      setVault(() => updatedVault);
      await setActiveWorkspace(trimmed);
      setShowAddModal(false);
      setNewSpaceName('');
    } catch {
      showAlert({
        title: 'Error',
        message: 'Failed to create workspace.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    }
  };

  const handleStartEdit = () => {
    if (!selectedSpaceToManage) return;
    setEditSpaceName(selectedSpaceToManage);
    setShowActionSheet(false);
    setTimeout(() => setShowEditModal(true), 250);
  };

  const handleSaveEdit = async () => {
    const trimmed = editSpaceName.trim();
    if (!trimmed || !selectedSpaceToManage || !vault || !vaultKey) return;

    if (trimmed.toLowerCase() === selectedSpaceToManage.toLowerCase()) {
      setShowEditModal(false);
      return;
    }

    const exists = effectiveSpaces.some(
      (s) => s.toLowerCase() === trimmed.toLowerCase() && s.toLowerCase() !== selectedSpaceToManage.toLowerCase()
    );
    if (exists) {
      showAlert({
        title: 'Already Exists',
        message: `A workspace named "${trimmed}" already exists.`,
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    const currentCustom = vault.customSpaces || [];
    const updatedCustom = currentCustom.map((s) => (s === selectedSpaceToManage ? trimmed : s));
    if (selectedSpaceToManage === 'Work' && !updatedCustom.includes(trimmed)) {
      updatedCustom.push(trimmed);
    }

    // Update items belonging to this space
    const updatedPasswords = (vault.passwords || []).map((p) =>
      p.workspace === selectedSpaceToManage ? { ...p, workspace: trimmed } : p
    );
    const updatedCards = (vault.cards || []).map((c) =>
      c.workspace === selectedSpaceToManage ? { ...c, workspace: trimmed } : c
    );

    const updatedVault: VaultData = {
      ...vault,
      customSpaces: updatedCustom,
      passwords: updatedPasswords,
      cards: updatedCards,
    };

    try {
      await saveVault(updatedVault, vaultKey);
      setVault(() => updatedVault);
      if (activeWorkspace === selectedSpaceToManage) {
        await setActiveWorkspace(trimmed);
      }
      setShowEditModal(false);
      setSelectedSpaceToManage(null);
    } catch {
      showAlert({
        title: 'Error',
        message: 'Failed to update workspace name.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!selectedSpaceToManage) return;
    const spaceToDelete = selectedSpaceToManage;
    const count = spaceCounts[spaceToDelete] || 0;

    showAlert({
      title: 'Delete Workspace?',
      message:
        count > 0
          ? `Deleting "${spaceToDelete}" will move its ${count} account${count > 1 ? 's' : ''} to "Personal".`
          : `Are you sure you want to delete "${spaceToDelete}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        if (!vault || !vaultKey) return;

        const updatedCustom = (vault.customSpaces || []).filter((s) => s !== spaceToDelete);
        const updatedPasswords = (vault.passwords || []).map((p) =>
          p.workspace === spaceToDelete ? { ...p, workspace: 'Personal' } : p
        );
        const updatedCards = (vault.cards || []).map((c) =>
          c.workspace === spaceToDelete ? { ...c, workspace: 'Personal' } : c
        );

        const updatedVault: VaultData = {
          ...vault,
          customSpaces: updatedCustom,
          passwords: updatedPasswords,
          cards: updatedCards,
        };

        try {
          await saveVault(updatedVault, vaultKey);
          setVault(() => updatedVault);
          if (activeWorkspace === spaceToDelete) {
            await setActiveWorkspace('Personal');
          }
          setShowActionSheet(false);
          setSelectedSpaceToManage(null);
        } catch {
          showAlert({
            title: 'Error',
            message: 'Failed to delete workspace.',
            confirmText: 'OK',
            onConfirm: () => {},
          });
        }
      },
    });
  };

  // Build grid data: spaces + "+ New Space" button
  const gridData = React.useMemo(() => {
    const items: Array<{ id: string; name: string; isAddButton?: boolean }> = effectiveSpaces.map((s) => ({
      id: s,
      name: s,
    }));
    items.push({ id: '__add_new__', name: '+ New Space', isAddButton: true });
    return items;
  }, [effectiveSpaces]);

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (fromLogin) {
                router.replace('/dashboard');
              } else {
                router.back();
              }
            }}
            accessibilityLabel={fromLogin ? 'Skip' : 'Back'}
          >
            <Ionicons name={fromLogin ? 'close' : 'chevron-back'} size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Workspaces</Text>
          {fromLogin ? (
            <TouchableOpacity onPress={() => router.replace('/dashboard')} style={styles.skipBtn}>
              <Text style={[styles.skipText, { color: colors.primary }]}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Subtitle */}
        <Text style={[styles.pageSub, { color: colors.mutedText }]}>
          Select a space to switch accounts
        </Text>

        {/* 2-Column Square Cards Grid */}
        <FlatList
          data={gridData}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if (item.isAddButton) {
              return (
                <TouchableOpacity
                  style={[
                    styles.squareCard,
                    styles.addCard,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setShowAddModal(true)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.addIconCircle, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons name="add" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.addCardTitle, { color: colors.text }]}>New Space</Text>
                  <Text style={[styles.addCardSub, { color: colors.mutedText }]}>Create workspace</Text>
                </TouchableOpacity>
              );
            }

            const isCurrent = (activeWorkspace || 'Personal') === item.name;
            const count = spaceCounts[item.name] || 0;
            const subtitle = item.name === 'Personal' ? 'Default' : item.name === 'Work' ? 'Workspace' : 'Custom';

            return (
              <TouchableOpacity
                style={[
                  styles.squareCard,
                  {
                    backgroundColor: isCurrent ? colors.primary + '12' : colors.card,
                    borderColor: isCurrent ? colors.primary : colors.border,
                    borderWidth: isCurrent ? 1.5 : 1,
                  },
                ]}
                onPress={() => handleSelectSpace(item.name)}
                onLongPress={() => handleLongPressSpace(item.name)}
                activeOpacity={0.7}
              >
                {/* Top: Space Name & Active Checkmark */}
                <View style={styles.cardTopRow}>
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: isCurrent ? colors.primary : colors.text, fontWeight: isCurrent ? '700' : '600' },
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {isCurrent ? (
                    <View style={[styles.activeCheckBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={12} color="#ffffff" />
                    </View>
                  ) : null}
                </View>

                {/* Bottom: Count & Subtitle */}
                <View style={styles.cardBottom}>
                  <Text style={[styles.cardCountText, { color: colors.text }]}>
                    {count} {count === 1 ? 'account' : 'accounts'}
                  </Text>
                  <Text style={[styles.cardSubText, { color: colors.mutedText }]}>{subtitle}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            <View style={styles.footerWrap}>
              <Text style={[styles.footerTip, { color: colors.mutedText }]}>
                Tip: Long press any custom workspace to edit or delete it.
              </Text>
            </View>
          }
        />

        {/* Material 3 Bottom Sheet for Actions */}
        <Modal
          visible={showActionSheet}
          transparent
          animationType="slide"
          onRequestClose={() => setShowActionSheet(false)}
        >
          <View style={styles.bottomSheetOverlay}>
            <TouchableOpacity
              style={styles.bottomSheetBackdrop}
              activeOpacity={1}
              onPress={() => setShowActionSheet(false)}
            />
            <View style={[styles.bottomSheetContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

              <View style={styles.bottomSheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bottomSheetTitle, { color: colors.text }]} numberOfLines={1}>
                    {selectedSpaceToManage}
                  </Text>
                  <Text style={[styles.bottomSheetSubtitle, { color: colors.mutedText }]}>
                    Workspace • {spaceCounts[selectedSpaceToManage || ''] || 0} accounts
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.sheetCloseBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                  onPress={() => setShowActionSheet(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color={colors.mutedText} />
                </TouchableOpacity>
              </View>

              <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />

              {/* Edit Option */}
              <TouchableOpacity
                style={[styles.sheetActionRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={handleStartEdit}
                activeOpacity={0.7}
              >
                <View style={[styles.sheetActionIconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="pencil" size={18} color={colors.primary} />
                </View>
                <View style={styles.sheetActionTextWrap}>
                  <Text style={[styles.sheetActionTitle, { color: colors.text }]}>Edit Name</Text>
                  <Text style={[styles.sheetActionSubtitle, { color: colors.mutedText }]}>
                    Rename this workspace
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
              </TouchableOpacity>

              {/* Delete Option */}
              <TouchableOpacity
                style={[styles.sheetActionRow, { backgroundColor: '#ef444412', borderColor: '#ef444430' }]}
                onPress={handleConfirmDelete}
                activeOpacity={0.7}
              >
                <View style={[styles.sheetActionIconWrap, { backgroundColor: '#ef444420' }]}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </View>
                <View style={styles.sheetActionTextWrap}>
                  <Text style={[styles.sheetActionTitle, { color: '#ef4444' }]}>Delete Workspace</Text>
                  <Text style={[styles.sheetActionSubtitle, { color: '#ef4444aa' }]}>
                    Accounts will move to Personal
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Create Space Dull Modal */}
        <Modal
          visible={showAddModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowAddModal(false)}
            />
            <View style={[styles.modalContent, { backgroundColor: dullCardBg, borderColor: dullCardBorder }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Create Workspace</Text>
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: dullCancelBg, borderColor: dullCancelBorder }]}
                  onPress={() => setShowAddModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color={colors.mutedText} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 13, color: colors.mutedText, marginBottom: 14 }}>
                Enter a name for the new workspace (e.g. Freelance, Side Project).
              </Text>

              <TextInput
                style={[
                  styles.spaceInput,
                  {
                    backgroundColor: dullInputBg,
                    borderColor: dullInputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="Workspace name"
                placeholderTextColor={colors.mutedText}
                value={newSpaceName}
                onChangeText={setNewSpaceName}
                autoFocus
                maxLength={25}
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: dullCancelBg, borderColor: dullCancelBorder }]}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={handleCreateSpace}
                >
                  <Text style={[styles.modalBtnText, { color: '#fff', fontWeight: '700' }]}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Space Dull Modal */}
        <Modal
          visible={showEditModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowEditModal(false)}
            />
            <View style={[styles.modalContent, { backgroundColor: dullCardBg, borderColor: dullCardBorder }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Rename Workspace</Text>
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: dullCancelBg, borderColor: dullCancelBorder }]}
                  onPress={() => setShowEditModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color={colors.mutedText} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[
                  styles.spaceInput,
                  {
                    backgroundColor: dullInputBg,
                    borderColor: dullInputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="Workspace name"
                placeholderTextColor={colors.mutedText}
                value={editSpaceName}
                onChangeText={setEditSpaceName}
                autoFocus
                maxLength={25}
              />

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: dullCancelBg, borderColor: dullCancelBorder }]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={handleSaveEdit}
                >
                  <Text style={[styles.modalBtnText, { color: '#fff', fontWeight: '700' }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <AlertComponent />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  pageSub: {
    fontSize: 13,
    marginBottom: 20,
    marginLeft: 4,
  },
  listContent: {
    paddingBottom: 40,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  squareCard: {
    flex: 1,
    aspectRatio: 1.08,
    borderRadius: 18,
    padding: 14,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 17,
    letterSpacing: -0.2,
    flex: 1,
    marginRight: 6,
  },
  activeCheckBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBottom: {
    marginTop: 'auto',
  },
  cardCountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardSubText: {
    fontSize: 12,
    marginTop: 2,
  },
  addCard: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  addCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  addCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  footerWrap: {
    marginTop: 18,
    alignItems: 'center',
  },
  footerTip: {
    fontSize: 12,
    textAlign: 'center',
  },
  /* Bottom Sheet */
  bottomSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  bottomSheetBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomSheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
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
    marginBottom: 14,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  bottomSheetSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDivider: {
    height: 1,
    marginBottom: 14,
  },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  sheetActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetActionTextWrap: {
    flex: 1,
  },
  sheetActionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  sheetActionSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
