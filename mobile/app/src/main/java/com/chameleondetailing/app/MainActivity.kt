package com.chameleondetailing.app

import android.Manifest
import android.app.Dialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import com.chameleondetailing.shared.NativeContract
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File

class MainActivity : AppCompatActivity() {
    private lateinit var root: FrameLayout
    private lateinit var webView: WebView
    private lateinit var sessionStore: SessionStore
    private lateinit var authApi: AuthApi
    private lateinit var googleAuth: GoogleAuthManager
    private lateinit var networkMonitor: NetworkMonitor

    private var currentOverlay: View? = null
    private var offlineShield: View? = null
    private var restoredBanner: TextView? = null
    private var pageReady = false
    private var lastOnline = true

    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var cameraUri: Uri? = null
    private var pendingWebPermission: PermissionRequest? = null

    private val appHost by lazy { Uri.parse(BuildConfig.APP_URL).host.orEmpty() }

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = fileCallback ?: return@registerForActivityResult
        val data = result.data
        val uris = mutableListOf<Uri>()

        if (result.resultCode == RESULT_OK) {
            data?.clipData?.let { clip ->
                for (i in 0 until clip.itemCount) uris += clip.getItemAt(i).uri
            }
            data?.data?.let { uris += it }
            if (uris.isEmpty()) cameraUri?.let { uris += it }
        }

