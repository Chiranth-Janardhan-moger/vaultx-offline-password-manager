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

export function getTOTPCode(secret?: string | null, epochSeconds?: number): string {
  if (!secret) return '------';
  try {
    const hexSecret = base32tohex(secret);
    const epoch = typeof epochSeconds === 'number' ? epochSeconds : Math.round(new Date().getTime() / 1000.0);
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

export function getTOTPDetails(secret?: string | null, epochSeconds?: number) {
  const epoch = typeof epochSeconds === 'number' ? epochSeconds : Math.round(new Date().getTime() / 1000.0);
  const remainingSeconds = 30 - (epoch % 30);
  const code = getTOTPCode(secret, epoch);
  return { code, remainingSeconds };
}

export type OtpAuthParseResult =
  | {
      ok: true;
      secret: string;
      issuer?: string;
      account?: string;
      warning?: string;
    }
  | {
      ok: false;
      error: string;
    };

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function normalizeAndValidateSecret(rawSecret: string): string | null {
  const cleaned = rawSecret.replace(/\s+/g, '').replace(/=+$/, '').toUpperCase();
  if (cleaned.length < 8 || !/^[A-Z2-7]+$/.test(cleaned)) {
    return null;
  }
  try {
    base32tohex(cleaned);
    return cleaned;
  } catch {
    return null;
  }
}

/**
 * Parses an otpauth://totp/... QR URI (or raw Base32 secret string) into a validated TOTP secret.
 */
export function parseOtpAuthUri(raw: string): OtpAuthParseResult {
  const input = (raw ?? '').trim();
  if (!input) {
    return { ok: false, error: 'Scanned QR code is empty.' };
  }

  const lower = input.toLowerCase();
  if (lower.startsWith('otpauth-migration://')) {
    return {
      ok: false,
      error: 'Google Authenticator batch export QR codes are not supported. Scan an individual account 2FA QR code.',
    };
  }

  if (lower.startsWith('otpauth://')) {
    const schemeRemoved = input.slice('otpauth://'.length);
    const slashIdx = schemeRemoved.indexOf('/');
    const type = (slashIdx === -1 ? schemeRemoved : schemeRemoved.slice(0, slashIdx)).toLowerCase();

    if (type === 'hotp') {
      return {
        ok: false,
        error: 'Counter-based (HOTP) 2FA codes are not supported. Only time-based (TOTP) codes are supported.',
      };
    }
    if (type !== 'totp') {
      return {
        ok: false,
        error: 'Unsupported 2FA QR code format. Expected a TOTP authenticator URI.',
      };
    }

    const rest = slashIdx === -1 ? '' : schemeRemoved.slice(slashIdx + 1);
    const qIdx = rest.indexOf('?');
    const rawLabel = qIdx === -1 ? rest : rest.slice(0, qIdx);
    const rawQuery = qIdx === -1 ? '' : rest.slice(qIdx + 1);

    const decodedLabel = safeDecodeURIComponent(rawLabel).trim();
    let labelIssuer: string | undefined;
    let account: string | undefined;
    const colonIdx = decodedLabel.indexOf(':');
    if (colonIdx !== -1) {
      const left = decodedLabel.slice(0, colonIdx).trim();
      const right = decodedLabel.slice(colonIdx + 1).trim();
      if (left) labelIssuer = left;
      if (right) account = right;
    } else if (decodedLabel) {
      account = decodedLabel;
    }

    const params: Record<string, string> = {};
    if (rawQuery) {
      for (const pair of rawQuery.split('&')) {
        if (!pair) continue;
        const eqIdx = pair.indexOf('=');
        const key = (eqIdx === -1 ? pair : pair.slice(0, eqIdx)).toLowerCase();
        const val = eqIdx === -1 ? '' : safeDecodeURIComponent(pair.slice(eqIdx + 1));
        params[key] = val;
      }
    }

    if (!params.secret) {
      return { ok: false, error: 'The scanned 2FA QR code does not contain a secret key.' };
    }

    const secret = normalizeAndValidateSecret(params.secret);
    if (!secret) {
      return { ok: false, error: 'The scanned 2FA QR code contains an invalid Base32 secret key.' };
    }

    const issuer = params.issuer?.trim() || labelIssuer;
    const nonStandardParts: string[] = [];
    if (params.algorithm && params.algorithm.trim().toUpperCase() !== 'SHA1') {
      nonStandardParts.push(`algorithm=${params.algorithm.trim().toUpperCase()}`);
    }
    if (params.digits && params.digits.trim() !== '6') {
      nonStandardParts.push(`digits=${params.digits.trim()}`);
    }
    if (params.period && params.period.trim() !== '30') {
      nonStandardParts.push(`period=${params.period.trim()}s`);
    }

    const warning =
      nonStandardParts.length > 0
        ? `This QR code specifies ${nonStandardParts.join(', ')}. VaultX generates standard 6-digit, 30s SHA1 codes.`
        : undefined;

    return {
      ok: true,
      secret,
      ...(issuer ? { issuer } : {}),
      ...(account ? { account } : {}),
      ...(warning ? { warning } : {}),
    };
  }

  const rawSecret = normalizeAndValidateSecret(input);
  if (rawSecret) {
    return { ok: true, secret: rawSecret };
  }

  return {
    ok: false,
    error: 'Invalid 2FA QR code. No valid TOTP secret key was found.',
  };
}
