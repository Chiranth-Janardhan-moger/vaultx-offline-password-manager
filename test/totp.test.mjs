import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTOTPCode,
  getTOTPDetails,
  parseAuthenticatorExportFile,
  parseGoogleAuthMigrationUri,
  parseOtpAuthUri,
} from '../lib/totp.ts';

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

test('TOTP - parseOtpAuthUri extracts secrets, issuer, account, and rejects invalid QR formats', () => {
  // 1. Standard otpauth://totp URI with URL encoding and spaces/lowercase
  const standard = parseOtpAuthUri(
    'otpauth://totp/GitHub%3Aalice%40example.com?secret=jbsw%20y3dp%20ehpk%203pxp%3D%3D&issuer=GitHub&algorithm=SHA1&digits=6&period=30'
  );
  assert.strictEqual(standard.ok, true);
  assert.strictEqual(standard.secret, 'JBSWY3DPEHPK3PXP');
  assert.strictEqual(standard.issuer, 'GitHub');
  assert.strictEqual(standard.account, 'alice@example.com');
  assert.strictEqual(standard.warning, undefined);

  // 2. Fallback issuer extraction from label prefix when issuer query param omitted
  const labelOnly = parseOtpAuthUri('otpauth://totp/Proton:dev@proton.me?secret=GEZDGNBVGY3TQOJQ');
  assert.strictEqual(labelOnly.ok, true);
  assert.strictEqual(labelOnly.secret, 'GEZDGNBVGY3TQOJQ');
  assert.strictEqual(labelOnly.issuer, 'Proton');
  assert.strictEqual(labelOnly.account, 'dev@proton.me');

  // 3. Non-standard parameters emit a clear warning while preserving secret
  const customParams = parseOtpAuthUri('otpauth://totp/Bank?secret=JBSWY3DPEHPK3PXP&digits=8&period=60');
  assert.strictEqual(customParams.ok, true);
  assert.strictEqual(customParams.secret, 'JBSWY3DPEHPK3PXP');
  assert.ok(customParams.warning?.includes('digits=8'));
  assert.ok(customParams.warning?.includes('period=60s'));

  // 4. Raw Base32 secret string accepted cleanly
  const bare = parseOtpAuthUri('  jbsw y3dp ehpk 3pxp== ');
  assert.strictEqual(bare.ok, true);
  assert.strictEqual(bare.secret, 'JBSWY3DPEHPK3PXP');

  // 5. Rejects HOTP, Google batch export, random URLs, missing/invalid secrets
  const hotp = parseOtpAuthUri('otpauth://hotp/Test?secret=JBSWY3DPEHPK3PXP&counter=1');
  assert.strictEqual(hotp.ok, false);
  assert.ok(hotp.error.includes('HOTP'));

  const migration = parseOtpAuthUri('otpauth-migration://offline?data=abc');
  assert.strictEqual(migration.ok, false);
  assert.ok(migration.error.includes('batch export'));

  const url = parseOtpAuthUri('https://example.com/2fa');
  assert.strictEqual(url.ok, false);

  const missingSecret = parseOtpAuthUri('otpauth://totp/Test?issuer=Test');
  assert.strictEqual(missingSecret.ok, false);

  const badBase32 = parseOtpAuthUri('otpauth://totp/Test?secret=INVALID9999');
  assert.strictEqual(badBase32.ok, false);
});

test('TOTP - parseGoogleAuthMigrationUri decodes batch export protobuf and skips HOTP', () => {
  const encodeVarint = (n) => {
    const out = [];
    let v = n;
    while (v >= 0x80) {
      out.push((v & 0x7f) | 0x80);
      v = Math.floor(v / 128);
    }
    out.push(v);
    return out;
  };
  const lenField = (fieldNum, bytes) => [
    ...encodeVarint((fieldNum << 3) | 2),
    ...encodeVarint(bytes.length),
    ...bytes,
  ];
  const varintField = (fieldNum, val) => [
    ...encodeVarint((fieldNum << 3) | 0),
    ...encodeVarint(val),
  ];
  const utf8 = (s) => Array.from(Buffer.from(s, 'utf8'));

  // Entry 1: TOTP GitHub (secret "1234567890" -> Base32 GEZDGNBVGY3TQOJQ)
  const entry1 = [
    ...lenField(1, utf8('1234567890')),
    ...lenField(2, utf8('GitHub:alice@example.com')),
    ...lenField(3, utf8('GitHub')),
    ...varintField(4, 1), // SHA1
    ...varintField(5, 1), // 6 digits
    ...varintField(6, 2), // TOTP
  ];
  // Entry 2: TOTP Proton with label-only issuer (secret "ABCDEFGHIJ" -> Base32 IFBEGRCFIZDUQSKK)
  const entry2 = [
    ...lenField(1, utf8('ABCDEFGHIJ')),
    ...lenField(2, utf8('Proton:bob@proton.me')),
    ...varintField(6, 2), // TOTP
  ];
  // Entry 3: HOTP (should be skipped)
  const entry3 = [
    ...lenField(1, utf8('1234567890')),
    ...lenField(2, utf8('Legacy:hotp@example.com')),
    ...varintField(6, 1), // HOTP
  ];

  const payload = Buffer.from([
    ...lenField(1, entry1),
    ...lenField(1, entry2),
    ...lenField(1, entry3),
    ...varintField(2, 1), // version
    ...varintField(3, 2), // batch_size
    ...varintField(4, 0), // batch_index
  ]);

  const uri = `otpauth-migration://offline?data=${encodeURIComponent(payload.toString('base64'))}`;
  const res = parseGoogleAuthMigrationUri(uri);

  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.accounts.length, 2);
  assert.strictEqual(res.skippedHotp, 1);
  assert.strictEqual(res.batchSize, 2);
  assert.strictEqual(res.batchIndex, 0);

  assert.strictEqual(res.accounts[0].service, 'GitHub');
  assert.strictEqual(res.accounts[0].username, 'alice@example.com');
  assert.strictEqual(res.accounts[0].secret, 'GEZDGNBVGY3TQOJQ');
  assert.strictEqual(getTOTPCode(res.accounts[0].secret).length, 6);

  assert.strictEqual(res.accounts[1].service, 'Proton');
  assert.strictEqual(res.accounts[1].username, 'bob@proton.me');
  assert.strictEqual(res.accounts[1].secret, 'IFBEGRCFIZDUQSKK');

  // Rejects non-migration, missing data, and truncated payloads
  assert.strictEqual(parseGoogleAuthMigrationUri('otpauth://totp/Test?secret=GEZDGNBVGY3TQOJQ').ok, false);
  assert.strictEqual(parseGoogleAuthMigrationUri('otpauth-migration://offline').ok, false);
  assert.strictEqual(parseGoogleAuthMigrationUri('otpauth-migration://offline?data=!!!').ok, false);
});

