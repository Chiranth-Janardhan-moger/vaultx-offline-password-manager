import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

// Polyfill global crypto.getRandomValues for standard compatibility in React Native Hermes
if (typeof globalThis.crypto !== 'object' || globalThis.crypto === null) {
  (globalThis as any).crypto = {};
}

if (typeof (globalThis as any).crypto.getRandomValues !== 'function') {
  (globalThis as any).crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
    if (array) {
      try {
        Crypto.getRandomValues(array as any);
      } catch {
        const u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
        for (let i = 0; i < u8.length; i++) {
          u8[i] = Math.floor(Math.random() * 256);
        }
      }
    }
    return array;
  };
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

  // Safe fallback if native module is not ready
  for (let i = 0; i < byteCount; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
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
