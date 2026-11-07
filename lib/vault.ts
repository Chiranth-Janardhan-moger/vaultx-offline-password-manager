import CryptoJS from 'crypto-js';
import * as FileSystem from 'expo-file-system/legacy';
import { type CategoryType } from './categories';
import { getRandomHex, getRandomWordArray } from './crypto-shim';
import { pbkdf2Key } from './secure';

export type PasswordItem = {
  service: string;
  username: string;
  password: string;
  notes?: string;
  category?: CategoryType;
  loginPin?: string;
  transactionPin?: string;
  otherPin?: string; // JSON string of array: [{label: string, pin: string}] (custom fields / additional PINs)
  createdAt?: number; // Unix timestamp
  modifiedAt?: number; // Unix timestamp
  isFavorite?: boolean; // Star/pin for quick access
  folder?: string; // Custom folder category
  workspace?: string; // Workspace space (e.g. 'Personal', 'Work')
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
  workspace?: string; // Workspace space (e.g. 'Personal', 'Work')
};

export type VaultData = {
  user: {
    email?: string;
    phone?: string;
    passwordHash: string;
    passwordSaltHex?: string;
  };
  passwords: PasswordItem[];
  cards?: CardItem[];
  customTags?: string[];
  deletedCategories?: string[];
  categoryOverrides?: { [categoryId: string]: string };
  customSpaces?: string[];
};

export const DEFAULT_WORKSPACES = ['Personal', 'Work'] as const;

export const getEffectiveWorkspaces = (vault?: VaultData | null): string[] => {
  const custom = vault?.customSpaces || [];
  const list: string[] = [...DEFAULT_WORKSPACES];
  for (const s of custom) {
    if (!list.includes(s)) list.push(s);
  }
  return list;
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

export const hashPasswordAsync = async (pw: string, saltHex?: string): Promise<string> => {
  if (!saltHex) {
    return CryptoJS.SHA256(pw).toString(CryptoJS.enc.Hex);
  }
  return pbkdf2Key(pw, saltHex, 100000);
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
  password: string,
  vaultKey: string,
  saltHex?: string,
  emailOrPhone?: { email?: string; phone?: string } | string
): Promise<VaultData> => {
  const passwordSaltHex = saltHex || generateSaltHex();
  let email: string | undefined;
  let phone: string | undefined;
  if (typeof emailOrPhone === 'object' && emailOrPhone !== null) {
    email = emailOrPhone.email;
    phone = emailOrPhone.phone;
  } else if (typeof emailOrPhone === 'string') {
    phone = emailOrPhone;
  }
  const passwordHash = await hashPasswordAsync(password, passwordSaltHex);
  const data: VaultData = {
    user: {
      email,
      phone,
      passwordHash,
      passwordSaltHex,
    },
    passwords: [],
    cards: [],
    customTags: [],
  };
  await saveEncryptedVault(data, vaultKey);
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

export const encryptBackupData = async (
  backupData: { passwords: PasswordItem[]; cards?: CardItem[] },
  passphrase: string
): Promise<string> => {
  const saltHex = getRandomHex(16);
  const ivWordArray = getRandomWordArray(16);
  const iterations = 100_000;

  const derivedKeyHex = await pbkdf2Key(passphrase, saltHex, iterations);
  const derivedKey = CryptoJS.enc.Hex.parse(derivedKeyHex);

  const hmacKeyHex = await pbkdf2Key(passphrase, saltHex, 10_000);
  const hmacKey = CryptoJS.enc.Hex.parse(hmacKeyHex);

  const plaintext = JSON.stringify(backupData);
  const encrypted = CryptoJS.AES.encrypt(plaintext, derivedKey, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const ciphertext = encrypted.toString();
  const ivHex = ivWordArray.toString(CryptoJS.enc.Hex);
  const hmac = CryptoJS.HmacSHA256(ciphertext + ivHex, hmacKey).toString();

  const container = {
    version: '2.1',
    timestamp: Date.now(),
    salt: saltHex,
    iv: ivHex,
    iterations,
    ciphertext,
    hmac,
  };

  return JSON.stringify(container);
};

export const decryptBackupData = async (
  backupJsonOrObj: string | any,
  passphrase: string
): Promise<{ passwords: PasswordItem[]; cards: CardItem[] }> => {
  const container = typeof backupJsonOrObj === 'string' ? JSON.parse(backupJsonOrObj) : backupJsonOrObj;

  // New hardened format (v2.1)
  if (container.version === '2.1' || (container.salt && container.ciphertext && container.iv)) {
    const saltHex = container.salt;
    const iterations = container.iterations || 100_000;
    const iv = CryptoJS.enc.Hex.parse(container.iv);

    if (container.hmac) {
      const hmacKeyHex = await pbkdf2Key(passphrase, saltHex, 10_000);
      const hmacKey = CryptoJS.enc.Hex.parse(hmacKeyHex);
      const expectedHmac = CryptoJS.HmacSHA256(container.ciphertext + container.iv, hmacKey).toString();
      if (expectedHmac !== container.hmac) {
        throw new Error('Incorrect backup password');
      }
    }

    const derivedKeyHex = await pbkdf2Key(passphrase, saltHex, iterations);
    const derivedKey = CryptoJS.enc.Hex.parse(derivedKeyHex);

    const decrypted = CryptoJS.AES.decrypt(container.ciphertext, derivedKey, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) {
      throw new Error('Incorrect backup password');
    }

    const parsed = JSON.parse(decryptedText);
    return {
      passwords: parsed.passwords || [],
      cards: parsed.cards || [],
    };
  }

  // Legacy format (v2.0: passwords property encrypted with CryptoJS string passphrase)
  if (container.passwords) {
    const decrypted = CryptoJS.AES.decrypt(container.passwords, passphrase).toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      throw new Error('Incorrect backup password');
    }
    const parsed = JSON.parse(decrypted);
    return {
      passwords: parsed.passwords || [],
      cards: parsed.cards || [],
    };
  }

  throw new Error('Unrecognized backup format');
};
