package com.chiranth7.vaultx.qrscanner

import android.app.Activity
import android.content.Intent
import android.view.WindowManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class VaultXQrScannerModule : Module() {
  private var pendingPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("VaultXQrScanner")

    AsyncFunction("scanQrCodeAsync") { promise: Promise ->
      if (pendingPromise != null) {
        promise.reject("ERR_SCANNER_BUSY", "QR scanner is already active.", null)
        return@AsyncFunction
      }

      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject(Exceptions.MissingActivity())
        return@AsyncFunction
      }

      pendingPromise = promise
      val isSecure = (activity.window.attributes.flags and WindowManager.LayoutParams.FLAG_SECURE) != 0
      val intent = Intent(activity, QrScannerActivity::class.java).apply {
        putExtra(QrScannerActivity.EXTRA_FLAG_SECURE, isSecure)
      }
      activity.startActivityForResult(intent, SCAN_QR_REQUEST_CODE)
    }

    OnActivityResult { _, (requestCode, resultCode, data) ->
      if (requestCode != SCAN_QR_REQUEST_CODE) return@OnActivityResult
      val promise = pendingPromise ?: return@OnActivityResult
      pendingPromise = null

      if (resultCode == Activity.RESULT_OK) {
        promise.resolve(data?.getStringExtra(QrScannerActivity.EXTRA_QR_RESULT))
        return@OnActivityResult
      }

      val errorCode = data?.getStringExtra(QrScannerActivity.EXTRA_QR_ERROR)
      when (errorCode) {
        "CAMERA_PERMISSION_DENIED" ->
          promise.reject("ERR_CAMERA_PERMISSION", "Camera permission is required to scan 2FA QR codes.", null)
        null ->
          promise.resolve(null)
        else ->
          promise.reject("ERR_SCANNER_FAILED", errorCode, null)
      }
    }
  }

  companion object {
    private const val SCAN_QR_REQUEST_CODE = 7824
  }
}
