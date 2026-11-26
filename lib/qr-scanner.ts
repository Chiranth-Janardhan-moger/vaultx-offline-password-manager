import { scanQrCodeAsync } from '../modules/vaultx-qr-scanner';
import {
  parseGoogleAuthMigrationUri,
  parseOtpAuthUri,
  type GoogleAuthMigrationResult,
  type OtpAuthParseResult,
} from './totp';

export type ScanTotpOutcome =
  | { status: 'cancelled' }
  | { status: 'error'; title: string; message: string }
  | { status: 'success'; parsed: Extract<OtpAuthParseResult, { ok: true }> };

export type ScanMigrationOutcome =
  | { status: 'cancelled' }
  | { status: 'error'; title: string; message: string }
  | { status: 'success'; parsed: Extract<GoogleAuthMigrationResult, { ok: true }> };

async function scanAndParseQr<T extends { ok: true } | { ok: false; error: string }>(
  runWithBackgroundLockSuppressed: <R>(fn: () => Promise<R>) => Promise<R>,
  parser: (raw: string) => T,
  invalidTitle: string
): Promise<
  | { status: 'cancelled' }
  | { status: 'error'; title: string; message: string }
  | { status: 'success'; parsed: Extract<T, { ok: true }> }
> {
  try {
    const raw = await runWithBackgroundLockSuppressed(() => scanQrCodeAsync());
    if (raw === null || raw === undefined) {
      return { status: 'cancelled' };
    }

    const parsed = parser(raw);
    if (!parsed.ok) {
      return { status: 'error', title: invalidTitle, message: parsed.error };
    }

    return { status: 'success', parsed: parsed as Extract<T, { ok: true }> };
  } catch (err: any) {
    const code = err?.code;
    if (code === 'ERR_CAMERA_PERMISSION') {
      return {
        status: 'error',
        title: 'Camera Permission Needed',
        message: 'Please allow camera access in Android Settings to scan 2FA QR codes.',
      };
    }
    return {
      status: 'error',
      title: 'Scanner Error',
      message: err?.message ?? 'Unable to scan QR code. You can still paste the 2FA secret manually.',
    };
  }
}

/**
 * Launches the native offline QR scanner while suppressing background auto-lock,
 * then parses and validates the scanned TOTP URI or Base32 secret.
 */
export function scanTotpQrCode(
  runWithBackgroundLockSuppressed: <T>(fn: () => Promise<T>) => Promise<T>
): Promise<ScanTotpOutcome> {
  return scanAndParseQr(runWithBackgroundLockSuppressed, parseOtpAuthUri, 'Invalid 2FA QR Code');
}

/**
 * Launches the native offline QR scanner while suppressing background auto-lock,
 * then decodes a Google Authenticator `otpauth-migration://` batch export QR code.
 */
export function scanGoogleAuthMigrationQrCode(
  runWithBackgroundLockSuppressed: <T>(fn: () => Promise<T>) => Promise<T>
): Promise<ScanMigrationOutcome> {
  return scanAndParseQr(
    runWithBackgroundLockSuppressed,
    parseGoogleAuthMigrationUri,
    'Invalid Google Authenticator QR'
  );
}
