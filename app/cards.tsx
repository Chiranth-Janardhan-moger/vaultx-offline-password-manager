import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { CardField, CardItem, CardType, saveVault } from '@/lib/vault';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  KeyboardAvoidingView,
  Share,
} from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';

const CARD_TEMPLATES: Record<CardType, { title: string; gradient: [string, string]; fields: CardField[] }> = {
  aadhaar: {
    title: 'Aadhaar Card',
    gradient: ['#FF9933', '#128807'] as [string, string],
    fields: [
      { label: 'Date of Birth', value: '', isSensitive: false },
      { label: 'Gender', value: '', isSensitive: false },
      { label: 'VID', value: '', isSensitive: true },
    ],
  },
  pan: {
    title: 'PAN Card',
    gradient: ['#0f2027', '#2c5364'] as [string, string],
    fields: [
      { label: 'Date of Birth', value: '', isSensitive: false },
      { label: 'Father\'s Name', value: '', isSensitive: false },
    ],
  },
  voter_id: {
    title: 'Voter ID',
    gradient: ['#00c6ff', '#0072ff'] as [string, string],
    fields: [
      { label: 'Assembly Constituency', value: '', isSensitive: false },
      { label: 'Date of Birth', value: '', isSensitive: false },
    ],
  },
  credit_card: {
    title: 'Credit Card',
    gradient: ['#141e30', '#243b55'] as [string, string],
    fields: [
      { label: 'Expiry Date (MM/YY)', value: '', isSensitive: true },
      { label: 'CVV', value: '', isSensitive: true },
      { label: 'Card PIN', value: '', isSensitive: true },
    ],
  },
  debit_card: {
    title: 'Debit Card',
    gradient: ['#3a7bd5', '#3a6073'] as [string, string],
    fields: [
      { label: 'Expiry Date (MM/YY)', value: '', isSensitive: true },
      { label: 'CVV', value: '', isSensitive: true },
      { label: 'ATM PIN', value: '', isSensitive: true },
    ],
  },
  custom: {
    title: 'Custom Card',
    gradient: ['#da1b60', '#ff8a00'] as [string, string],
    fields: [],
  },
};

const PREMIUM_GRADIENTS: [string, string][] = [
  ['#141e30', '#243b55'], // Midnight Blue
  ['#0f2027', '#203a43'], // Dark Teal
  ['#311b92', '#673ab7'], // Deep Violet
  ['#004d40', '#009688'], // Forest Emerald
  ['#111111', '#333333'], // Carbon Black
  ['#8e0e00', '#1f0000'], // Crimson Slate
  ['#1e3c72', '#2a5298'], // Royal Indigo
  ['#42275a', '#734b6d'], // Plum Velvet
  ['#134e5e', '#5a8f76'], // Sage Ocean
  ['#1f1c2c', '#3f3b5c'], // Shadow Purple
  ['#000428', '#004e92'], // Deep Space
  ['#29323c', '#485563'], // Gunmetal
];

