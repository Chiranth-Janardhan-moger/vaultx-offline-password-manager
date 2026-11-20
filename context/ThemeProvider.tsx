import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'system' | 'light' | 'dark';

type ThemeColors = {
  background: string;
  card: string;
  text: string;
  mutedText: string;
  inputBg: string;
  primary: string;
  border: string;
  statusBarBg: string;
};

type ThemeValue = {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  colors: ThemeColors;
  enhancedContrast: boolean;
  showBorders: boolean;
  setMode: (m: ThemeMode) => void;
  setEnhancedContrast: (enabled: boolean) => void;
  setShowBorders: (enabled: boolean) => void;
};

const THEME_MODE_KEY = 'theme_mode_v1';
const ENHANCED_CONTRAST_KEY = 'enhanced_contrast_v1';
const SHOW_BORDERS_KEY = 'show_borders_v1';

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

const lightColors: ThemeColors = {
  background: '#F8F9FA',
  card: '#FFFFFF',
  text: '#111827',
  mutedText: '#6B7280',
  inputBg: '#F3F4F6',
  primary: '#007AFF',
  border: '#E5E7EB',
  statusBarBg: '#F8F9FA',
};

const darkColors: ThemeColors = {
  background: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  mutedText: '#8E8E93',
  inputBg: '#2C2C2E',
  primary: '#0A84FF',
  border: '#38383A',
  statusBarBg: '#000000',
};

// Enhanced contrast WITHOUT borders (soft light canvas / dark zinc with transparent borders)
const lightColorsEnhancedNoBorder: ThemeColors = {
  background: '#F8F9FA',
  card: '#FFFFFF',
  text: '#000000',
  mutedText: '#6B7280',
  inputBg: '#F3F4F6',
  primary: '#007AFF',
  border: 'transparent',
  statusBarBg: '#F8F9FA',
};

const darkColorsEnhancedNoBorder: ThemeColors = {
  background: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  mutedText: '#8E8E93',
  inputBg: '#2C2C2E',
  primary: '#0A84FF',
  border: 'transparent',
  statusBarBg: '#000000',
};

// Enhanced contrast WITH borders
const lightColorsEnhancedWithBorder: ThemeColors = {
  background: '#F8F9FA',
  card: '#FFFFFF',
  text: '#000000',
  mutedText: '#6B7280',
  inputBg: '#F3F4F6',
  primary: '#007AFF',
  border: '#E5E7EB',
  statusBarBg: '#F8F9FA',
};

const darkColorsEnhancedWithBorder: ThemeColors = {
  background: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  mutedText: '#8E8E93',
  inputBg: '#2C2C2E',
  primary: '#0A84FF',
  border: '#38383A',
  statusBarBg: '#000000',
};

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [enhancedContrast, setEnhancedContrastState] = useState(false);
  const [showBorders, setShowBordersState] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(THEME_MODE_KEY);
      if (saved === 'system' || saved === 'light' || saved === 'dark') {
        setModeState(saved as ThemeMode);
      }
      
      const savedContrast = await SecureStore.getItemAsync(ENHANCED_CONTRAST_KEY);
      if (savedContrast === 'true') setEnhancedContrastState(true);
      
      const savedBorders = await SecureStore.getItemAsync(SHOW_BORDERS_KEY);
      if (savedBorders !== null) {
        setShowBordersState(savedBorders === 'true');
      }
    })();
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    SecureStore.setItemAsync(THEME_MODE_KEY, m);
  };

  const setEnhancedContrast = (enabled: boolean) => {
    setEnhancedContrastState(enabled);
    SecureStore.setItemAsync(ENHANCED_CONTRAST_KEY, enabled ? 'true' : 'false');
  };

  const setShowBorders = (enabled: boolean) => {
    setShowBordersState(enabled);
    SecureStore.setItemAsync(SHOW_BORDERS_KEY, enabled ? 'true' : 'false');
  };

  const resolved = mode === 'system' ? (systemColorScheme === 'light' ? 'light' : 'dark') : mode;

  let colors: ThemeColors;
  if (enhancedContrast) {
    if (showBorders) {
      colors = resolved === 'dark' ? darkColorsEnhancedWithBorder : lightColorsEnhancedWithBorder;
    } else {
      colors = resolved === 'dark' ? darkColorsEnhancedNoBorder : lightColorsEnhancedNoBorder;
    }
  } else {
    const baseColors = resolved === 'dark' ? darkColors : lightColors;
    colors = showBorders ? baseColors : { ...baseColors, border: 'transparent' };
  }

  const value = useMemo<ThemeValue>(
    () => ({ mode, resolved, colors, enhancedContrast, showBorders, setMode, setEnhancedContrast, setShowBorders }),
    [mode, resolved, colors, enhancedContrast, showBorders]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
