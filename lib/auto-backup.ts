import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { encryptBackupData, type CardItem, type PasswordItem, type VaultData } from './vault';

const AUTO_BACKUP_ENABLED_KEY = 'vaultx_auto_backup_enabled';
const AUTO_BACKUP_DIR_URI_KEY = 'vaultx_auto_backup_dir_uri';
const AUTO_BACKUP_PASSWORD_KEY = 'vaultx_auto_backup_password';
const AUTO_BACKUP_FREQUENCY_KEY = 'vaultx_auto_backup_frequency';
const AUTO_BACKUP_LAST_AT_KEY = 'vaultx_auto_backup_last_at';
const AUTO_BACKUP_LAST_ERROR_KEY = 'vaultx_auto_backup_last_error';
const AUTO_BACKUP_RECENT_FILES_KEY = 'vaultx_auto_backup_recent_files';
const LAST_BACKUP_DATE_KEY = 'last_backup_date';

const MAX_RETAINED_AUTO_BACKUPS = 3;
const AUTO_BACKUP_MIME_TYPE = 'application/vnd.vaultx.backup';

export type AutoBackupFrequency = 'on_change' | 'daily' | 'weekly';
export type AutoBackupTrigger = 'change' | 'unlock' | 'manual';

export type AutoBackupConfig = {
  enabled: boolean;
  directoryUri: string | null;
  hasPassword: boolean;
  frequency: AutoBackupFrequency;
  lastBackupAt: number;
  lastError: string | null;
};

export type SafStorageAdapter = {
  createFileAsync: (parentUri: string, fileName: string, mimeType: string) => Promise<string>;
  writeAsStringAsync: (fileUri: string, contents: string) => Promise<void>;
  deleteAsync: (fileUri: string) => Promise<void>;
};

export type AutoBackupResult =
  | { ok: true; skipped: false; fileUri: string; timestamp: number }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string };

const defaultSafAdapter: SafStorageAdapter = {
  createFileAsync: (parentUri, fileName, mimeType) =>
    FileSystem.StorageAccessFramework.createFileAsync(parentUri, fileName, mimeType),
  writeAsStringAsync: (fileUri, contents) =>
    FileSystem.StorageAccessFramework.writeAsStringAsync(fileUri, contents),
  deleteAsync: (fileUri) =>
    FileSystem.StorageAccessFramework.deleteAsync(fileUri, { idempotent: true }),
};

export function formatSafDirectoryName(uri: string | null | undefined): string {
  if (!uri) return 'Not selected';
  try {
    const decoded = decodeURIComponent(uri);
    const treeMarker = '/tree/';
    const treeIdx = decoded.indexOf(treeMarker);
    const rawTree = treeIdx !== -1 ? decoded.slice(treeIdx + treeMarker.length) : decoded;
    const colonIdx = rawTree.indexOf(':');
    if (colonIdx !== -1) {
      const volume = rawTree.slice(0, colonIdx);
      const relPath = rawTree.slice(colonIdx + 1).replace(/^\/+/, '');
      if (volume === 'primary') {
        return relPath || 'Internal Storage';
      }
      return relPath ? `${volume}/${relPath}` : volume;
    }
    return rawTree || 'Selected Folder';
  } catch {
    return 'Selected Folder';
  }
}

function parseFrequency(raw: string | null): AutoBackupFrequency {
  if (raw === 'daily' || raw === 'weekly' || raw === 'on_change') {
    return raw;
  }
  return 'on_change';
}

