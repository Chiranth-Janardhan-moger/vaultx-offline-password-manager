import { scanQrCodeAsync } from '../modules/vaultx-qr-scanner';
import { parseOtpAuthUri, type OtpAuthParseResult } from './totp';

export type ScanTotpOutcome =
  | { status: 'cancelled' }
  | { status: 'error'; title: string; message: string }
  | { status: 'success'; parsed: Extract<OtpAuthParseResult, { ok: true }> };

/**
 * Launches the native offline QR scanner while suppressing background auto-lock,
 * then parses and validates the scanned TOTP URI or Base32 secret.
 */
export async function scanTotpQrCode(
  runWithBackgroundLockSuppressed: <T>(fn: () => Promise<T>) => Promise<T>
): Promise<ScanTotpOutcome> {
  try {
    const raw = await runWithBackgroundLockSuppressed(() => scanQrCodeAsync());
    if (raw === null || raw === undefined) {
      return { status: 'cancelled' };
    }

    const parsed = parseOtpAuthUri(raw);
    if (!parsed.ok) {
      return { status: 'error', title: 'Invalid 2FA QR Code', message: parsed.error };
    }

    return { status: 'success', parsed };
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
