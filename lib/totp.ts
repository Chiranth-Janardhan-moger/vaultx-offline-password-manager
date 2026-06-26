import CryptoJS from 'crypto-js';

function base32tohex(base32: string): string {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  let hex = "";

  const cleanBase32 = base32.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();

  for (let i = 0; i < cleanBase32.length; i++) {
    const val = base32chars.indexOf(cleanBase32.charAt(i));
    if (val === -1) {
      throw new Error("Invalid base32 character: " + cleanBase32.charAt(i));
    }
    bits += val.toString(2).padStart(5, '0');
  }

  for (let i = 0; i + 4 <= bits.length; i += 4) {
    const chunk = bits.substr(i, 4);
    hex += parseInt(chunk, 2).toString(16);
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
