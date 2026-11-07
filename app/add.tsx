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

export default function AddPassword() {
  const router = useRouter();
  const { unlocked, vault, vaultKey, setVault, activeWorkspace } = useSession();
  const { colors, resolved } = useTheme();

  // Dull / light-gray card tokens for dialogs
  const dullCardBg = resolved === 'dark' ? '#1c2027' : '#f1f3f6';
  const dullCardBorder = resolved === 'dark' ? '#2e3440' : '#d8dce2';
  const dullInputBg = resolved === 'dark' ? '#13161c' : '#ffffff';
  const dullInputBorder = resolved === 'dark' ? '#2e3440' : '#cfd4dc';
  const dullCancelBg = resolved === 'dark' ? '#252a34' : '#e4e7eb';
  const dullCancelBorder = resolved === 'dark' ? '#333a48' : '#d1d6de';
  const { showAlert, AlertComponent } = useCustomAlert();
  const params = useLocalSearchParams();

  const [service, setService] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const [loginPin, setLoginPin] = React.useState('');
  const [showLoginPin, setShowLoginPin] = React.useState(false);
  const [transactionPin, setTransactionPin] = React.useState('');
  const [showTransactionPin, setShowTransactionPin] = React.useState(false);
  const [otherPins, setOtherPins] = React.useState<Array<{label: string; pin: string; show: boolean}>>([]);
  const [showPinSection, setShowPinSection] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [folder, setFolder] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<CategoryType | null>(null);
  const userManuallySelectedTagRef = React.useRef(false);
  const [workspace, setWorkspace] = React.useState<string>(
    (params.workspace as string) || activeWorkspace || 'Personal'
  );
  const [showAddTagModal, setShowAddTagModal] = React.useState(false);
  const [newTagName, setNewTagName] = React.useState('');

  const effectiveWorkspaces = React.useMemo(() => {
    return getEffectiveWorkspaces(vault);
  }, [vault]);

  const effectiveCats = React.useMemo(() => {
    return getEffectiveCategories(vault?.deletedCategories, vault?.categoryOverrides);
  }, [vault?.deletedCategories, vault?.categoryOverrides]);

  const handleServiceChange = React.useCallback(
    (text: string) => {
      setService(text);
      if (!userManuallySelectedTagRef.current) {
        const trimmed = text.trim();
        if (trimmed.length >= 2) {
          const matchedCatId = categorizeService(trimmed, vault?.deletedCategories);
          if (matchedCatId && matchedCatId !== 'other') {
            const cat = effectiveCats.find((c) => c.id === matchedCatId);
            if (cat) {
              setSelectedCategory(cat.id);
              setFolder(cat.name);
            }
          }
        } else if (trimmed.length === 0) {
          setSelectedCategory(null);
          setFolder('');
        }
      }
    },
    [vault?.deletedCategories, effectiveCats]
  );

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
      userManuallySelectedTagRef.current = true;
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
    // Only show if it's different from what user typed
    if (normalized.toLowerCase() === service.toLowerCase()) return null;
    return normalized;
  }, [service]);

  const addOtherPin = () => {
    setOtherPins([...otherPins, { label: '', pin: '', show: false }]);
  };

  const removeOtherPin = (index: number) => {
    setOtherPins(otherPins.filter((_, i) => i !== index));
  };

  const moveOtherPinUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...otherPins];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setOtherPins(updated);
  };

  const moveOtherPinDown = (index: number) => {
    if (index >= otherPins.length - 1) return;
    const updated = [...otherPins];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setOtherPins(updated);
  };

  const updateOtherPinLabel = (index: number, label: string) => {
    const updated = [...otherPins];
    updated[index].label = label;
    setOtherPins(updated);
  };

  const updateOtherPinValue = (index: number, pin: string) => {
    const updated = [...otherPins];
    updated[index].pin = pin;
    setOtherPins(updated);
  };

  const toggleOtherPinVisibility = (index: number) => {
    const updated = [...otherPins];
    updated[index].show = !updated[index].show;
    setOtherPins(updated);
  };

  React.useEffect(() => {
    if (!unlocked) router.replace('/login');
  }, [unlocked, router]);

  const onSave = React.useCallback(async () => {
    if (loading) return;
    if (!vault || !vaultKey) return;
    if (!service.trim()) {
      showAlert({
        title: 'Required',
        message: 'Service is required',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    if (!username.trim()) {
      showAlert({
        title: 'Required',
        message: 'Username/Email is required',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    
    // Check if at least password OR any PIN is provided
    const hasLoginPin = loginPin.trim().length > 0;
    const hasTransactionPin = transactionPin.trim().length > 0;
    const hasOtherPins = otherPins.some(p => p.pin.trim().length > 0);
    const hasAnyPin = hasLoginPin || hasTransactionPin || hasOtherPins;
    
    if (!pw && !hasAnyPin) {
      showAlert({
        title: 'Required',
        message: 'Please provide either a password or at least one PIN / custom field',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    let finalCategory = selectedCategory;
    let finalFolder = folder;
    if (!finalFolder && !finalCategory) {
      const autoCat = categorizeService(service.trim(), vault?.deletedCategories);
      if (autoCat) {
        finalCategory = autoCat;
        const matched = effectiveCats.find((c) => c.id === autoCat);
        if (matched) finalFolder = matched.name;
      }
    }

    if (!finalFolder && !finalCategory) {
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
      // Determine category based on user selection or fallback
      let category: CategoryType;
      if (finalCategory) {
        category = finalCategory;
      } else if (finalFolder) {
        const matched = effectiveCats.find(
          (c) => c.name.toLowerCase() === finalFolder.toLowerCase() || c.id === finalFolder.toLowerCase()
        );
        category = matched ? matched.id : 'other';
      } else {
        category = categorizeService(service);
      }
      
      // Prepare other pins data
      const otherPinsData = otherPins
        .filter(p => p.label.trim() && p.pin.trim())
        .map(p => ({ label: p.label.trim(), pin: p.pin.trim() }));
      
      const item: PasswordItem = { 
        service: service.trim(), 
        username: username.trim(), 
        password: pw || '', 
        notes,
        category,
        loginPin: loginPin.trim() || undefined,
        transactionPin: transactionPin.trim() || undefined,
        otherPin: otherPinsData.length > 0 ? JSON.stringify(otherPinsData) : undefined,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        folder: finalFolder.trim() || undefined,
        workspace: workspace.trim() || 'Personal',
      };
      const next = { ...vault, passwords: [...vault.passwords, item] };
      await saveVault(next, vaultKey);
      setVault(() => next);
      router.replace('/dashboard');
    } catch (e: any) {
      showAlert({
        title: 'Error',
        message: e?.message ?? 'Failed to save',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } finally {
      setLoading(false);
    }
  }, [loading, vault, vaultKey, service, username, pw, notes, loginPin, transactionPin, otherPins, folder, selectedCategory, setVault, router, showAlert]);

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
          <Text style={[styles.title, { color: colors.text }]}>Add Password</Text>
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
                    userManuallySelectedTagRef.current = true;
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
                    userManuallySelectedTagRef.current = true;
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
            onChangeText={handleServiceChange}
          />
          {normalizedSuggestion ? (
            <TouchableOpacity 
              style={[styles.suggestionChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
              onPress={() => handleServiceChange(normalizedSuggestion)}
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
            <TouchableOpacity
              onPress={() => setShowPw((v) => !v)}
              style={styles.eyeBtn}
              accessibilityRole="button"
              accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
            >
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
            <Ionicons name="keypad" size={20} color={colors.primary} />
            <Text style={[styles.pinToggleText, { color: colors.text }]}>
              {showPinSection ? 'Hide' : 'Add'} PINs & Custom Fields
            </Text>
            <Ionicons 
              name={showPinSection ? 'chevron-up' : 'chevron-down'} 
              size={18} 
              color={colors.mutedText} 
            />
          </TouchableOpacity>

          {showPinSection ? (
            <View style={styles.pinSection}>
              <Text style={[styles.pinSectionTitle, { color: colors.text }]}>
                Store your PINs & custom fields securely
              </Text>
              <Text style={[styles.pinSectionSub, { color: colors.mutedText }]}>
                Never forget your banking PINs, security answers, or custom keys again
              </Text>

              {/* Login PIN */}
              <Text style={[styles.label, { color: colors.mutedText }]}>Login PIN (Optional)</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[...inputStyle, { paddingRight: 44 }]}
                  placeholder="e.g. 1234 or 123456"
                  placeholderTextColor={colors.mutedText}
                  secureTextEntry={!showLoginPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="off"
                  textContentType="none"
                  value={loginPin}
                  onChangeText={(text) => setLoginPin(text.replace(/[^0-9]/g, ''))}
                />
                <TouchableOpacity
                  onPress={() => setShowLoginPin((v) => !v)}
                  style={styles.eyeBtn}
                >
                  <Ionicons name={showLoginPin ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
                </TouchableOpacity>
              </View>

              {/* Transaction PIN */}
              <Text style={[styles.label, { color: colors.mutedText }]}>Transaction PIN (Optional)</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={[...inputStyle, { paddingRight: 44 }]}
                  placeholder="e.g. 1234 or 123456"
                  placeholderTextColor={colors.mutedText}
                  secureTextEntry={!showTransactionPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="off"
                  textContentType="none"
                  value={transactionPin}
                  onChangeText={(text) => setTransactionPin(text.replace(/[^0-9]/g, ''))}
                />
                <TouchableOpacity
                  onPress={() => setShowTransactionPin((v) => !v)}
                  style={styles.eyeBtn}
                >
                  <Ionicons name={showTransactionPin ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
                </TouchableOpacity>
              </View>

              {/* Other PIN with custom label */}
              <Text style={[styles.label, { color: colors.mutedText, marginTop: 12 }]}>Custom Fields / Additional PINs</Text>
              
              {otherPins.map((otherPin, index) => (
                <View key={index} style={styles.otherPinItem}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={[inputStyle, { marginBottom: 8 }]}
                      placeholder="Field Label (e.g. Security Question, Client ID, PIN)"
                      placeholderTextColor={colors.mutedText}
                      value={otherPin.label}
                      onChangeText={(text) => updateOtherPinLabel(index, text)}
                    />
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={[...inputStyle, { paddingRight: 44 }]}
                        placeholder="Field Value"
                        placeholderTextColor={colors.mutedText}
                        secureTextEntry={!otherPin.show}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="off"
                        textContentType="none"
                        value={otherPin.pin}
                        onChangeText={(text) => updateOtherPinValue(index, text)}
                      />
                      <TouchableOpacity
                        onPress={() => toggleOtherPinVisibility(index)}
                        style={styles.eyeBtn}
                      >
                        <Ionicons name={otherPin.show ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.pinActionsCol}>
                    {otherPins.length > 1 && (
                      <>
                        <TouchableOpacity
                          disabled={index === 0}
                          onPress={() => moveOtherPinUp(index)}
                          style={[
                            styles.orderBtn,
                            { backgroundColor: colors.inputBg, opacity: index === 0 ? 0.3 : 1 }
                          ]}
                        >
                          <Ionicons name="chevron-up" size={16} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={index === otherPins.length - 1}
                          onPress={() => moveOtherPinDown(index)}
                          style={[
                            styles.orderBtn,
                            { backgroundColor: colors.inputBg, opacity: index === otherPins.length - 1 ? 0.3 : 1 }
                          ]}
                        >
                          <Ionicons name="chevron-down" size={16} color={colors.text} />
                        </TouchableOpacity>
                      </>
                    )}
                    <TouchableOpacity
                      onPress={() => removeOtherPin(index)}
                      style={[styles.removeBtn, { backgroundColor: colors.inputBg }]}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.addPinBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={addOtherPin}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.addPinText, { color: colors.primary }]}>Add Custom Field / PIN</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={onSave}
          >
            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save'}</Text>
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
  NoiconBtn: { width: 40, height: 40 ,borderColor: 'transparent'},
  iconBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '900' },
  card: { borderWidth: 1, borderRadius: 16, padding: 14 },
  label: { fontSize: 12, fontWeight: '800', marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, padding: 12, borderRadius: 12, fontSize: 15 },
  inputWrap: { position: 'relative' },
  eyeBtn: { position: 'absolute', right: 2, top: 0, bottom: 0, height: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  button: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 14 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  pinToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  pinToggleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  pinSection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  pinSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  pinSectionSub: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  otherPinItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
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
  removeBtn: {
    width: 36,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addPinText: {
    fontSize: 14,
    fontWeight: '700',
  },
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
