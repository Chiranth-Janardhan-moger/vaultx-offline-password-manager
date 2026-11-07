import { NativeModules, Platform } from 'react-native';

const { ScreenSecurity } = NativeModules;

export const setScreenshotBlocking = async (block: boolean): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  if (ScreenSecurity?.setScreenshotBlocking) {
    try {
      return await ScreenSecurity.setScreenshotBlocking(block);
    } catch {
      return false;
    }
  }
  return false;
};

export const isScreenshotBlocked = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;
  if (ScreenSecurity?.isScreenshotBlocked) {
    try {
      return await ScreenSecurity.isScreenshotBlocked();
    } catch {
      return false;
    }
  }
  return false;
};
