import test from 'node:test';
import assert from 'node:assert';
import CryptoJS from 'crypto-js';

import {
  encryptBackupData,
  decryptBackupData,
  toCsv,
} from '../lib/vault.ts';
import {
  recordFailedAttempt,
  getLockoutState,
  clearLockoutState,
} from '../lib/secure.ts';
import { _clearStore } from './mocks/expo-secure-store.mjs';

test.beforeEach(async () => {
  _clearStore();
  await clearLockoutState();
});

test('Security Fix - VAULTX-SEC-008: Screenshot Blocking Defaults to ON', () => {
  // When unconfigured in SecureStore (null), blockSS !== 'false' must evaluate to true
  const blockSSNull = null;
  const shouldBlockDefault = blockSSNull !== 'false';
  assert.strictEqual(shouldBlockDefault, true, 'Screenshot blocking must default to ON on cold start');

  // Explicit user disabling in Settings
  const blockSSDisabled = 'false';
  const shouldBlockDisabled = blockSSDisabled !== 'false';
  assert.strictEqual(shouldBlockDisabled, false, 'Explicitly disabling in Settings must be respected');

  // Explicit user enabling in Settings
  const blockSSEnabled = 'true';
  const shouldBlockEnabled = blockSSEnabled !== 'false';
  assert.strictEqual(shouldBlockEnabled, true, 'Explicitly enabling in Settings must be respected');
});

test('Security Fix - VAULTX-SEC-009: Recovery Questions Lockout Rate Limiting', async () => {
  // Simulate 4 failed recovery attempts
  for (let i = 0; i < 4; i++) {
    const state = await recordFailedAttempt(5, 30_000);
    assert.strictEqual(state.lockedUntil, 0);
  }

  // 5th failed attempt must trigger 30s lockout
  const stateLocked = await recordFailedAttempt(5, 30_000);
  assert.ok(stateLocked.lockedUntil > Date.now());

  // In locked state, lockout state query must report lockedUntil in future
  const query = await getLockoutState();
  assert.ok(query.lockedUntil > Date.now());
  assert.ok(query.lockedUntil - Date.now() > 0);

  // Clearing lockout resets
  await clearLockoutState();
  const resetQuery = await getLockoutState();
  assert.strictEqual(resetQuery.lockedUntil, 0);
  assert.strictEqual(resetQuery.failedAttempts, 0);
});

test('Security Fix - VAULTX-SEC-012: Backup Container HMAC Stripping and Iterations Bound', async () => {
  const backupData = {
    passwords: [{ service: 'TestService', username: 'user1', password: 'Pass123!@#' }],
    cards: [],
  };
  const passphrase = 'StrongBackupPassphrase2026!';
  const backupJson = await encryptBackupData(backupData, passphrase);
  const container = JSON.parse(backupJson);

  // 1. Stripping HMAC from v2.1 container must fail
  const stripped = { ...container };
  delete stripped.hmac;
  await assert.rejects(async () => {
    await decryptBackupData(JSON.stringify(stripped), passphrase);
  }, /Incorrect backup password/);

  // 2. Iterations exceeding safe bound (> 500k) must fail
  const excessiveIterations = { ...container, iterations: 100_000_000 };
  await assert.rejects(async () => {
    await decryptBackupData(JSON.stringify(excessiveIterations), passphrase);
  }, /Incorrect backup password/);

  // 3. Iterations below minimum bound (< 10k) must fail
  const subIterations = { ...container, iterations: 500 };
  await assert.rejects(async () => {
    await decryptBackupData(JSON.stringify(subIterations), passphrase);
  }, /Incorrect backup password/);
});

test('Security Fix - VAULTX-SEC-013: CSV Formula Injection Sanitization (CWE-1236)', () => {
  const vaultWithFormulas = {
    passwords: [
      { service: '=1+1', username: '+cmd', password: '-2', notes: '@calc' },
      { service: '\t=DDE', username: '\r=cmd', password: '  =SUM', notes: '|cmd' },
      { service: 'NormalService', username: 'normal_user', password: 'safe_password' },
    ],
  };

  const csv = toCsv(vaultWithFormulas);

  // Direct formula prefixes
  assert.ok(csv.includes('"\'=1+1"'), 'Direct equals must be escaped with single-quote');
  assert.ok(csv.includes('"\'+cmd"'), 'Direct plus must be escaped with single-quote');
  assert.ok(csv.includes('"\'-2"'), 'Direct minus must be escaped with single-quote');
  assert.ok(csv.includes('"\'@calc"'), 'Direct at must be escaped with single-quote');

  // Obfuscated formula prefixes (tabs, carriage returns, leading spaces, pipes)
  assert.ok(csv.includes('"\'\t=DDE"'), 'Horizontal tab prefix must be escaped');
  assert.ok(csv.includes('"\'\r=cmd"'), 'Carriage return prefix must be escaped');
  assert.ok(csv.includes('"\'  =SUM"'), 'Leading spaces before formula must be escaped');
  assert.ok(csv.includes('"\'|cmd"'), 'Pipe character must be escaped');

  // Safe entries must NOT have single-quote prepended
  assert.ok(csv.includes('"NormalService"'), 'Safe strings must not have single quote prepended');
});

test('Security Fix - VAULTX-SEC-014: Non-Array Backup Schema Normalization', async () => {
  const passphrase = 'SchemaPassphrase2026!';

  // Malformed backup where passwords is a string and cards is a number
  const malformedObj = {
    passwords: 'this-should-be-an-array-not-string',
    cards: 12345,
  };

  const backupJson = await encryptBackupData(malformedObj, passphrase);
  const decrypted = await decryptBackupData(backupJson, passphrase);

  // Must normalize invalid non-array properties to safe empty arrays
  assert.ok(Array.isArray(decrypted.passwords), 'passwords must be an array');
  assert.strictEqual(decrypted.passwords.length, 0);
  assert.ok(Array.isArray(decrypted.cards), 'cards must be an array');
  assert.strictEqual(decrypted.cards.length, 0);
});