export async function getAutoBackupConfig(): Promise<AutoBackupConfig> {
  try {
    const [enabledRaw, directoryUri, password, freqRaw, lastAtRaw, lastError] = await Promise.all([
      SecureStore.getItemAsync(AUTO_BACKUP_ENABLED_KEY),
      SecureStore.getItemAsync(AUTO_BACKUP_DIR_URI_KEY),
      SecureStore.getItemAsync(AUTO_BACKUP_PASSWORD_KEY),
      SecureStore.getItemAsync(AUTO_BACKUP_FREQUENCY_KEY),
      SecureStore.getItemAsync(AUTO_BACKUP_LAST_AT_KEY),
      SecureStore.getItemAsync(AUTO_BACKUP_LAST_ERROR_KEY),
    ]);

    const parsedLastAt = lastAtRaw ? parseInt(lastAtRaw, 10) : 0;
    return {
      enabled: enabledRaw === '1' || enabledRaw === 'true',
      directoryUri: directoryUri || null,
      hasPassword: !!password && password.length >= 6,
      frequency: parseFrequency(freqRaw),
      lastBackupAt: Number.isFinite(parsedLastAt) && parsedLastAt > 0 ? parsedLastAt : 0,
      lastError: lastError || null,
    };
  } catch {
    return {
      enabled: false,
      directoryUri: null,
      hasPassword: false,
      frequency: 'on_change',
      lastBackupAt: 0,
      lastError: null,
    };
  }
}

export async function setAutoBackupEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(AUTO_BACKUP_ENABLED_KEY, enabled ? '1' : '0');
}

export async function setAutoBackupDirectoryUri(directoryUri: string): Promise<void> {
  await SecureStore.setItemAsync(AUTO_BACKUP_DIR_URI_KEY, directoryUri);
  await SecureStore.deleteItemAsync(AUTO_BACKUP_LAST_ERROR_KEY).catch(() => {});
}

export async function setAutoBackupPassword(password: string): Promise<void> {
  if (!password || password.length < 6) {
    throw new Error('Backup password must be at least 6 characters');
  }
  await SecureStore.setItemAsync(AUTO_BACKUP_PASSWORD_KEY, password);
}

export async function setAutoBackupFrequency(frequency: AutoBackupFrequency): Promise<void> {
  await SecureStore.setItemAsync(AUTO_BACKUP_FREQUENCY_KEY, frequency);
}

