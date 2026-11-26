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
      error:
        'This is a Google Authenticator batch export QR code. Use "Import from Google Authenticator" in Settings -> Backup & Restore to import all accounts at once.',
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

export interface MigrationAccount {
  secret: string;
  service: string;
  username: string;
  warning?: string;
}

export type GoogleAuthMigrationResult =
  | {
      ok: true;
      accounts: MigrationAccount[];
      skippedHotp: number;
      batchSize?: number;
      batchIndex?: number;
    }
  | { ok: false; error: string };

function bytesToBase32(bytes: Uint8Array): string {
  let bits = 0;
  let val = 0;
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    val = (val << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += BASE32_ALPHABET[(val >> bits) & 31];
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(val << (5 - bits)) & 31];
  }
  return out;
}

function base64ToBytes(b64: string): Uint8Array | null {
  try {
    const normalized = b64.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
    if (!normalized) return null;
    const padLen = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLen);
    const wa = CryptoJS.enc.Base64.parse(padded);
    if (!wa || wa.sigBytes <= 0) return null;
    const bytes = new Uint8Array(wa.sigBytes);
    for (let i = 0; i < wa.sigBytes; i++) {
      bytes[i] = (wa.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    return bytes;
  } catch {
    return null;
  }
}

function decodeUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]);
  }
  return s;
}

function readVarint(buf: Uint8Array, start: number): { value: number; next: number } | null {
  let value = 0;
  let multiplier = 1;
  let idx = start;
  for (let i = 0; i < 8; i++) {
    if (idx >= buf.length) return null;
    const byte = buf[idx++];
    value += (byte & 0x7f) * multiplier;
    if ((byte & 0x80) === 0) {
      return { value, next: idx };
    }
    multiplier *= 128;
  }
  return null;
}

function skipProtoField(buf: Uint8Array, offset: number, wireType: number): number | null {
  if (wireType === 0) {
    const v = readVarint(buf, offset);
    return v ? v.next : null;
  }
  if (wireType === 1) {
    return offset + 8 <= buf.length ? offset + 8 : null;
  }
  if (wireType === 2) {
    const len = readVarint(buf, offset);
    if (!len || len.next + len.value > buf.length) return null;
    return len.next + len.value;
  }
  if (wireType === 5) {
    return offset + 4 <= buf.length ? offset + 4 : null;
  }
  return null;
}

function parseOtpParametersProto(buf: Uint8Array): {
  secretBytes?: Uint8Array;
  name?: string;
  issuer?: string;
  algorithm?: number;
  digits?: number;
  type?: number;
} | null {
  const out: {
    secretBytes?: Uint8Array;
    name?: string;
    issuer?: string;
    algorithm?: number;
    digits?: number;
    type?: number;
  } = {};

  let offset = 0;
  while (offset < buf.length) {
    const tag = readVarint(buf, offset);
    if (!tag) return null;
    offset = tag.next;
    const fieldNum = tag.value >>> 3;
    const wireType = tag.value & 0x07;

    if (wireType === 2 && (fieldNum === 1 || fieldNum === 2 || fieldNum === 3)) {
      const len = readVarint(buf, offset);
      if (!len || len.next + len.value > buf.length) return null;
      const slice = buf.subarray(len.next, len.next + len.value);
      offset = len.next + len.value;
      if (fieldNum === 1) out.secretBytes = slice;
      else if (fieldNum === 2) out.name = decodeUtf8(slice);
      else if (fieldNum === 3) out.issuer = decodeUtf8(slice);
    } else if (wireType === 0 && (fieldNum === 4 || fieldNum === 5 || fieldNum === 6)) {
      const val = readVarint(buf, offset);
      if (!val) return null;
      offset = val.next;
      if (fieldNum === 4) out.algorithm = val.value;
      else if (fieldNum === 5) out.digits = val.value;
      else if (fieldNum === 6) out.type = val.value;
    } else {
      const next = skipProtoField(buf, offset, wireType);
      if (next === null) return null;
      offset = next;
    }
  }
  return out;
}

/**
 * Parses a Google Authenticator `otpauth-migration://offline?data=...` QR URI offline.
 */
