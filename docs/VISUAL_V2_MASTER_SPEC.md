# ChameleonDetailing — Visual V2 / Staging Master Contract

## 0. Purpose
This branch is the only place for the premium Mini App redesign. `main` is the protected production baseline.

The goal is not to invent a new product. The goal is to preserve all existing working business logic and raise the Mini App to the approved visual reference level: premium black detailing studio, glossy automotive photography, warm-gold ambient light, restrained neon-lime interaction accents, translucent dark glass cards, compact typography, precise spacing, and high information density without visual noise.

## 1. Non-negotiable rules for any AI / developer
1. Never modify `main` directly.
2. Never remove, rename, simplify, or replace existing business functionality unless the task explicitly requires it.
3. Never "improve" an approved screen by redesigning unrelated areas.
4. Never replace working components with speculative mockups.
5. Never fake API data in production code. Test/demo data must be isolated behind an explicit staging/test mode.
6. Every visual change must preserve click behavior, routes/tabs, Telegram WebApp behavior, API calls, localization, currency logic, saved cars, calculator logic, VIP logic, orders, profile, and service availability behavior.
7. If a new implementation is visually or functionally worse than the current implementation, keep the current implementation.
8. One task = one bounded visual/functional scope. Do not batch unrelated rewrites.
9. Before editing a screen, inspect the existing component, styles, state, events, API calls, and responsive rules.
10. After editing, run build/check and perform the QA matrix below before presenting the result.

## 2. Visual target
The supplied reference screenshots are the visual contract.

### Core aesthetic
- Background: near-black, premium studio/showroom atmosphere, not flat #000.
- Hero imagery: realistic glossy black vehicles and detailing studio scenes; no cheap stock look.
- Accent hierarchy:
  - Neon lime = primary interactive state / selected / CTA.
  - Warm gold = premium informational accent / VIP / secondary highlight.
  - White = primary text.
  - Soft gray = supporting text.
- Cards: translucent black glass, subtle borders, very soft highlights, restrained blur.
- Buttons: less bulky than current UI; compact, elegant, slightly transparent by default. Strong filled lime is reserved for the main action.
- Corners: premium rounded geometry, consistent radius system.
- Shadows: minimal. Prefer inner highlights, borders, blur, and controlled glow over large drop shadows.
- Icons: consistent line weight and family; approved branded assets take priority over generic Lucide icons where an approved asset exists.
- No visual clutter, rainbow effects, random gradients, or decorative elements that compete with the content.

### Composition principles
- Use full-width editorial hero blocks.
- Layer car imagery into the environment rather than placing it as a detached PNG card whenever appropriate.
- Keep critical action within thumb reach.
- Bottom nav stays readable and fixed with safe-area support.
- Preserve strong hierarchy: brand -> page purpose -> primary object/action -> supporting modules.
- Avoid oversized headings that force excessive scrolling.
- Use real data from the existing app wherever possible.

## 3. Screen contracts

### Home
Must feel like a premium landing dashboard, not a generic app home.
Required:
- brand header + locale control;
- premium hero with vehicle/studio visual;
- main CTA: schedule/detailing action;
- next visit / vehicle state / recommendation summary;
- service-open/closed information;
- popular services;
- bottom navigation.
Do not expose a large price in the hero CTA unless explicitly requested. Keep CTA visually cleaner than the reference if needed.

### Garage / Cars
Required:
- current car hero;
- brand/model/plate/body type/ceramic state;
- car switcher + add car;
- body condition, interior condition, ceramic status, last visit;
- next recommended care;
- service history timeline;
- edit/history/schedule actions.
Must work with multiple saved cars.

### Calculator
Required:
- clear multi-step progress;
- saved-car choice and "other car";
- service direction selection;
- full-detailing conflict rules;
- add-ons;
- price calculation;
- result/confirmation modal;
- saved defaults per car;
- current schedule availability;
- safe iPhone scrolling.
Do not sacrifice calculator behavior for visual similarity.

