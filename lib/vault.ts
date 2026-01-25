import CryptoJS from 'crypto-js';
import * as FileSystem from 'expo-file-system/legacy';
import { type CategoryType } from './categories';

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
};

export type VaultData = {
  user: {
    phone: string;
    passwordHash: string;
  };
  passwords: PasswordItem[];
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

export const hashPassword = (pw: string) => CryptoJS.SHA256(pw).toString(CryptoJS.enc.Hex);

const encryptText = (plaintext: string, key: string) => CryptoJS.AES.encrypt(plaintext, key).toString();

const decryptText = (ciphertext: string, key: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      throw new Error('Decryption failed - empty result');
    }
    return decrypted;
  } catch (error) {
    console.error('Vault decrypt error:', error);
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

export const createNewVault = async (phone: string, password: string, vaultKey: string): Promise<VaultData> => {
  const data: VaultData = {
    user: { phone, passwordHash: hashPassword(password) },
    passwords: [],
  };
  await saveEncryptedVault(data, vaultKey);
  return data;
};

export const unlockLegacyVaultWithPassword = async (password: string): Promise<VaultData> => {
  const encrypted = await readEncryptedString();
  const decrypted = decryptText(encrypted, password);
  if (!decrypted) throw new Error('Incorrect password');
  const data = JSON.parse(decrypted) as VaultData;
  if (!data?.user?.passwordHash || hashPassword(password) !== data.user.passwordHash) {
    throw new Error('Incorrect password');
  }
  return data;
};

export const decryptVaultWithKey = async (vaultKey: string): Promise<VaultData> => {
  const encrypted = await readEncryptedString();
  const decrypted = decryptText(encrypted, vaultKey);
  if (!decrypted) throw new Error('Unable to decrypt vault');
  const data = JSON.parse(decrypted) as VaultData;
  if (!data?.user?.passwordHash) throw new Error('Corrupted vault');
  return data;
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
