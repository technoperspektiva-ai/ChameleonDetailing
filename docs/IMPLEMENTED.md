# Implemented in v1.1.2

- architecture v1.4 base
- React/Vite Telegram Mini App
- Cloudflare Worker backend
- Telegram initData authentication
- D1 users / profiles / services / requests foundation
- Owner role protection
- UA / PL / EN UI dictionaries
- UA / PL / EN service title and description translations
- automatic repair of old incorrect service translations in D1
- localized bot `/start` and `/help`
- active Telegram webhook Worker endpoint
- automatic webhook reconciliation on Mini App open/auth/status
- 30-minute webhook recovery cron
- Telegram bot health endpoint using `getMe` + `getWebhookInfo`
- startup splash / calculator processing overlay
- maintenance / blacklist / schedule foundations


# Implemented in v1.3.0 — Desktop Control Center

- one backend / one D1 / one permission system for Mini App, Bot Panel and Desktop
- /desktop one-time Telegram-authenticated login token with 14-day device session
- /sales quick search by order, phone, @username and license plate
- backend-enforced Manager permissions for Desktop, Sales, CRM, finance and broadcasts
- Desktop global modes: Online / Read Only / Maintenance / Disabled
- Desktop dashboard with operational KPIs and quick actions
- Orders workspace: table, filters, Kanban and full order side panel
- Sales search and order editing against the original service_requests row
- accelerated-work option with final-price update
- Clients CRM, Cars CRM, Calendar, Services, Payments, Staff and Audit views
- Broadcast Center with standard/important messages, audiences, scheduling and recurrence
- chunk-safe scheduled campaign runner from Cloudflare cron
- Desktop device sessions with revoke support
- Owner Layout Editor with Draft / Lock / Publish / Versions / Revert
- role-specific workspace preview and responsive Desktop / Laptop / iPad preview
- UI-only Workspace Template export/import with logical data-source mappings
- Workspace templates explicitly exclude clients, orders, Telegram IDs, secrets and financial history
