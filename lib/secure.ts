import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  meta: 'vault_meta_v1',
  wrapPassword: 'vault_wrap_password_v1',
  wrapPin: 'vault_wrap_pin_v1',
  wrapRecovery: 'vault_wrap_recovery_v1',
  bioKey: 'vault_key_bio_v1',
  bioEnabled: 'vault_bio_enabled_v1',
};

export type WrapRecord = {
  saltHex: string;
  wrappedKey: string;
};

export type RecoveryRecord = {
  questions: string[];
  saltHex: string;
  wrappedKey: string;
};

export type VaultMeta = {
  phone: string;
  passwordHash: string;
};

const pbkdf2Key = (secret: string, saltHex: string) => {
  const salt = CryptoJS.enc.Hex.parse(saltHex);
  // Optimized for mobile - 1000 iterations for fast unlock
  const key = CryptoJS.PBKDF2(secret, salt, { keySize: 256 / 32, iterations: 1000 });
  return key.toString(CryptoJS.enc.Hex);
};

const aesWrap = (plaintext: string, derivedKeyHex: string) => CryptoJS.AES.encrypt(plaintext, derivedKeyHex).toString();

const aesUnwrap = (ciphertext: string, derivedKeyHex: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, derivedKeyHex);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      throw new Error('Decryption failed - empty result');
    }
    return decrypted;
  } catch (error) {
    console.error('AES unwrap error:', error);
    throw new Error('Decryption failed - incorrect key or corrupted data');
  }
};

const randomSaltHex = async () => {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const generateVaultKey = async () => {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
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
  const derived = pbkdf2Key(password, saltHex);
  const wrappedKey = aesWrap(vaultKey, derived);
  const rec: WrapRecord = { saltHex, wrappedKey };
  await SecureStore.setItemAsync(KEYS.wrapPassword, JSON.stringify(rec));
};

export const unwrapWithPassword = async (password: string) => {
  const raw = await SecureStore.getItemAsync(KEYS.wrapPassword);
  if (!raw) throw new Error('Password unlock not configured');
  const rec = JSON.parse(raw) as WrapRecord;
  const derived = pbkdf2Key(password, rec.saltHex);
  const vaultKey = aesUnwrap(rec.wrappedKey, derived);
  if (!vaultKey) throw new Error('Incorrect password');
  return vaultKey;
};

export const savePinWrap = async (vaultKey: string, pin6: string) => {
  const saltHex = await randomSaltHex();
  const derived = pbkdf2Key(pin6, saltHex);
  const wrappedKey = aesWrap(vaultKey, derived);
  const rec: WrapRecord = { saltHex, wrappedKey };
  await SecureStore.setItemAsync(KEYS.wrapPin, JSON.stringify(rec));
};

export const unwrapWithPin = async (pin6: string) => {
  const raw = await SecureStore.getItemAsync(KEYS.wrapPin);
  if (!raw) throw new Error('PIN unlock not configured');
  const rec = JSON.parse(raw) as WrapRecord;
  const derived = pbkdf2Key(pin6, rec.saltHex);
  const vaultKey = aesUnwrap(rec.wrappedKey, derived);
  if (!vaultKey) throw new Error('Incorrect PIN');
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
  const derived = pbkdf2Key(secret, saltHex);
  const wrappedKey = aesWrap(vaultKey, derived);
  const rec: RecoveryRecord = { questions, saltHex, wrappedKey };
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
  
  // Try current normalization (no spaces)
  const secret = normalizeAnswers(answers);
  const derived = pbkdf2Key(secret, rec.saltHex);
  const vaultKey = aesUnwrap(rec.wrappedKey, derived);
  if (vaultKey) return vaultKey;

  // Try legacy normalization (with spaces)
  const legacySecret = normalizeAnswersLegacy(answers);
  const legacyDerived = pbkdf2Key(legacySecret, rec.saltHex);
  const legacyVaultKey = aesUnwrap(rec.wrappedKey, legacyDerived);
  if (legacyVaultKey) return legacyVaultKey;
  
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
    const rnBiometrics = new (await import('react-native-biometrics')).default({
      allowDeviceCredentials: false,
    });
    
    // Create biometric key pair
    const { publicKey } = await rnBiometrics.createKeys();
    console.log('Biometric keys created:', publicKey);
    
    // Save vault key in SecureStore
    await SecureStore.setItemAsync(KEYS.bioKey, vaultKey);
    await setBiometricEnabled(true);
  } catch (error) {
    console.error('Failed to create biometric keys:', error);
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
