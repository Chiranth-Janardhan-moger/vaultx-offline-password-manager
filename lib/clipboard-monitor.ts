import { NativeModules, Platform } from 'react-native';

const { ClipboardMonitor } = NativeModules;

export const startClipboardMonitoring = () => {
  if (Platform.OS === 'android' && ClipboardMonitor) {
    ClipboardMonitor.startMonitoring();
  }
};

export const stopClipboardMonitoring = () => {
  if (Platform.OS === 'android' && ClipboardMonitor) {
    ClipboardMonitor.stopMonitoring();
  }
};

export const getClipboardText = async (): Promise<string> => {
  if (Platform.OS === 'android' && ClipboardMonitor) {
    try {
      return await ClipboardMonitor.getClipboardText();
    } catch (error) {
      console.error('Failed to get clipboard text:', error);
      return '';
    }
  }
  return '';
};
