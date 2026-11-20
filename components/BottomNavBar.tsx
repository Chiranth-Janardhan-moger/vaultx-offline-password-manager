import { useTheme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Keyboard,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
    label: 'Generate',
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
  const { colors, resolved } = useTheme();
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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    router.replace(tab.route);
  };

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 14);

  const capsuleBg = resolved === 'dark' ? colors.card : '#ffffff';
  const capsuleBorder = colors.border;
  const activePillBg = colors.primary + '18';

  return (
    <View style={[styles.outerWrapper, { paddingBottom: bottomPadding }]}>
      <View
        style={[
          styles.capsule,
          {
            backgroundColor: capsuleBg,
            borderColor: capsuleBorder,
          },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabTouch,
                isActive && [styles.activeTabTouch, { backgroundColor: activePillBg }],
              ]}
              onPress={() => handlePress(tab)}
              activeOpacity={0.75}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <Ionicons
                name={isActive ? tab.activeIcon : tab.inactiveIcon}
                size={isActive ? 19 : 21}
                color={isActive ? colors.primary : colors.mutedText}
              />
              {isActive ? (
                <Text
                  style={[
                    styles.activeLabel,
                    { color: colors.primary },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 36,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderWidth: 0.6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  tabTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 28,
  },
  activeTabTouch: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 28,
    gap: 6,
  },
  activeLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
