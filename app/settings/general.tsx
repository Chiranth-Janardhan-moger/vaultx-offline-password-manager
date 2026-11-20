import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { categories, DEFAULT_DELETE_CATEGORY_KEY } from '@/lib/categories';
import { isSelectWorkspaceOnLoginEnabled, setSelectWorkspaceOnLoginEnabled } from '@/lib/secure';
import { Ionicons } from '@expo/vector-icons';
import ToggleSwitch from '@/components/ToggleSwitch';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { LayoutAnimation, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function GeneralSettings() {
  const router = useRouter();
  const { unlocked } = useSession();
  const { mode, setMode, colors, showBorders, setShowBorders, resolved } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  React.useEffect(() => {
    if (!unlocked) {
      router.replace('/login');
    }
  }, [unlocked, router]);

  const [selectWorkspaceOnLogin, setSelectWorkspaceOnLogin] = React.useState(false);
  const [fallbackCategory, setFallbackCategory] = React.useState<string>('google');
  const [showFallbackModal, setShowFallbackModal] = React.useState(false);

  const dullCardBg = resolved === 'dark' ? '#1c2027' : '#FFFFFF';
  const dullCardBorder = resolved === 'dark' ? '#2e3440' : '#E5E7EB';

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
        {/* Header with Back Button */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>General</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={true}
          alwaysBounceVertical={true}
        >
          {/* Theme & Display Section */}
          <Text style={[styles.sectionHeader, { color: colors.mutedText, marginTop: 4 }]}>THEME & DISPLAY</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardInner}>
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
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setMode(t);
                        }}
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

              {/* Show Card Borders Switch */}
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="square-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>Show Card Borders</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedText }]}>
                    Display outline borders around cards
                  </Text>
                </View>
                <ToggleSwitch
                  value={showBorders}
                  onValueChange={setShowBorders}
                  accessibilityLabel="Show Card Borders"
                />
              </View>
            </View>
          </View>

          {/* Workspaces Section */}
          <Text style={[styles.sectionHeader, { color: colors.mutedText }]}>WORKSPACES</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardInner}>
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
                <ToggleSwitch
                  value={selectWorkspaceOnLogin}
                  onValueChange={toggleSelectWorkspaceOnLogin}
                  accessibilityLabel="Select Workspace on Login"
                />
              </View>
            </View>
          </View>

          {/* Tags & Categories Section */}
          <Text style={[styles.sectionHeader, { color: colors.mutedText }]}>TAGS & CATEGORIES</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardInner}>
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
          </View>
        </ScrollView>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 18,
    borderWidth: 0.6,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
        shadowColor: '#000000',
      },
    }),
  },
  cardInner: {
    borderRadius: 17.4,
    overflow: 'hidden',
  },
  themeRow: {
    padding: 16,
  },
  segmentedWrapper: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 0.6,
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
    width: '100%',
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
