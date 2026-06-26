import CryptoJS from 'crypto-js';

/**
 * Deterministic password generator
 * Same inputs = same password, always
 */
export function generateDeterministicPassword(
  service: string,
  username: string,
  masterPassword: string
): string {
  // Normalize inputs
  const normalizedService = service.trim().toLowerCase();
  const normalizedUsername = username.trim().toLowerCase();
  
  // Create unique seed from service + username + master password
  const seed = `${normalizedService}:${normalizedUsername}:${masterPassword}`;
  
  // Generate hash using SHA-256
  const hash = CryptoJS.SHA256(seed).toString(CryptoJS.enc.Hex);
  
  // Convert hash to password with required character types
  const password = hashToPassword(hash);
  
  return password;
}

function hashToPassword(hash: string): string {
  // Character sets
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I, O for clarity
  const lowercase = 'abcdefghijkmnopqrstuvwxyz'; // Removed l for clarity
  const numbers = '23456789'; // Removed 0, 1 for clarity
  const symbols = '!@#$%^&*';
  
  // Use different parts of hash for different character types
  let password = '';
  
  // Add 4 uppercase letters
  for (let i = 0; i < 4; i++) {
    const start = i * 2;
    const index = parseInt(hash.slice(start, start + 2), 16) % uppercase.length;
    password += uppercase[index];
  }
  
  // Add 4 lowercase letters
  for (let i = 4; i < 8; i++) {
    const start = i * 2;
    const index = parseInt(hash.slice(start, start + 2), 16) % lowercase.length;
    password += lowercase[index];
  }
  
  // Add 3 numbers
  for (let i = 8; i < 11; i++) {
    const start = i * 2;
    const index = parseInt(hash.slice(start, start + 2), 16) % numbers.length;
    password += numbers[index];
  }
  
  // Add 2 symbols
  for (let i = 11; i < 13; i++) {
    const start = i * 2;
    const index = parseInt(hash.slice(start, start + 2), 16) % symbols.length;
    password += symbols[index];
  }
  
  // Shuffle password deterministically using hash
  password = shuffleString(password, hash);
  
  // Return 16 character password
  return password.substring(0, 16);
}

function shuffleString(str: string, seed: string): string {
  const arr = str.split('');
  
  for (let i = arr.length - 1; i > 0; i--) {
    // Use seed to generate deterministic random index
    const start = (i * 3) % seed.length;
    const seedValue = parseInt(seed.slice(start, start + 4), 16);
    const j = seedValue % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  
  return arr.join('');
}
