import '@/lib/crypto-shim';
import { SessionProvider } from "@/context/SessionProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import { ToastProvider } from "@/context/ToastProvider";
import BottomNavBar, { type TabKey } from '@/components/BottomNavBar';
import { BLOCK_SCREENSHOTS_KEY, setScreenshotBlocking, shouldBlockScreenshotsByDefault } from '@/lib/screen-security';
import { Stack, usePathname } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const pathname = usePathname();
  const activeTab: TabKey | null =
    pathname === '/dashboard'
      ? 'vault'
      : pathname === '/cards'
        ? 'cards'
        : pathname === '/generate-password'
          ? 'generator'
          : pathname === '/settings'
            ? 'settings'
            : null;
  // Apply screenshot blocking setting on app start
  React.useEffect(() => {
    (async () => {
      try {
        const blockSS = await SecureStore.getItemAsync(BLOCK_SCREENSHOTS_KEY);
        const shouldBlock = shouldBlockScreenshotsByDefault(blockSS); // Default: true (blocks screenshots until explicitly disabled in Settings)
        await setScreenshotBlocking(shouldBlock);
      } catch (error) {
        console.error('Failed to apply screenshot blocking:', error);
        await setScreenshotBlocking(true);
      }
    })();
  }, []);

  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <ThemeProvider>
        <ToastProvider>
          <SessionProvider>
          <Stack 
            screenOptions={{ 
              headerShown: false,
              animation: 'slide_from_right',
              animationDuration: 200,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
              animationTypeForReplace: 'push',
              ...(Platform.OS === 'android' && {
                animation: 'fade_from_bottom',
                animationDuration: 180,
              }),
            }} 
          >
            <Stack.Screen 
              name="dashboard" 
              options={{ 
                animation: 'fade',
                animationDuration: 120,
              }} 
            />
            <Stack.Screen 
              name="cards" 
              options={{ 
                animation: 'fade',
                animationDuration: 120,
              }} 
            />
            <Stack.Screen 
              name="generate-password" 
              options={{ 
                animation: 'fade',
                animationDuration: 120,
              }} 
            />
            <Stack.Screen 
              name="settings/index" 
              options={{ 
                animation: 'fade',
                animationDuration: 120,
              }} 
            />
          </Stack>
          {activeTab ? <BottomNavBar activeTab={activeTab} /> : null}
          </SessionProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
