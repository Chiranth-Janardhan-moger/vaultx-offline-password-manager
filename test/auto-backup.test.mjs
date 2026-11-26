import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearAutoBackupConfig,
  formatSafDirectoryName,
  getAutoBackupConfig,
  isAutoBackupDue,
  runAutoBackup,
  setAutoBackupDirectoryUri,
  setAutoBackupEnabled,
  setAutoBackupFrequency,
  setAutoBackupPassword,
} from '../lib/auto-backup.ts';
import { decryptBackupData } from '../lib/vault.ts';
import { _clearStore } from './mocks/expo-secure-store.mjs';

test.beforeEach(async () => {
  _clearStore();
});

test('Auto Backup - formatSafDirectoryName decodes Android SAF URIs cleanly', () => {
  assert.strictEqual(formatSafDirectoryName(null), 'Not selected');
  assert.strictEqual(
    formatSafDirectoryName('content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FVaultX'),
    'Documents/VaultX'
  );
  assert.strictEqual(
    formatSafDirectoryName('content://com.android.externalstorage.documents/tree/primary%3A'),
    'Internal Storage'
  );
  assert.strictEqual(
    formatSafDirectoryName('content://com.android.externalstorage.documents/tree/1234-5678%3ABackups'),
    '1234-5678/Backups'
  );
});

test('Auto Backup - isAutoBackupDue respects schedule intervals and error catch-up', () => {
  const base = {
    enabled: true,
    directoryUri: 'content://tree/primary%3ABackups',
    hasPassword: true,
    lastError: null,
  };
  const now = 1_800_000_000_000;

  assert.strictEqual(isAutoBackupDue({ ...base, enabled: false, frequency: 'on_change', lastBackupAt: 0 }, 'change', now), false);
  assert.strictEqual(isAutoBackupDue({ ...base, frequency: 'on_change', lastBackupAt: now - 1000 }, 'change', now), true);
  assert.strictEqual(isAutoBackupDue({ ...base, frequency: 'on_change', lastBackupAt: now - 1000 }, 'unlock', now), false);
  assert.strictEqual(isAutoBackupDue({ ...base, frequency: 'on_change', lastBackupAt: now - 1000, lastError: 'Permission lost' }, 'unlock', now), true);

  const oneDayMs = 24 * 60 * 60 * 1000;
  assert.strictEqual(isAutoBackupDue({ ...base, frequency: 'daily', lastBackupAt: now - (oneDayMs - 1000) }, 'change', now), false);
  assert.strictEqual(isAutoBackupDue({ ...base, frequency: 'daily', lastBackupAt: now - oneDayMs }, 'unlock', now), true);

  const oneWeekMs = 7 * oneDayMs;
  assert.strictEqual(isAutoBackupDue({ ...base, frequency: 'weekly', lastBackupAt: now - (oneWeekMs - 1000) }, 'unlock', now), false);
  assert.strictEqual(isAutoBackupDue({ ...base, frequency: 'weekly', lastBackupAt: now - oneWeekMs }, 'unlock', now), true);
});

test('Auto Backup - End-to-End SAF write, v2.1 encryption, credential isolation, and rolling pruning', async () => {
  const files = new Map();
  let counter = 0;
  const mockSaf = {
    createFileAsync: async (parentUri, fileName) => {
      counter += 1;
      const uri = `${parentUri}/doc-${counter}-${fileName}`;
      files.set(uri, '');
      return uri;
    },
    writeAsStringAsync: async (fileUri, contents) => {
      files.set(fileUri, contents);
    },
    deleteAsync: async (fileUri) => {
      files.delete(fileUri);
    },
  };

  await setAutoBackupDirectoryUri('content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FVaultX');
  await setAutoBackupPassword('AutoBackupPass#2026');
  await setAutoBackupFrequency('on_change');
  await setAutoBackupEnabled(true);

  const vaultPayload = {
    user: { email: 'private@example.com', passwordHash: 'sensitivehash' },
    passwords: [
      { service: 'GitHub', username: 'dev', password: 'Secret123!', totpSecret: 'JBSWY3DPEHPK3PXP' },
    ],
    cards: [
      { id: 'c1', type: 'credit_card', title: 'Bank Card', holderName: 'Dev', number: '4111', fields: [], gradient: ['#000', '#111'], createdAt: 1 },
    ],
  };

  // Run 4 sequential backups to verify rolling retention keeps only latest 3
  let lastUri = '';
  for (let i = 0; i < 4; i++) {
    const res = await runAutoBackup(vaultPayload, {
      trigger: 'change',
      storageAdapter: mockSaf,
      now: 1_800_000_000_000 + i * 10_000,
    });
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.skipped, false);
    lastUri = res.fileUri;
  }

  assert.strictEqual(files.size, 3, 'Rolling cleanup must keep only latest 3 auto-backup files');
  assert.ok(files.has(lastUri), 'Latest backup URI must remain');

  // Verify encrypted .vxb file decrypts cleanly and excludes user account credentials
  const rawContent = files.get(lastUri);
  const parsedContainer = JSON.parse(rawContent);
  assert.strictEqual(parsedContainer.version, '2.1');
  assert.ok(parsedContainer.hmac);

  const restored = await decryptBackupData(rawContent, 'AutoBackupPass#2026');
  assert.strictEqual(restored.passwords.length, 1);
  assert.strictEqual(restored.passwords[0].totpSecret, 'JBSWY3DPEHPK3PXP');
  assert.strictEqual(restored.cards.length, 1);
  assert.strictEqual(restored.user, undefined);

  const cfg = await getAutoBackupConfig();
  assert.strictEqual(cfg.enabled, true);
  assert.strictEqual(cfg.lastError, null);
  assert.strictEqual(cfg.lastBackupAt, 1_800_000_030_000);

  // Error handling: failing SAF write records lastError cleanly without throwing
  const failingSaf = {
    createFileAsync: async () => {
      throw new Error('Folder permission revoked');
    },
    writeAsStringAsync: async () => {},
    deleteAsync: async () => {},
  };
  const errRes = await runAutoBackup(vaultPayload, { trigger: 'manual', storageAdapter: failingSaf });
  assert.strictEqual(errRes.ok, false);
  const errCfg = await getAutoBackupConfig();
  assert.strictEqual(errCfg.lastError, 'Folder permission revoked');

  // Factory reset clears all auto-backup keys
  await clearAutoBackupConfig();
  const clearedCfg = await getAutoBackupConfig();
  assert.strictEqual(clearedCfg.enabled, false);
  assert.strictEqual(clearedCfg.directoryUri, null);
  assert.strictEqual(clearedCfg.hasPassword, false);
});
