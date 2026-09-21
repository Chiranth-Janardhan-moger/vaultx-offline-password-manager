import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateVaultKey,
  saveMeta,
  loadMeta,
  hasPasswordUnlock,
  hasPinUnlock,
  hasRecovery,
  savePasswordWrap,
  unwrapWithPassword,
  savePinWrap,
  unwrapWithPin,
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

test('Secure - 6-Digit V-PIN Key Wrapping and Unwrapping', async () => {
  const vaultKey = await generateVaultKey();
  const pin = '839201';

  assert.strictEqual(await hasPinUnlock(), false);

  await savePinWrap(vaultKey, pin);
  assert.strictEqual(await hasPinUnlock(), true);

  // Correct PIN unwrap
  const unwrappedKey = await unwrapWithPin(pin);
  assert.strictEqual(unwrappedKey, vaultKey);

  // Incorrect PIN unwrap rejects
  await assert.rejects(async () => {
    await unwrapWithPin('000000');
  }, /Incorrect PIN/);
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
  await savePinWrap(vaultKey, '123456');
  await setBiometricEnabled(true);

  assert.strictEqual(await hasPasswordUnlock(), true);
  assert.strictEqual(await hasPinUnlock(), true);
  assert.strictEqual(await isBiometricEnabled(), true);

  await clearAllSecure();

  assert.strictEqual(await hasPasswordUnlock(), false);
  assert.strictEqual(await hasPinUnlock(), false);
  assert.strictEqual(await isBiometricEnabled(), false);
  assert.strictEqual(await loadMeta(), null);
});
