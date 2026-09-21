# Implemented foundation — v1.0.1

- Telegram Mini App frontend, responsive premium dark/lime UI.
- Full-screen branded startup splash with INIT/AUTH/PROFILE/CONFIG/READY stages.
- Splash locale priority and EN fallback (`The best is here`) per v1.3.
- Central motion tokens, button/card/modal transitions, reduced-motion support.
- Compact branded calculator processing overlay + result modal.
- Telegram initData validation and owner hard-binding to `375938798`.
- VIP discount is server-derived; client cannot spoof its tier.
- Central permissions module foundation for OWNER / ADMIN / MANAGER / CLIENT.
- Maintenance state, blacklist state, working schedule state, deferred/emergency request rules.
- 60-minute rate limit only for real work requests, not calculations.
- Calculator and request FX snapshots; emergency multiplier support.
- Voluntary phone-sharing entry point through the Telegram bot.
- Dynamic services/socials foundation and D1 schema for CRM, orders, payments, delivery, referrals, analytics and audit.
- D1 deployment naming fixed to lowercase `chameleondetailing`.
