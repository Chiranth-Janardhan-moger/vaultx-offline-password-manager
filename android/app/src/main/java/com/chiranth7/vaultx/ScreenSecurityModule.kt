package com.chiranth7.vaultx

import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class ScreenSecurityModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "ScreenSecurity"
    }

    @ReactMethod
    fun setScreenshotBlocking(block: Boolean, promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity != null) {
                activity.runOnUiThread {
                    if (block) {
                        // Block screenshots, screen recording, and screen sharing
                        activity.window.setFlags(
                            WindowManager.LayoutParams.FLAG_SECURE,
                            WindowManager.LayoutParams.FLAG_SECURE
                        )
                    } else {
                        // Allow screenshots only (screen recording and sharing still blocked by system)
                        activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                    }
                }
                promise.resolve(true)
            } else {
                promise.reject("NO_ACTIVITY", "Activity not available")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun isScreenshotBlocked(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity != null) {
                val flags = activity.window.attributes.flags
                val isBlocked = (flags and WindowManager.LayoutParams.FLAG_SECURE) != 0
                promise.resolve(isBlocked)
            } else {
                promise.reject("NO_ACTIVITY", "Activity not available")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
