import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPasswordStrength, getStrengthLabel } from '../lib/password-strength.ts';

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
