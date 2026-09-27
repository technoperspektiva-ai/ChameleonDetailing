# Desktop redesign delivery status

This is the first functional delivery of the master specification, not completion of all 174 sections.

Implemented: feature module extraction, grouped sidebar/topbar, dark/light design tokens, role-gated routes, hash navigation, order/client deep links, command palette, Today view, order board and table, assignment to self, undo for status/scheduling changes, saved views, client/car context, day/week/month calendar, manual order creation for existing clients/cars, service editor tabs, lazy-loaded business/system modules, mutation feedback, shared table/dialog/loading primitives and user-scoped local preferences.

Backend additions retain D1 and existing endpoint contracts. Manual order creation starts with the catalog base price and requires final price review; it is not a replacement for the client calculator. No database reset or destructive migration is required.

Still required for full acceptance:

- Full five-language coverage of new operational screens; new copy currently uses Ukrainian.
- Complete client creation, car editing/default packages, unified timeline and profile-level offers/access controls.
- Full order history, percentage surcharge approvals, complete staff picker and order action menu.
- Calendar capacity/holiday/working-hours integration (the current grid shows all hours and visually distinguishes 08:00–20:00, not the saved business schedule).
- Broadcast wizard with recipient estimate and send-test workflow; existing campaign editor remains available.
- True shared live widget rendering, draft autosave, publish diff, workspace profiles and direct resize. Sidebar preview now uses the real component; widget preview remains a sample.
- Notification feed, complete permission presets and audit filters.
- Server-side pagination/unbounded entity search. Existing backend limits still apply (250 orders, 300 clients, 400 cars).

Validation: TypeScript application/Worker build, existing translation validator and Vite production build. No authenticated production workflow test or real broadcast/payment mutation was performed.

Deployment target remains the existing Cloudflare Worker from `wrangler.jsonc`. GitHub's included workflow performs a build only; Cloudflare Git integration or authenticated Wrangler deployment is needed to publish.

Deployment confirmed on 2026-09-27: the public `/desktop` response served the same `index-BVMGGdB7.js` production asset as the local build; GitHub Actions run 36320755891 completed successfully for commit 25c042f215b158076b031491fbd6c282077e06db. The existing external Cloudflare integration publishes changes from main.
