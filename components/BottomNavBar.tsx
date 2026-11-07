import { useTheme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type TabKey = 'vault' | 'cards' | 'generator' | 'settings';

interface BottomNavBarProps {
  activeTab: TabKey;
}

interface TabConfig {
  key: TabKey;
  label: string;
  route: '/dashboard' | '/cards' | '/generate-password' | '/settings';
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabConfig[] = [
  {
    key: 'vault',
    label: 'Vault',
    route: '/dashboard',
    activeIcon: 'shield-checkmark',
    inactiveIcon: 'shield-checkmark-outline',
  },
  {
    key: 'cards',
    label: 'Wallet',
    route: '/cards',
    activeIcon: 'wallet',
    inactiveIcon: 'wallet-outline',
  },
  {
    key: 'generator',
    label: 'Generator',
    route: '/generate-password',
    activeIcon: 'sparkles',
    inactiveIcon: 'sparkles-outline',
  },
  {
    key: 'settings',
    label: 'Settings',
    route: '/settings',
    activeIcon: 'settings',
    inactiveIcon: 'settings-outline',
  },
];

export default function BottomNavBar({ activeTab }: BottomNavBarProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setKeyboardVisible] = React.useState(false);

  React.useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (isKeyboardVisible) {
    return null;
  }

  const handlePress = (tab: TabConfig) => {
    if (tab.key === activeTab) return;
    router.replace(tab.route);
  };

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 10);

  return (
    <View
      style={[
        styles.barContainer,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: bottomPadding,
        },
      ]}
    >
      <View style={styles.tabsRow}>
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabButton}
              onPress={() => handlePress(tab)}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.inactiveIcon}
                  size={20}
                  color={isActive ? colors.primary : colors.mutedText}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? colors.primary : colors.mutedText,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 52,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconWrap: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: -0.1,
  },
});
