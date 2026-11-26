import { useTheme } from '@/context/ThemeProvider';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  disabled?: boolean;
  activeColor?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export default function ToggleSwitch({
  value,
  onValueChange,
  disabled = false,
  activeColor,
  style,
  accessibilityLabel,
}: ToggleSwitchProps) {
  const { resolved } = useTheme();

  // Animation values
  const translateX = useRef(new Animated.Value(value ? 20 : 0)).current;
  const colorAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: value ? 20 : 0,
        tension: 80,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(colorAnim, {
        toValue: value ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value, translateX, colorAnim]);

  const handlePress = () => {
    if (disabled) return;
    onValueChange(!value);
  };

  const offTrackColor = resolved === 'dark' ? '#39393D' : '#E5E7EB';
  const onTrackColor = activeColor || '#34C759'; // Apple System Green

  const trackBg = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [offTrackColor, onTrackColor],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      disabled={disabled}
      style={[styles.touchTarget, style, disabled && styles.disabled]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackBg }]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX }],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  track: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 2.5,
    elevation: 4,
  },
  disabled: {
    opacity: 0.5,
  },
});
