package com.chiranth7.vaultx

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.view.View
import android.view.autofill.AutofillId
import android.view.autofill.AutofillManager
import android.view.autofill.AutofillValue
import android.app.assist.AssistStructure
import android.service.autofill.Dataset
import com.facebook.react.bridge.*

class AutofillModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AutofillModule"

    @ReactMethod
    fun isAutofillAvailable(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun isAutofillEnabled(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val autofillManager = reactApplicationContext.getSystemService(AutofillManager::class.java)
                val enabled = autofillManager?.hasEnabledAutofillServices() ?: false
                promise.resolve(enabled)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun openAutofillSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val intent = Intent(Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE)
                intent.data = android.net.Uri.parse("package:${reactApplicationContext.packageName}")
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun disableAutofill(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val autofillManager = reactApplicationContext.getSystemService(AutofillManager::class.java)
                autofillManager?.disableAutofillServices()
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun cancelAutofill(promise: Promise) {
        try {
            val activity = getCurrentActivity()
            activity?.setResult(Activity.RESULT_CANCELED)
            activity?.finish()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getAutofillIntentData(promise: Promise) {
        try {
            val activity = getCurrentActivity()
            if (activity == null) {
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("autofillMode", false)
                    putString("packageName", "")
                    putString("webDomain", "")
                })
                return
            }

            val intent = activity.getIntent()
            if (intent == null) {
                promise.resolve(Arguments.createMap().apply {
                    putBoolean("autofillMode", false)
                    putString("packageName", "")
                    putString("webDomain", "")
                })
                return
            }

            val autofillMode = intent.getBooleanExtra("autofill_mode", false)
            val packageName = intent.getStringExtra("package_name") ?: ""
            val webDomain = intent.getStringExtra("web_domain") ?: ""

            val map = Arguments.createMap().apply {
                putBoolean("autofillMode", autofillMode)
                putString("packageName", packageName)
                putString("webDomain", webDomain)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun fillCredentials(username: String, password: String, promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                promise.reject("UNSUPPORTED", "Android version not supported")
                return
            }

            val activity = getCurrentActivity()
            if (activity == null) {
                promise.reject("NO_ACTIVITY", "No current activity found")
                return
            }

            val intent = activity.getIntent()
            if (intent == null) {
                promise.reject("NO_INTENT", "No intent found on activity")
                return
            }

            val structure = intent.getParcelableExtra(AutofillManager.EXTRA_ASSIST_STRUCTURE) as? AssistStructure
            if (structure == null) {
                promise.reject("NO_STRUCTURE", "No AssistStructure found in autofill intent")
                return
            }

            val fields = parseStructure(structure)
            if (fields.usernameId == null && fields.passwordId == null) {
                promise.reject("NO_FIELDS", "No login fields found in structure")
                return
            }

            val datasetBuilder = Dataset.Builder()
            
            fields.usernameId?.let {
                datasetBuilder.setValue(it, AutofillValue.forText(username))
            }
            fields.passwordId?.let {
                datasetBuilder.setValue(it, AutofillValue.forText(password))
            }

            val replyIntent = Intent().apply {
                putExtra(AutofillManager.EXTRA_AUTHENTICATION_RESULT, datasetBuilder.build())
            }
            
            activity.setResult(Activity.RESULT_OK, replyIntent)
            
            // Clear the autofill extras so subsequent launches don't trigger autofill mode again
            intent.removeExtra("autofill_mode")
            intent.removeExtra("package_name")
            intent.removeExtra("web_domain")
            intent.removeExtra(AutofillManager.EXTRA_ASSIST_STRUCTURE)
            
            activity.finish()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    private data class AutofillFields(
        val usernameId: AutofillId?,
        val passwordId: AutofillId?
    )

    private fun parseStructure(structure: AssistStructure): AutofillFields {
        var usernameId: AutofillId? = null
        var passwordId: AutofillId? = null

        for (i in 0 until structure.windowNodeCount) {
            val windowNode = structure.getWindowNodeAt(i)
            findFields(windowNode.rootViewNode) { node ->
                when {
                    isPasswordField(node) && passwordId == null -> passwordId = node.autofillId
                    isUsernameField(node) && usernameId == null -> usernameId = node.autofillId
                }
            }
        }

        return AutofillFields(usernameId, passwordId)
    }

    private fun findFields(node: AssistStructure.ViewNode, callback: (AssistStructure.ViewNode) -> Unit) {
        callback(node)
        for (i in 0 until node.childCount) {
            findFields(node.getChildAt(i), callback)
        }
    }

    private fun isPasswordField(node: AssistStructure.ViewNode): Boolean {
        val hints = node.autofillHints ?: emptyArray()
        val inputType = node.inputType
        
        return hints.any { it == View.AUTOFILL_HINT_PASSWORD } ||
               (inputType and 0x00000080) != 0 || // PASSWORD
               (inputType and 0x00000090) != 0    // WEB_PASSWORD
    }

    private fun isUsernameField(node: AssistStructure.ViewNode): Boolean {
        val hints = node.autofillHints ?: emptyArray()
        val idEntry = node.idEntry?.lowercase() ?: ""
        val hint = node.hint?.lowercase() ?: ""
        
        return hints.any { 
            it == View.AUTOFILL_HINT_USERNAME || 
            it == View.AUTOFILL_HINT_EMAIL_ADDRESS 
        } || idEntry.contains("user") || 
            idEntry.contains("email") || 
            hint.contains("user") || 
            hint.contains("email")
    }

    companion object {
        const val AUTOFILL_REQUEST_CODE = 1001
    }
}
