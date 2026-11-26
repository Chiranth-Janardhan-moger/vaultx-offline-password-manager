import { requireOptionalNativeModule } from 'expo-modules-core';

type NativeQrScannerModule = {
  scanQrCodeAsync: () => Promise<string | null>;
};

const NativeScanner = requireOptionalNativeModule<NativeQrScannerModule>('VaultXQrScanner');

/**
 * Launches the native offline FOSS (CameraX + ZXing) QR scanner and resolves with
 * the scanned string, or null if the user cancelled.
 */
export async function scanQrCodeAsync(): Promise<string | null> {
  if (!NativeScanner || typeof NativeScanner.scanQrCodeAsync !== 'function') {
    throw new Error('QR scanner native module is unavailable. Please rebuild the app.');
  }
  return NativeScanner.scanQrCodeAsync();
}