test('TOTP - parseAuthenticatorExportFile supports Aegis, 2FAS, and Ente Auth formats', () => {
  // 1. Aegis unencrypted JSON
  const aegisJson = JSON.stringify({
    version: 1,
    db: {
      entries: [
        { type: 'totp', name: 'alice@github.com', issuer: 'GitHub', info: { secret: 'jbswy3dp ehpk3pxp' } },
        { type: 'hotp', name: 'counter@old.com', issuer: 'Old', info: { secret: 'GEZDGNBVGY3TQOJQ' } },
      ],
    },
  });
  const aegisRes = parseAuthenticatorExportFile(aegisJson);
  assert.strictEqual(aegisRes.ok, true);
  assert.strictEqual(aegisRes.format, 'aegis');
  assert.strictEqual(aegisRes.accounts.length, 1);
  assert.strictEqual(aegisRes.skippedHotp, 1);
  assert.strictEqual(aegisRes.accounts[0].service, 'GitHub');
  assert.strictEqual(aegisRes.accounts[0].username, 'alice@github.com');
  assert.strictEqual(aegisRes.accounts[0].secret, 'JBSWY3DPEHPK3PXP');

  // Rejects encrypted Aegis JSON cleanly
  const encryptedAegis = JSON.stringify({ header: { slots: [{}] }, db: 'encryptedBase64String' });
  const encRes = parseAuthenticatorExportFile(encryptedAegis);
  assert.strictEqual(encRes.ok, false);
  assert.ok(encRes.error.includes('Encrypted Aegis'));

  // 2. 2FAS export JSON
  const twoFasJson = JSON.stringify({
    services: [
      { name: 'Discord', secret: 'GEZDGNBVGY3TQOJQ', otp: { issuer: 'Discord', account: 'me@discord.gg', tokenType: 'TOTP' } },
      { name: 'HOTPApp', secret: 'JBSWY3DPEHPK3PXP', otp: { tokenType: 'HOTP' } },
    ],
  });
  const twoFasRes = parseAuthenticatorExportFile(twoFasJson);
  assert.strictEqual(twoFasRes.ok, true);
  assert.strictEqual(twoFasRes.format, '2fas');
  assert.strictEqual(twoFasRes.accounts.length, 1);
  assert.strictEqual(twoFasRes.skippedHotp, 1);
  assert.strictEqual(twoFasRes.accounts[0].service, 'Discord');
  assert.strictEqual(twoFasRes.accounts[0].username, 'me@discord.gg');
  assert.strictEqual(twoFasRes.accounts[0].secret, 'GEZDGNBVGY3TQOJQ');

  // 3. Ente Auth / plain-text otpauth:// URI list
  const enteTxt = [
    '# Ente Auth export',
    'otpauth://totp/Cloudflare:ops@site.io?secret=JBSWY3DPEHPK3PXP&issuer=Cloudflare',
    'otpauth://hotp/Counter:a@b.com?secret=GEZDGNBVGY3TQOJQ&counter=1',
  ].join('\n');
  const enteRes = parseAuthenticatorExportFile(enteTxt);
  assert.strictEqual(enteRes.ok, true);
  assert.strictEqual(enteRes.format, 'otpauth-list');
  assert.strictEqual(enteRes.accounts.length, 1);
  assert.strictEqual(enteRes.skippedHotp, 1);
  assert.strictEqual(enteRes.accounts[0].service, 'Cloudflare');
  assert.strictEqual(enteRes.accounts[0].username, 'ops@site.io');
  assert.strictEqual(enteRes.accounts[0].secret, 'JBSWY3DPEHPK3PXP');

  // Rejects empty / unknown files
  assert.strictEqual(parseAuthenticatorExportFile('').ok, false);
  assert.strictEqual(parseAuthenticatorExportFile('{"random": true}').ok, false);
});
