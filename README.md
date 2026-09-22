# ChameleonDetailing
## v1.1.40 — scrollable calculator confirmation modal

- Fixed the calculator result/confirmation popup on iPhone and other short mobile viewports.
- The popup now scrolls vertically with touch when its content is taller than the available Mini App viewport.
- Fixed stacking so the result popup stays above the app bottom navigation instead of being covered by it.
- The close button remains reachable while scrolling and safe-area insets are respected.

## v1.1.39 — human-readable analytics and content labels

- Analytics now shows plain-language labels instead of internal event codes.
- Content editor now shows human-readable names instead of technical content keys.
- Owner and Admin can export/send analytics for Today / 7 days / 30 days as a readable .txt file directly from the Analytics panel.
- The internal event/content keys remain unchanged in the backend, so existing data and logic stay compatible.

## v1.1.38 — Menu Builder registry sync + pagination

- Fixed missing newly registered menu modules in the Owner menu editor.
- Menu Builder now paginates every level, preventing Telegram from truncating large inline keyboards.
- Added explicit Sync menu items action; newly introduced modules/actions are also persisted automatically into the saved D1 layout.
- Added menu-item count per level so Owner can verify that all modules are present.

## v1.1.37 — complete Menu Builder conversion

- Converted the remaining Owner/Admin panel sections into the same Menu Builder registry instead of leaving fixed system-only controls.
- Added editable internal entries for Manager access and panel language.
- Preserved editable internal entries for campaigns, discounts, seasonal themes, reports, settings and personal offers, so their controls can be moved to the top level, into folders, or into other sections.
- Added Maintenance message / ETA as editable Settings children.
- Existing saved layouts are migrated non-destructively: newly registered items are appended using their default parent without resetting Owner custom structure.

## v1.1.36 — deep Owner Menu Builder

- Owner Menu Builder can now open system sections themselves (Dashboard, Campaigns, Reports, Settings, Calculator, Seasonal Theme, etc.) and edit their stable inner buttons as real layout items.
- Stable inner actions can be moved to the top level, into a custom folder, or into another system section; moved items disappear from their original section.
- Custom folders can be created at the root, inside folders, or inside system sections.
- Added a reliable Finish editing button and Cancel flow for menu prompts, fixing the editor trap and folder-creation flow.
- Added button row sizing: WIDE (one per row), HALF (two), COMPACT (up to three). Telegram controls physical button height, so sizing changes row span rather than pixel height.
- Existing v1 menu layout is migrated automatically into the new v2 layout setting without deleting the old data.

## v1.1.35 — nested menu sorting

- Owner Menu Builder now edits every folder level, not only the root.
- Each nested item has direct up/down controls inside its own folder.
- Navigation now returns to the correct parent folder instead of jumping back to the root editor.
- Moving an item into a folder opens that destination level immediately so its exact order can be adjusted.

## v1.1.34 — Owner Menu Builder

- Owner-only menu editor with shared layout for Owner / Admin / Manager; each role still sees only modules allowed by its permissions.
- Sort any menu item up/down, move it into a folder or back to the top level, and rename it.
- Create nested custom folders, rename them, move them, and delete them safely; deleting a folder moves its contents one level up instead of deleting system modules.
- Hide/show any menu item globally without removing the underlying feature or permission.
- Reset the custom layout back to the default structure at any time.

## v1.1.33 — Owner-controlled direct URL access

- Removed the technical H1/H2/Body/Small font buttons from the Owner/Admin settings UI. Font defaults remain intact in the app.
- Added Owner-only `Direct URL access` ON/OFF control.
- When direct URL access is OFF, opening the Worker URL outside Telegram shows a polished Chameleon screen that sends the visitor to `@ChameleonDetailing_bot`.
- Telegram Mini App access is unaffected. When URL access is ON, the public URL can open the browsing/calculator experience.

## v1.1.32 — seasonal decorations moved behind content

