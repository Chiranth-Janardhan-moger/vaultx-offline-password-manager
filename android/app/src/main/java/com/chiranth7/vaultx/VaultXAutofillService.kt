package com.chiranth7.vaultx

import android.app.assist.AssistStructure
import android.os.Build
import android.os.CancellationSignal
import android.service.autofill.*
import android.view.autofill.AutofillId
import android.widget.RemoteViews
import androidx.annotation.RequiresApi
import android.content.IntentSender
import android.view.View
import android.util.Log
import android.content.Intent
import android.app.PendingIntent

@RequiresApi(Build.VERSION_CODES.O)
class VaultXAutofillService : AutofillService() {

    companion object {
        private const val TAG = "VaultXAutofill"
    }

    override fun onFillRequest(
        request: FillRequest,
        cancellationSignal: CancellationSignal,
        callback: FillCallback
    ) {
        Log.d(TAG, "Autofill request received")

        val structure = request.fillContexts.lastOrNull()?.structure
        if (structure == null) {
            callback.onSuccess(null)
            return
        }

        // Get package/domain for matching
        val packageName = structure.activityComponent.packageName
        
        // Don't show autofill in VaultX itself
        if (packageName == "com.chiranth7.vaultx") {
            Log.d(TAG, "Ignoring autofill in VaultX app")
            callback.onSuccess(null)
            return
        }
        
        val webDomain = extractWebDomain(structure)
        
        Log.d(TAG, "Autofill for: $packageName / $webDomain")

        // Parse structure to find login fields
        val fields = parseStructure(structure)
        if (fields.usernameId == null && fields.passwordId == null) {
            Log.d(TAG, "No login fields found")
            callback.onSuccess(null)
            return
        }

        // Create response with VaultX option
        val responseBuilder = FillResponse.Builder()
        
        // Create a dataset that opens VaultX
        val presentation = RemoteViews(packageName, android.R.layout.simple_list_item_1).apply {
            setTextViewText(android.R.id.text1, "🔐 Fill with VaultX")
        }
        
        // Create intent to open VaultX autofill picker
        val autofillIntent = Intent(this, MainActivity::class.java).apply {
            putExtra("autofill_mode", true)
            putExtra("package_name", packageName)
            putExtra("web_domain", webDomain)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(), // Unique request code
            autofillIntent,
            PendingIntent.FLAG_CANCEL_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        
        val datasetBuilder = Dataset.Builder()
        datasetBuilder.setAuthentication(pendingIntent.intentSender)
        
        // Add the fields
        fields.usernameId?.let { 
            datasetBuilder.setValue(it, null, presentation)
        }
        fields.passwordId?.let { 
            datasetBuilder.setValue(it, null, presentation)
        }
        
        responseBuilder.addDataset(datasetBuilder.build())
        callback.onSuccess(responseBuilder.build())
    }

    override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
        // Don't save - users add passwords through the app
        callback.onSuccess()
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

    private fun extractWebDomain(structure: AssistStructure): String? {
        for (i in 0 until structure.windowNodeCount) {
            structure.getWindowNodeAt(i).rootViewNode.webDomain?.let { return it }
        }
        return null
    }
}
