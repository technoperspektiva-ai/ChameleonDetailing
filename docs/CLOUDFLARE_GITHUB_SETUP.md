# Cloudflare GitHub deployment settings

Canonical names for this project:

- GitHub repository: `ChameleonDetailing`
- Cloudflare Worker: `chameleondetailing`
- D1 database: `chameleondetailing`
- D1 binding: `DB`
- Telegram bot: `@ChameleonDetailing_bot`

## Git integration

Connect the GitHub repository `ChameleonDetailing` to the Cloudflare Worker **`chameleondetailing`**.

Use:

- Production branch: `main` (or your actual default branch)
- Root directory: `/`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Wrangler configuration: `/wrangler.jsonc`

The repository's `wrangler.jsonc` has `name = chameleondetailing`, so Wrangler deploys to that Worker instead of a starter Worker.

## If the URL says Hello world

`Hello world` is **not** produced anywhere by this repository. It means one of these is true:

1. You opened the URL of another Worker.
2. The Cloudflare Git integration is attached to a starter Worker instead of `chameleondetailing`.
3. Cloudflare did not run `npx wrangler deploy` from this repository root.
4. An older deployment is still active.

Open the deployment URL shown on the latest successful deployment for **`chameleondetailing`**, not a previously created `*.workers.dev` project.

## Verification

After a successful deployment open:

`https://chameleondetailing.<your-subdomain>.workers.dev/__version`

Expected response:

```json
{
  "app": "ChameleonDetailing",
  "version": "1.0.3",
  "database": "chameleondetailing",
  "worker": true
}
```

Then open the root URL. The React/Vite Mini App must render instead of plain text.

## D1

Create the database with:

```bash
npx wrangler d1 create chameleondetailing
```

After Cloudflare returns its database UUID, add the D1 binding to `wrangler.jsonc` using binding `DB`. Do not invent a database ID.
