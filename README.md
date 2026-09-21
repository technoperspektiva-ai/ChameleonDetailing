# ChameleonDetailing

Version **1.1.1** — architecture v1.4 UI/i18n update and **no-webhook Telegram mode**.

Production Telegram Mini App foundation for **@ChameleonDetailing_bot** on Cloudflare Workers, React/Vite and D1.

- GitHub repository: `ChameleonDetailing`
- Cloudflare Worker: `chameleondetailing`
- D1 database: `chameleondetailing`
- D1 binding: `DB`
- Owner Telegram ID: `375938798`
- Locales: `uk`, `pl`, `en`; UI labels: `UA`, `PL`, `EN`
- Fallback locale: English
- Currencies: PLN / USD / UAH
- Telegram webhook: **disabled by product design**

## v1.4 changes

- responsive hero with independent copy and mascot zones;
- safe-area support and QA-safe layouts from 320px through 430px+;
- responsive typography tokens and 44px+ touch targets;
- full customer UI localization through one i18n layer;
- UA/PL/EN JSON dictionaries with build-time completeness validation;
- no `UK` language badge — Ukrainian is always `UA` in the UI;
- no mixed-language holiday / navigation / calculator state;
- `?debugLocale=long` overflow stress mode;
- improved text wrapping, dynamic card heights and modal scrolling;
- webhook receiver removed from Worker;
- webhook setup script removed;
- one-shot `telegram:webhook:delete` command added.

## Build

```bash
npm install
npm run build
```

The build fails if UA/PL/EN translation keys are incomplete.

## D1

```bash
npx wrangler d1 create chameleondetailing
```

Then bind the real database UUID as `DB`.

## Required production secrets / vars

- `BOT_TOKEN` — still required to validate Telegram Mini App `initData`;
- `SESSION_SECRET` — secret;
- `APP_URL` — deployed Mini App URL.

`BOT_TOKEN` does **not** mean that a webhook is enabled.

## Disable an already configured Telegram webhook

The repository no longer registers a webhook. If Telegram already has an old webhook saved, delete it once:

```bash
BOT_TOKEN='YOUR_TOKEN' npm run telegram:webhook:delete
```

This calls Telegram `deleteWebhook` with `drop_pending_updates=false`.

## Deployment sanity check

Open `/__version` after deployment. It must report version `1.1.1` and `worker: true`.


## Telegram bot

The bot webhook is enabled again. See `docs/TELEGRAM_BOT.md`.
