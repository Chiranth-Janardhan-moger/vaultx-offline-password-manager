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
  cardBorder: string;
  cardBorderWidth: number;
  statusBarBg: string;
};

type ThemeValue = {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  colors: ThemeColors;
  showBorders: boolean;
  setMode: (m: ThemeMode) => void;
  setShowBorders: (enabled: boolean) => void;
};

const THEME_MODE_KEY = 'theme_mode_v1';
const SHOW_BORDERS_KEY = 'show_solid_borders_v1';

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

const lightColors: Omit<ThemeColors, 'cardBorder' | 'cardBorderWidth'> = {
  background: '#F8F9FA',
  card: '#FFFFFF',
  text: '#111827',
  mutedText: '#6B7280',
  inputBg: '#F3F4F6',
  primary: '#007AFF',
  border: '#E5E7EB',
  statusBarBg: '#F8F9FA',
};

const darkColors: Omit<ThemeColors, 'cardBorder' | 'cardBorderWidth'> = {
  background: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  mutedText: '#8E8E93',
  inputBg: '#2C2C2E',
  primary: '#0A84FF',
  border: '#27272A',
  statusBarBg: '#000000',
};

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [showBorders, setShowBordersState] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(THEME_MODE_KEY);
      if (saved === 'system' || saved === 'light' || saved === 'dark') {
        setModeState(saved as ThemeMode);
      }
      
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

  const setShowBorders = (enabled: boolean) => {
    setShowBordersState(enabled);
    SecureStore.setItemAsync(SHOW_BORDERS_KEY, enabled ? 'true' : 'false');
  };

  const resolved = mode === 'system' ? (systemColorScheme === 'light' ? 'light' : 'dark') : mode;

  const baseColors = resolved === 'dark' ? darkColors : lightColors;
  const colors: ThemeColors = {
    ...baseColors,
    cardBorder: showBorders ? (resolved === 'dark' ? '#3A3A3C' : '#000000') : baseColors.border,
    cardBorderWidth: showBorders ? 1.5 : 0.6,
  };

  const value = useMemo<ThemeValue>(
    () => ({ mode, resolved, colors, showBorders, setMode, setShowBorders }),
    [mode, resolved, colors, showBorders]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
