import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { CardField, CardItem, saveVault } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const CARD_DESIGNS: Array<{ name: string; gradient: [string, string] }> = [
  { name: 'Midnight', gradient: ['#141e30', '#243b55'] },
  { name: 'Obsidian', gradient: ['#000000', '#2c3440'] },
  { name: 'Sapphire', gradient: ['#1e3c72', '#2a5298'] },
  { name: 'Emerald', gradient: ['#0f382c', '#11998e'] },
  { name: 'Crimson', gradient: ['#3a1c22', '#c0392b'] },
  { name: 'Violet', gradient: ['#2e1052', '#7f00ff'] },
  { name: 'Ocean', gradient: ['#1a365d', '#00b4db'] },
  { name: 'Steel', gradient: ['#232526', '#414345'] },
  { name: 'Blaze', gradient: ['#4a0e17', '#e65c00'] },
  { name: 'Cyber', gradient: ['#16222f', '#1976d2'] },
];

const QUICK_FIELD_SUGGESTIONS = ['CVV', 'PIN', 'Issue Date', 'Category', 'Notes', 'Date of Birth'];

export default function AddCard() {
  const router = useRouter();
  const { unlocked, vault, vaultKey, setVault, activeWorkspace } = useSession();
  const { colors } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [title, setTitle] = React.useState('');
  const [holderName, setHolderName] = React.useState('');
  const [number, setNumber] = React.useState('');
  const [expiry, setExpiry] = React.useState('');
  const [selectedGradient, setSelectedGradient] = React.useState<[string, string]>(CARD_DESIGNS[0].gradient);
  const [customFields, setCustomFields] = React.useState<CardField[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!unlocked) {
      router.replace('/login');
    }
  }, [unlocked, router]);

  const addCustomField = (prefillLabel?: string) => {
    setCustomFields((prev) => [
      ...prev,
      {
        label: prefillLabel || '',
        value: '',
        isSensitive: prefillLabel === 'CVV' || prefillLabel === 'PIN',
      },
    ]);
  };

  const updateCustomField = (index: number, key: keyof CardField, val: any) => {
    setCustomFields((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: val };
      return updated;
    });
  };

  const removeCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveCard = React.useCallback(async () => {
    if (loading) return;
    if (!vault || !vaultKey) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showAlert({
        title: 'Title Required',
        message: 'Please enter a name or title for this card.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }

    setLoading(true);
    try {
      // Build final fields list: add Expiry if provided, then custom fields
      const finalFields: CardField[] = [];
      if (expiry.trim()) {
        finalFields.push({
          label: 'Valid Thru',
          value: expiry.trim(),
          isSensitive: false,
        });
      }

      for (const cf of customFields) {
        if (cf.label.trim() && cf.value.trim()) {
          finalFields.push({
            label: cf.label.trim(),
            value: cf.value.trim(),
            isSensitive: cf.isSensitive,
          });
        }
      }

      const newCard: CardItem = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
        type: 'custom',
        title: trimmedTitle,
        holderName: holderName.trim(),
        number: number.trim(),
        fields: finalFields,
        gradient: selectedGradient,
        createdAt: Date.now(),
        workspace: activeWorkspace || 'Personal',
      };

      const existingCards = vault.cards || [];
      const updatedVault = {
        ...vault,
        cards: [...existingCards, newCard],
      };

      await saveVault(updatedVault, vaultKey);
      setVault(() => updatedVault);
      router.back();
    } catch (e: any) {
      showAlert({
        title: 'Save Failed',
        message: e?.message ?? 'Failed to save card.',
        confirmText: 'OK',
        onConfirm: () => {},
      });
    } finally {
      setLoading(false);
    }
  }, [loading, vault, vaultKey, title, holderName, number, expiry, customFields, selectedGradient, activeWorkspace, setVault, router, showAlert]);

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
  ];

  // Format card number with clean 4-char groups for live preview
  const displayPreviewNumber = React.useMemo(() => {
    const clean = number.replace(/\s/g, '');
    if (!clean) return '•••• •••• •••• ••••';
    return clean.replace(/(.{4})/g, '$1 ').trim();
  }, [number]);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Add Card</Text>
            <TouchableOpacity
              onPress={handleSaveCard}
              disabled={loading}
              style={[styles.headerSaveBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Save Card"
            >
              <Text style={styles.headerSaveText}>{loading ? '...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          {/* Live Card Preview */}
          <View style={styles.previewContainer}>
            <LinearGradient
              colors={selectedGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardPreview}
            >
              {/* Card Preview Header */}
              <View style={styles.cardPreviewHeader}>
                <View style={styles.cardTitleWrap}>
                  <Ionicons name="wallet-outline" size={18} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.cardPreviewTitle} numberOfLines={1}>
                    {title.trim() || 'Card Name'}
                  </Text>
                </View>
                <Ionicons
                  name="wifi-outline"
                  size={20}
                  color="rgba(255,255,255,0.7)"
                  style={{ transform: [{ rotate: '90deg' }] }}
                />
              </View>

              {/* Card Preview Number */}
              <View style={styles.cardPreviewNumberBox}>
                <Text style={styles.cardPreviewLabel}>CARD NUMBER / ID</Text>
                <Text style={styles.cardPreviewNumber} numberOfLines={1}>
                  {displayPreviewNumber}
                </Text>
              </View>

              {/* Card Preview Footer */}
              <View style={styles.cardPreviewFooter}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardPreviewLabel}>CARDHOLDER</Text>
                  <Text style={styles.cardPreviewHolder} numberOfLines={1}>
                    {holderName.trim() || 'FULL NAME'}
                  </Text>
                </View>
                {expiry.trim().length > 0 && (
                  <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                    <Text style={styles.cardPreviewLabel}>VALID THRU</Text>
                    <Text style={styles.cardPreviewExpiry} numberOfLines={1}>
                      {expiry.trim()}
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* Card Design / Theme Picker */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Card Design</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.designSelectorRow}
            >
              {CARD_DESIGNS.map((d) => {
                const isSelected =
                  selectedGradient[0] === d.gradient[0] && selectedGradient[1] === d.gradient[1];
                return (
                  <TouchableOpacity
                    key={d.name}
                    onPress={() => setSelectedGradient(d.gradient)}
                    style={styles.designSwatchWrap}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={d.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.designSwatch,
                        isSelected && { borderColor: colors.primary, borderWidth: 3 },
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                    </LinearGradient>
                    <Text
                      style={[
                        styles.designSwatchName,
                        { color: isSelected ? colors.primary : colors.mutedText, fontWeight: isSelected ? '800' : '500' },
                      ]}
                    >
                      {d.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Universal Card Details Form */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Card Details</Text>

            {/* Card Title */}
            <Text style={[styles.label, { color: colors.mutedText }]}>Card Name / Title *</Text>
            <TextInput
              style={inputStyle}
              placeholder="e.g. Chase Sapphire, Driver License, Gym Card"
              placeholderTextColor={colors.mutedText}
              value={title}
              onChangeText={setTitle}
            />

            {/* Card Number / ID */}
            <Text style={[styles.label, { color: colors.mutedText, marginTop: 12 }]}>Card Number / ID</Text>
            <TextInput
              style={inputStyle}
              placeholder="e.g. 4532 8921 0032 1982 or DL-1234567"
              placeholderTextColor={colors.mutedText}
              value={number}
              onChangeText={setNumber}
              autoCapitalize="characters"
            />

            {/* Cardholder Name */}
            <Text style={[styles.label, { color: colors.mutedText, marginTop: 12 }]}>Cardholder Name</Text>
            <TextInput
              style={inputStyle}
              placeholder="Name as it appears on the card"
              placeholderTextColor={colors.mutedText}
              value={holderName}
              onChangeText={setHolderName}
            />

            {/* Expiry / Valid Thru */}
            <Text style={[styles.label, { color: colors.mutedText, marginTop: 12 }]}>Valid Thru / Expiry (Optional)</Text>
            <TextInput
              style={inputStyle}
              placeholder="MM/YY or YYYY"
              placeholderTextColor={colors.mutedText}
              value={expiry}
              onChangeText={setExpiry}
              maxLength={10}
            />
          </View>

          {/* Additional Custom Fields Section */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
            <View style={styles.fieldsHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Details</Text>
                <Text style={{ fontSize: 12, color: colors.mutedText, marginTop: 2 }}>
                  Add custom attributes like CVV, PIN, or Notes
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => addCustomField()}
                style={[styles.addFieldBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', marginLeft: 2 }}>
                  Add Field
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick-Add Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
              <View style={styles.quickChipsRow}>
                {QUICK_FIELD_SUGGESTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => addCustomField(s)}
                    style={[styles.quickChip, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                  >
                    <Ionicons name="add" size={13} color={colors.primary} />
                    <Text style={[styles.quickChipText, { color: colors.text }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Dynamic Custom Fields List */}
            {customFields.map((field, idx) => (
              <View
                key={idx}
                style={[styles.customFieldCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              >
                <View style={styles.customFieldTopRow}>
                  <TextInput
                    style={[styles.customFieldLabelInput, { color: colors.text, borderColor: colors.border }]}
                    placeholder="Field Label (e.g. PIN)"
                    placeholderTextColor={colors.mutedText}
                    value={field.label}
                    onChangeText={(val) => updateCustomField(idx, 'label', val)}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => updateCustomField(idx, 'isSensitive', !field.isSensitive)}
                      style={[
                        styles.sensitiveToggleBtn,
                        {
                          backgroundColor: field.isSensitive ? colors.primary + '20' : colors.card,
                          borderColor: field.isSensitive ? colors.primary : colors.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Toggle sensitive field"
                    >
                      <Ionicons
                        name={field.isSensitive ? 'eye-off' : 'eye'}
                        size={15}
                        color={field.isSensitive ? colors.primary : colors.mutedText}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => removeCustomField(idx)}
                      style={[styles.removeFieldBtn, { borderColor: colors.border }]}
                      accessibilityRole="button"
                      accessibilityLabel="Remove field"
                    >
                      <Ionicons name="trash-outline" size={16} color="#e53935" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TextInput
                  style={[styles.customFieldValueInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Field Value"
                  placeholderTextColor={colors.mutedText}
                  value={field.value}
                  secureTextEntry={field.isSensitive}
                  onChangeText={(val) => updateCustomField(idx, 'value', val)}
                />
              </View>
            ))}
          </View>

          {/* Bottom Save Action Button */}
          <TouchableOpacity
            style={[styles.saveActionBtn, { backgroundColor: colors.primary }]}
            onPress={handleSaveCard}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.saveActionBtnText}>{loading ? 'Saving Card...' : 'Save Card to Wallet'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 8,
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
    letterSpacing: -0.2,
  },
  headerSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSaveText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  cardPreview: {
    width: '100%',
    height: 190,
    borderRadius: 18,
    padding: 18,
    justifyContent: 'space-between',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  cardPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  cardPreviewTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardPreviewNumberBox: {
    marginVertical: 12,
  },
  cardPreviewLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardPreviewNumber: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cardPreviewFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardPreviewHolder: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardPreviewExpiry: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  designSelectorRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  designSwatchWrap: {
    alignItems: 'center',
    gap: 4,
  },
  designSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  designSwatchName: {
    fontSize: 11,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    fontSize: 14,
  },
  fieldsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  addFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  customFieldCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  customFieldTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  customFieldLabelInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  sensitiveToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeFieldBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customFieldValueInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  saveActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
    elevation: 2,
  },
  saveActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
