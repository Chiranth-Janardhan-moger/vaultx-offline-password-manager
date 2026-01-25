package com.chiranth7.vaultx

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class ClipboardMonitorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val CHANNEL_ID = "vaultx_clipboard"
    private val NOTIFICATION_ID = 1001
    private var clipboardManager: ClipboardManager? = null
    private var lastClipboardText: String = ""
    private var isMonitoring = false
    
    override fun getName(): String {
        return "ClipboardMonitor"
    }
    
    init {
        clipboardManager = reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
        createNotificationChannel()
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "VaultX Clipboard"
            val descriptionText = "Notifications for saving passwords from clipboard"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    @ReactMethod
    fun startMonitoring() {
        isMonitoring = true
        clipboardManager?.addPrimaryClipChangedListener {
            if (isMonitoring) {
                checkClipboard()
            }
        }
    }
    
    @ReactMethod
    fun stopMonitoring() {
        isMonitoring = false
    }
    
    private fun checkClipboard() {
        try {
            val clipData = clipboardManager?.primaryClip
            if (clipData != null && clipData.itemCount > 0) {
                val text = clipData.getItemAt(0).text?.toString() ?: return
                
                // Avoid duplicate notifications
                if (text == lastClipboardText || text.isEmpty()) return
                lastClipboardText = text
                
                // Check if it looks like a password (6+ chars, has letters/numbers)
                if (isLikelyPassword(text)) {
                    showNotification(text)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    private fun isLikelyPassword(text: String): Boolean {
        // Password heuristics:
        // - Length between 6 and 100 characters
        // - Contains letters or numbers
        // - Not just spaces
        // - Not a URL
        if (text.length < 6 || text.length > 100) return false
        if (text.trim().isEmpty()) return false
        if (text.startsWith("http://") || text.startsWith("https://")) return false
        if (text.contains("\n")) return false // Multi-line text
        
        val hasLetters = text.any { it.isLetter() }
        val hasDigits = text.any { it.isDigit() }
        
        return hasLetters || hasDigits
    }
    
    private fun showNotification(password: String) {
        try {
            // Create intent to open VaultX with password
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("vaultx://add?password=${Uri.encode(password)}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            
            val pendingIntent = PendingIntent.getActivity(
                reactApplicationContext,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            val notification = NotificationCompat.Builder(reactApplicationContext, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Password Detected")
                .setContentText("Tap to save to VaultX")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()
            
            notificationManager.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    @ReactMethod
    fun getClipboardText(promise: Promise) {
        try {
            val clipData = clipboardManager?.primaryClip
            if (clipData != null && clipData.itemCount > 0) {
                val text = clipData.getItemAt(0).text?.toString() ?: ""
                promise.resolve(text)
            } else {
                promise.resolve("")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