- Seasonal floating icons now render on a dedicated background layer behind the main cards/tiles instead of sitting on top of the interface.
- Added a denser ambient seasonal field for Halloween, New Year and Easter so more themed icons drift softly between the background and the UI.
- Main navigation, header and content remain visually clean and fully readable while the seasonal mood stays visible.

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

## v1.1.21
- Owner/Admin can mark services as Popular directly from the Telegram service editor; the Mini App home screen follows that selection.
- Mini App profile now pulls the Telegram profile photo (initData photo URL first, Bot API profile-photo fallback).
- Clients receive a Telegram notification whenever staff changes a request to CONFIRMED, IN_PROGRESS, COMPLETED or CANCELLED, with a shortcut to My requests.


## v1.1.22 — Dynamic neon theme

Owner/Admin can switch the Mini App neon theme from Bot Panel → Settings → Neon theme. Supports preset colors, custom HEX, default green and animated Rainbow Flow. Theme state is persisted in D1 and Mini App refreshes it automatically.


## v1.1.23 — Client bot settings
- Client bot menu now keeps Open Mini App + Settings (staff also gets Management Panel).
- Client Settings contains request-status notification toggle, bot language, Help, and voluntary phone sharing.
- Client notification preference is persisted in D1 and status-change messages respect it.
- Owner/Admin can edit the Settings copy for UA/PL/EN in the client bot menu editor.

## v1.1.24
- Client bot Settings keeps notification toggle, language and Help in one place.
- Owner/Admin Settings now includes a global client status-notification switch.
- Global notification switch is enforced before sending request-status updates.

## v1.1.25 — client campaigns and reactivation

Owner/Admin Bot Panel now includes **📣 Campaigns**:

- manual important-update broadcast to all active clients who have notifications enabled;
- broadcast can be sent as text or as a Telegram photo with caption;
- automatic reactivation after a configurable number of days from the client's latest completed request;
- configurable business-local send time, reminder text and optional Telegram photo;
- manual "send to due clients now" action;
- delivery log prevents the same automatic reactivation message from being sent twice for the same completed request.

The existing `*/30 * * * *` Worker cron runs the automatic reactivation check. Client notification opt-out is respected for campaign mailings.

## v1.1.27
- Added Owner/Admin Discounts & Gifts center in the Telegram management panel.
- Added timed service promotions with percent discounts and duration in hours.
- Active service promotions suppress VIP pricing for that service (no stacking).
- Added personal gift discounts for a specific client with greeting and Telegram activation button.
- Activated personal discounts apply to the whole next quote/request and are consumed only after the request is submitted.
- Personal gift discounts do not stack with service promotions or VIP; personal gift has priority.

## v1.1.28
- Mobile hero typography fix and glass/translucent calculator header.
- Personal client offers: Owner/Admin/Manager can build a ready service package and final price; Manager offers can require Admin/Owner approval; client accepts in Telegram and a confirmed request is created and assigned to the offer creator.
- Manager access control: Owner/Admin can enable selected management blocks for Manager with backend permission checks.
- Existing requests can add/remove additional services from the live service catalog while retaining manual final-price editing.

## v1.1.29
- Removed the visible internal FX provider label from the calculator result.
- Extra calculator services are now stored in D1 and loaded dynamically by the Mini App.
- Owner/Admin can manage extra services from Bot Panel → Calculator → Extra services: add, rename, enable/disable, and change price/currency.

## v1.1.30
- Seasonal UI themes: Halloween, New Year and Easter.
- Owner/Admin can switch seasonal themes manually or schedule date ranges.
- Seasonal themes override the normal neon while active, then restore the saved neon theme.
- Seasonal visual accents include themed icons, backgrounds, cards and primary-button styling.
- Owner-only Hidden Audit panel for Admin/Manager with NORMAL / CRITICAL_ONLY / HIDDEN modes.
- Critical/security actions remain auditable even when ordinary staff actions are hidden.
- Calculator extra options now support description, price, enable/disable, ordering and deletion from Owner/Admin Bot Panel.
