import { useTheme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface SwipeToGenerateProps {
  onGenerate: () => void;
  label?: string;
}

export default function SwipeToGenerate({
  onGenerate,
  label = 'Swipe to generate password',
}: SwipeToGenerateProps) {
  const { colors, resolved } = useTheme();
  const screenWidth = Dimensions.get('window').width;
  // Default to estimated card width on frame 0 so it's visible immediately
  const [containerWidth, setContainerWidth] = React.useState(Math.max(280, screenWidth - 60));
  const [isSuccess, setIsSuccess] = React.useState(false);
  const translateX = React.useRef(new Animated.Value(0)).current;

  const thumbSize = 46;
  const padding = 4;
  const maxDistance = Math.max(100, containerWidth - thumbSize - padding * 2);
  const maxDistanceRef = React.useRef(maxDistance);
  maxDistanceRef.current = maxDistance;

  const onGenerateRef = React.useRef(onGenerate);
  onGenerateRef.current = onGenerate;

  const triggerGenerate = React.useCallback(() => {
    setIsSuccess(true);
    onGenerateRef.current();

    const max = maxDistanceRef.current;
    Animated.sequence([
      Animated.timing(translateX, {
        toValue: max,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.delay(220),
      Animated.spring(translateX, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setIsSuccess(false);
    });
  }, [translateX]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          Math.abs(gestureState.dx) > 3,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, gestureState) => {
          const max = maxDistanceRef.current;
          if (max <= 0) return;
          const clamped = Math.max(0, Math.min(max, gestureState.dx));
          translateX.setValue(clamped);
        },
        onPanResponderRelease: (_, gestureState) => {
          const max = maxDistanceRef.current;
          if (max <= 0) return;
          const threshold = max * 0.65;

          if (gestureState.dx >= threshold) {
            triggerGenerate();
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              friction: 6,
              tension: 40,
              useNativeDriver: false,
            }).start();
          }
        },
      }),
    [translateX, triggerGenerate]
  );

  // Label opacity fades as thumb swipes right
  const labelOpacity = translateX.interpolate({
    inputRange: [0, Math.max(1, maxDistance * 0.5)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Animated fill width behind the thumb
  const fillWidth = translateX.interpolate({
    inputRange: [0, Math.max(1, maxDistance)],
    outputRange: [thumbSize + padding * 2, containerWidth || thumbSize + padding * 2],
    extrapolate: 'clamp',
  });

  const borderColor = isSuccess
    ? colors.primary
    : resolved === 'dark'
    ? '#2d3748'
    : '#d1d5db';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: resolved === 'dark' ? '#1a202c' : '#f1f5f9',
          borderColor,
        },
      ]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setContainerWidth(w);
      }}
    >
      {/* Active Fill Track */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fillTrack,
          {
            width: fillWidth,
            backgroundColor: isSuccess ? colors.primary + '35' : colors.primary + '20',
          },
        ]}
      />

      {/* Center Label & Chevrons */}
      <Animated.View
        pointerEvents="none"
        style={[styles.labelWrap, { opacity: labelOpacity }]}
      >
        <Text style={[styles.labelText, { color: resolved === 'dark' ? '#cbd5e1' : '#475569' }]}>
          {isSuccess ? 'Generated!' : label}
        </Text>
        <View style={styles.chevronsRow}>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.primary}
            style={{ opacity: 0.5 }}
          />
          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.primary}
            style={{ opacity: 0.8, marginLeft: -7 }}
          />
          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.primary}
            style={{ opacity: 1.0, marginLeft: -7 }}
          />
        </View>
      </Animated.View>

      {/* Circular Swipe Thumb Handle */}
      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: colors.primary,
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={triggerGenerate}
          activeOpacity={0.85}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={styles.thumbInner}
        >
          <Ionicons
            name={isSuccess ? 'checkmark' : 'sparkles'}
            size={20}
            color="#ffffff"
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 8,
    width: '100%',
  },
  fillTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 27,
  },
  labelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingLeft: 46,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  chevronsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  thumbInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
