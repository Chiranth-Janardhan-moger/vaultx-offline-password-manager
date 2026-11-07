import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';

export const CLIPBOARD_CLEAR_SECONDS_KEY = 'vaultx_clipboard_clear_seconds';
export const DEFAULT_CLIPBOARD_CLEAR_SECONDS = 45;

let cachedClearSeconds: number | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;

export const getClipboardClearSeconds = async (): Promise<number> => {
  if (cachedClearSeconds !== null) {
    return cachedClearSeconds;
  }
  try {
    const raw = await SecureStore.getItemAsync(CLIPBOARD_CLEAR_SECONDS_KEY);
    if (raw !== null) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        cachedClearSeconds = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore storage read errors and fallback to default
  }
  cachedClearSeconds = DEFAULT_CLIPBOARD_CLEAR_SECONDS;
  return DEFAULT_CLIPBOARD_CLEAR_SECONDS;
};

export const setClipboardClearSeconds = async (seconds: number): Promise<void> => {
  cachedClearSeconds = seconds;
  try {
    await SecureStore.setItemAsync(CLIPBOARD_CLEAR_SECONDS_KEY, seconds.toString());
  } catch (error) {
    console.error('Failed to save clipboard clear setting:', error);
  }
};

export const cancelClipboardClearTimer = (): void => {
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
};

/**
 * Copies sensitive text to the system clipboard and schedules an automated
 * background clearance timer.
 * If timeoutMs is omitted, the user-configured setting from SecureStore is used.
 * If configured duration or timeoutMs is 0, auto-clear is disabled.
 */
export const copyToClipboardWithAutoClear = async (
  text: string,
  timeoutMs?: number
): Promise<void> => {
  await Clipboard.setStringAsync(text);

  cancelClipboardClearTimer();

  let ms = timeoutMs;
  if (ms === undefined) {
    const seconds = await getClipboardClearSeconds();
    if (seconds <= 0) {
      return;
    }
    ms = seconds * 1000;
  } else if (ms <= 0) {
    return;
  }

  clearTimer = setTimeout(async () => {
    try {
      const current = await Clipboard.getStringAsync();
      if (current === text) {
        await Clipboard.setStringAsync('');
      }
    } catch {
      // Ignore background clipboard access errors
    } finally {
      clearTimer = null;
    }
  }, ms);
};