export async function clearAutoBackupConfig(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(AUTO_BACKUP_ENABLED_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(AUTO_BACKUP_DIR_URI_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(AUTO_BACKUP_PASSWORD_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(AUTO_BACKUP_FREQUENCY_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(AUTO_BACKUP_LAST_AT_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(AUTO_BACKUP_LAST_ERROR_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(AUTO_BACKUP_RECENT_FILES_KEY).catch(() => {}),
  ]);
}

export async function pickBackupDirectory(): Promise<{ granted: boolean; directoryUri?: string }> {
  const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!result.granted || !result.directoryUri) {
    return { granted: false };
  }
  await setAutoBackupDirectoryUri(result.directoryUri);
  return { granted: true, directoryUri: result.directoryUri };
}

export function isAutoBackupDue(
  config: Pick<AutoBackupConfig, 'enabled' | 'directoryUri' | 'hasPassword' | 'frequency' | 'lastBackupAt' | 'lastError'>,
  trigger: AutoBackupTrigger,
  now = Date.now()
): boolean {
  if (!config.enabled || !config.directoryUri || !config.hasPassword) {
    return false;
  }
  if (trigger === 'manual') {
    return true;
  }
  if (config.frequency === 'on_change') {
    if (trigger === 'change') return true;
    return config.lastBackupAt === 0 || !!config.lastError;
  }

  const intervalMs =
    config.frequency === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  return config.lastBackupAt === 0 || now - config.lastBackupAt >= intervalMs;
}

function formatBackupFilename(now: number): string {
  const iso = new Date(now).toISOString();
  const compact = iso.slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
  return `vaultx-auto-backup-${compact}.vxb`;
}

async function readRecentBackupUris(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(AUTO_BACKUP_RECENT_FILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === 'string') : [];
  } catch {
    return [];
  }
}

let activeBackupPromise: Promise<AutoBackupResult> | null = null;
let queuedSnapshot: { passwords: PasswordItem[]; cards: CardItem[] } | null = null;
let queuedOptions: { trigger?: AutoBackupTrigger; storageAdapter?: SafStorageAdapter; now?: number } | null = null;

async function executeBackupSnapshot(
  snapshot: { passwords: PasswordItem[]; cards: CardItem[] },
  options: { trigger?: AutoBackupTrigger; storageAdapter?: SafStorageAdapter; now?: number } = {}
): Promise<AutoBackupResult> {
  const trigger = options.trigger ?? 'change';
  const now = options.now ?? Date.now();
  const storage = options.storageAdapter ?? defaultSafAdapter;

  const [config, password] = await Promise.all([
    getAutoBackupConfig(),
    SecureStore.getItemAsync(AUTO_BACKUP_PASSWORD_KEY),
  ]);

  if (!config.enabled) {
    return { ok: true, skipped: true, reason: 'disabled' };
  }
  if (!config.directoryUri || !password) {
    return { ok: true, skipped: true, reason: 'incomplete_config' };
  }
  if (!isAutoBackupDue(config, trigger, now)) {
    return { ok: true, skipped: true, reason: 'not_due' };
  }

  try {
    const backupJson = await encryptBackupData(snapshot, password);
    const fileName = formatBackupFilename(now);
    const fileUri = await storage.createFileAsync(config.directoryUri, fileName, AUTO_BACKUP_MIME_TYPE);
    await storage.writeAsStringAsync(fileUri, backupJson);

    const prevFiles = await readRecentBackupUris();
    const updatedFiles = [fileUri, ...prevFiles.filter((u) => u !== fileUri)];
    const toDelete = updatedFiles.slice(MAX_RETAINED_AUTO_BACKUPS);
    const keptFiles = updatedFiles.slice(0, MAX_RETAINED_AUTO_BACKUPS);

    for (const oldUri of toDelete) {
      await storage.deleteAsync(oldUri).catch(() => {});
    }

    await Promise.all([
      SecureStore.setItemAsync(AUTO_BACKUP_RECENT_FILES_KEY, JSON.stringify(keptFiles)),
      SecureStore.setItemAsync(AUTO_BACKUP_LAST_AT_KEY, String(now)),
      SecureStore.setItemAsync(LAST_BACKUP_DATE_KEY, String(now)),
      SecureStore.deleteItemAsync(AUTO_BACKUP_LAST_ERROR_KEY).catch(() => {}),
    ]);

    return { ok: true, skipped: false, fileUri, timestamp: now };
  } catch (err: any) {
    const message = err?.message || 'Unable to write backup to the selected folder.';
    await SecureStore.setItemAsync(AUTO_BACKUP_LAST_ERROR_KEY, message).catch(() => {});
    return { ok: false, skipped: false, error: message };
  }
}

/**
 * Snapshots vault items synchronously before async encryption so session lock memory purging
 * cannot mutate data mid-backup, and coalesces rapid edits sequentially.
 */
export function runAutoBackup(
  vaultData: Pick<VaultData, 'passwords' | 'cards'>,
  options: { trigger?: AutoBackupTrigger; storageAdapter?: SafStorageAdapter; now?: number } = {}
): Promise<AutoBackupResult> {
  const snapshot: { passwords: PasswordItem[]; cards: CardItem[] } = JSON.parse(
    JSON.stringify({
      passwords: Array.isArray(vaultData?.passwords) ? vaultData.passwords : [],
      cards: Array.isArray(vaultData?.cards) ? vaultData.cards : [],
    })
  );

  if (activeBackupPromise) {
    queuedSnapshot = snapshot;
    queuedOptions = options;
    return activeBackupPromise;
  }

  const run = (async (): Promise<AutoBackupResult> => {
    let result = await executeBackupSnapshot(snapshot, options);
    while (queuedSnapshot) {
      const nextSnap = queuedSnapshot;
      const nextOpts = queuedOptions ?? {};
      queuedSnapshot = null;
      queuedOptions = null;
      result = await executeBackupSnapshot(nextSnap, nextOpts);
    }
    return result;
  })();

  activeBackupPromise = run.finally(() => {
    activeBackupPromise = null;
  });

  return activeBackupPromise;
}
