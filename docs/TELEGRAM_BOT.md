# Telegram bot

The bot is an active product surface, not only a Mini App launcher.

## Runtime flow

`Telegram update -> /api/telegram/webhook -> Cloudflare Worker -> bot handler -> Telegram Bot API`

Supported now:
- `/start`
- `/help`
- localized UA / PL / EN welcome/help text
- Mini App button
- Calculator deep-link button
- Requests deep-link button
- callbacks
- Telegram contact save flow

## Self-healing webhook

Version 1.1.2 removes the fragile manual-only webhook setup.

The Worker reconciles the webhook:
1. when the Mini App HTML is opened;
2. when `/api/auth/telegram` runs;
3. when `/api/system/status` runs;
4. every 30 minutes via Cloudflare Cron Trigger.

The live Worker request origin wins over `APP_URL`, preventing a stale `APP_URL` from registering the bot to an old workers.dev address.

## Health endpoint

`GET /api/telegram/health`

This asks Telegram `getMe` and `getWebhookInfo`. It does not expose the bot token.

If `webhook.last_error_message` exists, use it as the primary diagnostic signal.

## Required secret

`BOT_TOKEN` is required both for bot operation and Telegram Mini App `initData` verification.

`TELEGRAM_WEBHOOK_SECRET` is optional. If used, it must contain only `A-Z`, `a-z`, `0-9`, `_`, `-` and be 1–256 characters.


## Browser repair link (v1.1.3)

Add a Cloudflare variable/secret named `TELEGRAM_SETUP_KEY` with a long random value.

Then open:

`https://YOUR-WORKER.workers.dev/telegram/fix?key=YOUR_TELEGRAM_SETUP_KEY`

The page performs `getMe -> deleteWebhook -> setWebhook -> setMyCommands -> setChatMenuButton -> getWebhookInfo` and displays the result directly in the browser. The reset preserves pending updates.

Read-only browser diagnostics are available at:

`https://YOUR-WORKER.workers.dev/telegram/health`

After successful repair, rotate or remove `TELEGRAM_SETUP_KEY`.
