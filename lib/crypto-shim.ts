import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

const polyfillGetRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
  if (array) {
    try {
      Crypto.getRandomValues(array as any);
    } catch {
      throw new Error('Cryptographically secure PRNG is unavailable in this environment');
    }
  }
  return array;
};

// Polyfill global crypto.getRandomValues for standard compatibility in React Native Hermes
if (typeof globalThis.crypto !== 'object' || globalThis.crypto === null) {
  (globalThis as any).crypto = {};
}
(globalThis as any).crypto.getRandomValues = polyfillGetRandomValues;

if (typeof global !== 'undefined') {
  if (typeof (global as any).crypto !== 'object' || (global as any).crypto === null) {
    (global as any).crypto = (globalThis as any).crypto;
  } else {
    (global as any).crypto.getRandomValues = polyfillGetRandomValues;
  }
}

export const getRandomBytes = (byteCount: number): Uint8Array => {
  const array = new Uint8Array(byteCount);
  try {
    if (typeof (globalThis as any).crypto?.getRandomValues === 'function') {
      (globalThis as any).crypto.getRandomValues(array);
      return array;
    }
  } catch {}

  try {
    Crypto.getRandomValues(array);
    return array;
  } catch {}

  // Fail closed if cryptographically secure PRNG is unavailable
  throw new Error('Cryptographically secure PRNG is unavailable in this environment');
};

export const getRandomHex = (byteCount: number): string => {
  const bytes = getRandomBytes(byteCount);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const getRandomWordArray = (byteCount: number) => {
  const hex = getRandomHex(byteCount);
  return CryptoJS.enc.Hex.parse(hex);
};

// Directly patch CryptoJS.lib.WordArray.random so that internal CryptoJS functions
// (such as salt/IV generation during CryptoJS.AES.encrypt for backups) use our secure generator
// instead of throwing "Native crypto module could not be used to get secure random number."
try {
  (CryptoJS.lib.WordArray as any).random = function (nBytes: number) {
    return getRandomWordArray(nBytes);
  };
} catch {}
