import { SessionProvider } from "@/context/SessionProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
import { startClipboardMonitoring, stopClipboardMonitoring } from '@/lib/clipboard-monitor';
import '@/lib/crypto-shim';
import { setScreenshotBlocking } from '@/lib/screen-security';
import { Stack } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Platform } from 'react-native';

const BLOCK_SCREENSHOTS_KEY = 'block_screenshots';

export default function RootLayout() {
  // Apply screenshot blocking setting on app start
  React.useEffect(() => {
    (async () => {
      try {
        const blockSS = await SecureStore.getItemAsync(BLOCK_SCREENSHOTS_KEY);
        const shouldBlock = blockSS !== 'false'; // Default: true (block screenshots)
        await setScreenshotBlocking(shouldBlock);
      } catch (error) {
        console.error('Failed to apply screenshot blocking:', error);
        // Default to blocking on error for security
        await setScreenshotBlocking(true);
      }
    })();
  }, []);

  React.useEffect(() => {
    // Start clipboard monitoring when app opens
    startClipboardMonitoring();
    
    return () => {
      // Stop monitoring when app closes
      stopClipboardMonitoring();
    };
  }, []);

  return (
    <ThemeProvider>
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
        />
      </SessionProvider>
    </ThemeProvider>
  );
}