        callback.onReceiveValue(uris.distinct().toTypedArray())
        fileCallback = null
        cameraUri = null
    }

    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        pendingWebPermission?.let { request ->
            if (granted) request.grant(request.resources) else request.deny()
            pendingWebPermission = null
        }
        if (fileCallback != null) launchFileChooser(includeCamera = granted)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        sessionStore = SessionStore(this)
        authApi = AuthApi()
        googleAuth = GoogleAuthManager(this)

        root = FrameLayout(this).apply {
            setBackgroundColor(ContextCompat.getColor(this@MainActivity, R.color.chameleon_black))
        }
        webView = buildWebView()
        root.addView(webView, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
        setContentView(root)

        restoredBanner = UiFactory.restoredBanner(this).also { banner ->
            root.addView(banner, FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.TOP or Gravity.CENTER_HORIZONTAL
            ).apply { topMargin = dp(18) })
        }

        networkMonitor = NetworkMonitor(this) { online ->
            runOnUiThread { onConnectivityChanged(online) }
        }
        networkMonitor.start()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (currentOverlay != null && currentOverlay !== offlineShield) {
                    hideOverlay()
                    return
                }
                if (webView.canGoBack()) {
                    webView.goBack()
                    return
                }
                UiFactory.showExitDialog(this@MainActivity) { finishAndRemoveTask() }
            }
        })

        showOverlay(UiFactory.splash(this))
        lifecycleScope.launch {
            delay(420)
            bootstrap()
        }
    }

    private suspend fun bootstrap() {
        if (!networkMonitor.isOnline()) {
            showOfflineFull()
            return
        }

        val token = sessionStore.token
        if (token.isNullOrBlank()) {
            showLogin()
            return
        }

        showOverlay(UiFactory.splash(this))
        val valid = runCatching { authApi.validateSession(token) }.getOrDefault(false)
        if (!valid) {
            sessionStore.clear()
            showLogin()
            return
        }
        loadProduct()
    }

    private fun showLogin() {
        pageReady = false
        showOverlay(UiFactory.login(this) { startGoogleLogin() })
    }

    private fun startGoogleLogin() {
        if (BuildConfig.GOOGLE_SERVER_CLIENT_ID.isBlank()) {
            Toast.makeText(this, R.string.auth_config_missing, Toast.LENGTH_LONG).show()
            return
        }
        showOverlay(UiFactory.splash(this))
        lifecycleScope.launch {
            runCatching {
                val idToken = googleAuth.signIn()
                authApi.exchangeGoogleToken(idToken)
            }.onSuccess { result ->
                sessionStore.token = result.sessionToken
                loadProduct()
            }.onFailure {
                showLogin()
                Toast.makeText(this@MainActivity, R.string.auth_failed, Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun loadProduct() {
        if (!networkMonitor.isOnline()) {
            showOfflineFull()
            return
        }
        pageReady = false
        showOverlay(UiFactory.splash(this))
        val launchUri = intent?.data
        val url = if (launchUri != null && launchUri.host == appHost) {
            launchUri.toString()
        } else {
            BuildConfig.APP_URL.trimEnd('/') + "/?native=android"
        }
        webView.loadUrl(url)
    }

    private fun buildWebView(): WebView = WebView(this).apply {
        setBackgroundColor(Color.TRANSPARENT)
        overScrollMode = View.OVER_SCROLL_NEVER

        settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = true
            mediaPlaybackRequiresUserGesture = true
            allowFileAccess = false
            allowContentAccess = true
            userAgentString = userAgentString + " ChameleonNative/1.0 Android"
        }

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(this@apply, false)
        }

        addJavascriptInterface(NativeBridge(sessionStore), NativeContract.JS_BRIDGE)

        webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                return handleNavigation(uri)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                pageReady = true
                injectNativeRuntime()
                hideOverlay()
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true && !networkMonitor.isOnline()) {
                    showOfflineFull()
                }
            }
        }

        webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.fileCallback?.onReceiveValue(null)
                this@MainActivity.fileCallback = filePathCallback
                if (ContextCompat.checkSelfPermission(
                        this@MainActivity,
                        Manifest.permission.CAMERA
                    ) == PackageManager.PERMISSION_GRANTED
                ) {
                    launchFileChooser(includeCamera = true)
                } else {
                    cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                }
                return true
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                request ?: return
                if (request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                    if (ContextCompat.checkSelfPermission(
                            this@MainActivity,
                            Manifest.permission.CAMERA
                        ) == PackageManager.PERMISSION_GRANTED
                    ) {
                        request.grant(request.resources)
                    } else {
                        pendingWebPermission = request
                        cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                    }
                } else {
                    request.grant(request.resources)
                }
            }

            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: android.os.Message?
            ): Boolean {
                val popup = createPopupWebView()
                val dialog = Dialog(this@MainActivity).apply {
                    setContentView(popup)
                    window?.setLayout(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    setOnDismissListener { popup.destroy() }
                }
                popup.tag = dialog
                val transport = resultMsg?.obj as? WebView.WebViewTransport ?: return false
                transport.webView = popup
                resultMsg.sendToTarget()
                dialog.show()
                dialog.window?.setLayout(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                return true
            }
        }
    }

    private fun createPopupWebView(): WebView = WebView(this).apply {
        setBackgroundColor(ContextCompat.getColor(this@MainActivity, R.color.chameleon_black))
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.setSupportMultipleWindows(false)
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        addJavascriptInterface(NativeBridge(sessionStore), NativeContract.JS_BRIDGE)
        webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val uri = request?.url ?: return false
                if (isInternal(uri)) return false
                openExternal(uri)
                (tag as? Dialog)?.dismiss()
                return true
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                injectNativeRuntime(this@apply)
            }
        }
        webChromeClient = WebChromeClient()
    }

    private fun handleNavigation(uri: Uri): Boolean {
        val scheme = uri.scheme.orEmpty().lowercase()
        if ((scheme == "http" || scheme == "https") && isInternal(uri)) return false
        openExternal(uri)
        return true
    }

    private fun isInternal(uri: Uri): Boolean {
        if (uri.scheme == "about") return true
        return uri.host.equals(appHost, ignoreCase = true)
    }

    private fun openExternal(uri: Uri) {
        val scheme = uri.scheme.orEmpty().lowercase()
        try {
            if (scheme == "http" || scheme == "https") {
                CustomTabsIntent.Builder()
                    .setShowTitle(true)
                    .build()
                    .launchUrl(this, uri)
            } else {
                startActivity(Intent(Intent.ACTION_VIEW, uri))
            }
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, uri.toString(), Toast.LENGTH_SHORT).show()
        }
    }

    private fun launchFileChooser(includeCamera: Boolean) {
        if (fileCallback == null) return

        val contentIntent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
        }

        val initial = mutableListOf<Intent>()
        if (includeCamera) {
            val dir = File(cacheDir, "camera").apply { mkdirs() }
            val file = File.createTempFile("chameleon_", ".jpg", dir)
            cameraUri = FileProvider.getUriForFile(
                this,
                "$packageName.fileprovider",
                file
            )
            initial += Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                putExtra(MediaStore.EXTRA_OUTPUT, cameraUri)
                addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
        }

        val chooser = Intent.createChooser(contentIntent, getString(R.string.app_name)).apply {
            if (initial.isNotEmpty()) {
                putExtra(Intent.EXTRA_INITIAL_INTENTS, initial.toTypedArray())
            }
        }
        fileChooserLauncher.launch(chooser)
    }

    private fun injectNativeRuntime(target: WebView = webView) {
        val script = """
            (function(){
              document.documentElement.classList.add('native-app','native-android');
              document.documentElement.dataset.nativePlatform='android';
              window.dispatchEvent(new CustomEvent('chameleon:native-ready',{detail:{platform:'android'}}));
            })();
        """.trimIndent()
        target.evaluateJavascript(script, null)
    }

    private fun onConnectivityChanged(online: Boolean) {
        if (online == lastOnline) return
        lastOnline = online

        if (!online) {
            if (pageReady) showOfflineShield() else showOfflineFull()
            return
        }

        hideOfflineShield()
        if (currentOverlay != null && !pageReady) {
            lifecycleScope.launch { bootstrap() }
        } else {
            restoredBanner?.animate()?.alpha(1f)?.setDuration(180)?.withEndAction {
                restoredBanner?.postDelayed({
                    restoredBanner?.animate()?.alpha(0f)?.setDuration(280)?.start()
                }, 1300)
            }?.start()
            injectNativeRuntime()
        }
    }

    private fun showOfflineFull() {
        showOverlay(UiFactory.offline(this) {
            if (networkMonitor.isOnline()) lifecycleScope.launch { bootstrap() }
        })
    }

    private fun showOfflineShield() {
        if (offlineShield != null) return
        val shield = FrameLayout(this).apply {
            isClickable = true
            isFocusable = true
            setBackgroundColor(Color.argb(45, 0, 0, 0))
        }
        val banner = TextView(this).apply {
            text = getString(R.string.offline_title) + "\n" + getString(R.string.waiting_network)
            setTextColor(ContextCompat.getColor(this@MainActivity, R.color.chameleon_text))
            setBackgroundColor(Color.argb(235, 12, 17, 13))
            textSize = 13f
            gravity = Gravity.CENTER
            setPadding(dp(18), dp(12), dp(18), dp(12))
        }
        shield.addView(banner, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.TOP
        ).apply {
            leftMargin = dp(14)
            rightMargin = dp(14)
            topMargin = dp(16)
        })
        offlineShield = shield
        root.addView(shield, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
    }

    private fun hideOfflineShield() {
        offlineShield?.let { root.removeView(it) }
        offlineShield = null
    }

    private fun showOverlay(view: View) {
        hideOverlay()
        currentOverlay = view
        root.addView(view, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
    }

    private fun hideOverlay() {
        currentOverlay?.let { root.removeView(it) }
        currentOverlay = null
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    override fun onDestroy() {
        networkMonitor.stop()
        fileCallback?.onReceiveValue(null)
        fileCallback = null
        webView.removeJavascriptInterface(NativeContract.JS_BRIDGE)
        webView.destroy()
        super.onDestroy()
    }
}
