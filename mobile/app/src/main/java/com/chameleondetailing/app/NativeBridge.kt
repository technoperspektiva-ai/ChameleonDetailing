package com.chameleondetailing.app

import android.webkit.JavascriptInterface

class NativeBridge(private val sessionStore: SessionStore) {
    @JavascriptInterface
    fun getSessionToken(): String = sessionStore.token.orEmpty()

    @JavascriptInterface
    fun getPlatform(): String = "android"

    @JavascriptInterface
    fun getAppVersion(): String = BuildConfig.VERSION_NAME
}
