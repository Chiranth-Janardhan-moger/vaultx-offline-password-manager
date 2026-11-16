import test from 'node:test';
import assert from 'node:assert/strict';
import { getTOTPCode, getTOTPDetails } from '../lib/totp.ts';

test('TOTP - Empty or Missing Secret', () => {
  assert.strictEqual(getTOTPCode(''), '------');
  assert.strictEqual(getTOTPCode(null), '------');
  assert.strictEqual(getTOTPCode(undefined), '------');
});

test('TOTP - Invalid Base32 Secret Handling', () => {
  // Characters like 8, 9, 1, 0 are invalid in standard RFC 4648 Base32 alphabet
  assert.strictEqual(getTOTPCode('INVALID!@#$9999'), '000000');
});

test('TOTP - Deterministic RFC 6238 Reference Vectors', () => {
  // Standard RFC 6238 Appendix B test secret (Base32 representation of ASCII "12345678901234567890")
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  const testVectors = [
    { epoch: 59, expected: '287082' },
    { epoch: 1111111109, expected: '081804' },
    { epoch: 1234567890, expected: '005924' },
    { epoch: 2000000000, expected: '279037' },
  ];

  for (const { epoch, expected } of testVectors) {
    const code = getTOTPCode(secret, epoch);
    assert.strictEqual(code, expected, `TOTP at epoch ${epoch} must match RFC 6238 vector ${expected}`);
  }
});

test('TOTP - Whitespace and Padding Tolerant (Deterministic Clock)', () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const fixedEpoch = 1700000000;
  const code1 = getTOTPCode(secret, fixedEpoch);
  const code2 = getTOTPCode('  jbsw y3dp ehpk 3pxp==  ', fixedEpoch);
  assert.strictEqual(code1, code2);
  assert.match(code1, /^[0-9]{6}$/);
});

test('TOTP - Details Calculation (Remaining Seconds and Code)', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  // At epoch 59: 59 % 30 = 29 -> remainingSeconds = 30 - 29 = 1s, code = '287082'
  const details = getTOTPDetails(secret, 59);

  assert.strictEqual(details.code, '287082');
  assert.strictEqual(details.remainingSeconds, 1);

  // At epoch 60: 60 % 30 = 0 -> remainingSeconds = 30 - 0 = 30s
  const detailsAt60 = getTOTPDetails(secret, 60);
  assert.strictEqual(detailsAt60.remainingSeconds, 30);
});

test('TOTP - End-to-End Vault Persistence and Edit Protection', async () => {
  const { createNewVault, saveVault, decryptVaultWithKey, generateSaltHex, encryptBackupData, decryptBackupData } = await import('../lib/vault.ts');
  const vaultKey = generateSaltHex(32);
  const password = 'MasterPassword2026!';

  // 1. Create vault and add password item with 2FA secret
  const vault = await createNewVault(password, vaultKey);
  const originalSecret = 'JBSWY3DPEHPK3PXP';
  vault.passwords.push({
    service: 'GitHub',
    username: 'developer',
    password: 'SuperSecretPassword!',
    totpSecret: originalSecret,
  });

  await saveVault(vault, vaultKey);

  // 2. Reload and decrypt vault from disk
  const reloadedVault = await decryptVaultWithKey(vaultKey);
  assert.strictEqual(reloadedVault.passwords.length, 1);
  assert.strictEqual(reloadedVault.passwords[0].totpSecret, originalSecret);
  const generatedCode = getTOTPCode(reloadedVault.passwords[0].totpSecret, 1700000000);
  assert.match(generatedCode, /^[0-9]{6}$/);

  // 3. Simulate user editing the password (updating password, preserving existing totpSecret)
  const existing = reloadedVault.passwords[0];
  const editedItem = {
    ...existing,
    password: 'NewChangedPassword2026#',
    totpSecret: existing.totpSecret, // Guaranteed preserved by edit/[index].tsx
    modifiedAt: Date.now(),
  };
  reloadedVault.passwords[0] = editedItem;
  await saveVault(reloadedVault, vaultKey);

  // 4. Reload after edit: totpSecret must still be intact and identical
  const postEditVault = await decryptVaultWithKey(vaultKey);
  assert.strictEqual(postEditVault.passwords[0].password, 'NewChangedPassword2026#');
  assert.strictEqual(postEditVault.passwords[0].totpSecret, originalSecret);
  assert.strictEqual(getTOTPCode(postEditVault.passwords[0].totpSecret, 1700000000), generatedCode);

  // 5. Verify Backup export and restore preserves totpSecret
  const backupCiphertext = await encryptBackupData(postEditVault, 'BackupPass123!');
  const restoredBackup = await decryptBackupData(backupCiphertext, 'BackupPass123!');
  assert.strictEqual(restoredBackup.passwords.length, 1);
  assert.strictEqual(restoredBackup.passwords[0].totpSecret, originalSecret);
});