### VIP
Required:
- status/tier;
- priority booking;
- personal terms/offers;
- concierge;
- privilege block;
- progress to next tier if supported by real data;
- concierge contact only when data exists;
- next visit.
Never invent a named concierge, tier progress, or benefits that are not backed by the current backend/config.

### Profile
Preserve all current user settings, locale/currency, referral, requests/history entry points and any existing account controls.

## 4. Motion
- 160–260ms for ordinary transitions.
- 320–500ms for hero/image reveal.
- Use opacity/translate/scale subtly.
- Haptics where already integrated.
- No looping movement that distracts from reading.
- Respect `prefers-reduced-motion`.

## 5. Responsive contract
Primary acceptance device: iPhone 13 in Telegram Mini App.
Also verify:
- narrow iPhone viewport;
- modern Android;
- iPad portrait;
- desktop browser only as a development aid.
Rules:
- no horizontal scroll;
- no cropped vehicle image that hides essential content;
- no bottom-nav overlap;
- modals must remain scrollable;
- safe-area insets must be honored;
- tap targets >= 44px where practical;
- text must not collide at 100% text size.

## 6. Functional freeze
The following are regression-sensitive and must not be rewritten casually:
- Telegram session/auth;
- direct-web gate;
- maintenance/blocked state;
- schedule/open-hours refresh;
- services/options;
- calculator pricing and conflicts;
- cars and per-car defaults;
- orders;
- VIP logic;
- referrals;
- localization;
- currency;
- bot/worker APIs;
- D1 schema;
- desktop panel.

## 7. Staging policy
Production data and production bot behavior must not be used as a playground.

Before any public staging deploy:
- use a separate Worker environment/name;
- use a separate D1 database or a strictly isolated staging binding;
- set an explicit `ENVIRONMENT=staging`;
- disable or redirect outbound Telegram notifications that could reach real clients;
- use test identities/test records only;
- never run destructive migrations against production as part of a staging experiment.

## 8. Required pre-merge QA
A change is not ready for `main` until:
- `npm run build` passes;
- i18n verification passes;
- no TypeScript errors;
- Home / Garage / Services / Calculator / VIP / Profile open;
- bottom nav works on every screen;
- locale switch works;
- calculator can complete a real happy path;
- modal close/back/scroll works;
- saved car selection works;
- blocked/maintenance/off-hours states still render;
- no console-breaking runtime error;
- no obvious visual regression on iPhone 13;
- QA owner explicitly accepts the staging build.

## 9. Prompt to use with a coding model
You are working on the repository `technoperspektiva-ai/ChameleonDetailing` on branch `staging/visual-v2`.

Your job is execution, not creative reinterpretation.

FIRST inspect the existing implementation and understand all state, API calls, click handlers and responsive behavior in the exact screen you are changing.

THEN implement only the requested scope.

You MUST preserve every working behavior that is outside the requested scope. Do not simplify the app. Do not replace real functionality with a prototype. Do not change `main`. Do not touch the production Cloudflare/D1 setup.

The visual target is a premium black automotive-detailing Mini App matching the approved screenshots: realistic glossy black vehicle imagery, warm architectural gold light, restrained neon-lime interactive accents, transparent/dark-glass cards, crisp white typography, compact spacing, subtle borders, minimal shadows, elegant buttons and high-end editorial composition.

The screenshots are references for layout, hierarchy, atmosphere and finish. Existing ChameleonDetailing business logic is authoritative for behavior and data. Where the screenshot shows information that the backend does not actually have, omit it or use a truthful existing field; never fabricate product state.

Before declaring completion:
1. run the repository checks/build;
2. verify no unrelated files/functionality were changed;
3. provide a precise changed-file list;
4. provide a regression-risk note;
5. provide QA steps for the exact screen;
6. do not merge to `main`.

If uncertain whether a change is safe, preserve the current implementation and report the uncertainty instead of guessing.
