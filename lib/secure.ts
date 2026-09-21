import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { getRandomHex, getRandomWordArray } from './crypto-shim';

const KEYS = {
  meta: 'vault_meta_v1',
  wrapPassword: 'vault_wrap_password_v1',
  wrapPin: 'vault_wrap_pin_v1',
  wrapRecovery: 'vault_wrap_recovery_v1',
  bioKey: 'vault_key_bio_v1',
  bioEnabled: 'vault_bio_enabled_v1',
};

const DEFAULT_PBKDF2_ITERATIONS = 100000;
const LEGACY_PBKDF2_ITERATIONS = 1000;

export type WrapRecord = {
  saltHex: string;
  wrappedKey: string;
  iterations?: number;
};

export type RecoveryRecord = {
  questions: string[];
  saltHex: string;
  wrappedKey: string;
  iterations?: number;
};

export type VaultMeta = {
  phone: string;
  passwordHash: string;
  passwordSaltHex?: string;
};

const pbkdf2Key = (secret: string, saltHex: string, iterations = DEFAULT_PBKDF2_ITERATIONS) => {
  const salt = CryptoJS.enc.Hex.parse(saltHex);
  const key = CryptoJS.PBKDF2(secret, salt, {
    keySize: 256 / 32,
    iterations,
    hasher: iterations === LEGACY_PBKDF2_ITERATIONS ? CryptoJS.algo.SHA1 : CryptoJS.algo.SHA256,
  });
  return key.toString(CryptoJS.enc.Hex);
};

const aesWrap = (plaintext: string, derivedKeyHex: string) => {
  const key = CryptoJS.enc.Hex.parse(derivedKeyHex);
  const iv = getRandomWordArray(16);
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return `${iv.toString(CryptoJS.enc.Hex)}:${encrypted.toString()}`;
};

const aesUnwrap = (ciphertext: string, derivedKeyHex: string) => {
  try {
    if (ciphertext.includes(':')) {
      const [ivHex, ...rest] = ciphertext.split(':');
      const actualCiphertext = rest.join(':');
      const key = CryptoJS.enc.Hex.parse(derivedKeyHex);
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      const bytes = CryptoJS.AES.decrypt(actualCiphertext, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted || !/^[0-9a-fA-F]{32,}$/.test(decrypted.trim())) {
        throw new Error('Decryption failed - invalid key or padding');
      }
      return decrypted.trim();
    }

    // Legacy fallback (OpenSSL EVP_BytesToKey)
    const bytes = CryptoJS.AES.decrypt(ciphertext, derivedKeyHex);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted || !/^[0-9a-fA-F]{32,}$/.test(decrypted.trim())) {
      throw new Error('Decryption failed - empty result');
    }
    return decrypted.trim();
  } catch {
    throw new Error('Decryption failed - incorrect key or corrupted data');
  }
};

const randomSaltHex = async () => {
  return getRandomHex(16);
};

export const generateVaultKey = async () => {
  return getRandomHex(32);
};

export const saveMeta = async (meta: VaultMeta) => {
  await SecureStore.setItemAsync(KEYS.meta, JSON.stringify(meta));
};

export const loadMeta = async (): Promise<VaultMeta | null> => {
  const raw = await SecureStore.getItemAsync(KEYS.meta);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VaultMeta;
  } catch {
    return null;
  }
};

export const hasPasswordUnlock = async () => !!(await SecureStore.getItemAsync(KEYS.wrapPassword));

export const hasPinUnlock = async () => !!(await SecureStore.getItemAsync(KEYS.wrapPin));

export const hasRecovery = async () => !!(await SecureStore.getItemAsync(KEYS.wrapRecovery));

export const savePasswordWrap = async (vaultKey: string, password: string) => {
  const saltHex = await randomSaltHex();
  const derived = pbkdf2Key(password, saltHex, DEFAULT_PBKDF2_ITERATIONS);
  const wrappedKey = aesWrap(vaultKey, derived);
  const rec: WrapRecord = { saltHex, wrappedKey, iterations: DEFAULT_PBKDF2_ITERATIONS };
  await SecureStore.setItemAsync(KEYS.wrapPassword, JSON.stringify(rec));
};

