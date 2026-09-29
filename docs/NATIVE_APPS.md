# Chameleon native apps

The Telegram Mini App remains Telegram-authenticated. Native Android/iOS shells use their own identity flow and then load the same web product.

## Runtime contract

The native WebView exposes a JavaScript bridge named `ChameleonNative` with:

- `getSessionToken(): string`
- `getPlatform(): "android" | "ios"`
- `getAppVersion(): string`

The web app sends the token to existing API calls as `initData=native:<token>`. The Worker validates it through `native_sessions`, so no Google button or Google token is ever rendered inside the Mini App UI.

## Google authentication

1. Android uses Credential Manager / Sign in with Google.
2. Use a **Web OAuth client ID** as the server client ID.
3. Add the same client ID to the Worker variable `GOOGLE_WEB_CLIENT_ID`.
4. Android posts the Google ID token to `POST /api/native/auth/google`.
5. The Worker validates Google's RS256 signature, issuer, audience, expiry and verified email.
6. Chameleon issues a random 256-bit native session token valid for 90 days.
7. Only a SHA-256 hash of that session token is stored in D1.

Google-only users receive an internal negative legacy `telegram_user_id` so the existing client/order schema remains compatible. Their bot status is `UNAVAILABLE`; the number is never used as a real Telegram identity.

## Cloudflare setup

Set the Worker variable (client IDs are public identifiers, not passwords):

```
wrangler secret put GOOGLE_WEB_CLIENT_ID
```

Enter the Web OAuth client ID created in Google Cloud Console.

Apply migrations with your normal D1 deployment flow. Runtime code also creates the two native-auth tables defensively.

## iOS later

The API/session contract is platform-neutral. The future iOS shell can use Sign in with Apple and/or Google, then expose the same `ChameleonNative` bridge to WKWebView.
