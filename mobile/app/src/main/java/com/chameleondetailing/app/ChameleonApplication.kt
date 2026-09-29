package com.chameleondetailing.app

import android.app.Application
import android.webkit.WebView

class ChameleonApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)
    }
}
