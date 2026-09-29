-keepclassmembers class com.chameleondetailing.app.NativeBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.google.android.libraries.identity.googleid.** { *; }
-dontwarn org.conscrypt.**
