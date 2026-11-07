import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateVaultKey,
  saveMeta,
  loadMeta,
  hasPasswordUnlock,
  savePasswordWrap,
  unwrapWithPassword,
  saveBiometricKey,
  loadBiometricKey,
  recordFailedAttempt,
  getLockoutState,
  clearLockoutState,
} from '../lib/secure.ts';
import {
  createNewVault,
  generateSaltHex,
  hashPasswordAsync,
  encryptBackupData,
  decryptBackupData,
  decryptVaultWithKey,
  saveVault,
} from '../lib/vault.ts';
import {
  getClipboardClearSeconds,
  setClipboardClearSeconds,
  copyToClipboardWithAutoClear,
  cancelClipboardClearTimer,
  DEFAULT_CLIPBOARD_CLEAR_SECONDS,
} from '../lib/clipboard.ts';
import { _clearStore } from './mocks/expo-secure-store.mjs';
import { _getClipboard, _clearClipboard } from './mocks/expo-clipboard.mjs';

test.beforeEach(async () => {
  _clearStore();
  await clearLockoutState();
});

test('Account Setup - Email Validation Logic', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validEmails = [
    'user@example.com',
    'developer.admin@vaultx.io',
    'test_user+tag@domain.co.uk',
  ];
  for (const email of validEmails) {
    assert.ok(emailRegex.test(email), `Email "${email}" should be valid`);
  }

  const invalidEmails = [
    '',
    '   ',
    'plainaddress',
    'missingatsign.com',
    'user@missingdot',
    '@nodomain.com',
    'user@.com',
  ];
  for (const email of invalidEmails) {
    assert.strictEqual(emailRegex.test(email.trim()), false, `Email "${email}" should be invalid`);
  }
});

test('Account Setup - Full Registration Flow with Email and Password', async () => {
  const email = 'user@example.com';
  const masterPassword = 'MasterPassword2026!';
  const confirmPassword = 'MasterPassword2026!';

  assert.strictEqual(masterPassword, confirmPassword);
  assert.ok(masterPassword.length >= 8);

  const vaultKey = await generateVaultKey();
  const passwordSaltHex = generateSaltHex();
  const passwordHash = await hashPasswordAsync(masterPassword, passwordSaltHex);
  const cleanEmail = email.trim().toLowerCase();

  // Save metadata and wrapped password key
  await saveMeta({ email: cleanEmail, passwordHash, passwordSaltHex });
  await savePasswordWrap(vaultKey, masterPassword);

  const meta = await loadMeta();
  assert.ok(meta);
  assert.strictEqual(meta.email, cleanEmail);
  assert.strictEqual(meta.passwordHash, passwordHash);
  assert.strictEqual(meta.passwordSaltHex, passwordSaltHex);
  assert.strictEqual(await hasPasswordUnlock(), true);

  // Initialize vault with email
  const vault = await createNewVault(masterPassword, vaultKey, passwordSaltHex, { email: cleanEmail });
  assert.strictEqual(vault.user.email, cleanEmail);
  assert.strictEqual(vault.user.passwordHash, passwordHash);
  assert.strictEqual(vault.passwords.length, 0);
  assert.strictEqual(vault.cards.length, 0);
});

