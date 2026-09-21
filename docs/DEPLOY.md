# Deploy — ChameleonDetailing v1.1.2

1. Upload the repository contents to GitHub repository `ChameleonDetailing`.
2. Connect that repository to Cloudflare Worker `chameleondetailing`.
3. Add `BOT_TOKEN` and `SESSION_SECRET` as secrets.
4. Optionally add a valid `TELEGRAM_WEBHOOK_SECRET`.
5. Bind D1 database `chameleondetailing` as `DB`.
6. Deploy with `npx wrangler deploy`.
7. Open the deployed Mini App once. This immediately self-heals the Telegram webhook.
8. Check `/api/telegram/health` and then send `/start` to `@ChameleonDetailing_bot`.

Do **not** run the webhook-delete utility during normal operation. The bot requires a webhook in the Cloudflare Worker architecture.

The service localization repair is automatic; no D1 reset is needed for databases created by older builds.
