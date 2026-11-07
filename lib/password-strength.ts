import { getRandomBytes } from './crypto-shim';

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';

export interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number; // 0-100
  feedback: string;
  color: string;
}

export interface GeneratePasswordOptions {
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
}

const UPPERCASE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE_CHARS = 'abcdefghijkmnopqrstuvwxyz';
const NUMBER_CHARS = '23456789';
const SYMBOL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

export const generateSecurePassword = (
  length = 16,
  options: GeneratePasswordOptions = { uppercase: true, lowercase: true, numbers: true, symbols: true }
): string => {
  let pool = '';
  const mandatoryChars: string[] = [];

  if (options.uppercase !== false) {
    pool += UPPERCASE_CHARS;
    const b = getRandomBytes(1);
    mandatoryChars.push(UPPERCASE_CHARS[b[0] % UPPERCASE_CHARS.length]);
  }
  if (options.lowercase !== false) {
    pool += LOWERCASE_CHARS;
    const b = getRandomBytes(1);
    mandatoryChars.push(LOWERCASE_CHARS[b[0] % LOWERCASE_CHARS.length]);
  }
  if (options.numbers !== false) {
    pool += NUMBER_CHARS;
    const b = getRandomBytes(1);
    mandatoryChars.push(NUMBER_CHARS[b[0] % NUMBER_CHARS.length]);
  }
  if (options.symbols !== false) {
    pool += SYMBOL_CHARS;
    const b = getRandomBytes(1);
    mandatoryChars.push(SYMBOL_CHARS[b[0] % SYMBOL_CHARS.length]);
  }

  if (!pool) {
    pool = LOWERCASE_CHARS + NUMBER_CHARS;
  }

  const remainingLength = Math.max(0, length - mandatoryChars.length);
  const randomBytes = getRandomBytes(remainingLength);
  const chars: string[] = [...mandatoryChars];
  for (let i = 0; i < remainingLength; i++) {
    chars.push(pool[randomBytes[i] % pool.length]);
  }

  const shuffleBytes = getRandomBytes(chars.length);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  return chars.join('');
};

export const checkPasswordStrength = (password: string): PasswordStrengthResult => {
  if (!password) {
    return { strength: 'weak', score: 0, feedback: 'Password is required', color: '#ef4444' };
  }

  let score = Math.min(password.length * 4, 40);
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/\d/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  if (/(.)\1{2,}/.test(password)) score -= 15;

  score = Math.max(0, Math.min(100, score));

  if (score < 40) return { strength: 'weak', score, feedback: 'Weak - add more characters', color: '#ef4444' };
  if (score < 60) return { strength: 'fair', score, feedback: 'Fair - consider adding symbols', color: '#f97316' };
  if (score < 80) return { strength: 'good', score, feedback: 'Good - strong password', color: '#eab308' };
  if (score < 95) return { strength: 'strong', score, feedback: 'Strong - good password', color: '#22c55e' };
  return { strength: 'very-strong', score, feedback: 'Very strong - excellent!', color: '#10b981' };
};

export const getStrengthLabel = (strength: PasswordStrength): string => {
  const map: Record<PasswordStrength, string> = {
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong',
    'very-strong': 'Very Strong',
  };
  return map[strength] || 'Weak';
};
