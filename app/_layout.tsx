import '@/lib/crypto-shim';
import { SessionProvider } from "@/context/SessionProvider";
import { ThemeProvider } from "@/context/ThemeProvider";
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
        const shouldBlock = blockSS === 'true'; // Default: false, can be toggled in Settings
        await setScreenshotBlocking(shouldBlock);
      } catch (error) {
        console.error('Failed to apply screenshot blocking:', error);
        await setScreenshotBlocking(false);
      }
    })();
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
        >
          <Stack.Screen 
            name="dashboard" 
            options={{ 
              animation: 'none',
            }} 
          />
          <Stack.Screen 
            name="cards" 
            options={{ 
              animation: 'none',
            }} 
          />
          <Stack.Screen 
            name="generate-password" 
            options={{ 
              animation: 'none',
            }} 
          />
          <Stack.Screen 
            name="settings/index" 
            options={{ 
              animation: 'none',
            }} 
          />
        </Stack>
      </SessionProvider>
    </ThemeProvider>
  );
}
