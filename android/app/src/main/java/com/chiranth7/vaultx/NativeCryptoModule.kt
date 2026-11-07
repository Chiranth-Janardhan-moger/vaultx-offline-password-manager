package com.chiranth7.vaultx

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

class NativeCryptoModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "NativeCrypto"

    @ReactMethod
    fun pbkdf2(
        password: String,
        saltHex: String,
        iterations: Int,
        keyLengthBits: Int,
        algorithm: String,
        promise: Promise
    ) {
        Thread {
            try {
                val saltBytes = hexStringToByteArray(saltHex)
                val algo = when {
                    algorithm.equals("sha1", ignoreCase = true) -> "PBKDF2WithHmacSHA1"
                    algorithm.equals("sha512", ignoreCase = true) -> "PBKDF2WithHmacSHA512"
                    else -> "PBKDF2WithHmacSHA256"
                }
                val spec = PBEKeySpec(password.toCharArray(), saltBytes, iterations, keyLengthBits)
                try {
                    val skf = SecretKeyFactory.getInstance(algo)
                    val keyBytes = skf.generateSecret(spec).encoded
                    val resultHex = byteArrayToHexString(keyBytes)
                    promise.resolve(resultHex)
                } finally {
                    spec.clearPassword()
                }
            } catch (e: Exception) {
                promise.reject("ERR_PBKDF2", e.message, e)
            }
        }.start()
    }

    private fun hexStringToByteArray(s: String): ByteArray {
        val clean = if (s.length % 2 != 0) "0$s" else s
        val len = clean.length
        val data = ByteArray(len / 2)
        var i = 0
        while (i < len) {
            val high = Character.digit(clean[i], 16)
            val low = Character.digit(clean[i + 1], 16)
            data[i / 2] = ((high shl 4) + low).toByte()
            i += 2
        }
        return data
    }

    private fun byteArrayToHexString(bytes: ByteArray): String {
        val hexChars = CharArray(bytes.size * 2)
        val hexArray = "0123456789abcdef".toCharArray()
        for (j in bytes.indices) {
            val v = bytes[j].toInt() and 0xFF
            hexChars[j * 2] = hexArray[v ushr 4]
            hexChars[j * 2 + 1] = hexArray[v and 0x0F]
        }
        return String(hexChars)
    }
}