export function parseGoogleAuthMigrationUri(raw: string): GoogleAuthMigrationResult {
  const input = (raw ?? '').trim();
  if (!input.toLowerCase().startsWith('otpauth-migration://')) {
    return { ok: false, error: 'Not a Google Authenticator export QR code.' };
  }

  const qIdx = input.indexOf('?');
  const rawQuery = qIdx === -1 ? '' : input.slice(qIdx + 1);
  let dataParam = '';
  for (const pair of rawQuery.split('&')) {
    if (!pair) continue;
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).toLowerCase();
    if (key === 'data') {
      dataParam = safeDecodeURIComponent(pair.slice(eqIdx + 1));
      break;
    }
  }

  if (!dataParam) {
    return { ok: false, error: 'Google Authenticator export QR code is missing account data.' };
  }

  const payload = base64ToBytes(dataParam);
  if (!payload) {
    return { ok: false, error: 'Could not decode Google Authenticator export payload.' };
  }

  const accounts: MigrationAccount[] = [];
  let skippedHotp = 0;
  let batchSize: number | undefined;
  let batchIndex: number | undefined;

  let offset = 0;
  while (offset < payload.length) {
    const tag = readVarint(payload, offset);
    if (!tag) {
      return { ok: false, error: 'Malformed Google Authenticator export data.' };
    }
    offset = tag.next;
    const fieldNum = tag.value >>> 3;
    const wireType = tag.value & 0x07;

    if (fieldNum === 1 && wireType === 2) {
      const len = readVarint(payload, offset);
      if (!len || len.next + len.value > payload.length) {
        return { ok: false, error: 'Malformed Google Authenticator export entry.' };
      }
      const entryBytes = payload.subarray(len.next, len.next + len.value);
      offset = len.next + len.value;

      const parsed = parseOtpParametersProto(entryBytes);
      if (!parsed) {
        return { ok: false, error: 'Malformed Google Authenticator account entry.' };
      }

      // Google Authenticator OtpType: 1 = HOTP, 2 = TOTP (0 = unspecified, treat as TOTP if secret exists)
      if (parsed.type === 1) {
        skippedHotp++;
        continue;
      }

      if (!parsed.secretBytes || parsed.secretBytes.length === 0) continue;
      const secret = normalizeAndValidateSecret(bytesToBase32(parsed.secretBytes));
      if (!secret) continue;

      const rawName = (parsed.name ?? '').trim();
      let labelIssuer = '';
      let account = '';
      const colonIdx = rawName.indexOf(':');
      if (colonIdx !== -1) {
        labelIssuer = rawName.slice(0, colonIdx).trim();
        account = rawName.slice(colonIdx + 1).trim();
      } else {
        account = rawName;
      }

      const service = (parsed.issuer ?? '').trim() || labelIssuer || account || 'Imported 2FA';
      const username = account || service;

      const warnings: string[] = [];
      if (parsed.algorithm && parsed.algorithm !== 1) warnings.push('non-SHA1 algorithm');
      if (parsed.digits && parsed.digits !== 1) warnings.push('8-digit code');

      accounts.push({
        secret,
        service,
        username,
        ...(warnings.length > 0 ? { warning: warnings.join(', ') } : {}),
      });
    } else if (wireType === 0 && (fieldNum === 3 || fieldNum === 4)) {
      const val = readVarint(payload, offset);
      if (!val) return { ok: false, error: 'Malformed Google Authenticator batch metadata.' };
      offset = val.next;
      if (fieldNum === 3) batchSize = val.value;
      else if (fieldNum === 4) batchIndex = val.value;
    } else {
      const next = skipProtoField(payload, offset, wireType);
      if (next === null) {
        return { ok: false, error: 'Malformed Google Authenticator export payload.' };
      }
      offset = next;
    }
  }

  if (accounts.length === 0) {
    return {
      ok: false,
      error:
        skippedHotp > 0
          ? 'Only counter-based (HOTP) accounts were found. VaultX supports time-based (TOTP) accounts.'
          : 'No valid 2FA accounts were found in this Google Authenticator QR code.',
    };
  }

  return {
    ok: true,
    accounts,
    skippedHotp,
    ...(batchSize !== undefined ? { batchSize } : {}),
    ...(batchIndex !== undefined ? { batchIndex } : {}),
  };
}

export type AuthenticatorFileFormat = 'aegis' | '2fas' | 'otpauth-list';

export type AuthenticatorFileParseResult =
  | {
      ok: true;
      format: AuthenticatorFileFormat;
      accounts: MigrationAccount[];
      skippedHotp: number;
    }
  | { ok: false; error: string };

