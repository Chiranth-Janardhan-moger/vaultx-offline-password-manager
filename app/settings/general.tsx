import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useTheme } from '@/context/ThemeProvider';
import { categories, DEFAULT_DELETE_CATEGORY_KEY } from '@/lib/categories';
import { isSelectWorkspaceOnLoginEnabled, setSelectWorkspaceOnLoginEnabled } from '@/lib/secure';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function GeneralSettings() {
  const router = useRouter();
  const { mode, setMode, colors, enhancedContrast, setEnhancedContrast, showBorders, setShowBorders, resolved } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [selectWorkspaceOnLogin, setSelectWorkspaceOnLogin] = React.useState(false);
  const [fallbackCategory, setFallbackCategory] = React.useState<string>('google');
  const [showFallbackModal, setShowFallbackModal] = React.useState(false);

  const dullCardBg = resolved === 'dark' ? '#1c2027' : '#f1f3f6';
  const dullCardBorder = resolved === 'dark' ? '#2e3440' : '#d8dce2';

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const wsOnLogin = await isSelectWorkspaceOnLoginEnabled();
        setSelectWorkspaceOnLogin(wsOnLogin);

        const fbCat = await SecureStore.getItemAsync(DEFAULT_DELETE_CATEGORY_KEY);
        setFallbackCategory(fbCat || 'google');
      })();
    }, [])
  );

  const toggleSelectWorkspaceOnLogin = async () => {
    const newValue = !selectWorkspaceOnLogin;
    setSelectWorkspaceOnLogin(newValue);
    await setSelectWorkspaceOnLoginEnabled(newValue);
  };

  const handleSelectFallbackCategory = async (catId: string) => {
    setFallbackCategory(catId);
    await SecureStore.setItemAsync(DEFAULT_DELETE_CATEGORY_KEY, catId);
    setShowFallbackModal(false);
    const catName = categories.find((c) => c.id === catId)?.name || catId;
    showAlert({
      title: 'Default Tag Updated',
      message: `Accounts from deleted tags will now automatically move to "${catName}".`,
      confirmText: 'OK',
      onConfirm: () => {},
    });
  };

  const fallbackCatName = categories.find((c) => c.id === fallbackCategory)?.name || 'Google';

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.bodyWrap}>
          {/* Header with Back Button */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>General</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={true}
            alwaysBounceVertical={true}
          >
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Theme Segmented Control matching uploaded design */}
              <View style={styles.themeRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Theme</Text>
                </View>

                {/* 3-Segmented Pill Container */}
                <View style={[styles.segmentedWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  {(['system', 'light', 'dark'] as const).map((t) => {
                    const isSelected = mode === t;
                    const label = t === 'system' ? 'System' : t === 'light' ? 'Light' : 'Dark';
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.segmentBtn,
                          isSelected && [styles.segmentBtnActive, { backgroundColor: colors.primary }],
                        ]}
                        onPress={() => setMode(t)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            {
                              color: isSelected ? '#ffffff' : colors.mutedText,
                              fontWeight: isSelected ? '800' : '600',
                            },
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Workspace on Login Switch */}
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="grid-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Select Workspace on Login</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>
                    Prompt to choose workspace after unlocking
                  </Text>
                </View>
                <Switch
                  value={selectWorkspaceOnLogin}
                  onValueChange={toggleSelectWorkspaceOnLogin}
                  trackColor={{ false: resolved === 'dark' ? '#334155' : colors.border, true: colors.primary + '60' }}
                  thumbColor={selectWorkspaceOnLogin ? colors.primary : (resolved === 'dark' ? '#64748b' : '#94a3b8')}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Enhanced Contrast Switch */}
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="contrast-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Enhanced Contrast</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>
                    Higher contrast and pure black panels
                  </Text>
                </View>
                <Switch
                  value={enhancedContrast}
                  onValueChange={setEnhancedContrast}
                  trackColor={{ false: resolved === 'dark' ? '#334155' : colors.border, true: colors.primary + '60' }}
                  thumbColor={enhancedContrast ? colors.primary : (resolved === 'dark' ? '#64748b' : '#94a3b8')}
                />
              </View>

              {enhancedContrast ? (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.row}>
                    <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                      <Ionicons name="square-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>Show Card Borders</Text>
                      <Text style={[styles.itemSub, { color: colors.mutedText }]}>
                        Display defined borders around items
                      </Text>
                    </View>
                    <Switch
                      value={showBorders}
                      onValueChange={setShowBorders}
                      trackColor={{ false: resolved === 'dark' ? '#334155' : colors.border, true: colors.primary + '60' }}
                      thumbColor={showBorders ? colors.primary : (resolved === 'dark' ? '#64748b' : '#94a3b8')}
                    />
                  </View>
                </>
              ) : null}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Tag Deletion Target */}
              <TouchableOpacity style={styles.row} onPress={() => setShowFallbackModal(true)} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Tag Deletion Target</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>
                    Move items to &quot;{fallbackCatName}&quot; when tag is removed
                  </Text>
                </View>
                <View style={styles.badgeWrap}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{fallbackCatName}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedText} />
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Fallback Tag Selection Modal */}
      <Modal visible={showFallbackModal} transparent animationType="fade" onRequestClose={() => setShowFallbackModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFallbackModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.dialogCard, { backgroundColor: dullCardBg, borderColor: dullCardBorder }]}>
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Tag Deletion Target</Text>
            <Text style={[styles.dialogSub, { color: colors.mutedText }]}>
              When a tag is deleted, accounts will move to this default tag
            </Text>

            <ScrollView style={{ maxHeight: 300, marginTop: 12 }}>
              {categories.map((cat) => {
                const isSelected = fallbackCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.dialogOption,
                      isSelected && { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                    ]}
                    onPress={() => handleSelectFallbackCategory(cat.id)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name={cat.icon as any} size={18} color={isSelected ? colors.primary : colors.mutedText} />
                      <Text style={[styles.dialogOptionText, { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '700' : '500' }]}>
                        {cat.name} {cat.id === 'google' ? '(Default)' : ''}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.dialogCancelBtn, { borderColor: dullCardBorder }]}
              onPress={() => setShowFallbackModal(false)}
            >
              <Text style={[styles.dialogCancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bodyWrap: { flex: 1, paddingHorizontal: 20, paddingTop: 14 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '900' },
  scrollContent: { paddingBottom: 28 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  themeRow: {
    padding: 16,
  },
  segmentedWrapper: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentBtnActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  segmentText: {
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 64,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    elevation: 5,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  dialogSub: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
  dialogOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 6,
  },
  dialogOptionText: {
    fontSize: 14,
  },
  dialogCancelBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  dialogCancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
