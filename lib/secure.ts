import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { NativeModules } from 'react-native';
import { getRandomHex, getRandomWordArray } from './crypto-shim';

const NativeCrypto = (NativeModules as any)?.NativeCrypto;

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
  email?: string;
  phone?: string;
  passwordHash: string;
  passwordSaltHex?: string;
};

export const pbkdf2Key = async (secret: string, saltHex: string, iterations = DEFAULT_PBKDF2_ITERATIONS): Promise<string> => {
  if (NativeCrypto && typeof NativeCrypto.pbkdf2 === 'function') {
    try {
      const hasher = iterations === LEGACY_PBKDF2_ITERATIONS ? 'sha1' : 'sha256';
      const keyHex = await NativeCrypto.pbkdf2(secret, saltHex, iterations, 256, hasher);
      if (keyHex && typeof keyHex === 'string') {
        return keyHex;
      }
    } catch {
      // Fallback to JS implementation
    }
  }

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

export const hasRecovery = async () => !!(await SecureStore.getItemAsync(KEYS.wrapRecovery));

export const savePasswordWrap = async (vaultKey: string, password: string) => {
  const saltHex = await randomSaltHex();
  const derived = await pbkdf2Key(password, saltHex, DEFAULT_PBKDF2_ITERATIONS);
  const wrappedKey = aesWrap(vaultKey, derived);
  const rec: WrapRecord = { saltHex, wrappedKey, iterations: DEFAULT_PBKDF2_ITERATIONS };
  await SecureStore.setItemAsync(KEYS.wrapPassword, JSON.stringify(rec));
};

export const unwrapWithPassword = async (password: string) => {
  const raw = await SecureStore.getItemAsync(KEYS.wrapPassword);
  if (!raw) throw new Error('Password unlock not configured');
  const rec = JSON.parse(raw) as WrapRecord;
  const iterations = rec.iterations || LEGACY_PBKDF2_ITERATIONS;
  const derived = await pbkdf2Key(password, rec.saltHex, iterations);
  let vaultKey: string | null = null;
  try {
    vaultKey = aesUnwrap(rec.wrappedKey, derived);
  } catch {
    if (!rec.iterations) {
      const modernDerived = await pbkdf2Key(password, rec.saltHex, DEFAULT_PBKDF2_ITERATIONS);
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

const normalizeAnswers = (answers: string[]) =>
  answers
    .map((a) => (a ?? '').trim().toLowerCase().replace(/\s+/g, ''))
    .join('|');

const normalizeAnswersLegacy = (answers: string[]) => answers.map((a) => (a ?? '').trim().toLowerCase()).join('|');

export const saveRecoveryWrap = async (vaultKey: string, questions: string[], answers: string[]) => {
  if (questions.length !== answers.length) throw new Error('Invalid recovery setup');
  const saltHex = await randomSaltHex();
  const secret = normalizeAnswers(answers);
  const derived = await pbkdf2Key(secret, saltHex, DEFAULT_PBKDF2_ITERATIONS);
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
  let derived = await pbkdf2Key(secret, rec.saltHex, iterations);
  let vaultKey: string | null = null;
  try {
    vaultKey = aesUnwrap(rec.wrappedKey, derived);
  } catch {
    if (!rec.iterations) {
      try {
        const modernDerived = await pbkdf2Key(secret, rec.saltHex, DEFAULT_PBKDF2_ITERATIONS);
        vaultKey = aesUnwrap(rec.wrappedKey, modernDerived);
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
  derived = await pbkdf2Key(legacySecret, rec.saltHex, iterations);
  try {
    vaultKey = aesUnwrap(rec.wrappedKey, derived);
  } catch {
    if (!rec.iterations) {
      try {
        const modernDerived = await pbkdf2Key(legacySecret, rec.saltHex, DEFAULT_PBKDF2_ITERATIONS);
        vaultKey = aesUnwrap(rec.wrappedKey, modernDerived);
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
    await SecureStore.setItemAsync(KEYS.bioKey, vaultKey, {
      requireAuthentication: true,
      authenticationPrompt: 'Authenticate to enable biometric unlock',
    });
    await setBiometricEnabled(true);
  } catch (error) {
    console.error('Failed to setup biometric authentication:', error);
    throw new Error('Failed to setup biometric authentication');
  }
};

export const loadBiometricKey = async () => {
  // Enforces hardware KeyStore cryptographic authentication signature
  const v = await SecureStore.getItemAsync(KEYS.bioKey, {
    requireAuthentication: true,
    authenticationPrompt: 'Unlock VaultX',
  });
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
    SecureStore.deleteItemAsync(LOCKOUT_KEY),
  ]);
};

export const LOCKOUT_KEY = 'vaultx_lockout_state_v1';

export type LockoutState = {
  failedAttempts: number;
  lockedUntil: number; // Unix timestamp in ms
};

export const getLockoutState = async (): Promise<LockoutState> => {
  try {
    const raw = await SecureStore.getItemAsync(LOCKOUT_KEY);
    if (!raw) return { failedAttempts: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw);
    const lockedUntil = typeof parsed.lockedUntil === 'number' ? parsed.lockedUntil : 0;
    const failedAttempts = typeof parsed.failedAttempts === 'number' ? parsed.failedAttempts : 0;
    return { failedAttempts, lockedUntil };
  } catch {
    return { failedAttempts: 0, lockedUntil: 0 };
  }
};

export const recordFailedAttempt = async (
  maxAttempts = 5,
  lockoutDurationMs = 30000
): Promise<LockoutState> => {
  const current = await getLockoutState();
  const now = Date.now();
  let attempts = current.failedAttempts + 1;
  let lockedUntil = current.lockedUntil;

  if (attempts >= maxAttempts) {
    lockedUntil = now + lockoutDurationMs;
    attempts = 0;
  }

  const newState: LockoutState = { failedAttempts: attempts, lockedUntil };
  try {
    await SecureStore.setItemAsync(LOCKOUT_KEY, JSON.stringify(newState));
  } catch (e) {
    console.error('Failed to persist lockout state:', e);
  }
  return newState;
};

export const clearLockoutState = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(LOCKOUT_KEY);
  } catch {}
};

export const SELECT_WORKSPACE_ON_LOGIN_KEY = 'vaultx_select_workspace_on_login';

export const isSelectWorkspaceOnLoginEnabled = async (): Promise<boolean> => {
  try {
    const v = await SecureStore.getItemAsync(SELECT_WORKSPACE_ON_LOGIN_KEY);
    return v === '1' || v === 'true';
  } catch {
    return false;
  }
};

export const setSelectWorkspaceOnLoginEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await SecureStore.setItemAsync(SELECT_WORKSPACE_ON_LOGIN_KEY, enabled ? '1' : '0');
  } catch (error) {
    console.error('Failed to update select workspace on login setting:', error);
  }
};