export default function CardsScreen({ isTab }: { isTab?: boolean }) {
  const router = useRouter();
  const { colors, resolved } = useTheme();
  const { vault, vaultKey, setVault } = useSession();
  const { showAlert, AlertComponent } = useCustomAlert();

  const Wrapper = isTab ? View : Screen;

  const [cards, setCards] = React.useState<CardItem[]>([]);
  const [selectedCard, setSelectedCard] = React.useState<CardItem | null>(null);
  const [isAddModalVisible, setIsAddModalVisible] = React.useState(false);
  const [reorderingCardId, setReorderingCardId] = React.useState<string | null>(null);
  const [folder, setFolder] = React.useState('');

  const folderSuggestions = React.useMemo(() => {
    if (!vault) return [];
    const pFolders = vault.passwords.map(p => p.folder).filter(Boolean);
    const cFolders = (vault.cards || []).map(c => c.folder).filter(Boolean);
    return Array.from(new Set([...pFolders, ...cFolders])) as string[];
  }, [vault]);

  // Form States
  const [cardType, setCardType] = React.useState<CardType | null>(null);
  const [cardTitle, setCardTitle] = React.useState('');
  const [holderName, setHolderName] = React.useState('');
  const [cardNumber, setCardNumber] = React.useState('');
  const [customFields, setCustomFields] = React.useState<CardField[]>([]);

  // Revealed Fields State (maps "cardId_fieldIndex" -> boolean, and "cardId_number" -> boolean)
  const [revealedFields, setRevealedFields] = React.useState<{ [key: string]: boolean }>({});

  // Load cards from vault on mount
  React.useEffect(() => {
    if (vault?.cards) {
      setCards(vault.cards);
    }
  }, [vault]);

  const toggleFieldReveal = (key: string) => {
    setRevealedFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Share States & Methods
  const [sharingCard, setSharingCard] = React.useState<CardItem | null>(null);
  const [shareFields, setShareFields] = React.useState<{ [key: string]: boolean }>({});
  const [shareFormat, setShareFormat] = React.useState<'text' | 'card'>('text');
  const viewShotRef = React.useRef<any>(null);

  const initiateShare = (card: CardItem) => {
    setSharingCard(card);
    setShareFormat('text');
    const initial: { [key: string]: boolean } = {
      number: !card.type.includes('card'),
      holderName: true,
    };
    card.fields.forEach((f, idx) => {
      initial[`field_${idx}`] = !f.isSensitive;
    });
    setShareFields(initial);
  };

  const executeShare = async () => {
    if (!sharingCard) return;

    if (shareFormat === 'text') {
      let text = `*${sharingCard.title}*\n`;
      if (shareFields.holderName) text += `Holder Name: ${sharingCard.holderName}\n`;
      if (shareFields.number) {
        text += `Card Number: ${sharingCard.number}\n`;
      } else {
        text += `Card Number: ${formatCardNumber(sharingCard.number, sharingCard.type, false)}\n`;
      }
      sharingCard.fields.forEach((f, idx) => {
        if (shareFields[`field_${idx}`]) {
          text += `${f.label}: ${f.value}\n`;
        } else {
          text += `${f.label}: ••••••••\n`;
        }
      });

      try {
        await Share.share({ message: text });
        setSharingCard(null);
      } catch (err) {
        console.error('Failed to share text:', err);
      }
    } else {
      // Capture Card Image and share it
      try {
        if (!viewShotRef.current) return;

        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (!isSharingAvailable) {
          showAlert({
            title: 'Not Supported',
            message: 'Sharing is not available on this device.',
            confirmText: 'OK',
          });
          return;
        }

        const uri = await viewShotRef.current.capture();
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Share ${sharingCard.title}`,
          UTI: 'public.png',
        });
        setSharingCard(null);
      } catch (err) {
        console.error('Failed to capture or share card image:', err);
        showAlert({
          title: 'Share Error',
          message: 'Could not generate card image for sharing.',
          confirmText: 'OK',
        });
      }
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    showAlert({
      title: 'Copied',
      message: `${label} copied to clipboard`,
      confirmText: 'OK',
    });
  };

  const handleCreateCard = async () => {
    if (!cardType) {
      showAlert({
        title: 'Error',
        message: 'Please select a card template',
        confirmText: 'OK',
      });
      return;
    }

    if (!cardTitle.trim()) {
      showAlert({
        title: 'Error',
        message: 'Card title is required',
        confirmText: 'OK',
      });
      return;
    }

    if (!cardNumber.trim()) {
      showAlert({
        title: 'Error',
        message: 'Card number is required',
        confirmText: 'OK',
      });
      return;
    }

    if (cardType === 'aadhaar' && cardNumber.trim().length !== 12) {
      showAlert({
        title: 'Error',
        message: 'Aadhaar Card number must be exactly 12 digits',
        confirmText: 'OK',
      });
      return;
    }

    if (cardType === 'pan' && cardNumber.trim().length !== 10) {
      showAlert({
        title: 'Error',
        message: 'PAN Card number must be exactly 10 alphanumeric characters',
        confirmText: 'OK',
      });
      return;
    }

    if ((cardType === 'credit_card' || cardType === 'debit_card') && cardNumber.trim().length !== 16) {
      showAlert({
        title: 'Error',
        message: 'Card number must be exactly 16 digits',
        confirmText: 'OK',
      });
      return;
    }

    const template = CARD_TEMPLATES[cardType];
    const cardGradient = cardType === 'aadhaar'
      ? template.gradient
      : PREMIUM_GRADIENTS[cards.length % PREMIUM_GRADIENTS.length];

    const newCard: CardItem = {
      id: Math.random().toString(36).slice(2),
      type: cardType,
      title: cardTitle.trim(),
      holderName: holderName.trim() || 'Not Specified',
      number: cardNumber.trim(),
      fields: customFields.filter(f => f.label.trim() && f.value.trim()),
      gradient: cardGradient,
      createdAt: Date.now(),
      folder: folder.trim() || undefined,
    };

    const nextCards = [...cards, newCard];
    try {
      if (vault && vaultKey) {
        const updatedVault = { ...vault, cards: nextCards };
        await saveVault(updatedVault, vaultKey);
        setVault(() => updatedVault);
        setCards(nextCards);
        setIsAddModalVisible(false);
        resetForm();
        showAlert({
          title: 'Success',
          message: 'Identity Card saved successfully',
          confirmText: 'OK',
        });
      }
    } catch (error) {
      console.error('Failed to save card:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to save card data',
        confirmText: 'OK',
      });
    }
  };

  const handleDeleteCard = (cardId: string) => {
    showAlert({
      title: 'Delete Card',
      message: 'Are you sure you want to delete this identity card?',
      cancelText: 'Cancel',
      confirmText: 'Delete',
      type: 'destructive',
      onConfirm: async () => {
        const nextCards = cards.filter(c => c.id !== cardId);
        try {
          if (vault && vaultKey) {
            const updatedVault = { ...vault, cards: nextCards };
            await saveVault(updatedVault, vaultKey);
            setVault(() => updatedVault);
            setCards(nextCards);
            setSelectedCard(null);
          }
        } catch (error) {
          console.error('Failed to delete card:', error);
        }
      },
    });
  };

  const handleMoveCard = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= cards.length) return;

    const nextCards = [...cards];
    const temp = nextCards[index];
    nextCards[index] = nextCards[newIndex];
    nextCards[newIndex] = temp;

    try {
      if (vault && vaultKey) {
        const updatedVault = { ...vault, cards: nextCards };
        await saveVault(updatedVault, vaultKey);
        setVault(() => updatedVault);
        setCards(nextCards);
        if (selectedCard && selectedCard.id === temp.id) {
          setSelectedCard(nextCards[newIndex]);
        }
      }
    } catch (error) {
      console.error('Failed to reorder card:', error);
    }
  };

  const resetForm = () => {
    setCardType(null);
    setHolderName('');
    setCardNumber('');
    setCardTitle('');
    setCustomFields([]);
    setFolder('');
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { label: '', value: '', isSensitive: false }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index: number, key: keyof CardField, val: any) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], [key]: val };
    setCustomFields(updated);
  };

  const formatCardNumber = (num: string, type: CardType, rev: boolean) => {
    if (!num) return '';
    const cleanNum = num.replace(/\s/g, '');
    if (!rev) {
      return type.includes('card')
        ? '•••• •••• •••• ' + cleanNum.slice(-4)
        : '•••• •••• ' + cleanNum.slice(-4);
    }
    // Format card number with spaces every 4 characters
    return cleanNum.replace(/(.{4})/g, '$1 ').trim();
  };

  const getCardIconName = (type: CardType) => type.includes('card') ? 'card-outline' : type === 'custom' ? 'wallet-outline' : 'person-outline';

  const getCardBrand = (num: string) => {
    if (!num) return null;
    const clean = num.replace(/\s/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (clean.startsWith('5')) return 'Mastercard';
    if (clean.startsWith('6')) return 'RuPay';
    if (clean.startsWith('3')) return 'Amex';
    return null;
  };

  const renderBrandIcon = (brand: string) => {
    if (brand === 'Visa') {
      return (
        <View style={[styles.brandBadge, { backgroundColor: '#1a1f71' }]}>
          <Text style={[styles.brandText, { color: '#f7b600', fontStyle: 'italic', fontWeight: '900' }]}>
            VISA
          </Text>
        </View>
      );
    }
    if (brand === 'Mastercard') {
      return (
        <View style={[styles.brandBadge, { backgroundColor: '#222222', flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
          <View style={{ flexDirection: 'row', width: 22, height: 14, position: 'relative' }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#eb001b', opacity: 0.9 }} />
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#ff5f00', opacity: 0.9, position: 'absolute', left: 8 }} />
          </View>
          <Text style={[styles.brandText, { color: '#ffffff', fontSize: 10, fontWeight: '800' }]}>
            mastercard
          </Text>
        </View>
      );
    }
    if (brand === 'RuPay') {
      return (
        <View style={[styles.brandBadge, { backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6 }]}>
          <Text style={[styles.brandText, { color: '#0f3f7a', fontStyle: 'italic', fontWeight: '900', fontSize: 11 }]}>
            RuPay
          </Text>
          <View style={{ width: 6, height: 10, backgroundColor: '#f9a825', transform: [{ skewX: '-20deg' }] }} />
          <View style={{ width: 6, height: 10, backgroundColor: '#2e7d32', transform: [{ skewX: '-20deg' }] }} />
        </View>
      );
    }
    if (brand === 'Amex') {
      return (
        <View style={[styles.brandBadge, { backgroundColor: '#007bc1' }]}>
          <Text style={[styles.brandText, { color: '#ffffff', fontWeight: '900', letterSpacing: 0.5, fontSize: 10 }]}>
            AMEX
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderCardFaceContent = (
    card: CardItem,
    isSharePreview: boolean,
    shareFieldsState?: { [key: string]: boolean },
    isExpanded?: boolean,
    isReorderingMode?: boolean
  ) => {
    const isNumRevealed = isSharePreview
      ? !!shareFieldsState?.number
      : !!revealedFields[`${card.id}_number`];

    const isFieldRevealed = (idx: number, isSensitive: boolean) => {
      if (isSharePreview) {
        return !!shareFieldsState?.[`field_${idx}`];
      }
      return !isSensitive || !!revealedFields[`${card.id}_field_${idx}`];
    };

    const isHolderRevealed = isSharePreview
      ? !!shareFieldsState?.holderName
      : true;

    const cardIcon = getCardIconName(card.type);
    const brand = card.type.includes('card') ? getCardBrand(card.number) : null;

    // Find Expiry Date, CVV, and other common fields to place on the card face
    const expiryFieldIdx = card.fields.findIndex(f => f.label.toLowerCase().includes('expiry'));
    const cvvFieldIdx = card.fields.findIndex(f => f.label.toLowerCase().includes('cvv'));

    // Other fields that are not Expiry or CVV
    const otherFields = card.fields.filter((_, idx) => idx !== expiryFieldIdx && idx !== cvvFieldIdx);

    return (
      <>
        {/* Saffron and Green overlay accents for Aadhaar Card design */}
        {card.type === 'aadhaar' && (
          <View style={styles.aadhaarTricolorAccent}>
            <View style={{ flex: 1, backgroundColor: '#FF9933', opacity: 0.15 }} />
            <View style={{ flex: 1, backgroundColor: '#ffffff', opacity: 0.15 }} />
            <View style={{ flex: 1, backgroundColor: '#128807', opacity: 0.15 }} />
          </View>
        )}

        <View style={styles.cardHeader}>
          <View style={styles.cardLogo}>
            <Ionicons name={cardIcon as any} size={28} color="#ffffff" />
            <Text style={styles.cardLogoText}>{card.title}</Text>
          </View>
          {!isSharePreview && (isExpanded || isReorderingMode) ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {cards.findIndex(c => c.id === card.id) > 0 && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    const idx = cards.findIndex(c => c.id === card.id);
                    handleMoveCard(idx, 'up');
                  }}
                  style={styles.cardDeleteBtn}
                >
                  <Ionicons name="arrow-up-outline" size={20} color="#ffffff" />
                </TouchableOpacity>
              )}
              {cards.findIndex(c => c.id === card.id) < cards.length - 1 && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    const idx = cards.findIndex(c => c.id === card.id);
                    handleMoveCard(idx, 'down');
                  }}
                  style={styles.cardDeleteBtn}
                >
                  <Ionicons name="arrow-down-outline" size={20} color="#ffffff" />
                </TouchableOpacity>
              )}
              {!isReorderingMode && (
                <>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      initiateShare(card);
                    }}
                    style={styles.cardDeleteBtn}
                  >
                    <Ionicons name="share-social-outline" size={20} color="#ffffff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteCard(card.id);
                    }}
                    style={styles.cardDeleteBtn}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            card.type.includes('card') && (
              <Ionicons
                name="wifi-outline"
                size={20}
                color="rgba(255,255,255,0.8)"
                style={{ transform: [{ rotate: '90deg' }] }}
              />
            )
          )}
        </View>


        <View style={styles.cardBody}>
          {/* Card Number */}
          <View style={styles.cardNumberContainer}>
            <Text style={styles.cardNumberLabel}>CARD NUMBER</Text>
            <View style={styles.cardNumberRow}>
              <Text style={styles.cardNumber}>
                {formatCardNumber(card.number, card.type, isNumRevealed)}
              </Text>
              {!isSharePreview && (
                <>
                  <TouchableOpacity
                    onPress={() => toggleFieldReveal(`${card.id}_number`)}
                    style={{ marginLeft: 10, padding: 4 }}
                  >
                    <Ionicons
                      name={isNumRevealed ? 'eye-off' : 'eye'}
                      size={18}
                      color="rgba(255,255,255,0.7)"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(card.number, 'Card Number')}
                    style={{ marginLeft: 10, padding: 4 }}
                  >
                    <Ionicons
                      name="copy-outline"
                      size={18}
                      color="rgba(255,255,255,0.7)"
                    />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Middle details row for non-credit cards (Aadhaar, PAN, Voter ID, Custom) */}
          {!card.type.includes('card') && otherFields.length > 0 && (
            <View style={styles.cardMiddleFieldsRow}>
              {otherFields.slice(0, 2).map((field) => {
                const idx = card.fields.indexOf(field);
                const revealed = isFieldRevealed(idx, field.isSensitive);
                return (
                  <View key={idx} style={styles.cardMiddleFieldItem}>
                    <Text style={styles.cardMiddleFieldLabel}>{field.label.toUpperCase()}</Text>
                    <Text style={styles.cardMiddleFieldValue} numberOfLines={1}>
                      {field.isSensitive && !revealed ? '••••••••' : field.value}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Bottom Row */}
          <View style={styles.cardBottomRow}>
            <View style={styles.cardHolderContainer}>
              <Text style={styles.cardHolderLabel}>CARD HOLDER</Text>
              <Text style={styles.cardHolderName}>
                {isHolderRevealed ? card.holderName : '••••••••••••'}
              </Text>
            </View>

            {/* Expiry and CVV for Credit/Debit Cards */}
            {card.type.includes('card') && (
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-end' }}>
                {expiryFieldIdx !== -1 && (
                  <View style={styles.cardExpiryContainer}>
                    <Text style={styles.cardExpiryLabel}>VALID THRU</Text>
                    <Text style={styles.cardExpiryValue}>
                      {isFieldRevealed(expiryFieldIdx, card.fields[expiryFieldIdx].isSensitive)
                        ? card.fields[expiryFieldIdx].value
                        : '••/••'}
                    </Text>
                  </View>
                )}
                {cvvFieldIdx !== -1 && (
                  <View style={styles.cardExpiryContainer}>
                    <Text style={styles.cardExpiryLabel}>CVV</Text>
                    <Text style={styles.cardExpiryValue}>
                      {isFieldRevealed(cvvFieldIdx, card.fields[cvvFieldIdx].isSensitive)
                        ? card.fields[cvvFieldIdx].value
                        : '•••'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Brand Logo for Credit/Debit Cards */}
            {brand && renderBrandIcon(brand)}
          </View>
        </View>
      </>
    );
  };

  const renderCardItem = (card: CardItem, index: number, isExpanded: boolean) => {
    const isReorderingMode = reorderingCardId === card.id;
    return (
      <TouchableOpacity
        key={card.id}
        style={[
          styles.cardWrapper,
          {
            marginTop: index === 0 || isExpanded ? 0 : -110,
            zIndex: isReorderingMode ? 999 : index,
            transform: isReorderingMode ? [{ scale: 1.04 }] : [],
          },
        ]}
        onPress={() => {
          if (reorderingCardId) {
            setReorderingCardId(null);
          } else {
            setSelectedCard(isExpanded ? null : card);
          }
        }}
        onLongPress={() => {
          if (!isExpanded) {
            setReorderingCardId(reorderingCardId === card.id ? null : card.id);
          }
        }}
        delayLongPress={300}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={card.gradient}
          style={[
            styles.cardFace,
            {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 8,
            },
          ]}
        >
          {renderCardFaceContent(card, false, undefined, isExpanded, isReorderingMode)}
        </LinearGradient>

        {/* Expanded Fields Details Panel */}
        {isExpanded && card.fields.length > 0 && (
          <View style={[styles.expandedDetails, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {card.fields.map((field, fIdx) => {
              const fKey = `${card.id}_field_${fIdx}`;
              const isRevealed = !field.isSensitive || revealedFields[fKey];
              
              return (
                <View key={fIdx} style={[styles.detailItem, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: colors.mutedText }]}>{field.label}</Text>
                    <TouchableOpacity
                      disabled={!field.isSensitive}
                      onPress={() => toggleFieldReveal(fKey)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.detailValue,
                          { color: colors.text },
                          field.isSensitive && !isRevealed && styles.blurredText,
                        ]}
                      >
                        {field.isSensitive && !isRevealed ? '••••••••' : field.value}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.detailActions}>
                    {field.isSensitive && (
                      <TouchableOpacity
                        style={styles.detailActionBtn}
                        onPress={() => toggleFieldReveal(fKey)}
                      >
                        <Ionicons name={isRevealed ? 'eye-off' : 'eye'} size={18} color={colors.mutedText} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.detailActionBtn}
                      onPress={() => copyToClipboard(field.value, field.label)}
                    >
                      <Ionicons name="copy-outline" size={18} color={colors.mutedText} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Wrapper style={isTab ? { flex: 1 } : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }, isTab && { paddingBottom: 60 }]}>
        <View style={styles.header}>
          {!isTab ? (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-down" size={22} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 8 }} />
          )}
          <Text style={[styles.headerTitle, { color: colors.text }]}>Identity Wallet</Text>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setIsAddModalVisible(true)}
          >
            <Ionicons name="add" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.card }]}>
              <Ionicons name="wallet-outline" size={60} color={colors.mutedText} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Your Wallet is Empty</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
              Add Aadhaar, PAN, Debit/Credit cards securely. Fully encrypted and offline.
            </Text>
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: colors.primary }]}
              onPress={() => setIsAddModalVisible(true)}
            >
              <Ionicons name="add-circle" size={22} color="#ffffff" />
              <Text style={styles.createBtnText}>Add First Card</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {selectedCard ? (
              // If a card is selected/expanded, show it on top centered, and show close details button
              <View style={styles.expandedContainer}>
                {renderCardItem(selectedCard, 0, true)}
                <TouchableOpacity
                  style={[styles.closeDetailBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setSelectedCard(null)}
                >
                  <Text style={[styles.closeDetailText, { color: colors.text }]}>Collapse Wallet Stack</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Normal peeking stack list
              <View style={styles.stackContainer}>
                {cards.map((card, idx) => renderCardItem(card, idx, false))}
              </View>
            )}
          </ScrollView>
        )}

        {/* Modal form to add a card */}
        <Modal
          visible={isAddModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setIsAddModalVisible(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[styles.modalContent, { backgroundColor: colors.background }]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Identity Card</Text>
                <TouchableOpacity
                  onPress={() => {
                    setIsAddModalVisible(false);
                    resetForm();
                  }}
                  style={[styles.modalCloseBtn, { backgroundColor: colors.card }]}
                >
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
                {/* Type Selection */}
                <Text style={[styles.label, { color: colors.mutedText }]}>Card Type</Text>
                <View style={styles.typeSelectorRow}>
                  {Object.keys(CARD_TEMPLATES).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: cardType === type ? colors.primary : colors.card,
                          borderColor: cardType === type ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setCardType(type as CardType);
                        const template = CARD_TEMPLATES[type as CardType];
                        setCardTitle(template.title);
                        setCustomFields(template.fields.map((f: CardField) => ({ ...f })));
                      }}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          { color: cardType === type ? '#ffffff' : colors.text },
                        ]}
                      >
                        {type.toUpperCase().replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {cardType ? (
                  <>
                    {/* Card Title */}
                    <Text style={[styles.label, { color: colors.mutedText }]}>Card Name / Title</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                      placeholder="e.g. My Aadhaar Card"
                      placeholderTextColor={colors.mutedText}
                      value={cardTitle}
                      onChangeText={setCardTitle}
                    />

                    {/* Holder Name */}
                    <Text style={[styles.label, { color: colors.mutedText }]}>Card Holder Name</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                      placeholder="Full name as printed"
                      placeholderTextColor={colors.mutedText}
                      value={holderName}
                      onChangeText={setHolderName}
                    />

                    {/* Card Number */}
                    <Text style={[styles.label, { color: colors.mutedText }]}>
                      {cardType === 'aadhaar' ? 'Aadhaar Number (12 digits)' : 
                       cardType === 'pan' ? 'PAN Number (10 alphanumeric)' : 
                       cardType?.includes('card') ? 'Card Number (16 digits)' : 
                       'Card Number (Primary)'}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                      placeholder={cardType === 'aadhaar' ? '12-digit number' : 
                                   cardType === 'pan' ? '10-char alphanumeric' : 
                                   cardType?.includes('card') ? '16-digit card number' : 
                                   'Enter primary card number'}
                      placeholderTextColor={colors.mutedText}
                      keyboardType={cardType === 'aadhaar' || cardType?.includes('card') ? 'numeric' : 'default'}
                      maxLength={cardType === 'aadhaar' ? 12 : cardType === 'pan' ? 10 : cardType?.includes('card') ? 16 : undefined}
                      autoCapitalize={cardType === 'pan' ? 'characters' : 'none'}
                      value={cardNumber}
                      onChangeText={(t) => {
                        if (cardType === 'aadhaar' || cardType?.includes('card')) {
                          setCardNumber(t.replace(/[^0-9]/g, ''));
                        } else if (cardType === 'pan') {
                          setCardNumber(t.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                        } else {
                          setCardNumber(t);
                        }
                      }}
                    />

                    {/* Folder (Optional) */}
                    <Text style={[styles.label, { color: colors.mutedText }]}>Folder (Optional)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                      placeholder="e.g. Personal, Taxes, Server Keys"
                      placeholderTextColor={colors.mutedText}
                      value={folder}
                      onChangeText={setFolder}
                    />
                    {folderSuggestions.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderSuggestionsScroll}>
                        {folderSuggestions.map((f, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.folderChip, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                            onPress={() => setFolder(f)}
                          >
                            <Text style={[styles.folderChipText, { color: colors.text }]}>{f}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}

                    {/* Template / Custom Fields Section */}
                    <View style={styles.fieldsHeader}>
                      <Text style={[styles.label, { color: colors.text, marginVertical: 0 }]}>Additional Fields</Text>
                      <TouchableOpacity onPress={addCustomField} style={styles.addFieldBtn}>
                        <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                        <Text style={[styles.addFieldBtnText, { color: colors.primary }]}>Add Field</Text>
                      </TouchableOpacity>
                    </View>

                    {customFields.map((field, index) => (
                      <View key={index} style={styles.customFieldRow}>
                        <View style={{ flex: 1, gap: 8 }}>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                            placeholder="Label (e.g. Expiry Date)"
                            placeholderTextColor={colors.mutedText}
                            value={field.label}
                            onChangeText={(t) => updateCustomField(index, 'label', t)}
                          />
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                            placeholder="Value (e.g. 12/29)"
                            placeholderTextColor={colors.mutedText}
                            value={field.value}
                            onChangeText={(t) => updateCustomField(index, 'value', t)}
                          />
                          <TouchableOpacity
                            style={styles.sensitiveToggleRow}
                            onPress={() => updateCustomField(index, 'isSensitive', !field.isSensitive)}
                          >
                            <Ionicons
                              name={field.isSensitive ? 'checkbox' : 'square-outline'}
                              size={18}
                              color={colors.primary}
                            />
                            <Text style={[styles.sensitiveToggleText, { color: colors.text }]}>Blur this field by default</Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                          onPress={() => removeCustomField(index)}
                          style={[styles.removeFieldBtn, { backgroundColor: colors.inputBg }]}
                        >
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* Save Button */}
                    <TouchableOpacity
                      style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                      onPress={handleCreateCard}
                    >
                      <Text style={styles.saveBtnText}>Save Identity Card</Text>
                    </TouchableOpacity>
                    <View style={{ height: 40 }} />
                  </>
                ) : (
                  <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
                    <Ionicons name="card-outline" size={48} color={colors.mutedText} style={{ alignSelf: 'center', marginVertical: 20 }} />
                    <Text style={{ color: colors.mutedText, fontSize: 14, textAlign: 'center' }}>
                      Please select a card type above to start.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Share Config Modal */}
        <Modal
          visible={!!sharingCard}
          animationType="slide"
          transparent
          onRequestClose={() => setSharingCard(null)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.background, flex: 0, maxHeight: '90%' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Share Card Details</Text>
                <TouchableOpacity
                  onPress={() => setSharingCard(null)}
                  style={[styles.modalCloseBtn, { backgroundColor: colors.card }]}
                >
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Format Selector */}
              <View style={[styles.formatSelector, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.formatOption,
                    shareFormat === 'text' && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setShareFormat('text')}
                >
                  <Ionicons name="text-outline" size={18} color={shareFormat === 'text' ? '#ffffff' : colors.text} />
                  <Text style={[styles.formatOptionText, { color: shareFormat === 'text' ? '#ffffff' : colors.text }]}>
                    Share as Text
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.formatOption,
                    shareFormat === 'card' && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setShareFormat('card')}
                >
                  <Ionicons name="image-outline" size={18} color={shareFormat === 'card' ? '#ffffff' : colors.text} />
                  <Text style={[styles.formatOptionText, { color: shareFormat === 'card' ? '#ffffff' : colors.text }]}>
                    Share as Card
                  </Text>
                </TouchableOpacity>
              </View>
              
              <Text style={{ color: colors.mutedText, fontSize: 13, marginBottom: 16 }}>
                Select the details you want to share. Sensitive fields are deselected by default.
              </Text>

              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {shareFormat === 'card' && sharingCard && (
                  <View style={styles.previewContainer}>
                    <Text style={[styles.previewTitle, { color: colors.mutedText }]}>CARD PREVIEW</Text>
                    <ViewShot
                      ref={viewShotRef}
                      options={{ format: 'png', quality: 1.0 }}
                      style={styles.viewShotWrapper}
                    >
                      <LinearGradient
                        colors={sharingCard.gradient}
                        style={[
                          styles.cardFace,
                          {
                            width: '100%',
                            height: 200,
                          },
                        ]}
                      >
                        {renderCardFaceContent(sharingCard, true, shareFields)}
                      </LinearGradient>
                    </ViewShot>
                  </View>
                )}

                {sharingCard && (
                  <View style={{ gap: 12 }}>
                    <TouchableOpacity
                      style={styles.shareCheckRow}
                      onPress={() => setShareFields(prev => ({ ...prev, holderName: !prev.holderName }))}
                    >
                      <Ionicons
                        name={shareFields.holderName ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={colors.primary}
                      />
                      <View>
                        <Text style={[styles.shareFieldLabel, { color: colors.text }]}>Card Holder Name</Text>
                        <Text style={{ color: colors.mutedText, fontSize: 12 }}>{sharingCard.holderName}</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.shareCheckRow}
                      onPress={() => setShareFields(prev => ({ ...prev, number: !prev.number }))}
                    >
                      <Ionicons
                        name={shareFields.number ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={colors.primary}
                      />
                      <View>
                        <Text style={[styles.shareFieldLabel, { color: colors.text }]}>Card Number</Text>
                        <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                          {shareFields.number ? sharingCard.number : formatCardNumber(sharingCard.number, sharingCard.type, false)}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {sharingCard.fields.map((f, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.shareCheckRow}
                        onPress={() => setShareFields(prev => ({ ...prev, [`field_${idx}`]: !prev[`field_${idx}`] }))}
                      >
                        <Ionicons
                          name={shareFields[`field_${idx}`] ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={colors.primary}
                        />
                        <View>
                          <Text style={[styles.shareFieldLabel, { color: colors.text }]}>{f.label}</Text>
                          <Text style={{ color: colors.mutedText, fontSize: 12 }}>
                            {shareFields[`field_${idx}`] ? f.value : '•••••••• (Hidden)'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 20 }]}
                onPress={executeShare}
              >
                <Text style={styles.saveBtnText}>
                  {shareFormat === 'text' ? 'Share Text Details' : 'Share Card Image'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
      <AlertComponent />
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollContainer: { paddingBottom: 60 },
  stackContainer: { marginTop: 12, paddingBottom: 100 },
  expandedContainer: { marginTop: 12 },
  cardWrapper: { marginBottom: 20 },
  cardFace: {
    borderRadius: 20,
    padding: 22,
    height: 200,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  aadhaarTricolorAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardLogoText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardDeleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardBody: {
    gap: 16,
  },
  cardNumberContainer: {
    gap: 4,
  },
  cardNumberLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardNumber: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardHolderContainer: {
    gap: 2,
  },
  cardHolderLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardHolderName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardCopyBadge: {
    position: 'absolute',
    bottom: 18,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  cardCopyText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  expandedDetails: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  blurredText: {
    opacity: 0.25,
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noFieldsText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  closeDetailBtn: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  closeDetailText: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    width: '100%',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalForm: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    fontSize: 14,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  fieldsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 10,
  },
  addFieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addFieldBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  customFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sensitiveToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  sensitiveToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  removeFieldBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  saveBtn: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  shareCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  shareFieldLabel: {
    fontSize: 14,
    fontWeight: '800',
  },

  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardExpiryContainer: {
    alignItems: 'flex-start',
    gap: 2,
  },
  cardExpiryLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardExpiryValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardBrandText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  cardMiddleFieldsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: -4,
    marginBottom: 4,
  },
  cardMiddleFieldItem: {
    flex: 1,
  },
  cardMiddleFieldLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardMiddleFieldValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  formatSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
  },
  formatOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  formatOptionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  previewTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  viewShotWrapper: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  brandBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  brandText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  folderSuggestionsScroll: {
    paddingVertical: 6,
    flexDirection: 'row',
    gap: 8,
  },
  folderChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  folderChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
