package com.chameleondetailing.app

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class NativeAuthResult(
    val sessionToken: String,
    val name: String?,
    val email: String?,
    val photoUrl: String?
)

class AuthApi {
    suspend fun exchangeGoogleToken(idToken: String): NativeAuthResult = withContext(Dispatchers.IO) {
        val url = URL(BuildConfig.APP_URL.trimEnd('/') + "/api/native/auth/google")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 12_000
            readTimeout = 12_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
        }
        val body = JSONObject()
            .put("idToken", idToken)
            .put("platform", "android")
            .put("appVersion", BuildConfig.VERSION_NAME)
            .toString()
        conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }

        val code = conn.responseCode
        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
        val raw = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
        val json = runCatching { JSONObject(raw) }.getOrElse { JSONObject() }
        if (code !in 200..299) {
            throw IllegalStateException(json.optString("error", "HTTP $code"))
        }
        val token = json.optString("sessionToken")
        if (token.isBlank()) throw IllegalStateException("Native session token missing")
        val user = json.optJSONObject("user")
        NativeAuthResult(
            sessionToken = token,
            name = user?.optString("name")?.takeIf { it.isNotBlank() },
            email = user?.optString("email")?.takeIf { it.isNotBlank() },
            photoUrl = user?.optString("photoUrl")?.takeIf { it.isNotBlank() }
        )
    }

    suspend fun validateSession(token: String): Boolean = withContext(Dispatchers.IO) {
        val url = URL(BuildConfig.APP_URL.trimEnd('/') + "/api/native/session")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 8_000
            readTimeout = 8_000
            setRequestProperty("Authorization", "Bearer $token")
            setRequestProperty("Accept", "application/json")
        }
        conn.responseCode in 200..299
    }

    suspend fun logout(token: String) = withContext(Dispatchers.IO) {
        val url = URL(BuildConfig.APP_URL.trimEnd('/') + "/api/native/logout")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 8_000
            readTimeout = 8_000
            setRequestProperty("Authorization", "Bearer $token")
            doOutput = true
        }
        conn.outputStream.use { it.write(ByteArray(0)) }
        conn.responseCode
    }
}
