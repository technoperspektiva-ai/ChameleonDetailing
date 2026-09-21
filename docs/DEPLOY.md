# First deployment / update — ChameleonDetailing v1.1.0

Canonical mapping:

- GitHub: `ChameleonDetailing`
- Cloudflare Worker: `chameleondetailing`
- D1: `chameleondetailing`
- D1 binding: `DB`
- Telegram: `@ChameleonDetailing_bot`
- Telegram webhook: **disabled**

## 1. GitHub

Upload the contents of the ZIP to the **root** of repository `ChameleonDetailing`.

## 2. Cloudflare

Use Worker `chameleondetailing` connected to repository `ChameleonDetailing`.

Recommended Cloudflare configuration:

```text
Root directory: /
Deploy command: npx wrangler deploy
```

`wrangler.jsonc` contains a custom build command, so Wrangler executes `npm run build` before deployment.

## 3. Version check

Open:

```text
https://chameleondetailing.<workers-subdomain>.workers.dev/__version
```

Expected version: `1.1.0`.

## 4. D1

Create lowercase database:

```bash
npx wrangler d1 create chameleondetailing
```

Binding name remains `DB`.

## 5. Variables / secrets

Required for real Telegram Mini App authentication:

- `BOT_TOKEN`
- `SESSION_SECRET`
- `APP_URL`

No `TELEGRAM_WEBHOOK_SECRET` is used in v1.1.0.

## 6. Cancel the old Telegram webhook

The Worker no longer has `/api/telegram/webhook` and the project no longer contains a webhook setup script.

Telegram may still remember an old webhook from a previous deployment. Delete it once using your bot token:

```bash
BOT_TOKEN='YOUR_TOKEN' npm run telegram:webhook:delete
```

Expected output:

```text
Telegram webhook deleted. Bot is now in no-webhook mode.
```

Important: with no webhook, the Worker will not automatically answer `/start`, callback buttons or ordinary bot messages. The Mini App itself still authenticates through Telegram `initData` because that only needs `BOT_TOKEN` for signature validation.

## 7. v1.4 visual QA

Before release, check at least widths `320`, `360`, `375`, `390`, `414`, `430` for `UA`, `PL`, `EN`.

Use `?debugLocale=long` to stress-test overflow.
