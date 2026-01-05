import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemeMode = 'light' | 'dark';

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
  background: '#ffffff',
  card: '#f3f4f6',
  text: '#0b0b0c',
  mutedText: '#4b5563',
  inputBg: '#eef2f7',
  primary: '#2563EB',
  border: '#e5e7eb',
  statusBarBg: '#ffffff',
};

const darkColors: ThemeColors = {
  background: '#0b0b0c',
  card: '#111827',
  text: '#ffffff',
  mutedText: '#9aa0a6',
  inputBg: '#1f2937',
  primary: '#2563EB',
  border: '#1f2937',
  statusBarBg: '#0b0b0c',
};

// Enhanced contrast WITHOUT borders (subtle gray borders for definition)
const lightColorsEnhancedNoBorder: ThemeColors = {
  background: '#ffffff',
  card: '#ffffff',
  text: '#000000',
  mutedText: '#333333',
  inputBg: '#ffffff',
  primary: '#2563EB',
  border: '#f0f0f0',
  statusBarBg: '#ffffff',
};

const darkColorsEnhancedNoBorder: ThemeColors = {
  background: '#000000',
  card: '#000000',
  text: '#ffffff',
  mutedText: '#cccccc',
  inputBg: '#000000',
  primary: '#2563EB',
  border: '#1a1a1a',
  statusBarBg: '#000000',
};

// Enhanced contrast WITH borders
const lightColorsEnhancedWithBorder: ThemeColors = {
  background: '#ffffff',
  card: '#ffffff',
  text: '#000000',
  mutedText: '#333333',
  inputBg: '#ffffff',
  primary: '#2563EB',
  border: '#000000',
  statusBarBg: '#ffffff',
};

const darkColorsEnhancedWithBorder: ThemeColors = {
  background: '#000000',
  card: '#000000',
  text: '#ffffff',
  mutedText: '#cccccc',
  inputBg: '#000000',
  primary: '#2563EB',
  border: '#ffffff',
  statusBarBg: '#000000',
};

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [enhancedContrast, setEnhancedContrastState] = useState(false);
  const [showBorders, setShowBordersState] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(THEME_MODE_KEY);
      if (saved === 'light' || saved === 'dark') setModeState(saved);
      
      const savedContrast = await SecureStore.getItemAsync(ENHANCED_CONTRAST_KEY);
      if (savedContrast === 'true') setEnhancedContrastState(true);
      
      const savedBorders = await SecureStore.getItemAsync(SHOW_BORDERS_KEY);
      if (savedBorders === 'true') setShowBordersState(true);
    })();
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    SecureStore.setItemAsync(THEME_MODE_KEY, m);
  };

  const setEnhancedContrast = (enabled: boolean) => {
    setEnhancedContrastState(enabled);
    SecureStore.setItemAsync(ENHANCED_CONTRAST_KEY, enabled ? 'true' : 'false');
    // Reset borders when disabling enhanced contrast
    if (!enabled) {
      setShowBordersState(false);
      SecureStore.setItemAsync(SHOW_BORDERS_KEY, 'false');
    }
  };

  const setShowBorders = (enabled: boolean) => {
    setShowBordersState(enabled);
    SecureStore.setItemAsync(SHOW_BORDERS_KEY, enabled ? 'true' : 'false');
  };

  const resolved = mode;

  let colors: ThemeColors;
  if (enhancedContrast) {
    if (showBorders) {
      colors = resolved === 'dark' ? darkColorsEnhancedWithBorder : lightColorsEnhancedWithBorder;
    } else {
      colors = resolved === 'dark' ? darkColorsEnhancedNoBorder : lightColorsEnhancedNoBorder;
    }
  } else {
    colors = resolved === 'dark' ? darkColors : lightColors;
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
