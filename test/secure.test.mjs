import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateVaultKey,
  saveMeta,
  loadMeta,
  hasPasswordUnlock,
  hasRecovery,
  savePasswordWrap,
  unwrapWithPassword,
  saveRecoveryWrap,
  loadRecoveryQuestions,
  unwrapWithRecovery,
  setBiometricEnabled,
  isBiometricEnabled,
  saveBiometricKey,
  loadBiometricKey,
  clearAllSecure,
} from '../lib/secure.ts';
import { _clearStore } from './mocks/expo-secure-store.mjs';

test.beforeEach(async () => {
  _clearStore();
});

test('Secure - Vault Key Generation', async () => {
  const key1 = await generateVaultKey();
  const key2 = await generateVaultKey();

  assert.strictEqual(typeof key1, 'string');
  assert.strictEqual(key1.length, 64); // 256-bit hex
  assert.notStrictEqual(key1, key2);
});

test('Secure - Metadata Storage and Retrieval', async () => {
  assert.strictEqual(await loadMeta(), null);

  const meta = {
    phone: '9876543210',
    passwordHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    passwordSaltHex: '0123456789abcdef0123456789abcdef',
  };

  await saveMeta(meta);
  const loaded = await loadMeta();

  assert.deepStrictEqual(loaded, meta);
});

test('Secure - Master Password Key Wrapping and Unwrapping', async () => {
  const vaultKey = await generateVaultKey();
  const masterPassword = 'MyMasterPassword2026!';

  assert.strictEqual(await hasPasswordUnlock(), false);

  await savePasswordWrap(vaultKey, masterPassword);
  assert.strictEqual(await hasPasswordUnlock(), true);

  // Correct password unwrap
  const unwrappedKey = await unwrapWithPassword(masterPassword);
  assert.strictEqual(unwrappedKey, vaultKey);

  // Incorrect password unwrap rejects
  await assert.rejects(async () => {
    await unwrapWithPassword('WrongPassword123');
  }, /Incorrect password/);
});

test('Secure - Master Password Key Wrapping and Unwrapping with Special Characters', async () => {
  const vaultKey = await generateVaultKey();
  const password = 'V@ultX#2026_Secure$Passphrase!';

  assert.strictEqual(await hasPasswordUnlock(), false);

  await savePasswordWrap(vaultKey, password);
  assert.strictEqual(await hasPasswordUnlock(), true);

  // Correct password unwrap
  const unwrappedKey = await unwrapWithPassword(password);
  assert.strictEqual(unwrappedKey, vaultKey);

  // Incorrect password unwrap rejects
  await assert.rejects(async () => {
    await unwrapWithPassword('WrongPass#123');
  }, /Incorrect password/);
});

test('Secure - Recovery Questions Key Wrapping and Unwrapping', async () => {
  const vaultKey = await generateVaultKey();
  const questions = [
    'What was the name of your first pet?',
    'What city were you born in?',
  ];
  const answers = ['Fluffy', 'Bengaluru'];

  assert.strictEqual(await hasRecovery(), false);

  await saveRecoveryWrap(vaultKey, questions, answers);
  assert.strictEqual(await hasRecovery(), true);

  const loadedQuestions = await loadRecoveryQuestions();
  assert.deepStrictEqual(loadedQuestions, questions);

  // Correct answers (should be case/trim-tolerant)
  const unwrappedKey = await unwrapWithRecovery(['  fluffy  ', 'BENGALURU']);
  assert.strictEqual(unwrappedKey, vaultKey);

  // Wrong answers reject
  await assert.rejects(async () => {
    await unwrapWithRecovery(['Dog', 'Delhi']);
  }, /Incorrect answer/);
});

test('Secure - Biometrics Flag and Key Handling', async () => {
  assert.strictEqual(await isBiometricEnabled(), false);

  await setBiometricEnabled(true);
  assert.strictEqual(await isBiometricEnabled(), true);

  const vaultKey = await generateVaultKey();
  await saveBiometricKey(vaultKey);

  const loadedKey = await loadBiometricKey();
  assert.strictEqual(loadedKey, vaultKey);

  await setBiometricEnabled(false);
  assert.strictEqual(await isBiometricEnabled(), false);
});

test('Secure - clearAllSecure Resets Everything', async () => {
  const vaultKey = await generateVaultKey();
  await savePasswordWrap(vaultKey, 'password');
  await saveRecoveryWrap(vaultKey, ['Question?'], ['Answer']);
  await setBiometricEnabled(true);

  assert.strictEqual(await hasPasswordUnlock(), true);
  assert.strictEqual(await hasRecovery(), true);
  assert.strictEqual(await isBiometricEnabled(), true);

  await clearAllSecure();

  assert.strictEqual(await hasPasswordUnlock(), false);
  assert.strictEqual(await hasRecovery(), false);
  assert.strictEqual(await isBiometricEnabled(), false);
  assert.strictEqual(await loadMeta(), null);
});

test('Secure - Alphanumeric and Symbol Passcode Key Wrapping and Unwrapping', async () => {
  const vaultKey = await generateVaultKey();
  const complexPasscode = 'V@ultX#2026_Secure$';

  await savePasswordWrap(vaultKey, complexPasscode);
  assert.strictEqual(await hasPasswordUnlock(), true);

  const unwrappedKey = await unwrapWithPassword(complexPasscode);
  assert.strictEqual(unwrappedKey, vaultKey);

  await assert.rejects(async () => {
    await unwrapWithPassword('WrongPass#123');
  }, /Incorrect password/);
});

test('Secure - Lockout State Persistence and Threshold', async () => {
  const { getLockoutState, recordFailedAttempt, clearLockoutState } = await import('../lib/secure.ts');

  await clearLockoutState();
  const initial = await getLockoutState();
  assert.strictEqual(initial.failedAttempts, 0);
  assert.strictEqual(initial.lockedUntil, 0);

  // Attempt 1 to 4: increments count without locking
  let state = await recordFailedAttempt(5, 30000);
  assert.strictEqual(state.failedAttempts, 1);
  assert.strictEqual(state.lockedUntil, 0);

  state = await recordFailedAttempt(5, 30000);
  assert.strictEqual(state.failedAttempts, 2);

  state = await recordFailedAttempt(5, 30000);
  assert.strictEqual(state.failedAttempts, 3);

  state = await recordFailedAttempt(5, 30000);
  assert.strictEqual(state.failedAttempts, 4);
  assert.strictEqual(state.lockedUntil, 0);

  // Attempt 5: triggers 30s lockout and resets failedAttempts counter
  state = await recordFailedAttempt(5, 30000);
  assert.strictEqual(state.failedAttempts, 0);
  assert.ok(state.lockedUntil > Date.now());

  // State persists across reload
  const persisted = await getLockoutState();
  assert.strictEqual(persisted.lockedUntil, state.lockedUntil);

  // Clearing lockout clears state
  await clearLockoutState();
  const cleared = await getLockoutState();
  assert.strictEqual(cleared.failedAttempts, 0);
  assert.strictEqual(cleared.lockedUntil, 0);
});
