# Chameleon Detailing — Android

Native Android shell for the existing Chameleon Mini App. The web product remains the single source of business UI and logic; Android adds native authentication, splash/offline UX, safe redirects, file/camera handling, popup WebViews and Play Store packaging.

## Project identity

- Android package: `com.chameleondetailing.app`
- minSdk: 26
- targetSdk: 36
- compileSdk: 36
- Production URL: `https://chameleondetailing.black-sci-official.workers.dev`
- Kotlin/Android project with a small KMP `shared` module prepared for a future iOS shell.

Google Play requires new apps submitted after August 31, 2026 to target Android 16 / API 36 or higher. This project already targets API 36.

## Open in Android Studio

Open the `mobile/` folder as a project.

Use JDK 17.

## Google Sign-In setup

1. In Google Cloud Console create/configure the OAuth consent screen.
2. Create an **Android OAuth client** for package `com.chameleondetailing.app` and your release SHA-1/SHA-256.
3. Create a **Web OAuth client**. Its client ID is used as the server client ID for Google ID tokens.
4. Put the Web client ID in your local `~/.gradle/gradle.properties` (preferred) or `mobile/gradle.properties` while testing:

```properties
GOOGLE_SERVER_CLIENT_ID=1234567890-xxxxxxxx.apps.googleusercontent.com
```

5. Configure the same value in Cloudflare Worker:

```bash
npx wrangler secret put GOOGLE_WEB_CLIENT_ID
```

The Google client ID is not a password, but keeping environment-specific configuration out of source control avoids accidental mismatch.

## Authentication model

Telegram Mini App: Telegram `initData` only.

Android/iOS shell: native provider login -> Chameleon native session -> same Mini App API.

No Google button is rendered inside Telegram Mini App.

## Offline behavior

- Before WebView is ready: native branded offline screen.
- During use: current page remains visible behind a blocking translucent overlay.
- Network restoration is detected automatically.
- A short “Connection restored” confirmation is shown without losing the current page.

## WebView behavior

- Internal Chameleon URLs stay inside the app.
- External HTTP(S) links open in a Custom Tab.
- Deep links such as `tel:`, `mailto:`, Telegram, maps, etc. are delegated to Android.
- `window.open` / popup flows use a secondary WebView dialog.
- File chooser supports document/gallery selection and camera capture.
- Android back closes nested UI/history before showing the Chameleon exit confirmation.

## Release signing

Create an upload keystore and keep it outside Git:

```bash
keytool -genkeypair -v -keystore chameleon-upload.jks -alias chameleon-upload -keyalg RSA -keysize 4096 -validity 10000
```

Add these to your user Gradle properties, **not** the repository:

```properties
CHAMELEON_KEYSTORE_PATH=/absolute/path/chameleon-upload.jks
CHAMELEON_KEYSTORE_PASSWORD=...
CHAMELEON_KEY_ALIAS=chameleon-upload
CHAMELEON_KEY_PASSWORD=...
```

Build the Play bundle:

```bash
./gradlew :app:bundleRelease
```

Output:

`app/build/outputs/bundle/release/app-release.aab`

Enable **Play App Signing** in Play Console. The upload key stays with you; Google stores the app-signing key.

## Before first Play Console upload

- Finalize the package name. It cannot be changed after publication.
- Add production SHA-1/SHA-256 to the Android OAuth client.
- Configure `GOOGLE_WEB_CLIENT_ID` on Cloudflare.
- Apply D1 migrations.
- Prepare 512×512 store icon, feature graphic, screenshots, privacy policy and Data Safety answers.
- Test Google login, uploads, camera, external links, offline/reconnect, back/exit behavior on at least one phone and one tablet.
- Build and upload an AAB to Internal testing first.

## Future iOS

The Worker native-session contract and `shared` module are platform-neutral. The iOS app should use WKWebView and expose the same JavaScript bridge contract. Sign in with Apple can be added without changing the existing Mini App.
