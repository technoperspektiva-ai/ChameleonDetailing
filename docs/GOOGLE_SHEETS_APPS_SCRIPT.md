# Google Sheets via Apps Script — ChameleonDetailing v1.1.46

Target spreadsheet:
`https://docs.google.com/spreadsheets/d/1L8lF0A3SIQ06pmRDCq-7RwqNWvnRL9nomsMg0I7UxxM/edit`

## One-time setup

1. Open the target Google Sheet.
2. Open **Extensions → Apps Script**.
3. Delete the starter code and paste the complete contents of `integrations/google-apps-script.gs`.
4. Change only this line to your own long random secret:
   `const WEBHOOK_SECRET = 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET';`
5. Save and run `setup()` once. Approve the Google permission prompt.
6. Choose **Deploy → New deployment → Web app**.
7. Set **Execute as: Me** and **Who has access: Anyone**.
8. Deploy and copy the final URL ending in `/exec`.
9. In Cloudflare Worker → Settings → Variables and Secrets add:
   - `GOOGLE_SHEETS_WEBHOOK_URL` = the `/exec` Web App URL
   - `GOOGLE_SHEETS_WEBHOOK_SECRET` = exactly the same secret used in Apps Script
10. Redeploy the Worker.
11. Open a private chat with the bot and send `/sheets`.
12. Press **Check**, then **Sync now**.

## How it works

D1 remains the primary database. Google Sheets is only a reporting mirror. The Worker does not call Google on every Mini App action. The existing 30-minute cron checks whether the configured interval is due, so 1h mode produces at most one report snapshot per hour.

Available intervals from `/sheets`: OFF, 1h, 6h, 24h.

The following tabs are automatically created/updated: Users, Orders, Payments, Revenue, VIP, Referrals, Analytics, Staff Activity, Business Report.

Existing `.xlsx` reports in the Telegram bot are not removed. From the `/sheets` panel, **Standard Excel reports** returns to the existing reports panel.

After the full project reset action, v1.1.46 schedules a fresh Google Sheets snapshot once the reset operation has finished. This makes the report mirror match the newly cleaned D1 data.
