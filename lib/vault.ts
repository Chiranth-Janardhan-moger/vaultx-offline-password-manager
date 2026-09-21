import CryptoJS from 'crypto-js';
import * as FileSystem from 'expo-file-system/legacy';
import { type CategoryType } from './categories';
import { getRandomHex, getRandomWordArray } from './crypto-shim';

export type PasswordItem = {
  service: string;
  username: string;
  password: string;
  notes?: string;
  category?: CategoryType;
  loginPin?: string;
  transactionPin?: string;
  otherPin?: string; // JSON string of array: [{label: string, pin: string}]
  createdAt?: number; // Unix timestamp
  modifiedAt?: number; // Unix timestamp
  isFavorite?: boolean; // Star/pin for quick access
  folder?: string; // Custom folder category
  totpSecret?: string; // Base32 2FA secret key
};

export type CardField = {
  label: string;
  value: string;
  isSensitive: boolean;
};

export type CardType = 'aadhaar' | 'pan' | 'voter_id' | 'credit_card' | 'debit_card' | 'custom';

export type CardItem = {
  id: string;
  type: CardType;
  title: string;
  holderName: string;
  number: string;
  fields: CardField[];
  gradient: [string, string];
  createdAt: number;
  folder?: string; // Custom folder category
};

export type VaultData = {
  user: {
    phone: string;
    passwordHash: string;
    passwordSaltHex?: string;
  };
  passwords: PasswordItem[];
  cards?: CardItem[];
  folders?: string[]; // List of user-defined custom folders
};

const VAULT_FILENAME = 'vault_v1.enc';

export const getVaultFilePath = () => {
  const base = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory || '';
  return `${base}${VAULT_FILENAME}`;
};

export const vaultExists = async () => {
  const info = await FileSystem.getInfoAsync(getVaultFilePath());
  return !!info.exists;
};

export const generateSaltHex = (bytes = 16) => getRandomHex(bytes);

export const hashPassword = (pw: string, saltHex?: string): string => {
  if (!saltHex) {
    return CryptoJS.SHA256(pw).toString(CryptoJS.enc.Hex);
  }
  const salt = CryptoJS.enc.Hex.parse(saltHex);
  return CryptoJS.PBKDF2(pw, salt, {
    keySize: 256 / 32,
    iterations: 100000,
    hasher: CryptoJS.algo.SHA256,
  }).toString(CryptoJS.enc.Hex);
};

export const verifyPassword = (password: string, storedHash: string, saltHex?: string): boolean => {
  if (saltHex) {
    return hashPassword(password, saltHex) === storedHash;
  }
  return hashPassword(password) === storedHash;
};

const encryptText = (plaintext: string, keyHex: string) => {
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv = getRandomWordArray(16);
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return `${iv.toString(CryptoJS.enc.Hex)}:${encrypted.toString()}`;
};

const decryptText = (ciphertext: string, keyHex: string) => {
  try {
    if (ciphertext.includes(':')) {
      const [ivHex, ...rest] = ciphertext.split(':');
      const actualCiphertext = rest.join(':');
      const key = CryptoJS.enc.Hex.parse(keyHex);
      const iv = CryptoJS.enc.Hex.parse(ivHex);
      const bytes = CryptoJS.AES.decrypt(actualCiphertext, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        throw new Error('Decryption failed - invalid key or padding');
      }
      return decrypted;
    }

    // Legacy fallback (OpenSSL EVP_BytesToKey)
    const bytes = CryptoJS.AES.decrypt(ciphertext, keyHex);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      throw new Error('Decryption failed - empty result');
    }
    return decrypted;
  } catch {
    throw new Error('Unable to decrypt vault - incorrect key or corrupted data');
  }
};

export const saveEncryptedVault = async (vault: VaultData, vaultKey: string) => {
  const json = JSON.stringify(vault);
  const encrypted = encryptText(json, vaultKey);
  await FileSystem.writeAsStringAsync(getVaultFilePath(), encrypted);
};

export const readEncryptedString = async () => {
  return FileSystem.readAsStringAsync(getVaultFilePath());
};

export const createNewVault = async (
  phone: string,
  password: string,
  vaultKey: string,
  saltHex?: string
): Promise<VaultData> => {
  const passwordSaltHex = saltHex || generateSaltHex();
  const data: VaultData = {
    user: {
      phone,
      passwordHash: hashPassword(password, passwordSaltHex),
      passwordSaltHex,
    },
    passwords: [],
    cards: [],
  };
  await saveEncryptedVault(data, vaultKey);
  return data;
};

export const unlockLegacyVaultWithPassword = async (password: string): Promise<VaultData> => {
  const encrypted = await readEncryptedString();
  const decrypted = decryptText(encrypted, password);
  if (!decrypted) throw new Error('Incorrect password');
  const data = JSON.parse(decrypted) as VaultData;
  if (!data?.user?.passwordHash || !verifyPassword(password, data.user.passwordHash, data.user.passwordSaltHex)) {
    throw new Error('Incorrect password');
  }
  return data;
};

export const decryptVaultWithKey = async (vaultKey: string): Promise<VaultData> => {
  const encrypted = await readEncryptedString();
  const decrypted = decryptText(encrypted, vaultKey);
  if (!decrypted) throw new Error('Unable to decrypt vault');
  try {
    const data = JSON.parse(decrypted) as VaultData;
    if (!data?.user?.passwordHash) throw new Error('Corrupted vault');
    return data;
  } catch {
    throw new Error('Unable to decrypt vault - incorrect key or corrupted data');
  }
};

export const saveVault = async (vault: VaultData, vaultKey: string) => {
  await saveEncryptedVault(vault, vaultKey);
};

export const toCsv = (vault: VaultData) => {
  const sanitizeCell = (v: string) => {
    const s = v ?? '';
    return /^[=+\-@]/.test(s) ? `'${s}` : s;
  };

  const escape = (v: string) => '"' + sanitizeCell(v).replace(/"/g, '""') + '"';
  const header = ['service', 'username', 'password', 'notes', 'loginPin', 'transactionPin', 'otherPins'];
  const lines = [header.join(',')];
  for (const item of vault.passwords) {
    lines.push([
      escape(item.service),
      escape(item.username),
      escape(item.password),
      escape(item.notes ?? ''),
      escape(item.loginPin ?? ''),
      escape(item.transactionPin ?? ''),
      escape(item.otherPin ?? ''),
    ].join(','));
  }
  return lines.join('\n');
};
