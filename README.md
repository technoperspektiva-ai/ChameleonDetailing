# ChameleonDetailing

Version **1.0.2** — first-deploy fix with explicit Cloudflare Git deployment verification.

Production-oriented Telegram Mini App + Telegram Bot foundation for **@ChameleonDetailing_bot** on Cloudflare Workers, Vite/React and D1.

- GitHub repository: `ChameleonDetailing`
- Cloudflare Worker: `ChameleonDetailing`
- D1 database: `chameleondetailing` (**lowercase required**)
- D1 binding: `DB`
- Owner Telegram ID: `375938798`
- Languages: UA / PL / EN, first-launch fallback EN
- Currencies: PLN / USD / UAH

## Local check
```bash
npm install
npm run build
```

## D1
Create the DB with:
```bash
npx wrangler d1 create chameleondetailing
```
Then bind it as `DB` using the generated database ID. See `docs/DEPLOY.md` and `docs/D1_BINDING.example.jsonc`.

## Required secrets/vars
`BOT_TOKEN`, `SESSION_SECRET`, `APP_URL`. Recommended: `TELEGRAM_WEBHOOK_SECRET`.

The Worker is intentionally deployable before D1 is bound; persistent CRM/orders activate when `DB` exists.


## Deployment sanity check
After Cloudflare deployment open `/__version`. It must return `ChameleonDetailing` and version `1.0.2`. Plain `Hello world` means the wrong/default Worker was deployed.
