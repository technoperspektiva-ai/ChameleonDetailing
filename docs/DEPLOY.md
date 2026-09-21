# First deployment — ChameleonDetailing

The Worker/project is `ChameleonDetailing`. GitHub repository may stay `ChameleonDetailing`.
The D1 database name is **strictly lowercase**: `chameleondetailing`.

## Safest first deploy
1. Push the contents of this folder to the GitHub repository `ChameleonDetailing`.
2. In Cloudflare Workers & Pages create/connect Worker `ChameleonDetailing` from that repository.
3. Build command: `npm run build` (or `npm run deploy` only when deploying with Wrangler from CI).
4. The first deploy intentionally does not hard-code a D1 `database_id`; this prevents a nonexistent/placeholder ID from breaking deployment. The app boots in safe fallback mode until DB is bound.
5. Create D1 with the exact name `chameleondetailing`.
6. Add D1 binding `DB` in Cloudflare Dashboard, or copy the block from `docs/D1_BINDING.example.jsonc` and paste the real database ID into `wrangler.jsonc`.
7. Apply `database/migrations/0001_initial.sql` from D1 Console or run `npm run db:migrate:remote` after the binding is present.
8. Add secrets/variables: `BOT_TOKEN`, `SESSION_SECRET`, `APP_URL`, optionally `TELEGRAM_WEBHOOK_SECRET`.
9. Set `APP_URL` to the final HTTPS Worker URL.
10. Run `npm run telegram:webhook` locally with `BOT_TOKEN`, `APP_URL`, and optionally `TELEGRAM_WEBHOOK_SECRET` exported.

## Important
Do not paste a fake D1 UUID into `wrangler.jsonc`: Cloudflare will reject the deployment. The schema is idempotent and the Worker can start without D1, but CRM/orders need the `DB` binding to persist data.
