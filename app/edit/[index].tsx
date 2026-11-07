import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import SwipeToGenerate from '@/components/SwipeToGenerate';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { categories, categorizeService, getEffectiveCategories, CategoryType } from '@/lib/categories';
import { checkPasswordStrength, generateSecurePassword, getStrengthLabel } from '@/lib/password-strength';
import { normalizeServiceName } from '@/lib/service-icons';
import { PasswordItem, saveVault, getEffectiveWorkspaces, type VaultData } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function EditPassword() {
  const router = useRouter();
  const { index } = useLocalSearchParams<{ index: string }>();
  const { vault, vaultKey, setVault } = useSession();
  const { colors, resolved } = useTheme();

  // Dull / light-gray card tokens for dialogs
  const dullCardBg = resolved === 'dark' ? '#1c2027' : '#f1f3f6';
  const dullCardBorder = resolved === 'dark' ? '#2e3440' : '#d8dce2';
  const dullInputBg = resolved === 'dark' ? '#13161c' : '#ffffff';
  const dullInputBorder = resolved === 'dark' ? '#2e3440' : '#cfd4dc';
  const dullCancelBg = resolved === 'dark' ? '#252a34' : '#e4e7eb';
  const dullCancelBorder = resolved === 'dark' ? '#333a48' : '#d1d6de';
  const { showAlert, AlertComponent } = useCustomAlert();

  const passwordIndex = parseInt(index || '0', 10);
  const existingPassword = vault?.passwords[passwordIndex];

  const [service, setService] = React.useState(existingPassword?.service || '');
  const [username, setUsername] = React.useState(existingPassword?.username || '');
  const [pw, setPw] = React.useState(existingPassword?.password || '');
  const [showPw, setShowPw] = React.useState(false);
  const [notes, setNotes] = React.useState(existingPassword?.notes || '');
  const [loginPin, setLoginPin] = React.useState(existingPassword?.loginPin || '');
  const [showLoginPin, setShowLoginPin] = React.useState(false);
  const [transactionPin, setTransactionPin] = React.useState(existingPassword?.transactionPin || '');
  const [showTransactionPin, setShowTransactionPin] = React.useState(false);
  const [otherPins, setOtherPins] = React.useState<Array<{label: string; pin: string; show: boolean}>>([]);
  const [showPinSection, setShowPinSection] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [folder, setFolder] = React.useState(existingPassword?.folder || '');
  const [selectedCategory, setSelectedCategory] = React.useState<CategoryType | null>(
    (existingPassword?.category as CategoryType) || null
  );
  const [workspace, setWorkspace] = React.useState(existingPassword?.workspace || 'Personal');
  const [showAddTagModal, setShowAddTagModal] = React.useState(false);
  const [newTagName, setNewTagName] = React.useState('');

  const effectiveWorkspaces = React.useMemo(() => {
    return getEffectiveWorkspaces(vault);
  }, [vault]);

  const effectiveCats = React.useMemo(() => {
    return getEffectiveCategories(vault?.deletedCategories, vault?.categoryOverrides);
  }, [vault?.deletedCategories, vault?.categoryOverrides]);

  const customTags = React.useMemo(() => {
    if (!vault) return [];
    const pFolders = (vault.passwords || []).map((p) => p.folder).filter(Boolean) as string[];
    const cFolders = (vault.cards || []).map((c) => c.folder).filter(Boolean) as string[];
    const custom = vault.customTags || [];
    const all = Array.from(new Set([...custom, ...pFolders, ...cFolders]));
    const catNames = new Set(effectiveCats.map((c) => c.name.toLowerCase()));
    return all.filter((t) => !catNames.has(t.toLowerCase()));
  }, [vault, effectiveCats]);

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

    const existingNames = [
      ...effectiveCats.map((c) => c.name.toLowerCase()),
      ...customTags.map((t) => t.toLowerCase()),
    ];
    if (existingNames.includes(trimmed.toLowerCase())) {
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
      setFolder(trimmed);
      setSelectedCategory(null);
    } catch {
      showAlert({
        title: 'Error',
        message: 'Failed to create tag. Please try again.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    }
  }, [newTagName, effectiveCats, customTags, vault, vaultKey, setVault, showAlert]);

  // Password strength check
  const passwordStrength = React.useMemo(() => {
    if (!pw) return null;
    return checkPasswordStrength(pw);
  }, [pw]);

  const handleSwipeGeneratePassword = React.useCallback(() => {
    const generated = generateSecurePassword(16);
    setPw(generated);
    setShowPw(true);
  }, []);

  // Show normalized service name suggestion
  const normalizedSuggestion = React.useMemo(() => {
    if (!service.trim() || service.length < 2) return null;
    const normalized = normalizeServiceName(service);
    if (normalized.toLowerCase() === service.toLowerCase()) return null;
    return normalized;
  }, [service]);

  React.useEffect(() => {
    if (existingPassword?.otherPin) {
      try {
        const parsed = JSON.parse(existingPassword.otherPin) as Array<{label: string; pin: string}>;
        setOtherPins(parsed.map(p => ({ ...p, show: false })));
      } catch {}
    }
    if (existingPassword?.loginPin || existingPassword?.transactionPin || existingPassword?.otherPin) {
      setShowPinSection(true);
    }
  }, [existingPassword]);

  const addOtherPin = () => {
    setOtherPins([...otherPins, { label: '', pin: '', show: false }]);
  };

  const removeOtherPin = (idx: number) => {
    setOtherPins(otherPins.filter((_, i) => i !== idx));
  };

  const moveOtherPinUp = (idx: number) => {
    if (idx <= 0) return;
    const updated = [...otherPins];
    const temp = updated[idx];
    updated[idx] = updated[idx - 1];
    updated[idx - 1] = temp;
    setOtherPins(updated);
  };

  const moveOtherPinDown = (idx: number) => {
    if (idx >= otherPins.length - 1) return;
    const updated = [...otherPins];
    const temp = updated[idx];
    updated[idx] = updated[idx + 1];
    updated[idx + 1] = temp;
    setOtherPins(updated);
  };

  const updateOtherPinLabel = (idx: number, label: string) => {
    const updated = [...otherPins];
    updated[idx].label = label;
    setOtherPins(updated);
  };

  const updateOtherPinValue = (idx: number, pin: string) => {
    const updated = [...otherPins];
    updated[idx].pin = pin;
    setOtherPins(updated);
  };

  const toggleOtherPinVisibility = (idx: number) => {
    const updated = [...otherPins];
    updated[idx].show = !updated[idx].show;
    setOtherPins(updated);
  };

  const handleSave = async () => {
    if (loading) return;
    if (!vault || !vaultKey) return;
    if (!service.trim()) {
      showAlert({
        title: 'Required',
        message: 'Service name is required',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    if (!username.trim()) {
      showAlert({
        title: 'Required',
        message: 'Username is required',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    const hasAnyPin = loginPin || transactionPin || otherPins.some(p => p.pin);
    if (!pw && !hasAnyPin) {
      showAlert({
        title: 'Required',
        message: 'Password or at least one PIN / custom field is required',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    if (!folder && !selectedCategory) {
      showAlert({
        title: 'Required',
        message: 'Please select a tag',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    setLoading(true);
    try {
      const validOtherPins = otherPins.filter(p => p.label && p.pin);
      let category: CategoryType;
      if (selectedCategory) {
        category = selectedCategory;
      } else if (folder) {
        const matched = effectiveCats.find(
          (c) => c.name.toLowerCase() === folder.toLowerCase() || c.id === folder.toLowerCase()
        );
        category = matched ? matched.id : 'other';
      } else {
        category = categorizeService(service.trim());
      }

      const item: PasswordItem = {
        service: service.trim(),
        username: username.trim(),
        password: pw,
        notes: notes || undefined,
        category,
        loginPin: loginPin || undefined,
        transactionPin: transactionPin || undefined,
        otherPin: validOtherPins.length > 0 ? JSON.stringify(validOtherPins.map(p => ({ label: p.label, pin: p.pin }))) : undefined,
        createdAt: existingPassword?.createdAt || Date.now(),
        modifiedAt: Date.now(),
        folder: folder.trim() || undefined,
        workspace: workspace.trim() || 'Personal',
      };

      const updatedPasswords = [...vault.passwords];
      updatedPasswords[passwordIndex] = item;

      const next = { ...vault, passwords: updatedPasswords };
      await saveVault(next, vaultKey);
      setVault(() => next);
      showAlert({
        title: 'Success',
        message: 'Password updated!',
        confirmText: 'OK',
        onConfirm: () => router.back(),
      });
    } catch (e: any) {
      showAlert({
        title: 'Error',
        message: e?.message ?? 'Failed to update',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }];

  return (
    <Screen>
      <ScrollView 
        style={{ flex: 1, backgroundColor: colors.background }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        bounces={true}
        alwaysBounceVertical={true}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Edit Password</Text>
          <View style={styles.NoiconBtn} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Tags (1st) */}
          <Text style={[styles.label, { color: colors.mutedText }]}>Tags *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagChipsScroll}
            style={{ marginBottom: 16 }}
          >
            {/* Built-in Categories */}
            {effectiveCats.map((cat) => {
              const isSelected = selectedCategory === cat.id || folder.toLowerCase() === cat.name.toLowerCase();
              return (
                <TouchableOpacity
                  key={`cat-${cat.id}`}
                  style={[
                    styles.tagChip,
                    isSelected
                      ? [styles.tagChipActive, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]
                      : { backgroundColor: colors.inputBg, borderColor: colors.border },
                  ]}
                  onPress={() => {
                    if (isSelected) {
                      setFolder('');
                      setSelectedCategory(null);
                    } else {
                      setFolder(cat.name);
                      setSelectedCategory(cat.id);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={(isSelected ? 'checkmark-circle' : (cat.icon || 'folder-outline')) as any}
                    size={15}
                    color={isSelected ? colors.primary : colors.mutedText}
                  />
                  <Text
                    style={[
                      styles.tagChipText,
                      { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '700' : '500' },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Custom User Tags */}
            {customTags.map((tagName) => {
              const isSelected = !selectedCategory && folder.toLowerCase() === tagName.toLowerCase();
              return (
                <TouchableOpacity
                  key={`tag-${tagName}`}
                  style={[
                    styles.tagChip,
                    isSelected
                      ? [styles.tagChipActive, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]
                      : { backgroundColor: colors.inputBg, borderColor: colors.border },
                  ]}
                  onPress={() => {
                    if (isSelected) {
                      setFolder('');
                      setSelectedCategory(null);
                    } else {
                      setFolder(tagName);
                      setSelectedCategory(null);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'pricetag-outline'}
                    size={15}
                    color={isSelected ? colors.primary : colors.mutedText}
                  />
                  <Text
                    style={[
                      styles.tagChipText,
                      { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '700' : '500' },
                    ]}
                  >
                    {tagName}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Quick Add New Tag */}
            <TouchableOpacity
              style={[
                styles.tagChip,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.primary,
                  borderStyle: 'dashed',
                },
              ]}
              onPress={() => {
                setNewTagName('');
                setShowAddTagModal(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={15} color={colors.primary} />
              <Text style={[styles.tagChipText, { color: colors.primary, fontWeight: '700' }]}>
                New Tag
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <Text style={[styles.label, { color: colors.mutedText }]}>Website / App name</Text>
          <TextInput
            style={inputStyle}
            placeholder="e.g. Google"
            placeholderTextColor={colors.mutedText}
            value={service}
            onChangeText={setService}
          />
          {normalizedSuggestion ? (
            <TouchableOpacity 
              style={[styles.suggestionChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
              onPress={() => setService(normalizedSuggestion)}
            >
              <Ionicons name="sparkles" size={14} color={colors.primary} />
              <Text style={[styles.suggestionText, { color: colors.primary }]}>
                Use &quot;{normalizedSuggestion}&quot; instead?
              </Text>
            </TouchableOpacity>
          ) : null}

          <Text style={[styles.label, { color: colors.mutedText }]}>Username / Email</Text>
          <TextInput
            style={inputStyle}
            placeholder="e.g. you@email.com"
            placeholderTextColor={colors.mutedText}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            autoCorrect={false}
          />

          <Text style={[styles.label, { color: colors.mutedText }]}>Password {loginPin || transactionPin || otherPins.length > 0 ? '(Optional if PIN/custom field provided)' : ''}</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[...inputStyle, { paddingRight: 44 }]}
              placeholder={loginPin || transactionPin || otherPins.length > 0 ? "Optional" : "Enter password"}
              placeholderTextColor={colors.mutedText}
              secureTextEntry={!showPw}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              autoCapitalize="none"
              autoCorrect={false}
              value={pw}
              onChangeText={setPw}
            />
            <TouchableOpacity onPress={() => setShowPw((v) => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPw ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
            </TouchableOpacity>
          </View>

          {/* Circular Swipe to Generate Password */}
          <SwipeToGenerate onGenerate={handleSwipeGeneratePassword} />
          
          {passwordStrength && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                <View 
                  style={[
                    styles.strengthBarFill, 
                    { 
                      width: `${passwordStrength.score}%`, 
                      backgroundColor: passwordStrength.color 
                    }
                  ]} 
                />
              </View>
              <View style={styles.strengthInfo}>
                <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                  {getStrengthLabel(passwordStrength.strength)}
                </Text>
                <Text style={[styles.strengthFeedback, { color: colors.mutedText }]}>
                  {passwordStrength.feedback}
                </Text>
              </View>
            </View>
          )}

          <Text style={[styles.label, { color: colors.mutedText }]}>Notes</Text>
          <TextInput
            style={[...inputStyle, { height: 110, textAlignVertical: 'top' }]}
            placeholder="Optional"
            placeholderTextColor={colors.mutedText}
            multiline
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            value={notes}
            onChangeText={setNotes}
          />

          {/* Workspace Selection */}
          <Text style={[styles.label, { color: colors.mutedText }]}>Workspace</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagChipsScroll}
            style={{ marginBottom: 16 }}
          >
            {effectiveWorkspaces.map((wsName) => {
              const isSelected = (workspace || 'Personal').toLowerCase() === wsName.toLowerCase();
              return (
                <TouchableOpacity
                  key={wsName}
                  style={[
                    styles.tagChip,
                    isSelected
                      ? [styles.tagChipActive, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]
                      : { backgroundColor: colors.inputBg, borderColor: colors.border },
                  ]}
                  onPress={() => setWorkspace(wsName)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '700' : '500' },
                    ]}
                  >
                    {wsName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          
          {/* PIN Section Toggle */}
          <TouchableOpacity
            style={[styles.pinToggle, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => setShowPinSection(!showPinSection)}
          >
            <Ionicons name="keypad" size={18} color={colors.primary} />
            <Text style={[styles.pinToggleText, { color: colors.text }]}>
              {showPinSection ? 'Hide' : 'Add'} PINs & Custom Fields
            </Text>
            <Ionicons name={showPinSection ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedText} />
          </TouchableOpacity>

          {showPinSection ? (
            <View style={styles.pinSection}>
              <Text style={[styles.label, { color: colors.mutedText }]}>Login PIN</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[...inputStyle, { paddingRight: 44 }]}
                  placeholder="Optional"
                  placeholderTextColor={colors.mutedText}
                  secureTextEntry={!showLoginPin}
                  keyboardType="numeric"
                  value={loginPin}
                  onChangeText={setLoginPin}
                />
                <TouchableOpacity onPress={() => setShowLoginPin(!showLoginPin)} style={styles.eyeBtn}>
                  <Ionicons name={showLoginPin ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: colors.mutedText }]}>Transaction PIN</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[...inputStyle, { paddingRight: 44 }]}
                  placeholder="Optional"
                  placeholderTextColor={colors.mutedText}
                  secureTextEntry={!showTransactionPin}
                  keyboardType="numeric"
                  value={transactionPin}
                  onChangeText={setTransactionPin}
                />
                <TouchableOpacity onPress={() => setShowTransactionPin(!showTransactionPin)} style={styles.eyeBtn}>
                  <Ionicons name={showTransactionPin ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
                </TouchableOpacity>
              </View>

              {otherPins.map((pin, idx) => (
                <View key={idx} style={styles.otherPinRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.mutedText }]}>Field Label</Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="e.g. Security Question, Client ID, PIN"
                      placeholderTextColor={colors.mutedText}
                      value={pin.label}
                      onChangeText={(text) => updateOtherPinLabel(idx, text)}
                    />
                    <Text style={[styles.label, { color: colors.mutedText }]}>Field Value</Text>
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={[...inputStyle, { paddingRight: 44 }]}
                        placeholder="Field Value"
                        placeholderTextColor={colors.mutedText}
                        secureTextEntry={!pin.show}
                        autoCapitalize="none"
                        autoCorrect={false}
                        value={pin.pin}
                        onChangeText={(text) => updateOtherPinValue(idx, text)}
                      />
                      <TouchableOpacity onPress={() => toggleOtherPinVisibility(idx)} style={styles.eyeBtn}>
                        <Ionicons name={pin.show ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.pinActionsCol}>
                    {otherPins.length > 1 && (
                      <>
                        <TouchableOpacity
                          disabled={idx === 0}
                          onPress={() => moveOtherPinUp(idx)}
                          style={[
                            styles.orderBtn,
                            { backgroundColor: colors.inputBg, opacity: idx === 0 ? 0.3 : 1 }
                          ]}
                        >
                          <Ionicons name="chevron-up" size={16} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={idx === otherPins.length - 1}
                          onPress={() => moveOtherPinDown(idx)}
                          style={[
                            styles.orderBtn,
                            { backgroundColor: colors.inputBg, opacity: idx === otherPins.length - 1 ? 0.3 : 1 }
                          ]}
                        >
                          <Ionicons name="chevron-down" size={16} color={colors.text} />
                        </TouchableOpacity>
                      </>
                    )}
                    <TouchableOpacity
                      style={[styles.removeBtn, { backgroundColor: '#ef4444' }]}
                      onPress={() => removeOtherPin(idx)}
                    >
                      <Ionicons name="trash" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.addPinBtn, { borderColor: colors.primary }]}
                onPress={addOtherPin}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.addPinText, { color: colors.primary }]}>Add Custom Field / PIN</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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

            <TextInput
              style={[
                styles.tagInput,
                {
                  backgroundColor: dullInputBg,
                  borderColor: dullInputBorder,
                  color: colors.text,
                },
              ]}
              placeholder="Tag name (e.g., Personal, Taxes)"
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

      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '900' },
  NoiconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderColor: 'transparent' },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  label: { fontSize: 12, fontWeight: '800', marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, padding: 12, borderRadius: 12, fontSize: 15 },
  inputWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 12, top: 12 },
  button: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 14 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  pinToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  pinToggleText: { flex: 1, fontSize: 14, fontWeight: '700' },
  pinSection: { marginTop: 12 },
  otherPinRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  pinActionsCol: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBtn: {
    width: 36,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: { width: 36, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addPinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', marginTop: 12 },
  addPinText: { fontSize: 14, fontWeight: '700' },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  strengthContainer: {
    marginTop: 8,
    gap: 6,
  },
  strengthBar: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  strengthFeedback: {
    fontSize: 11,
    fontWeight: '600',
  },
  tagsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  tagChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagChipActive: {
    borderWidth: 1.5,
  },
  tagChipText: {
    fontSize: 13,
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
    marginBottom: 16,
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
