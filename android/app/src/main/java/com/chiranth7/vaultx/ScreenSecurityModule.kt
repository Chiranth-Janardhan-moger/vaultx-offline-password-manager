package com.chiranth7.vaultx

import android.app.Activity
import android.view.WindowManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ScreenSecurityModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "ScreenSecurity"

    @ReactMethod
    fun setScreenshotBlocking(block: Boolean, promise: Promise) {
        val activity: Activity? = reactContext.currentActivity
        if (activity == null) {
            promise.resolve(false)
            return
        }
        activity.runOnUiThread {
            try {
                if (block) {
                    activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                } else {
                    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_SCREEN_SECURITY", e.message)
            }
        }
    }

    @ReactMethod
    fun isScreenshotBlocked(promise: Promise) {
        val activity: Activity? = reactContext.currentActivity
        if (activity == null) {
            promise.resolve(false)
            return
        }
        val flags = activity.window.attributes.flags
        val isBlocked = (flags and WindowManager.LayoutParams.FLAG_SECURE) != 0
        promise.resolve(isBlocked)
    }
}
