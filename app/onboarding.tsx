import Screen from '@/components/Screen';
import { useTheme } from '@/context/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: 'shield-checkmark' as const,
    title: 'Military-Grade Security',
    description: 'Your passwords are protected with AES-256 encryption, the same standard used by banks and governments.',
    color: '#22c55e',
  },
  {
    icon: 'lock-closed' as const,
    title: '100% Offline',
    description: 'No internet connection required. Your data never leaves your device. No cloud, no servers, no tracking.',
    color: '#3b82f6',
  },
  {
    icon: 'eye-off' as const,
    title: 'Complete Privacy',
    description: 'Screenshots blocked. Screen recording disabled. Your passwords stay private, even from screenshots.',
    color: '#8b5cf6',
  },
  {
    icon: 'finger-print' as const,
    title: 'Biometric Protection',
    description: 'Unlock with your fingerprint. Multiple layers of security: PIN, password, and biometric authentication.',
    color: '#f59e0b',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace('/setup');
    }
  };

  const handleSkip = () => {
    router.replace('/setup');
  };

  const slide = slides[currentIndex];

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.mutedText }]}>Skip</Text>
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: slide.color + '20' }]}>
            <Ionicons name={slide.icon} size={64} color={slide.color} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>
          <Text style={[styles.description, { color: colors.mutedText }]}>{slide.description}</Text>
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === currentIndex ? colors.primary : colors.border,
                    width: index === currentIndex ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleNext}
          >
            <Text style={styles.buttonText}>
              {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  skipBtn: { alignSelf: 'flex-end', padding: 12 },
  skipText: { fontSize: 16, fontWeight: '600' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  description: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
  footer: { paddingBottom: 20 },
  pagination: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  dot: { height: 8, borderRadius: 4 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
    borderRadius: 16,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});
