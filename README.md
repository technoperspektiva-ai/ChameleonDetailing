# ChameleonDetailing
## v1.1.13 — clearer schedule, client request status/delete, vehicle icons

- Working schedule in Bot Panel is now day-by-day: each weekday has an explicit ON/OFF toggle and its own hours.
- Clients see human-readable request confirmation/work statuses and may remove eligible requests from their own list; unconfirmed requests are cancelled when removed.
- Vehicle type cards now use the supplied Sedan / Hatchback / SUV / Large SUV / Van artwork.

## v1.1.12 — requests, Excel reports and full VIP pricing

This build adds the missing architecture blocks:

- **Client requests** in Mini App (`Profile → My requests`) and `?startapp=orders` support.
- **Staff requests** in Owner/Admin/Manager Bot Panel with status workflow: REQUESTED → CONFIRMED → IN_PROGRESS → COMPLETED/CANCELLED.
- **Real `.xlsx` reports** generated in memory and sent directly to Telegram. Owner/Admin receive full reports; Manager receives operational Orders export.
- **Reports menu / `/reports`** with period selection (7/30/90 days / all) for time-based reports.
- **VIP pricing engine** supports percentage discount, a separate fixed price list, or multiplier for `VIP` and `VIP_PLUS`, per service.
- **VIP pricing editor** in Bot Panel: `Pricing → service → VIP pricing` (also available from service editor/VIP section).
- VIP clients see their effective VIP base price in service cards, and the calculator uses the same backend rule.

Excel output includes formatted headers, frozen header rows, filters and business-oriented sheets. Generated files are not persisted: generate → Telegram `sendDocument` → discard.


### D1 is now connected in Wrangler

This release binds the existing Cloudflare D1 database directly in `wrangler.jsonc`:

- binding: `DB`
- database: `chameleondetailing`
- database_id: `167770dd-95c2-484c-b157-1fc369cee19c`
- migrations: `database/migrations`

After deployment, `/api/system/status` should report `dbConfigured: true`, and `/panel` can use the Owner data features.


The locked owner is Telegram numeric ID `375938798`. Management intentionally lives in the Telegram bot, not in the Mini App. Send `/panel` or `/owner` from the owner account to open the role-aware control panel. The panel includes Dashboard, Users, VIP, Whitelist, Managers, Admins, Services, Pricing, Calculator Rules, Content, Languages, Referrals, Analytics, Audit Log and Settings. Owner staff onboarding supports `@username`; known users are promoted immediately and unknown users receive a secure deep-link invite.

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



### v1.1.11 management panel language
- Owner / Admin / Manager panels now have a personal **Panel language** selector.
- Supported management UI languages: **UA / PL / EN**.
- The choice is saved per staff account in D1 (`users.management_language`) and survives bot restarts/deploys.
- Main panel navigation, dashboard, users, VIP, lists, services, pricing, calculator rules, content, product-language settings, referrals, analytics, audit and settings use the selected management language.
- Existing databases are upgraded automatically with a backward-compatible `management_language` column.

### v1.1.9 referral & VIP fixes

- VIP tier label is now constrained inside the premium card on narrow iPhone widths.
- Home referral card is now an actual action button.
- Backend creates a unique referral deep-link and records `referral_link_created`.
- Telegram `/start ref_<code>` claims the invite and records `referral_open`.
- Telegram share sheet opens directly from the Mini App.


### v1.1.8 management panel
- Owner: full role-aware Telegram Bot Panel with editable users, VIP, whitelist, blacklist, staff, services, pricing, calculator rules, content, languages, referrals, analytics, audit and system settings.
- Admin: same operational/product editors except Admin creation/removal and Owner-only maintenance/security controls.
- Manager: users, add client, VIP, whitelist/blacklist, client notes, calculator history and basic analytics.
- Editing flows use bot state, confirmations/step prompts, backend permission checks and audit entries.
- D1 bootstrap now creates/repairs management tables needed by these flows.

## Order notifications (v1.1.17)

Staff roles OWNER / ADMIN / MANAGER can enable personal new-order notifications in Bot Panel → Order notifications.

OWNER / ADMIN can also connect a Telegram group/chat for shared order alerts:

1. Add `@ChameleonDetailing_bot` to the target group/chat.
2. From an OWNER or ADMIN account send `/connectorders` in that chat.
3. Shared notifications can be enabled/disabled and their UA/PL/EN language selected from Bot Panel → Order notifications.
4. Send `/disconnectorders` to disconnect the shared chat.

Each new-order alert contains client/order details and an `Open request` button.


## Clean single-panel bot UI (v1.1.18)

Private bot interactions now keep one active UI panel. User commands and staff text inputs are deleted after processing, callback navigation edits the existing panel, and old tracked panels are replaced automatically. Excel report documents are intentionally preserved in chat. Shared order-notification chats are not cleaned.
