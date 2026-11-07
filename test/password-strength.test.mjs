import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPasswordStrength, generateSecurePassword, getStrengthLabel } from '../lib/password-strength.ts';

test('Password Strength - Empty and Null Handling', () => {
  const result = checkPasswordStrength('');
  assert.strictEqual(result.strength, 'weak');
  assert.strictEqual(result.score, 0);
  assert.strictEqual(result.feedback, 'Password is required');
});

test('Password Strength - Weak Passwords', () => {
  const result = checkPasswordStrength('abc');
  assert.strictEqual(result.strength, 'weak');
  assert.ok(result.score < 40);
  assert.strictEqual(result.color, '#ef4444');
});

test('Password Strength - Character Type Additions', () => {
  const base = checkPasswordStrength('abcdefgh');
  const withUpper = checkPasswordStrength('abcdefgH');
  const withNumber = checkPasswordStrength('abcdefg1');
  const withSpecial = checkPasswordStrength('abcdefg!');

  assert.ok(withUpper.score > base.score);
  assert.ok(withNumber.score > base.score);
  assert.ok(withSpecial.score > base.score);
});

test('Password Strength - Repeated Characters Penalty', () => {
  const regular = checkPasswordStrength('abcdefgh123');
  const repeated = checkPasswordStrength('aaaaaefgh123');
  assert.ok(repeated.score < regular.score);
});

test('Password Strength - Very Strong Passwords', () => {
  const result = checkPasswordStrength('V@ultX#2026_Secure_Pass!');
  assert.strictEqual(result.strength, 'very-strong');
  assert.ok(result.score >= 95);
  assert.strictEqual(result.color, '#10b981');
});

test('Password Strength - Label Mapping', () => {
  assert.strictEqual(getStrengthLabel('weak'), 'Weak');
  assert.strictEqual(getStrengthLabel('fair'), 'Fair');
  assert.strictEqual(getStrengthLabel('good'), 'Good');
  assert.strictEqual(getStrengthLabel('strong'), 'Strong');
  assert.strictEqual(getStrengthLabel('very-strong'), 'Very Strong');
});

test('Password Generation - Length and Cryptographic Randomness', () => {
  const p16 = generateSecurePassword(16);
  assert.strictEqual(p16.length, 16);

  const p32 = generateSecurePassword(32);
  assert.strictEqual(p32.length, 32);

  const p64 = generateSecurePassword(64);
  assert.strictEqual(p64.length, 64);

  // Diverse character pool check
  assert.match(p32, /[A-Z]/);
  assert.match(p32, /[a-z]/);
  assert.match(p32, /[0-9]/);

  // Strength check
  const strength = checkPasswordStrength(p16);
  assert.ok(strength.strength === 'strong' || strength.strength === 'very-strong');
});

test('Password Generation - Custom Option Constraints', () => {
  const numbersOnly = generateSecurePassword(12, { uppercase: false, lowercase: false, numbers: true, symbols: false });
  assert.strictEqual(numbersOnly.length, 12);
  assert.match(numbersOnly, /^[0-9]+$/);
});
