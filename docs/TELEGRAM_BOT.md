# Telegram bot setup

The Cloudflare Worker uses a Telegram webhook. A Cloudflare Worker cannot reliably operate a user-facing bot with permanent long polling, so the webhook endpoint must stay enabled.

## Required Worker secrets / variables

- `BOT_TOKEN` — BotFather token (secret)
- `APP_URL` — deployed Worker URL, e.g. `https://chameleondetailing.<your-subdomain>.workers.dev`
- `SESSION_SECRET` — long random secret (secret)
- `TELEGRAM_WEBHOOK_SECRET` — optional but recommended random secret (secret)

## Webhook endpoint

`POST /api/telegram/webhook`

Supported baseline flows:

- `/start` → welcome + Mini App button
- `/help` → help + Mini App button
- other text → main actions
- callback button handling
- Telegram contact message storage foundation

## Register webhook

From a local shell with the variables available:

```bash
BOT_TOKEN='...' APP_URL='https://chameleondetailing.<subdomain>.workers.dev' TELEGRAM_WEBHOOK_SECRET='...' npm run telegram:webhook:set
```

Or call the protected bootstrap endpoint after deploy:

```bash
curl -X POST 'https://chameleondetailing.<subdomain>.workers.dev/api/telegram/bootstrap' \
  -H 'Authorization: Bearer <SESSION_SECRET>'
```

Check status:

```bash
BOT_TOKEN='...' npm run telegram:webhook:info
```

Do not run `telegram:webhook:delete` unless you intentionally want the bot to stop receiving messages.
