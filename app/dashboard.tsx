import { useCustomAlert } from '@/components/CustomAlert';
import Screen from '@/components/Screen';
import { useSession } from '@/context/SessionProvider';
import { useTheme } from '@/context/ThemeProvider';
import { categories, categorizeService, type CategoryType } from '@/lib/categories';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const MASTER_PASSWORD_KEY = 'master_password_v1';
const DOUBLE_TAP_LOCK_KEY = 'double_tap_lock';

const maskPhone = (phone: string): string => {
  if (phone.length <= 4) return phone;
  const first2 = phone.slice(0, 2);
  const last2 = phone.slice(-2);
  const middle = 'X'.repeat(phone.length - 4);
  return `${first2}${middle}${last2}`;
};

export default function Dashboard() {
  const router = useRouter();
  const { unlocked, vault, lock, resetAutoLockTimer } = useSession();
  const { colors } = useTheme();
  const { showAlert, AlertComponent } = useCustomAlert();
  
  const [showFabMenu, setShowFabMenu] = React.useState(false);
  const [hasMasterPassword, setHasMasterPassword] = React.useState(false);
  const [doubleTapEnabled, setDoubleTapEnabled] = React.useState(false);
  const [lastTap, setLastTap] = React.useState(0);
  const [showTutorial, setShowTutorial] = React.useState(false);
  const [tutorialStep, setTutorialStep] = React.useState(0);
  const [typedText, setTypedText] = React.useState('');
  
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnims = React.useRef(categories.map(() => new Animated.Value(0))).current;
  const fabLabelAnim = React.useRef(new Animated.Value(0)).current;
  const spotlightAnim = React.useRef(new Animated.Value(0)).current;
  const typingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);


  React.useEffect(() => {
    if (!unlocked) router.replace('/login');
  }, [unlocked, router]);

  useFocusEffect(
    React.useCallback(() => {
      // Reset auto-lock timer when dashboard is focused
      resetAutoLockTimer();
      
      (async () => {
        const mp = await SecureStore.getItemAsync(MASTER_PASSWORD_KEY);
        setHasMasterPassword(!!mp);
        
        const doubleTap = await SecureStore.getItemAsync(DOUBLE_TAP_LOCK_KEY);
        setDoubleTapEnabled(doubleTap === 'true');
      })();
    }, [])
  );

  React.useEffect(() => {
    (async () => {
      // Check if tutorial has been shown
      const tutorialShown = await SecureStore.getItemAsync('fab_tutorial_shown');
      if (!tutorialShown) {
        setShowTutorial(true);
      }
    })();
  }, []);

  React.useEffect(() => {
    // Animate bars in with slide from left
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.stagger(
        60,
        scaleAnims.map(anim =>
          Animated.spring(anim, {
            toValue: 1,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
          })
        )
      ),
    ]).start();
  }, []);

  // Count passwords per category
  const categoryCounts = React.useMemo(() => {
    if (!vault?.passwords) return {};
    
    const counts: { [key in CategoryType]?: number } = {};
    
    vault.passwords.forEach(pwd => {
      const category = pwd.category || categorizeService(pwd.service);
      counts[category] = (counts[category] || 0) + 1;
    });
    
    return counts;
  }, [vault?.passwords]);

  const handleDoubleTap = () => {
    // Only lock if double-tap is enabled in settings
    if (!doubleTapEnabled) return;
    
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      // Double tap detected - lock the app
      lock();
      router.replace('/login');
    }
    setLastTap(now);
  };

  const openSearch = () => {
    router.push('/search');
  };

  const toggleFabMenu = () => {
    // Show tutorial on first FAB click
    if (showTutorial && tutorialStep === 0) {
      setTutorialStep(1);
      Animated.timing(spotlightAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      // Start typing animation
      typeText('Keep your existing passwords safe and organized — no need to remember them.', 0);
      return;
    }
    
    const toValue = showFabMenu ? 0 : 1;
    
    // Smoother spring animation
    Animated.spring(fabLabelAnim, {
      toValue,
      tension: 80,
      friction: 8,
      useNativeDriver: false,
    }).start();
    
    setShowFabMenu(!showFabMenu);
  };

  const typeText = (text: string, index: number) => {
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (index < text.length) {
      setTypedText(text.substring(0, index + 1));
      typingTimeoutRef.current = setTimeout(() => typeText(text, index + 1), 30);
    }
  };

  const nextTutorialStep = () => {
    if (tutorialStep === 1) {
      // Clear any ongoing typing animation
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      setTutorialStep(2);
      setTypedText('');
      Animated.timing(spotlightAnim, {
        toValue: 2,
        duration: 500,
        useNativeDriver: true,
      }).start();
      typeText('Create strong, secure passwords automatically.', 0);
    }
  };

  const closeTutorial = async () => {
    try {
      // Clear any ongoing typing animation
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      await SecureStore.setItemAsync('fab_tutorial_shown', 'true');
      setShowTutorial(false);
      setTutorialStep(0);
      setTypedText('');
      Animated.timing(spotlightAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Failed to save tutorial state:', error);
    }
  };

  return (
    <Screen>
      <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <TouchableOpacity style={{ flex: 1 }} onPress={handleDoubleTap} activeOpacity={0.7}>
            <Text style={[styles.title, { color: colors.text }]}>VaultX</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              {vault?.user.phone ? maskPhone(vault.user.phone) : ''}
            </Text>
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={openSearch}
            >
              <Ionicons name="search" size={20} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/settings')}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          onScroll={resetAutoLockTimer}
          scrollEventThrottle={1000}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
        >
          {categories.map((category, index) => {
            const count = categoryCounts[category.id] || 0;
            
            return (
              <Animated.View
                key={category.id}
                style={{
                  transform: [
                    {
                      translateX: scaleAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 0],
                      }),
                    },
                  ],
                  opacity: scaleAnims[index],
                }}
              >
                <TouchableOpacity
                  style={[styles.categoryBar, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push(`/category/${category.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.plainBar}>
                    <View style={styles.barLeft}>
                      <View style={[styles.barIconWrap, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name={category.icon as any} size={24} color={colors.primary} />
                      </View>
                      <View style={styles.barTextWrap}>
                        <Text style={[styles.barTitle, { color: colors.text }]}>{category.name}</Text>
                        <Text style={[styles.barSubtitle, { color: colors.mutedText }]}>{count} password{count !== 1 ? 's' : ''}</Text>
                      </View>
                    </View>
                    <View style={styles.barRight}>
                      <Ionicons name="chevron-forward" size={20} color={colors.mutedText} />
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>

        {showTutorial && tutorialStep > 0 ? (
          <View style={styles.tutorialOverlay}>
            <View style={[styles.tutorialDarkBg, { backgroundColor: 'rgba(0,0,0,0.9)' }]} />
            
            {/* Show FAB menu circles during tutorial */}
            <View style={styles.fabMenuCircular}>
              <Animated.View style={[styles.fabItemContainer, {
                opacity: tutorialStep === 1 ? 1 : 0.3,
              }]}>
                <View style={[styles.fabCircleBtn, { backgroundColor: colors.primary }]}>
                  <Ionicons name="key" size={24} color="#fff" />
                </View>
              </Animated.View>

              <Animated.View style={[styles.fabItemContainer, {
                opacity: tutorialStep === 2 ? 1 : 0.3,
              }]}>
                <View style={[styles.fabCircleBtn, { backgroundColor: '#8b5cf6' }]}>
                  <Ionicons name="sparkles" size={24} color="#fff" />
                </View>
              </Animated.View>
            </View>
            
            <View style={styles.tutorialContent}>
              <View style={[styles.tutorialIcon, { backgroundColor: tutorialStep === 1 ? colors.primary : '#8b5cf6' }]}>
                <Ionicons name={tutorialStep === 1 ? 'key' : 'sparkles'} size={32} color="#fff" />
              </View>
              
              <Text style={[styles.tutorialTitle, { color: '#fff' }]}>
                {tutorialStep === 1 ? 'Save Existing Passwords' : 'Generate New Password'}
              </Text>
              
              <Text style={[styles.tutorialText, { color: 'rgba(255,255,255,0.9)' }]}>
                {typedText}
              </Text>
              
              <View style={styles.tutorialButtons}>
                {tutorialStep === 1 ? (
                  <TouchableOpacity
                    style={[styles.tutorialBtn, { backgroundColor: colors.primary }]}
                    onPress={nextTutorialStep}
                  >
                    <Text style={styles.tutorialBtnText}>Next →</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.tutorialBtn, { backgroundColor: '#8b5cf6' }]}
                    onPress={closeTutorial}
                  >
                    <Text style={styles.tutorialBtnText}>Got it</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ) : null}

        {showFabMenu ? (
          <>
            <TouchableOpacity
              style={styles.fabOverlay}
              activeOpacity={1}
              onPress={toggleFabMenu}
            />
            <View style={styles.fabMenuCircular}>
              <Animated.View style={[styles.fabItemContainer, {
                opacity: fabLabelAnim,
                transform: [
                  {
                    translateY: fabLabelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                  {
                    scale: fabLabelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              }]}>
                <Animated.View style={[styles.fabLabel, { 
                  backgroundColor: colors.card,
                  width: fabLabelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 210],
                  }),
                  opacity: fabLabelAnim,
                }]}>
                  <Text style={[styles.fabLabelText, { color: colors.text }]} numberOfLines={1}>Save Existing Passwords</Text>
                </Animated.View>
                <TouchableOpacity
                  style={[styles.fabCircleBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setShowFabMenu(false);
                    fabLabelAnim.setValue(0);
                    router.push('/add');
                  }}
                >
                  <Ionicons name="key" size={24} color="#fff" />
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={[styles.fabItemContainer, {
                opacity: fabLabelAnim,
                transform: [
                  {
                    translateY: fabLabelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                  {
                    scale: fabLabelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              }]}>
                <Animated.View style={[styles.fabLabel, { 
                  backgroundColor: colors.card,
                  width: fabLabelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 200],
                  }),
                  opacity: fabLabelAnim,
                }]}>
                  <Text style={[styles.fabLabelText, { color: colors.text }]} numberOfLines={1}>Generate New Password</Text>
                </Animated.View>
                <TouchableOpacity
                  style={[styles.fabCircleBtn, { backgroundColor: '#8b5cf6' }]}
                  onPress={() => {
                    setShowFabMenu(false);
                    fabLabelAnim.setValue(0);
                    if (!hasMasterPassword) {
                      showAlert({
                        title: 'Master Password Required',
                        message: 'Set up your master password to generate strong passwords',
                        cancelText: 'Cancel',
                        confirmText: 'Set Up Now',
                        onCancel: () => {},
                        onConfirm: () => router.push('/master-password-intro'),
                      });
                    } else {
                      router.push('/generate-password');
                    }
                  }}
                >
                  <Ionicons name="sparkles" size={24} color="#fff" />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </>
        ) : null}

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={toggleFabMenu}
          activeOpacity={0.85}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: fabLabelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '135deg'],
                  }),
                },
                {
                  scale: fabLabelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  }),
                },
              ],
            }}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      <AlertComponent />
    </Screen>
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
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { marginTop: 4, fontSize: 13, fontWeight: '600' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    display: 'flex',
  },
  scrollView: { flex: 1 },
  listContainer: {
    paddingBottom: 100,
    paddingHorizontal: 4,
    gap: 12,
  },
  categoryBar: {
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
  },
  plainBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    minHeight: 78,
  },
  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  barIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
  },
  barTextWrap: {
    flex: 1,
  },
  barTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  barSubtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  barRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fabOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  fabMenuCircular: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    alignItems: 'flex-end',
    gap: 16,
  },
  fabItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fabLabel: {
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    paddingHorizontal: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabLabelText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  fabCircleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 18,
    right: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  tutorialOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  tutorialDarkBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  spotlightCircle: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tutorialContent: {
    position: 'absolute',
    top: '30%',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  tutorialIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  tutorialTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'center',
  },
  tutorialText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
    minHeight: 72,
  },
  tutorialButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  tutorialBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  tutorialBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