test('Login - Unlocks with Password Only (Email is NOT Required to Unlock)', async () => {
  const email = 'alex@example.org';
  const masterPassword = 'UltraSecurePassword2026#';

  const vaultKey = await generateVaultKey();
  const passwordSaltHex = generateSaltHex();
  const passwordHash = await hashPasswordAsync(masterPassword, passwordSaltHex);

  await saveMeta({ email, passwordHash, passwordSaltHex });
  await savePasswordWrap(vaultKey, masterPassword);

  const initialVault = await createNewVault(masterPassword, vaultKey, passwordSaltHex, { email });
  initialVault.passwords.push({
    service: 'GitHub',
    username: 'alex',
    password: 'gh-secret-token-123',
  });
  await saveVault(initialVault, vaultKey);

  // 1. Password-only unlock works without providing or checking email
  const unwrappedVaultKey = await unwrapWithPassword(masterPassword);
  assert.strictEqual(unwrappedVaultKey, vaultKey);

  // 2. Decrypt vault using the unwrapped key
  const decryptedVault = await decryptVaultWithKey(unwrappedVaultKey);
  assert.strictEqual(decryptedVault.user.email, email);
  assert.strictEqual(decryptedVault.passwords.length, 1);
  assert.strictEqual(decryptedVault.passwords[0].service, 'GitHub');

  // 3. Incorrect password fails to unwrap vault key
  await assert.rejects(async () => {
    await unwrapWithPassword('WrongPassword123');
  }, /Incorrect password/);
});

test('Login - Biometric Unlock Functions Completely Independently of Password and Email Input', async () => {
  const masterPassword = 'BiometricMaster2026!';
  const vaultKey = await generateVaultKey();
  const passwordSaltHex = generateSaltHex();

  await savePasswordWrap(vaultKey, masterPassword);
  await saveBiometricKey(vaultKey);

  // Load biometric key (fingerprint authentication)
  const bioKey = await loadBiometricKey();
  assert.strictEqual(bioKey, vaultKey);

  const vault = await createNewVault(masterPassword, bioKey, passwordSaltHex);
  assert.ok(vault);
});

test('Login - Lockout Threshold on Failed Password Attempts', async () => {
  // 4 failed attempts should not lock out
  for (let i = 0; i < 4; i++) {
    const state = await recordFailedAttempt(5, 30_000);
    assert.strictEqual(state.lockedUntil, 0);
  }

  // 5th failed attempt locks out for 30 seconds
  const lockedState = await recordFailedAttempt(5, 30_000);
  assert.ok(lockedState.lockedUntil > Date.now());

  const activeState = await getLockoutState();
  assert.strictEqual(activeState.lockedUntil, lockedState.lockedUntil);

  // Clearing lockout resets the state
  await clearLockoutState();
  const resetState = await getLockoutState();
  assert.strictEqual(resetState.lockedUntil, 0);
  assert.strictEqual(resetState.failedAttempts, 0);
});

test('Backup - Verifies Account Email and Master Password are NOT Stored in Backup', async () => {
  const userEmail = 'security-test@vaultx.app';
  const masterPassword = 'ConfidentialMasterPass2026!';
  const vaultKey = await generateVaultKey();
  const passwordSaltHex = generateSaltHex();
  const passwordHash = await hashPasswordAsync(masterPassword, passwordSaltHex);

  const vault = await createNewVault(masterPassword, vaultKey, passwordSaltHex, { email: userEmail });
  vault.passwords.push({
    service: 'AWS Console',
    username: 'cloud-admin',
    password: 'IAM-Secret-Key-123',
    notes: 'Production root credentials',
  });
  vault.cards.push({
    id: 'card-99',
    type: 'credit',
    title: 'HDFC Corporate Card',
    holderName: 'Cloud Admin',
    number: '4111222233334444',
    expiry: '12/28',
    cvv: '123',
  });

  // Prepare backup container (as constructed in app/export.tsx)
  const backupData = {
    passwords: vault.passwords,
    cards: vault.cards,
  };
  const backupPassphrase = 'DedicatedBackupPassword2026!';

  // Encrypt backup
  const backupJson = await encryptBackupData(backupData, backupPassphrase);
  assert.ok(typeof backupJson === 'string');

  // 1. Raw backup ciphertext / container MUST NOT contain the user email, master password, or password hash
  assert.strictEqual(backupJson.includes(userEmail), false, 'Raw backup must not contain account email');
  assert.strictEqual(backupJson.includes(masterPassword), false, 'Raw backup must not contain master password');
  assert.strictEqual(backupJson.includes(passwordHash), false, 'Raw backup must not contain password hash');

  // 2. Decrypted backup payload MUST contain ONLY passwords and cards (NO user account credentials)
  const decryptedBackup = await decryptBackupData(backupJson, backupPassphrase);

  assert.ok(Array.isArray(decryptedBackup.passwords));
  assert.strictEqual(decryptedBackup.passwords.length, 1);
  assert.strictEqual(decryptedBackup.passwords[0].service, 'AWS Console');

  assert.ok(Array.isArray(decryptedBackup.cards));
  assert.strictEqual(decryptedBackup.cards.length, 1);
  assert.strictEqual(decryptedBackup.cards[0].title, 'HDFC Corporate Card');

  // Explicit verification: NO email, NO user object, NO master password in the decrypted data
  assert.strictEqual(decryptedBackup.email, undefined);
  assert.strictEqual(decryptedBackup.user, undefined);
  assert.strictEqual(decryptedBackup.password, undefined);
  assert.strictEqual(decryptedBackup.passwordHash, undefined);
});

