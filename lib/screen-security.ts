import { Platform } from 'react-native';

export const setScreenshotBlocking = async (_block: boolean): Promise<boolean> => {
  return Platform.OS === 'android';
};

export const isScreenshotBlocked = async (): Promise<boolean> => {
  return Platform.OS === 'android';
};
