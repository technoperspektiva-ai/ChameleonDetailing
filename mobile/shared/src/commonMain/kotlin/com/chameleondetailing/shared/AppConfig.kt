package com.chameleondetailing.shared

data class NativeRuntimeConfig(
    val appUrl: String,
    val platform: String,
    val appVersion: String
)

object NativeContract {
    const val JS_BRIDGE = "ChameleonNative"
    const val SESSION_PREFIX = "native:"
    const val GOOGLE_AUTH_PATH = "/api/native/auth/google"
    const val SESSION_PATH = "/api/native/session"
    const val LOGOUT_PATH = "/api/native/logout"
}