/**
 * Parses an exported 2FA file from Aegis (unencrypted JSON), 2FAS (.2fas JSON),
 * or Ente Auth / plain-text `otpauth://totp/...` URI lists.
 */
export function parseAuthenticatorExportFile(rawContent: string): AuthenticatorFileParseResult {
  const content = (rawContent ?? '').trim();
  if (!content) {
    return { ok: false, error: 'The selected file is empty.' };
  }

  const accounts: MigrationAccount[] = [];
  let skippedHotp = 0;

  if (content.startsWith('{') || content.startsWith('[')) {
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { ok: false, error: 'Invalid JSON file. Could not parse authenticator export.' };
    }

    // Encrypted Aegis vault check
    if (parsed?.header?.slots && typeof parsed?.db === 'string') {
      return {
        ok: false,
        error: 'Encrypted Aegis exports are not supported. Export as plain-text JSON in Aegis.',
      };
    }

    // 1. Aegis unencrypted JSON (db.entries)
    if (Array.isArray(parsed?.db?.entries)) {
      for (const entry of parsed.db.entries) {
        const type = String(entry?.type ?? '').toLowerCase();
        if (type === 'hotp') {
          skippedHotp++;
          continue;
        }
        if (type && type !== 'totp') continue;

        const secret = normalizeAndValidateSecret(entry?.info?.secret);
        if (!secret) continue;

        const issuer = String(entry?.issuer ?? '').trim();
        const name = String(entry?.name ?? '').trim();
        const service = issuer || name || 'Imported 2FA';
        const username = name || service;
        accounts.push({ secret, service, username });
      }

      if (accounts.length === 0) {
        return {
          ok: false,
          error:
            skippedHotp > 0
              ? 'Only counter-based (HOTP) entries were found. VaultX supports TOTP accounts.'
              : 'No valid TOTP accounts were found in this Aegis export.',
        };
      }
      return { ok: true, format: 'aegis', accounts, skippedHotp };
    }

    // 2. 2FAS export (.2fas / JSON with services array)
    if (Array.isArray(parsed?.services)) {
      for (const svc of parsed.services) {
        const tokenType = String(svc?.otp?.tokenType ?? 'TOTP').toUpperCase();
        if (tokenType === 'HOTP') {
          skippedHotp++;
          continue;
        }
        if (tokenType && tokenType !== 'TOTP') continue;

        const secret = normalizeAndValidateSecret(svc?.secret);
        if (!secret) continue;

        const issuer = String(svc?.otp?.issuer ?? '').trim();
        const name = String(svc?.name ?? '').trim();
        const account = String(svc?.otp?.account ?? svc?.otp?.label ?? '').trim();
        const service = issuer || name || account || 'Imported 2FA';
        const username = account || name || service;
        accounts.push({ secret, service, username });
      }

      if (accounts.length === 0) {
        return {
          ok: false,
          error:
            skippedHotp > 0
              ? 'Only counter-based (HOTP) entries were found. VaultX supports TOTP accounts.'
              : 'No valid TOTP accounts were found in this 2FAS export.',
        };
      }
      return { ok: true, format: '2fas', accounts, skippedHotp };
    }

    return {
      ok: false,
      error: 'Unsupported JSON format. Expected an unencrypted Aegis or 2FAS export file.',
    };
  }

  // 3. Ente Auth / plain-text list of otpauth://totp/... URIs
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.toLowerCase().startsWith('otpauth://hotp/')) {
      skippedHotp++;
      continue;
    }
    if (!line.toLowerCase().startsWith('otpauth://totp/')) continue;

    const res = parseOtpAuthUri(line);
    if (!res.ok) continue;
    const service = res.issuer || res.account || 'Imported 2FA';
    const username = res.account || service;
    accounts.push({
      secret: res.secret,
      service,
      username,
      ...(res.warning ? { warning: res.warning } : {}),
    });
  }

  if (accounts.length === 0) {
    return {
      ok: false,
      error:
        skippedHotp > 0
          ? 'Only counter-based (HOTP) entries were found. VaultX supports TOTP accounts.'
          : 'No valid 2FA accounts found. Select an Aegis (.json), 2FAS (.2fas), or Ente Auth (.txt) export.',
    };
  }

  return { ok: true, format: 'otpauth-list', accounts, skippedHotp };
}