export const unwrapWithPassword = async (password: string) => {
  const raw = await SecureStore.getItemAsync(KEYS.wrapPassword);
  if (!raw) throw new Error('Password unlock not configured');
  const rec = JSON.parse(raw) as WrapRecord;
  const iterations = rec.iterations || LEGACY_PBKDF2_ITERATIONS;
  const derived = pbkdf2Key(password, rec.saltHex, iterations);
  let vaultKey: string | null = null;
  try {
    vaultKey = aesUnwrap(rec.wrappedKey, derived);
  } catch {
    if (!rec.iterations) {
      const modernDerived = pbkdf2Key(password, rec.saltHex, DEFAULT_PBKDF2_ITERATIONS);
      try {
        vaultKey = aesUnwrap(rec.wrappedKey, modernDerived);
      } catch {
        vaultKey = null;
      }
    }
  }
  if (!vaultKey) throw new Error('Incorrect password');

  if (!rec.iterations || rec.iterations < DEFAULT_PBKDF2_ITERATIONS || !rec.wrappedKey.includes(':')) {
    savePasswordWrap(vaultKey, password).catch(() => {});
  }

  return vaultKey;
};

export const savePinWrap = async (vaultKey: string, pin6: string) => {
  const saltHex = await randomSaltHex();
  const derived = pbkdf2Key(pin6, saltHex, DEFAULT_PBKDF2_ITERATIONS);
  const wrappedKey = aesWrap(vaultKey, derived);
  const rec: WrapRecord = { saltHex, wrappedKey, iterations: DEFAULT_PBKDF2_ITERATIONS };
  await SecureStore.setItemAsync(KEYS.wrapPin, JSON.stringify(rec));
};

export const unwrapWithPin = async (pin6: string) => {
  const raw = await SecureStore.getItemAsync(KEYS.wrapPin);
  if (!raw) throw new Error('PIN unlock not configured');
  const rec = JSON.parse(raw) as WrapRecord;
  const iterations = rec.iterations || LEGACY_PBKDF2_ITERATIONS;
  const derived = pbkdf2Key(pin6, rec.saltHex, iterations);
  let vaultKey: string | null = null;
  try {
    vaultKey = aesUnwrap(rec.wrappedKey, derived);
  } catch {
    if (!rec.iterations) {
      const modernDerived = pbkdf2Key(pin6, rec.saltHex, DEFAULT_PBKDF2_ITERATIONS);
      try {
        vaultKey = aesUnwrap(rec.wrappedKey, modernDerived);
      } catch {
        vaultKey = null;
      }
    }
  }
  if (!vaultKey) throw new Error('Incorrect PIN');

  if (!rec.iterations || rec.iterations < DEFAULT_PBKDF2_ITERATIONS || !rec.wrappedKey.includes(':')) {
    savePinWrap(vaultKey, pin6).catch(() => {});
  }

  return vaultKey;
};

const normalizeAnswers = (answers: string[]) =>
  answers
    .map((a) => (a ?? '').trim().toLowerCase().replace(/\s+/g, ''))
    .join('|');

const normalizeAnswersLegacy = (answers: string[]) => answers.map((a) => (a ?? '').trim().toLowerCase()).join('|');

export const saveRecoveryWrap = async (vaultKey: string, questions: string[], answers: string[]) => {
  if (questions.length !== answers.length) throw new Error('Invalid recovery setup');
  const saltHex = await randomSaltHex();
  const secret = normalizeAnswers(answers);
  const derived = pbkdf2Key(secret, saltHex, DEFAULT_PBKDF2_ITERATIONS);
  const wrappedKey = aesWrap(vaultKey, derived);
  const rec: RecoveryRecord = { questions, saltHex, wrappedKey, iterations: DEFAULT_PBKDF2_ITERATIONS };
  await SecureStore.setItemAsync(KEYS.wrapRecovery, JSON.stringify(rec));
};

