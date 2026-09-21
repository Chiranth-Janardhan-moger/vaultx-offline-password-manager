import CryptoJS from 'crypto-js';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32tohex(base32: string): string {
  const clean = base32.replace(/\s+/g, '').replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let val = 0;
  let hex = '';
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) throw new Error(`Invalid base32 char: ${clean[i]}`);
    val = (val << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      hex += ((val >> bits) & 0xff).toString(16).padStart(2, '0');
    }
  }
  return hex;
}

export function getTOTPCode(secret: string): string {
  if (!secret) return '------';
  try {
    const hexSecret = base32tohex(secret);
    const epoch = Math.round(new Date().getTime() / 1000.0);
    const time = Math.floor(epoch / 30).toString(16).padStart(16, '0');

    const key = CryptoJS.enc.Hex.parse(hexSecret);
    const msg = CryptoJS.enc.Hex.parse(time);

    const hmac = CryptoJS.HmacSHA1(msg, key).toString(CryptoJS.enc.Hex);

    const offset = parseInt(hmac.substring(hmac.length - 1), 16) * 2;
    let otp = ((parseInt(hmac.substr(offset, 8), 16) & 0x7fffffff) + '');
    
    // Ensure 6 digits
    otp = otp.substring(otp.length - 6).padStart(6, '0');
    return otp;
  } catch (error) {
    // Return placeholder on invalid base32 secret
    return '000000';
  }
}

export function getTOTPDetails(secret: string) {
  const epoch = Math.round(new Date().getTime() / 1000.0);
  const remainingSeconds = 30 - (epoch % 30);
  const code = getTOTPCode(secret);
  return { code, remainingSeconds };
}
