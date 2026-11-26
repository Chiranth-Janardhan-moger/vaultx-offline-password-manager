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
  borderWidth: number;
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

const lightColors: Omit<ThemeColors, 'borderWidth' | 'cardBorder' | 'cardBorderWidth'> = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#111827',
  mutedText: '#6B7280',
  inputBg: '#E8E8ED',
  primary: '#3B7DED',
  border: 'rgba(0, 0, 0, 0.07)',
  statusBarBg: '#F2F2F7',
};

const darkColors: Omit<ThemeColors, 'borderWidth' | 'cardBorder' | 'cardBorderWidth'> = {
  background: '#0D0E11',
  card: '#17181C',
  text: '#F5F5F7',
  mutedText: '#8E8E93',
  inputBg: '#22242A',
  primary: '#4D96FF',
  border: 'rgba(255, 255, 255, 0.07)',
  statusBarBg: '#0D0E11',
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
  const solidBorder = resolved === 'dark' ? '#3A3A3C' : '#D1D1D6';
  const activeBorder = showBorders ? solidBorder : baseColors.border;
  const activeWidth = showBorders ? 1 : 0;

  const colors: ThemeColors = {
    ...baseColors,
    border: activeBorder,
    borderWidth: activeWidth,
    cardBorder: activeBorder,
    cardBorderWidth: activeWidth,
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
