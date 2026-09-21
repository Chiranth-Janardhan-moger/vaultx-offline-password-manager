import crypto from 'node:crypto';

export function getRandomValues(typedArray) {
  const bytes = crypto.randomBytes(typedArray.byteLength);
  typedArray.set(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  return typedArray;
}

export function getRandomBytes(byteCount) {
  return new Uint8Array(crypto.randomBytes(byteCount));
}

export async function getRandomBytesAsync(byteCount) {
  return new Uint8Array(crypto.randomBytes(byteCount));
}

export async function digestStringAsync(algorithm, data) {
  const hash = crypto.createHash(algorithm.toLowerCase().replace('-', ''));
  hash.update(data);
  return hash.digest('hex');
}
