import { NativeModules, Platform } from 'react-native';

const { ScreenSecurity } = NativeModules;

export const setScreenshotBlocking = async (block: boolean): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    console.warn('Screenshot blocking is only supported on Android');
    return false;
  }

  if (!ScreenSecurity) {
    console.warn('ScreenSecurity native module not available. Please rebuild the app.');
    return false;
  }

  try {
    await ScreenSecurity.setScreenshotBlocking(block);
    return true;
  } catch (error) {
    console.error('Failed to set screenshot blocking:', error);
    return false;
  }
};

export const isScreenshotBlocked = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  if (!ScreenSecurity) {
    return true; // Default to blocked for security
  }

  try {
    return await ScreenSecurity.isScreenshotBlocked();
  } catch (error) {
    console.error('Failed to check screenshot blocking status:', error);
    return true; // Default to blocked for security
  }
};
