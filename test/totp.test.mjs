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

test('TOTP - Valid Base32 Secret Code Generation', () => {
  // Standard test secret (Base32 representation of "12345678901234567890")
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  const code = getTOTPCode(secret);
  
  assert.strictEqual(typeof code, 'string');
  assert.strictEqual(code.length, 6);
  assert.match(code, /^[0-9]{6}$/);
});

test('TOTP - Whitespace and Padding Tolerant', () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const code1 = getTOTPCode(secret);
  const code2 = getTOTPCode('  jbsw y3dp ehpk 3pxp==  ');
  assert.strictEqual(code1, code2);
});

test('TOTP - Details Calculation (Remaining Seconds and Code)', () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const details = getTOTPDetails(secret);

  assert.strictEqual(typeof details.code, 'string');
  assert.strictEqual(details.code.length, 6);
  assert.match(details.code, /^[0-9]{6}$/);
  assert.ok(details.remainingSeconds >= 1 && details.remainingSeconds <= 30);
});
