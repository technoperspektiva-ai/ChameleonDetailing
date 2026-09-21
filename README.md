# ChameleonDetailing

Production-oriented Telegram Mini App + Cloudflare Worker for **@ChameleonDetailing_bot**.

Version **1.1.3** — architecture v1.4, Telegram bot self-healing webhook, and corrected UA/PL/EN service localization.

## Names

- GitHub repository: `ChameleonDetailing`
- Cloudflare Worker: `chameleondetailing`
- D1 database: `chameleondetailing`
- Telegram bot: `@ChameleonDetailing_bot`

## Required Cloudflare secrets / variables

Secrets:
- `BOT_TOKEN` — token from BotFather for `@ChameleonDetailing_bot`
- `SESSION_SECRET` — long random string
- `TELEGRAM_WEBHOOK_SECRET` — optional. Use only letters, digits, `_` and `-` (1–256 chars). Invalid values are ignored safely.

Optional variable:
- `APP_URL` — canonical Mini App URL. The live Worker request origin takes priority, so a stale `APP_URL` no longer breaks the bot after deploy.

D1 binding:
- binding: `DB`
- database: `chameleondetailing`

## Cloudflare deploy

Recommended deploy command:

```bash
npx wrangler deploy
```

`wrangler.jsonc` runs `npm run build` before deployment.

The Worker is configured with `assets.run_worker_first=true`, therefore opening the Mini App also verifies/re-registers the Telegram webhook against the currently deployed Worker URL.

A cron trigger reconciles the webhook every 30 minutes as a second recovery mechanism.

## Telegram bot health

After deploy open:

```text
https://<your-worker-domain>/api/telegram/health
```

A healthy result contains:

```json
{
  "ok": true,
  "botConfigured": true,
  "bot": "@ChameleonDetailing_bot",
  "webhook": {
    "url": "https://<your-worker-domain>/api/telegram/webhook"
  }
}
```

Opening the Mini App once after deploy is enough to trigger immediate webhook reconciliation. You can then send `/start` to the bot.

Manual bootstrap remains available for diagnostics:

```bash
curl -X POST \
  -H "Authorization: Bearer $SESSION_SECRET" \
  https://<your-worker-domain>/api/telegram/bootstrap
```

## Localization

UI dictionaries are in:
- `src/locales/uk.json`
- `src/locales/pl.json`
- `src/locales/en.json`

Service titles/descriptions are also localized separately in `worker/lib/services.ts`. Older D1 databases that were previously seeded with English text for every locale are repaired automatically on the next Worker cold start / DB bootstrap.

The build runs a locale-key consistency check before TypeScript/Vite compilation.

## D1

Create the database:

```bash
npx wrangler d1 create chameleondetailing
```

Add the returned D1 database id to the `DB` binding, then apply migrations:

```bash
npm run db:migrate:remote
```

The runtime also creates the minimum core schema defensively and UPSERTs canonical localized starter services.

## Diagnostics

- `/__version` — deployed version
- `/api/system/status` — Worker/DB/bot configuration flags
- `/api/telegram/health` — Telegram bot + current webhook status


### Emergency Telegram bot repair URL

Set `TELEGRAM_SETUP_KEY` in Cloudflare, then open:
`https://<worker-domain>/telegram/fix?key=<TELEGRAM_SETUP_KEY>`

This browser page resets and re-registers the Telegram webhook against the exact Worker origin and prints Telegram diagnostics.