test('Backup - Tampering with Backup Container Fails Decryption (HMAC Integrity)', async () => {
  const backupData = {
    passwords: [{ service: 'Test', username: 'u', password: 'p' }],
  };
  const passphrase = 'IntegrityPassword2026!';
  const backupJson = await encryptBackupData(backupData, passphrase);

  const container = JSON.parse(backupJson);

  // Tamper with ciphertext
  const tamperedCiphertext = container.ciphertext.substring(0, container.ciphertext.length - 4) + 'AAAA';
  const tamperedContainer = { ...container, ciphertext: tamperedCiphertext };

  await assert.rejects(async () => {
    await decryptBackupData(JSON.stringify(tamperedContainer), passphrase);
  }, /Incorrect backup password/);

  // Decryption with wrong passphrase fails
  await assert.rejects(async () => {
    await decryptBackupData(backupJson, 'WrongPassphrase!');
  }, /Incorrect backup password/);
});

test('Clipboard - Default timeout and user preference persistence', async () => {
  cancelClipboardClearTimer();
  _clearClipboard();

  // Fresh state should be 45 seconds default
  await setClipboardClearSeconds(DEFAULT_CLIPBOARD_CLEAR_SECONDS);
  assert.strictEqual(await getClipboardClearSeconds(), 45);

  // Update to custom timer (e.g. 30 seconds)
  await setClipboardClearSeconds(30);
  assert.strictEqual(await getClipboardClearSeconds(), 30);

  // Update to disabled (0 seconds)
  await setClipboardClearSeconds(0);
  assert.strictEqual(await getClipboardClearSeconds(), 0);

  // Reset back to default
  await setClipboardClearSeconds(45);
});

test('Clipboard - Auto-clear wipes sensitive text after configured timeout', async () => {
  cancelClipboardClearTimer();
  _clearClipboard();

  const secret = 'super-secret-copied-password-2026';
  // Use explicit small ms timeout for fast test verification
  await copyToClipboardWithAutoClear(secret, 50);

  // Immediate check: clipboard holds the secret
  assert.strictEqual(_getClipboard(), secret);

  // Wait for the timeout to elapse
  await new Promise((resolve) => setTimeout(resolve, 80));

  // Clipboard must now be cleared
  assert.strictEqual(_getClipboard(), '');
});

test('Clipboard - Auto-clear does not wipe when disabled (0 seconds)', async () => {
  cancelClipboardClearTimer();
  _clearClipboard();

  await setClipboardClearSeconds(0);
  const secret = 'persistent-copied-password';
  await copyToClipboardWithAutoClear(secret);

  assert.strictEqual(_getClipboard(), secret);

  // Wait some time to ensure timer was NOT scheduled
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Clipboard remains intact
  assert.strictEqual(_getClipboard(), secret);

  // Reset to default
  await setClipboardClearSeconds(45);
  cancelClipboardClearTimer();
  _clearClipboard();
});
