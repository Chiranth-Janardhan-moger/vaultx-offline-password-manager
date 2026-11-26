import * as SecureStore from 'expo-secure-store';
import * as ReactNative from 'react-native';

export const HAPTIC_FEEDBACK_KEY = 'haptic_feedback_enabled_v1';

let cachedEnabled: boolean | null = null;

export async function isHapticsEnabled(): Promise<boolean> {
  if (cachedEnabled !== null) return cachedEnabled;
  try {
    const val = await SecureStore.getItemAsync(HAPTIC_FEEDBACK_KEY);
    cachedEnabled = val === null ? true : val === 'true';
    return cachedEnabled;
  } catch {
    return true;
  }
}

export async function setHapticsEnabled(enabled: boolean): Promise<void> {
  cachedEnabled = enabled;
  await SecureStore.setItemAsync(HAPTIC_FEEDBACK_KEY, enabled ? 'true' : 'false');
}

function performVibration(): void {
  try {
    const platformOs = ReactNative.Platform?.OS;
    const vibration = (ReactNative as { Vibration?: { vibrate?: (ms: number) => void } }).Vibration;
    if (platformOs === 'android' || platformOs === 'ios') {
      vibration?.vibrate?.(10);
    }
  } catch {
    // Ignore on devices without vibrator hardware
  }
}

export function triggerLightHaptic(): void {
  if (cachedEnabled === false) return;
  if (cachedEnabled === null) {
    void isHapticsEnabled().then((enabled) => {
      if (enabled) performVibration();
    });
    return;
  }
  performVibration();
}
