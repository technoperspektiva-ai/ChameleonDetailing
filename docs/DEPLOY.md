# First deployment — ChameleonDetailing

Canonical deployment mapping:

- GitHub: `ChameleonDetailing`
- Cloudflare Worker: `chameleondetailing`
- D1: `chameleondetailing`
- D1 binding: `DB`
- Telegram: `@ChameleonDetailing_bot`

## 1. GitHub

Upload **the contents of this archive** to the root of repository `ChameleonDetailing`. `package.json`, `wrangler.jsonc`, `src/`, `worker/` and `index.html` must all be at repository root. Do not upload the enclosing folder as an extra nested directory.

## 2. Cloudflare

Create/select Worker `chameleondetailing` and connect repository `ChameleonDetailing`.

Build command:

```bash
npm run build
```

Deploy command:

```bash
npx wrangler deploy
```

Root directory: `/`

## 3. First verification — before Telegram

Open:

```text
https://chameleondetailing.<your-workers-subdomain>.workers.dev/__version
```

It must return `version: 1.0.3`. Then open `/`; the Mini App UI must load.

If `/` says `Hello world`, stop configuring Telegram: that URL is serving another/default Worker or an old deployment. Fix the Worker/repository binding first.

## 4. D1

Create lowercase D1 `chameleondetailing`. Keep binding name uppercase `DB`. Add its real UUID to `wrangler.jsonc` only after Cloudflare creates it.

## 5. Secrets / variables

Required for Telegram production:

- `BOT_TOKEN` — secret
- `SESSION_SECRET` — secret
- `APP_URL` — deployed `https://...workers.dev` or custom domain

Optional/recommended:

- `TELEGRAM_WEBHOOK_SECRET` — secret

Non-secret defaults are already in `wrangler.jsonc`.

## 6. Telegram webhook

After `APP_URL`, `BOT_TOKEN` and optional webhook secret are configured, run the provided webhook setup script or set BotFather Web App URL to the deployed Mini App URL.

## Cloudflare Workers Builds — important

This repository is self-building during `wrangler deploy`. The `wrangler.jsonc` contains:

```json
"build": {
  "command": "npm run build"
}
```

Therefore the Cloudflare **Deploy command may stay exactly**:

```bash
npx wrangler deploy
```

Wrangler will first run the React/Vite build, create `dist/`, verify it, then upload the Worker and static assets. This prevents `assets.directory ./dist does not exist` when the dashboard Build command is empty.
