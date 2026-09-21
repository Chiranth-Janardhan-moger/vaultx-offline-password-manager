import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSaltHex,
  hashPassword,
  verifyPassword,
  saveVault,
  decryptVaultWithKey,
  createNewVault,
  vaultExists,
  toCsv,
} from '../lib/vault.ts';
import { _clearFiles } from './mocks/expo-file-system.mjs';

test.beforeEach(() => {
  _clearFiles();
});

test('Vault - Salt Generation', () => {
  const salt1 = generateSaltHex(16);
  const salt2 = generateSaltHex(16);

  assert.strictEqual(typeof salt1, 'string');
  assert.strictEqual(salt1.length, 32); // 16 bytes = 32 hex chars
  assert.notStrictEqual(salt1, salt2, 'Salts must be cryptographically random');
});

test('Vault - Salted Password Hashing and Verification', () => {
  const password = 'SuperSecretVaultPassword!123';
  const saltHex = generateSaltHex();
  const hash = hashPassword(password, saltHex);

  assert.ok(hash.length >= 64);
  assert.strictEqual(verifyPassword(password, hash, saltHex), true);
  assert.strictEqual(verifyPassword('WrongPassword', hash, saltHex), false);
  assert.strictEqual(verifyPassword(password, hash, generateSaltHex()), false);
});

test('Vault - Legacy Password Hashing (Without Salt)', () => {
  const password = 'LegacyPassword';
  const legacyHash = hashPassword(password);

  assert.ok(legacyHash.length >= 64);
  assert.strictEqual(verifyPassword(password, legacyHash), true);
  assert.strictEqual(verifyPassword('OtherPassword', legacyHash), false);
});

test('Vault - Create, Encrypt, Save, and Decrypt Vault Lifecycle', async () => {
  const phone = '9876543210';
  const password = 'MasterPassword2026!';
  const vaultKey = generateSaltHex(32); // 256-bit key

  assert.strictEqual(await vaultExists(), false);

  const initialVault = await createNewVault(phone, password, vaultKey);
  assert.strictEqual(initialVault.user.phone, phone);
  assert.strictEqual(initialVault.passwords.length, 0);
  assert.strictEqual(initialVault.cards.length, 0);

  // Vault file should now exist
  assert.strictEqual(await vaultExists(), true);

  // Decrypt vault with correct key
  const decrypted = await decryptVaultWithKey(vaultKey);
  assert.strictEqual(decrypted.user.phone, phone);
  assert.strictEqual(verifyPassword(password, decrypted.user.passwordHash, decrypted.user.passwordSaltHex), true);

  // Add password item and card item
  decrypted.passwords.push({
    service: 'GitHub',
    username: 'testuser',
    password: 'github_password_123',
    category: 'work',
    totpSecret: 'JBSWY3DPEHPK3PXP',
    isFavorite: true,
  });

  decrypted.cards.push({
    id: 'card-1',
    type: 'credit_card',
    title: 'HDFC Millennia',
    holderName: 'Test User',
    number: '4111222233334444',
    fields: [{ label: 'CVV', value: '123', isSensitive: true }],
    gradient: ['#10b981', '#059669'],
    createdAt: Date.now(),
  });

  await saveVault(decrypted, vaultKey);

  // Reload and verify contents
  const reloaded = await decryptVaultWithKey(vaultKey);
  assert.strictEqual(reloaded.passwords.length, 1);
  assert.strictEqual(reloaded.passwords[0].service, 'GitHub');
  assert.strictEqual(reloaded.passwords[0].totpSecret, 'JBSWY3DPEHPK3PXP');
  assert.strictEqual(reloaded.cards.length, 1);
  assert.strictEqual(reloaded.cards[0].title, 'HDFC Millennia');
});

test('Vault - Decryption Fails With Incorrect Key', async () => {
  const phone = '9876543210';
  const password = 'MasterPassword2026!';
  const correctKey = generateSaltHex(32);
  const wrongKey = generateSaltHex(32);

  await createNewVault(phone, password, correctKey);

  await assert.rejects(async () => {
    await decryptVaultWithKey(wrongKey);
  }, /Unable to decrypt vault/);
});

test('Vault - Export to CSV Format', () => {
  const vault = {
    user: { phone: '1234567890', passwordHash: 'hash' },
    passwords: [
      {
        service: 'Google, Inc.',
        username: 'user@example.com',
        password: 'secret"password',
        notes: 'Personal email',
        category: 'google',
      },
    ],
  };

  const csv = toCsv(vault);
  assert.ok(csv.includes('service,username,password,notes,loginPin,transactionPin,otherPins'));
  // Special characters like quote should be escaped
  assert.ok(csv.includes('"Google, Inc."'));
  assert.ok(csv.includes('"secret""password"'));
});

test('Vault - Identity Cards Saving and Retrieval', async () => {
  const phone = '9876543210';
  const password = 'MasterPassword2026!';
  const vaultKey = generateSaltHex(32);

  const vault = await createNewVault(phone, password, vaultKey);
  assert.deepStrictEqual(vault.cards, []);

  const identityCard = {
    id: 'aadhaar_test_123',
    type: 'aadhaar',
    title: 'My Aadhaar',
    holderName: 'Dev User',
    number: '123456789012',
    fields: [
      { label: 'Date of Birth', value: '15/08/1990', isSensitive: false },
      { label: 'Gender', value: 'Male', isSensitive: false },
      { label: 'VID', value: '9876543210123456', isSensitive: true },
    ],
    gradient: ['#FF9933', '#128807'],
    createdAt: Date.now(),
    folder: 'Government IDs',
  };

  const updatedVault = { ...vault, cards: [identityCard] };
  await saveVault(updatedVault, vaultKey);

  const decrypted = await decryptVaultWithKey(vaultKey);
  assert.ok(Array.isArray(decrypted.cards));
  assert.strictEqual(decrypted.cards.length, 1);
  assert.strictEqual(decrypted.cards[0].id, 'aadhaar_test_123');
  assert.strictEqual(decrypted.cards[0].number, '123456789012');
  assert.strictEqual(decrypted.cards[0].fields.length, 3);
  assert.strictEqual(decrypted.cards[0].folder, 'Government IDs');
});