export const loadRecoveryQuestions = async () => {
  const raw = await SecureStore.getItemAsync(KEYS.wrapRecovery);
  if (!raw) return null;
  try {
    const rec = JSON.parse(raw) as RecoveryRecord;
    return rec.questions;
  } catch {
    return null;
  }
};

export const unwrapWithRecovery = async (answers: string[]) => {
  const raw = await SecureStore.getItemAsync(KEYS.wrapRecovery);
  if (!raw) throw new Error('Recovery not configured');
  const rec = JSON.parse(raw) as RecoveryRecord;
  const iterations = rec.iterations || LEGACY_PBKDF2_ITERATIONS;
  
  // Try current normalization (no spaces)
  const secret = normalizeAnswers(answers);
  let derived = pbkdf2Key(secret, rec.saltHex, iterations);
  let vaultKey: string | null = null;
  try {
    vaultKey = aesUnwrap(rec.wrappedKey, derived);
  } catch {
    if (!rec.iterations) {
      try {
        vaultKey = aesUnwrap(rec.wrappedKey, pbkdf2Key(secret, rec.saltHex, DEFAULT_PBKDF2_ITERATIONS));
      } catch {
        vaultKey = null;
      }
    }
  }
  if (vaultKey) {
    if (!rec.iterations || rec.iterations < DEFAULT_PBKDF2_ITERATIONS || !rec.wrappedKey.includes(':')) {
      saveRecoveryWrap(vaultKey, rec.questions, answers).catch(() => {});
    }
    return vaultKey;
  }

  // Try legacy normalization (with spaces)
  const legacySecret = normalizeAnswersLegacy(answers);
  derived = pbkdf2Key(legacySecret, rec.saltHex, iterations);
  try {
    vaultKey = aesUnwrap(rec.wrappedKey, derived);
  } catch {
    if (!rec.iterations) {
      try {
        vaultKey = aesUnwrap(rec.wrappedKey, pbkdf2Key(legacySecret, rec.saltHex, DEFAULT_PBKDF2_ITERATIONS));
      } catch {
        vaultKey = null;
      }
    }
  }
  if (vaultKey) {
    if (!rec.iterations || rec.iterations < DEFAULT_PBKDF2_ITERATIONS || !rec.wrappedKey.includes(':')) {
      saveRecoveryWrap(vaultKey, rec.questions, answers).catch(() => {});
    }
    return vaultKey;
  }
  
  throw new Error('Incorrect answer');
};

export const setBiometricEnabled = async (enabled: boolean) => {
  await SecureStore.setItemAsync(KEYS.bioEnabled, enabled ? '1' : '0');
};

export const isBiometricEnabled = async () => {
  const v = await SecureStore.getItemAsync(KEYS.bioEnabled);
  return v === '1';
};

export const saveBiometricKey = async (vaultKey: string) => {
  try {
    await SecureStore.setItemAsync(KEYS.bioKey, vaultKey);
    await setBiometricEnabled(true);
  } catch (error) {
    console.error('Failed to setup biometric authentication:', error);
    throw new Error('Failed to setup biometric authentication');
  }
};

export const loadBiometricKey = async () => {
  // This will be called after biometric authentication succeeds
  const v = await SecureStore.getItemAsync(KEYS.bioKey);
  if (!v) throw new Error('Biometric unlock not available');
  return v;
};

export const clearAllSecure = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.meta),
    SecureStore.deleteItemAsync(KEYS.wrapPassword),
    SecureStore.deleteItemAsync(KEYS.wrapPin),
    SecureStore.deleteItemAsync(KEYS.wrapRecovery),
    SecureStore.deleteItemAsync(KEYS.bioKey),
    SecureStore.deleteItemAsync(KEYS.bioEnabled),
  ]);
};
