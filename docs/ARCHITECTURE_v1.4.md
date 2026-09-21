# Detailing Telegram Mini App — Product & System Architecture v0.1

> Статус: концепт / foundation document  
> Платформа: Telegram Bot + Telegram Mini App + Cloudflare + GitHub  
> Основні мови: UA / PL / EN  
> Мета документа: зафіксувати архітектуру продукту до початку реалізації, щоб UI, ролі, тарифи, калькулятор, VIP-логіка, реферали, аналітика та контент масштабувалися без переписування ядра.

---

## 1. Ідея продукту

Продукт — це Telegram Mini App для детейлінг-сервісу, який поєднує:

1. Публічний міні-сайт усередині Telegram.
2. Калькулятор вартості послуг.
3. Динамічне формування ціни залежно від:
   - обраної послуги;
   - класу/типу автомобіля;
   - стану автомобіля;
   - додаткових опцій;
   - статусу клієнта;
   - VIP-тарифу;
   - потенційних промо/реферальних правил.
4. Telegram-бот для входу, навігації, рефералів і повідомлень.
5. Адміністративну частину для Owner / Admin / Manager.
6. Систему VIP / whitelist.
7. Аналітику користувачів і використання калькулятора.
8. Реферальну систему “Порекомендувати другу”.
9. Повну мультимовність UA / PL / EN.
10. Повністю модульний UI, де кожен компонент можна замінювати окремо.

---

# 2. Основний продукт

## 2.1. Для звичайного користувача

Користувач відкриває Telegram-бота, натискає `/start`, отримує чисте вітальне повідомлення і кнопку відкриття Mini App.

Після відкриття Mini App користувач отримує персональну Telegram-сесію.

Головний сценарій:

`Start Bot → Mini App → вибір авто → вибір послуги → стан авто → додаткові опції → фінальна ціна → заявка / контакт / рекомендація другу`

### Основні користувацькі розділи

- Home
- Послуги
- Калькулятор
- VIP / статус клієнта
- Мої розрахунки
- Рекомендувати другу
- Контакти
- Мова
- Профіль

---

# 3. Рольова модель

Система будується за принципом:

`OWNER > ADMIN > MANAGER > VIP CLIENT > CLIENT`

Кожна наступна роль має менше прав.

---

## 3.1. OWNER

Головний аккаунт продукту.

Owner не видається через інтерфейс і не може бути випадково видалений.

### Права Owner

- повний контроль продукту;
- призначення Admin;
- зняття Admin;
- призначення Manager;
- видалення Manager;
- управління користувачами;
- управління whitelist;
- управління VIP;
- управління тарифами;
- управління послугами;
- управління калькулятором;
- управління коефіцієнтами;
- управління локалізаціями;
- управління UI-конфігурацією;
- управління feature flags;
- перегляд повної аналітики;
- перегляд рефералів;
- керування системними повідомленнями;
- редагування welcome message;
- редагування Bot Menu;
- редагування продукту;
- доступ до журналу дій;
- блокування користувачів;
- ручне редагування клієнтського статусу.

### Важливо

Owner визначається жорстко заданим Telegram User ID:

```text
375938798
```

Це єдиний Owner продукту.

Owner не можна:
- змінити через UI;
- видалити;
- понизити;
- заблокувати через UI;
- замінити іншим користувачем;
- створити другого Owner.

На backend кожна критична перевірка Owner повинна звіряти фактичний Telegram User ID з `375938798`.

---

## 3.2. ADMIN

Admin має майже всі права над продуктом.

### Admin може

- редагувати продукт;
- змінювати послуги;
- змінювати ціни;
- змінювати коефіцієнти;
- керувати VIP;
- керувати whitelist;
- створювати Manager;
- видаляти Manager;
- редагувати користувачів;
- переглядати аналітику;
- переглядати реферали;
- редагувати локалізації;
- змінювати UI-конфігурацію;
- керувати контентом;
- переглядати audit log.

### Admin НЕ може

- створювати інших Admin;
- видаляти Admin;
- змінювати Owner;
- змінювати системний Owner ID;
- змінювати критичні security secrets.

---

## 3.3. MANAGER

Manager — операційна роль.

### Manager може

- додавати нових клієнтів;
- редагувати базові дані клієнта;
- видавати VIP;
- забирати VIP;
- додавати користувача у whitelist;
- видаляти користувача з whitelist;
- переглядати список клієнтів;
- переглядати історію розрахунків;
- створювати/редагувати нотатки клієнта;
- переглядати обмежену аналітику.

### Manager НЕ може

- редагувати продукт;
- змінювати послуги;
- змінювати базові тарифи;
- змінювати коефіцієнти;
- створювати Admin;
- створювати Manager;
- змінювати локалізацію;
- змінювати UI;
- змінювати системні налаштування.

---

## 3.4. VIP CLIENT

VIP — не адміністративна роль, а клієнтський статус.

VIP може мати:

- спеціальні ціни;
- спеціальний коефіцієнт;
- окремий прайс;
- персональні пропозиції;
- додаткові послуги;
- пріоритетний контакт;
- приховані пропозиції;
- майбутню loyalty-систему.

VIP видається вручну:

- Owner;
- Admin;
- Manager.

---

## 3.5. CLIENT

Стандартний клієнт.

Може:

- користуватися Mini App;
- користуватися калькулятором;
- отримувати стандартні ціни;
- зберігати свої розрахунки;
- відправляти заявку;
- рекомендувати сервіс другу;
- бачити свій статус.

---

# 4. Permission Architecture

Не перевіряти права через прості умови типу:

`if role === "admin"`

Використовувати централізовану систему permissions.

Приклад:

```ts
permissions = {
  user.read,
  user.create,
  user.update,
  vip.assign,
  vip.remove,
  whitelist.manage,
  manager.create,
  manager.remove,
  admin.create,
  admin.remove,
  service.edit,
  pricing.edit,
  calculator.edit,
  content.edit,
  localization.edit,
  analytics.full,
  analytics.basic,
  audit.read,
  settings.edit
}
```

Ролі отримують набір permissions.

Це дозволить надалі додати:

- operator;
- accountant;
- franchise-admin;
- location-manager;
- marketing-manager;

без переписування системи.

---

# 5. Telegram Authentication

Основний принцип — Telegram є identity provider.

Mini App НЕ використовує окремий логін/пароль.

### Flow

`Telegram → WebApp initData → Cloudflare Worker → validation → user/session → Mini App`

Backend повинен:

1. отримати Telegram `initData`;
2. перевірити Telegram signature;
3. отримати Telegram User ID;
4. знайти або створити користувача в D1;
5. визначити роль;
6. визначити VIP;
7. визначити whitelist;
8. створити/оновити session;
9. повернути frontend session payload.

---

# 6. Sessions

Для кожного Telegram-користувача існує власна сесія.

Рекомендована модель:

- D1 — користувачі та довготривалі session metadata;
- signed session token / secure cookie — поточна авторизація;
- KV — тільки якщо буде потрібен швидкий кеш;
- Durable Objects — тільки якщо пізніше знадобиться realtime/shared state.

Не прив'язувати business logic до localStorage.

---

# 7. Telegram Bot

Бот — не просто launcher.

Він є окремою частиною продукту.

## Команди

### `/start`

Повинен:

1. визначити нового / існуючого користувача;
2. визначити referral payload;
3. записати visit;
4. записати referral;
5. створити користувача, якщо його ще немає;
6. показати welcome message;
7. показати кнопку Mini App.

### Важливо

Після натискання Start не повинно залишатися зайвого “сміття”.

Bot повинен максимально використовувати:

- editMessageText;
- editMessageReplyMarkup;
- deleteMessage;

там, де це дозволено Telegram API.

Ціль: у чаті залишається акуратний актуальний UI.

---

# 8. Welcome Message

Welcome message є контентним блоком і не hardcode-иться в боті.

Зберігається в content/config.

Окремо:

- `welcome.ua`
- `welcome.pl`
- `welcome.en`

Може містити:

- бренд;
- короткий опис;
- CTA;
- кнопку “Відкрити калькулятор”;
- кнопку “Порекомендувати другу”;
- контакт.

Owner/Admin можуть змінювати текст без зміни коду.

---

# 9. Referral System

Кожен користувач отримує персональний referral code.

Приклад:

`/start ref_7H4K2`

або Telegram deep-link:

`https://t.me/BOT_USERNAME?start=ref_7H4K2`

## Фіксуємо

- хто запросив;
- кого запросили;
- дата;
- перший launch;
- чи відкрив Mini App;
- чи користувався калькулятором;
- чи створив заявку;
- чи став VIP.

## Аналітика

- referrals created;
- referral clicks;
- referred registrations;
- calculator conversions;
- lead conversions.

На старті не обов'язково давати бонус.

Архітектура має дозволити потім додати:

- бонус;
- знижку;
- referral points;
- referral VIP.

---

# 10. Calculator

Калькулятор — центральна частина продукту.

Ціну не можна hardcode-ити у frontend.

Backend/DB повинні бути source of truth.

---

## 10.1. Базова формула

Приклад логіки:

```text
final_price =
service_base_price
× vehicle_multiplier
× condition_multiplier
+ options_total
- client_discount
```

Але формулу потрібно реалізувати через configurable pricing engine.

---

## 10.2. Фактори

### Service

Наприклад:

- Хімчистка
- Полірування
- Кераміка
- Мийка
- Детейлінг салону
- Детейлінг кузова
- Комплекс

### Vehicle

- Sedan
- Hatchback
- Coupe
- SUV
- Large SUV
- Van
- Premium / special size

### Condition

Наприклад:

- Light
- Normal
- Dirty
- Very Dirty
- Extreme

Кожен стан має coefficient.

Наприклад:

```text
Light       1.00
Normal      1.10
Dirty       1.25
Very Dirty  1.50
Extreme     custom/manual
```

Значення повинні редагуватися через Admin UI.

---

# 11. VIP Pricing

VIP не повинен бути простим boolean `is_vip`.

Рекомендована структура:

```text
client_tier:
- STANDARD
- VIP
- VIP_PLUS
```

Навіть якщо на першому релізі використовуються тільки STANDARD/VIP.

Це дозволить масштабувати продукт.

VIP pricing може працювати як:

### Варіант A
відсоток:

`-10%`

### Варіант B
окремий price list.

### Варіант C
окремий multiplier.

Рекомендація:

підтримувати всі три механізми на рівні engine, навіть якщо UI v1 використовує тільки один.

---

# 12. Whitelist

Whitelist — окрема сутність від VIP.

Причина:

VIP = pricing/business status.

Whitelist = access/permission/business exception.

Приклади майбутнього використання:

- доступ до закритої послуги;
- тестова функція;
- special pricing;
- корпоративний клієнт;
- ручний доступ до beta;
- доступ до premium booking.

---

# 13. User Analytics

Потрібно чітко розділити метрики.

## Основні

### Total Users
Користувачі, які натиснули `/start`.

### Mini App Users
Користувачі, які відкрили Mini App.

### Calculator Users
Користувачі, які хоча б раз почали/завершили розрахунок.

### Leads
Користувачі, які натиснули CTA заявки/контакту.

### Referral Users
Користувачі, що прийшли через referral link.

### VIP Users
Поточна кількість VIP.

---

# 14. Event Tracking

Не рахувати статистику тільки з таблиці users.

Створити event-driven analytics.

Приклад подій:

```text
bot_start
miniapp_open
calculator_open
calculator_service_selected
calculator_vehicle_selected
calculator_condition_selected
calculator_completed
lead_created
referral_link_created
referral_open
vip_assigned
vip_removed
whitelist_added
whitelist_removed
language_changed
```

Це дозволить робити нормальну статистику без зміни основних таблиць.

---

# 15. Telegram Bot Control Panel

Адміністративної частини в Mini App НЕ буде.

Mini App — виключно клієнтський продукт.

Усе керування продуктом відбувається через окрему role-aware Telegram Bot Panel.

Backend повертає permissions і доступні bot-actions відповідно до ролі.

## Owner Bot Panel

- Dashboard
- Users
- VIP
- Whitelist
- Managers
- Admins
- Services
- Pricing
- Calculator Rules
- Content
- Languages
- Referrals
- Analytics
- Audit Log
- Settings

## Admin Bot Panel

Майже те саме, але без:
- створення/видалення Admin;
- зміни Owner;
- security-critical settings.

## Manager Bot Panel

- Users
- Add Client
- VIP
- Whitelist
- Client Notes
- Calculator History
- Basic Analytics

## Принцип UX

Bot Panel не повинна засмічувати чат десятками повідомлень.

Використовувати:
- editMessageText;
- editMessageReplyMarkup;
- deleteMessage;
- inline keyboard;
- callback queries;
- paginated lists;
- confirmation screens.

Ціль: одна актуальна керуюча панель у чаті, яка оновлюється замість постійного створення нових повідомлень.

---

# 16. Audit Log

Критично для продукту з кількома адміністративними ролями.

Записувати:

- actor;
- action;
- target;
- old value;
- new value;
- timestamp;
- Telegram ID;
- role.

Наприклад:

```text
ADMIN #2381 changed service "Interior Cleaning"
price: 2000 → 2300
```

або:

```text
MANAGER #531 assigned VIP to USER #842
```

---

# 17. D1 Database — Core Tables

Початкова схема.

## users

- id
- telegram_user_id
- username
- first_name
- last_name
- language
- role
- status
- created_at
- updated_at
- last_seen_at

## user_roles

За потреби майбутньої multi-role системи.

## user_permissions

Для override permission.

## client_profiles

- user_id
- client_tier
- vip_since
- notes
- assigned_manager_id

## whitelist

- user_id
- type
- reason
- created_by
- created_at
- expires_at

## services

- id
- slug
- enabled
- sort_order

## service_translations

- service_id
- locale
- title
- description

## service_prices

- service_id
- client_tier
- currency
- price

## vehicle_types

- id
- slug
- multiplier
- enabled

## condition_levels

- id
- slug
- multiplier
- enabled

## service_options

- id
- service_id
- price
- pricing_type
- enabled

## calculator_sessions

- id
- user_id
- service_id
- vehicle_type_id
- condition_level_id
- calculated_price
- currency
- created_at

## calculator_session_options

- calculation_id
- option_id
- price_snapshot

## referrals

- id
- referrer_user_id
- referred_user_id
- code
- created_at

## analytics_events

- id
- user_id
- event_type
- metadata_json
- created_at

## audit_log

- id
- actor_user_id
- action
- entity_type
- entity_id
- old_data_json
- new_data_json
- created_at

## content_blocks

- key
- locale
- value
- updated_at

## feature_flags

- key
- enabled
- config_json

---

# 18. Multilanguage Architecture

Locales:

```text
uk
pl
en
```

Не зберігати всі тексти в компонентах.

Структура:

```text
/locales
  /uk
    common.json
    calculator.json
    bot.json
    admin.json
  /pl
    common.json
    calculator.json
    bot.json
    admin.json
  /en
    common.json
    calculator.json
    bot.json
    admin.json
```

Dynamic content зберігається в D1.

Static UI translations — у файлах locales.

---

# 19. UI Architecture

Головний принцип:

**кожен елемент повинен бути змінним незалежно.**

Не створювати монолітні сторінки по 1000+ рядків.

Приклад:

```text
src/
  components/
    buttons/
    cards/
    icons/
    navigation/
    modals/
    calculator/
    admin/
  features/
    auth/
    calculator/
    referrals/
    users/
    vip/
    whitelist/
    services/
    analytics/
  pages/
  layouts/
  hooks/
  lib/
  locales/
```

---

# 20. Icon Architecture

Усі значки повинні мати централізований registry.

Наприклад:

```ts
icons = {
  home,
  calculator,
  car,
  services,
  profile,
  vip,
  referral,
  users,
  manager,
  admin,
  settings,
  analytics,
  language,
  history,
  logout,
  back,
  close,
  check,
  add,
  edit,
  delete
}
```

UI не повинен напряму імпортувати випадкові SVG у різних місцях.

Це дозволить замінити одну іконку одним файлом.

---

# 21. UI Concept

Візуальний напрям:

**premium automotive / detailing / clean luxury**

Не робити типовий “Telegram dashboard”.

Основні характеристики:

- темний premium background;
- великі фото/рендери авто;
- glass / soft panel UI;
- великі readable cards;
- мінімум зайвих рамок;
- сильна типографіка;
- чітка ціна;
- плавні transitions;
- native Telegram feeling;
- mobile-first;
- bottom navigation;
- one-hand interaction;
- 44px+ tap targets.

---

# 22. User Navigation

Рекомендований Bottom Nav:

1. Home
2. Services
3. Calculator
4. VIP / Benefits
5. Profile

У Mini App немає management entry для Owner/Admin/Manager.

Staff користується звичайним клієнтським Mini App як користувач.

Усі керуючі дії виконуються тільки через Telegram Bot Panel.

---

# 23. Home Screen

## Header

- Logo
- Language switch
- Profile avatar

## Hero

- короткий premium message;
- CTA “Розрахувати вартість”.

## Quick Actions

- Calculator
- Services
- Recommend
- Contact

## VIP Card

Якщо стандартний клієнт:

“VIP pricing is available for selected clients.”

Якщо VIP:

“Your VIP pricing is active.”

## Popular Services

3–4 cards.

## Referral Block

“Recommend us to a friend.”

---

# 24. Calculator UX

Не показувати 15 полів одночасно.

Flow по кроках.

### Step 1
Що потрібно?

### Step 2
Який автомобіль?

### Step 3
Який стан?

Використати visual cards.

### Step 4
Додаткові опції.

### Step 5
Результат.

Фінальний екран:

```text
Estimated price
2 650 PLN

Base service       2 000
Vehicle class      +250
Condition          +500
VIP discount       -100
```

CTA:

- Contact us
- Send request
- Save estimate
- Recommend to friend

---

# 25. Pricing Snapshot

Важливий принцип:

коли клієнт робить розрахунок, зберігати snapshot ціни.

Інакше після зміни прайсу стара історія стане неправильною.

Зберігати:

- base price;
- multipliers;
- options;
- discount;
- final price;
- currency;
- pricing version.

---

# 26. Product Configuration

Максимум business logic повинен бути configurable.

Наприклад:

```text
/config
  app.ts
  roles.ts
  permissions.ts
  navigation.ts
  icons.ts
  calculator.ts
  locales.ts
```

---

# 27. Cloudflare Architecture

Рекомендований стек:

## Frontend
React + TypeScript + Vite

## Backend
Cloudflare Workers

## Database
Cloudflare D1

## Static / images
Cloudflare R2

## Cache / optional
Cloudflare KV

## Security
Cloudflare Secrets

## Scheduled jobs
Cloudflare Cron Triggers

## Deployment
GitHub → Cloudflare

---

# 28. Worker API Structure

Приклад:

```text
/api/auth/*
/api/user/*
/api/services/*
/api/calculator/*
/api/referrals/*
/api/vip/*
/api/whitelist/*
/api/admin/*
/api/manager/*
/api/analytics/*
/api/content/*
/api/settings/*
/api/telegram/*
```

---

# 29. Suggested Repository Structure

```text
detailing-miniapp/
│
├─ apps/
│  ├─ miniapp/
│  └─ worker/
│
├─ packages/
│  ├─ ui/
│  ├─ config/
│  ├─ types/
│  ├─ permissions/
│  └─ i18n/
│
├─ database/
│  ├─ migrations/
│  ├─ seeds/
│  └─ schema/
│
├─ assets/
│  ├─ icons/
│  ├─ logos/
│  ├─ cars/
│  ├─ services/
│  └─ backgrounds/
│
├─ docs/
│  ├─ ARCHITECTURE.md
│  ├─ DATABASE.md
│  ├─ ROLES.md
│  ├─ API.md
│  ├─ UI.md
│  └─ DEPLOY.md
│
├─ scripts/
├─ wrangler.toml
├─ package.json
└─ README.md
```

---

# 30. Assets Rule

Ніяких великих спрайтів або зображень, у яких 10 елементів склеєні разом.

Кожна сутність окремим файлом.

Приклад:

```text
assets/icons/home.svg
assets/icons/calculator.svg
assets/icons/vip.svg

assets/services/interior-cleaning.webp
assets/services/polishing.webp

assets/cars/sedan.webp
assets/cars/suv.webp
```

---

# 31. Bot / Mini App Shared User

Bot і Mini App не мають створювати двох користувачів.

Primary key identity:

`telegram_user_id`

Один користувач = один profile.

---

# 32. New User Flow

```text
Telegram deep link / Bot search
        ↓
      /start
        ↓
 detect referral
        ↓
 create/update user
        ↓
 welcome message
        ↓
 OPEN MINI APP
        ↓
 auth via Telegram
        ↓
 language / locale detection
        ↓
 Home
        ↓
 Calculator
```

---

# 33. Existing User Flow

```text
/start
   ↓
recognize user
   ↓
update last_seen
   ↓
show compact current menu
   ↓
Mini App
```

Не потрібно кожного разу створювати нові welcome messages.

---

# 34. Referral Flow

```text
User A
 ↓
Recommend button
 ↓
Referral deep link
 ↓
User B /start payload
 ↓
Backend stores referral
 ↓
User B opens Mini App
 ↓
Events tracked
```

---

# 35. Staff Creation через Telegram Bot

Усі Staff-ролі, крім Owner, додаються безпосередньо через Telegram-бота за `@username`.

Не використовувати ручне введення Telegram User ID у звичайному UI.

## 35.1. Додавання Admin

Тільки Owner `375938798`:

```text
Owner
 ↓
Bot → Staff Management
 ↓
Add Admin
 ↓
Enter @telegram_username
 ↓
Backend resolves Telegram user
 ↓
Confirm identity
 ↓
Assign ADMIN
 ↓
Audit entry
```

Admin НЕ може створювати іншого Admin.

## 35.2. Додавання Manager

Owner або Admin:

```text
Bot → Staff Management
 ↓
Add Manager
 ↓
Enter @telegram_username
 ↓
Backend resolves Telegram user
 ↓
Confirm identity
 ↓
Assign MANAGER
 ↓
Audit entry
```

## 35.3. Важливе технічне обмеження Telegram

Telegram Bot API не дозволяє надійно отримати довільного користувача лише за `@username`, якщо бот раніше не бачив цього користувача.

Тому Staff onboarding повинен підтримувати безпечний flow:

```text
Owner/Admin вводить @username
        ↓
backend шукає користувача серед вже відомих users
        ↓
якщо знайдено → показати підтвердження
        ↓
якщо не знайдено → створити pending staff invite
        ↓
згенерувати персональне bot deep-link запрошення
        ↓
користувач відкриває бота /start
        ↓
Telegram ID підтверджується
        ↓
роль активується
```

Таким чином для власника інтерфейс усе одно працює через `@username`, але система ніколи не вгадує Telegram ID.

---

# 36. Staff Removal / Role Changes

## Owner може

- знімати Admin;
- знімати Manager;
- переводити Manager → Admin;
- переводити Admin → Manager;
- блокувати Staff.

## Admin може

- створювати Manager;
- знімати Manager;
- не може змінювати роль Admin;
- не може змінювати Owner.

Усі зміни обов'язково пишуться в `audit_log`.

---

# 37. VIP Flow

Owner/Admin/Manager:

```text
Client
 ↓
Set VIP
 ↓
choose tier
 ↓
optional expiry
 ↓
optional note
 ↓
save
 ↓
audit log
```

---

# 38. Security Rules

1. Telegram initData обов'язково validate backend-side.
2. Ніколи не довіряти role з frontend.
3. Ніколи не довіряти price з frontend.
4. Кожний protected endpoint перевіряє permission.
5. Owner ID тільки через secure environment.
6. Audit sensitive actions.
7. Rate limit calculator/API.
8. Validate всі IDs.
9. D1 queries parameterized.
10. Secrets не зберігати в GitHub.

---

# 39. API Principle

Frontend може сказати:

```json
{
  "service": "interior-cleaning",
  "vehicle": "suv",
  "condition": "dirty"
}
```

Але frontend НЕ повинен надсилати:

```json
{
  "price": 2300
}
```

Backend сам визначає фінальну ціну.

---

# 40. Currency

Оскільки продукт орієнтований мінімум на UA/PL/EN, currency не потрібно прив'язувати до мови.

Окреме поле:

```text
UAH
PLN
EUR
```

На першому етапі можна активувати одну валюту, але схема повинна підтримувати кілька.

---

# 41. Settings

Конфігурація продукту повинна мати:

- brand name;
- logo;
- default locale;
- available locales;
- default currency;
- contact phone;
- Telegram;
- Instagram;
- location;
- working hours;
- booking CTA;
- calculator enabled;
- referral enabled;
- VIP enabled.

---

# 42. Content Management

Тексти не повинні бути розкидані по коду.

Важливі content keys:

```text
home.hero.title
home.hero.subtitle
bot.welcome
bot.returning
calculator.result.note
vip.description
referral.description
contact.description
```

---

# 43. Analytics Dashboard v1

Показувати:

- Total users
- New users today
- Mini App opens
- Calculator users
- Completed calculations
- Leads
- Referral users
- VIP users
- Conversion start → calculator
- Conversion calculator → lead

Фільтри:

- today
- 7 days
- 30 days
- custom range

---

# 44. Manager Bot Panel v1

Показувати тільки операційні дані:

- клієнти;
- нові клієнти;
- VIP;
- whitelist;
- останні calculations;
- basic conversion.

Не показувати:
- системні налаштування;
- security settings;
- pricing editor;
- product configuration;
- staff creation, окрім дозволених сценаріїв, якщо вони будуть додані в майбутньому.

---

# 45. Bot Analytics

Окремо рахувати:

- bot_started;
- returning_bot_users;
- referral_bot_starts;
- miniapp_opened_from_bot.

---

# 46. Delete/Edit Bot Messages

Telegram не дозволяє “стерти кнопку Start” як системний UI Telegram.

Але після `/start` можна підтримувати чистий чат:

- видаляти старі bot menu messages;
- редагувати попередню bot message;
- тримати одну “актуальну” menu message;
- уникати спаму новими повідомленнями.

---

# 47. Future Modules

Архітектура повинна дозволити додати без rewrite:

- online booking;
- calendar;
- locations;
- workers;
- order management;
- payment;
- subscriptions;
- loyalty;
- promo codes;
- push/bot notifications;
- CRM;
- car history;
- saved cars;
- before/after gallery;
- reviews;
- corporate clients;
- franchise mode.

---

# 48. Phase 1 — Foundation

Перший технічний етап:

1. GitHub repo.
2. Cloudflare Worker.
3. React Mini App.
4. D1.
5. Telegram auth.
6. Bot webhook.
7. User session.
8. Role system.
9. Owner protection.
10. UA/PL/EN.
11. Base UI shell.

---

# 49. Phase 2 — Core Product

1. Services.
2. Vehicles.
3. Conditions.
4. Pricing engine.
5. Calculator.
6. Pricing snapshots.
7. User calculations.
8. CTA/contact flow.

---

# 50. Phase 3 — CRM Layer

1. Admin.
2. Manager.
3. Users.
4. VIP.
5. Whitelist.
6. Client notes.
7. Audit log.

---

# 51. Phase 4 — Growth

1. Referral system.
2. Referral analytics.
3. Bot analytics.
4. Conversion events.
5. Dashboard.

---

# 52. Phase 5 — Polish

1. premium UI;
2. animations;
3. service illustrations;
4. car illustrations;
5. icon pass;
6. responsive QA;
7. Telegram Android QA;
8. Telegram iOS QA;
9. Telegram Desktop QA;
10. browser fallback QA.

---

# 53. Update ZIP Strategy

Після початку реалізації кожна версія повинна видаватися двома архівами.

## FULL

```text
detailing-miniapp-full-vX.Y.Z.zip
```

Повний робочий проект.

## UPDATE

```text
detailing-miniapp-update-vX.Y.Z.zip
```

Тільки файли, які змінилися від попередньої стабільної версії.

У кожному update ZIP:

```text
UPDATE.md
```

з переліком:

- added;
- changed;
- removed;
- migrations;
- env changes;
- deploy steps.

---

# 54. Migration Rule

Якщо update змінює D1:

ніколи не кидати просто новий `schema.sql`.

Потрібна окрема migration:

```text
database/migrations/0004_add_vip_tier.sql
```

---

# 55. Versioning

Використовувати semver:

```text
0.1.0
0.2.0
0.2.1
1.0.0
```

- patch — fix;
- minor — feature;
- major — breaking architecture change.

---

# 56. Product Principle

Ключова вимога проекту:

> Ні дизайн, ні ціна, ні permission, ні текст, ні іконка, ні послуга, ні VIP-правило не повинні вимагати переписування всього продукту.

Система має бути:
- modular;
- configurable;
- role-aware;
- multilingual;
- Telegram-first;
- mobile-first;
- auditable;
- scalable.

---

# 57. Відкриті продуктові рішення перед кодом

Перед реалізацією v1 потрібно окремо затвердити:

1. Назву продукту.
2. Назву Telegram-бота.
3. Назву GitHub repo.
4. Назву Cloudflare Worker.
5. Брендову палітру.
6. Логотип.
7. Валюту v1.
8. Перелік послуг.
9. Базові ціни.
10. Типи автомобілів.
11. Градації стану.
12. VIP-модель:
    - discount;
    - separate price list;
    - multiplier.
13. Чи потрібен booking у v1.
14. Чи потрібна заявка менеджеру.
15. Куди має приходити заявка:
    - Telegram group;
    - конкретному manager;
    - CRM;
    - тільки запис у D1.
16. Referral reward — є чи поки тільки tracking.
17. Whitelist — які конкретні можливості відкриває у v1.
18. Контакти / геолокація / social links.

---

# 58. Recommended First MVP

Щоб не зробити продукт “великим, але пустим”, перший справжній MVP:

### User
- Telegram auth
- Home
- Services
- Calculator
- Dynamic pricing
- VIP pricing
- Referral
- Contact CTA
- UA/PL/EN

### Management
- Owner
- Admin
- Manager
- Users
- VIP
- Whitelist
- Services
- Prices
- Analytics
- Audit log

### Backend
- Worker
- D1
- Telegram webhook
- Telegram validation
- role/permission middleware
- pricing engine
- analytics events

Це вже буде повноцінний бізнес-продукт, а не демо Mini App.


---

# 59. Owner & Staff Identity Rules — Locked

Ці правила вважаються зафіксованими для реалізації:

```text
OWNER_TELEGRAM_ID = 375938798
```

1. Owner тільки один.
2. Owner визначається за Telegram numeric ID, не за username.
3. Username Owner може змінитися — права Owner від цього не змінюються.
4. Усі інші Staff додаються через `@username` у Telegram Bot UI.
5. Після введення `@username` роль активується тільки після підтвердження реального Telegram numeric ID.
6. Якщо бот ще не знає користувача, створюється pending invite/deep-link flow.
7. Admin може додати тільки Manager.
8. Manager не може додавати Staff.
9. Жодна роль не може видати собі вищі права.
10. Backend є єдиним джерелом істини для role/permission checks.


---

# 60. Management Surface — Locked

Це правило вважається зафіксованим:

```text
MINI APP = CLIENT PRODUCT ONLY
BOT = ALL MANAGEMENT
```

## Mini App містить тільки

- Home;
- Services;
- Calculator;
- VIP/client status;
- My calculations;
- Referral;
- Contacts;
- Profile;
- Language;
- майбутні клієнтські функції.

## Telegram Bot Panel містить усе керування

- Owner controls;
- Admin controls;
- Manager controls;
- Users;
- Staff;
- VIP;
- Whitelist;
- Services;
- Prices;
- Pricing coefficients;
- Calculator rules;
- Content;
- Languages;
- Referrals;
- Analytics;
- Audit Log;
- Settings.

## Заборонено

- додавати адмінські сторінки в Mini App;
- додавати приховані management screens у Mini App;
- змішувати клієнтський і staff UX;
- показувати management navigation клієнту;
- дублювати одні й ті самі control-функції і в боті, і в Mini App.

Причина: Mini App має залишатися максимально чистим, преміальним і зрозумілим клієнтським інтерфейсом, а Telegram Bot Panel — окремим операційним інструментом.


---

# 61. Blacklist Module

Blacklist — окрема сутність від VIP та Whitelist.

## Хто може додавати в Blacklist

- Owner;
- Admin;
- Manager — якщо Owner дозволить permission `blacklist.manage`.

Рекомендація для v1:
- Owner — повний доступ;
- Admin — повний доступ;
- Manager — додавання/видалення клієнтів із Blacklist без зміни системних правил.

## Додавання в Blacklist через Bot Panel

Flow:

```text
Bot Panel
 ↓
Users
 ↓
Select client
 ↓
Blacklist
 ↓
Enter reason
 ↓
Optional internal note
 ↓
Confirm
 ↓
Audit log
```

Зберігати окремо:

- `public_reason` — текст, який може побачити клієнт;
- `internal_note` — службова нотатка, яку клієнт не бачить;
- `blocked_by`;
- `blocked_at`;
- `expires_at` — optional;
- `is_active`.

## Поведінка при відкритті Mini App

Backend після Telegram auth перевіряє blacklist до повернення основної сесії.

Якщо користувач заблокований:

- Mini App не відкриває звичайний клієнтський інтерфейс;
- показує спеціальний friendly-state screen;
- показує причину;
- не показує технічні слова типу `BANNED`, `BLOCKED`, `ACCESS DENIED`.

Приклад тону:

> Наразі ми не можемо надати доступ до сервісу для цього профілю.  
> Причина: {public_reason}  
> Якщо вважаєте, що сталася помилка, будь ласка, зв’яжіться з нами — ми із задоволенням усе перевіримо.  
> Бажаємо вам гарного дня 🤍

Текст має бути локалізованим:
- UA;
- PL;
- EN.

## Blacklist Audit

Обов'язково записувати:

- хто заблокував;
- кого;
- public reason;
- internal note;
- дата;
- дата розблокування;
- хто розблокував.

---

# 62. User Base & Segmentation

Система повинна вести повну історичну базу користувачів.

Користувач не видаляється фізично зі статистики при втраті VIP або деактивації.

## Основні сегменти

### All-time users

Кількість усіх унікальних користувачів, які хоча б раз натиснули `/start`.

### New this month

Унікальні користувачі, створені в поточному календарному місяці.

### Recently assigned VIP

Користувачі, яким VIP було надано нещодавно.

Рекомендований default window:
- останні 30 днів.

Window має бути configurable.

### Long-time VIP

Користувачі, які мають активний VIP довше встановленого порогу.

Рекомендований default:
- більше 30 днів.

### VIP history

Не зберігати тільки current boolean.

Потрібна історія:

- assigned_at;
- assigned_by;
- tier;
- removed_at;
- removed_by;
- reason;
- expiry;
- previous_tier.

---

# 63. VIP History Table

Додати таблицю:

## vip_history

- id
- user_id
- tier
- assigned_by
- assigned_at
- expires_at
- removed_by
- removed_at
- removal_reason
- metadata_json

Це дозволить рахувати:

- нових VIP;
- активних VIP;
- VIP цього місяця;
- довготривалих VIP;
- середній час VIP;
- повторне надання VIP.

---

# 64. Service Calculation → Work Confirmation Workflow

Після того як клієнт завершив реальний розрахунок послуги, створюється `service_request`.

Це не просто calculator history.

## Статуси

```text
DRAFT
CALCULATED
PENDING_CONFIRMATION
CONFIRMED
REJECTED
COMPLETED
CANCELLED
TEST
```

Рекомендований flow:

```text
Client completes calculation
        ↓
service_request created
        ↓
status = PENDING_CONFIRMATION
        ↓
notifications sent
        ↓
Client + assigned Manager + Admin
        ↓
Confirm / Reject
```

## Кому приходить повідомлення

### Client

Отримує:
- послугу;
- авто;
- стан;
- опції;
- розраховану вартість;
- статус;
- CTA.

### Manager

Отримує:
- клієнта;
- Telegram username/name;
- послугу;
- vehicle class;
- condition;
- price;
- VIP/standard;
- referral source, якщо є;
- buttons.

### Admin

Отримує такий самий operational summary.

Щоб не спамити всіх staff, архітектура має дозволяти налаштувати routing:

- all Admins;
- all Managers;
- assigned Manager only;
- selected staff group.

---

# 65. Work Confirmation

У staff-повідомленні:

```text
✅ Підтвердити
❌ Відхилити
🧪 Тест — не зберігати
👤 Відкрити клієнта
```

## Confirm

При підтвердженні:

- `confirmed_at`;
- `confirmed_by`;
- request переходить у `CONFIRMED`.

Після фактичного завершення:

```text
✅ Роботу виконано
```

→ status `COMPLETED`.

## Reject

Потрібно вказати:

- reason;
- optional internal note.

Status:
`REJECTED`.

Клієнту приходить акуратне повідомлення без грубого формулювання.

## Completed

Саме `COMPLETED` входить у статистику реально виконаних робіт.

---

# 66. Test / Do Not Save Mode

Для уникнення сміття в статистиці кожен service request можна позначити як тестовий.

Доступно через staff button:

```text
🧪 Тест — не зберігати
```

або під час створення/перевірки:

```text
TEST
```

## Поведінка

Тестовий запис:

- не входить у revenue/service conversion statistics;
- не входить у completed jobs;
- не входить у manager performance;
- не впливає на client conversion;
- може залишатися короткочасно в audit/debug history;
- може автоматично очищатися cron job після заданого періоду.

Рекомендований retention:
- 7–30 днів.

Важливо:
для audit/security краще не робити фізичне миттєве видалення, а ставити `is_test = true` і виключати з business analytics.

---

# 67. Service Request Database

Додати таблицю:

## service_requests

- id
- user_id
- calculation_id
- assigned_manager_id
- status
- is_test
- service_id
- vehicle_type_id
- condition_level_id
- base_price_snapshot
- options_total_snapshot
- discount_snapshot
- final_price_snapshot
- currency
- created_at
- confirmed_at
- confirmed_by
- rejected_at
- rejected_by
- rejection_reason
- completed_at
- completed_by
- referral_id
- metadata_json

---

# 68. Service Request Events

Додати event types:

```text
service_request_created
service_request_confirmed
service_request_rejected
service_request_completed
service_request_marked_test
```

Аналітика повинна чітко розрізняти:

- calculation completed;
- request created;
- request confirmed;
- actual work completed.

---

# 69. Client Notifications

Клієнт отримує Telegram-повідомлення при ключових змінах:

### Request created

“Ми отримали ваш розрахунок і передали його команді.”

### Confirmed

“Ваш запит підтверджено. Команда вже бачить усі деталі.”

### Rejected

М'який текст:

“Наразі ми не можемо підтвердити цей запит у поточному вигляді. Причина: {reason}. Напишіть нам — допоможемо підібрати інший варіант.”

### Completed

“Готово ✨ Роботу позначено як виконану. Дякуємо, що обрали нас.”

Усі повідомлення локалізуються UA/PL/EN.

---

# 70. Extended Analytics

Bot Panel повинна показувати окремо:

## Users

- All-time users
- New this month
- Returning users
- Referral users
- Blacklisted users

## VIP

- Active VIP
- VIP assigned this month
- Recently assigned VIP
- Long-time VIP
- VIP removed this month

## Calculator

- Calculator opened
- Calculator completed
- Service requests created
- Confirmed
- Rejected
- Completed jobs
- Test records excluded

## Conversion

```text
/start
  ↓
Mini App open
  ↓
Calculator open
  ↓
Calculation completed
  ↓
Service request
  ↓
Confirmed
  ↓
Completed
```

---

# 71. /help Command

Команда:

```text
/help
```

повинна бути role-aware.

Користувач бачить тільки ті команди, які доступні його ролі.

## Client Help

### Основне
- `/start` — головне меню
- `/help` — довідка
- `/app` — відкрити Mini App
- `/language` — змінити мову
- `/referral` — отримати посилання для рекомендації другу

## Manager Help

### Клієнти
- `/users`
- `/user @username`
- `/addclient`
- `/vip`
- `/whitelist`
- `/blacklist`

### Роботи
- `/requests`
- `/pending`
- `/completed`

### Статистика
- `/stats`

## Admin Help

Усе Manager +

### Product
- `/services`
- `/pricing`
- `/calculator`
- `/content`
- `/languages`

### Staff
- `/managers`

### Analytics
- `/analytics`
- `/referrals`
- `/audit`

## Owner Help

Усе Admin +

### Staff
- `/admins`
- `/addadmin`
- `/removeadmin`
- `/addmanager`
- `/removemanager`

### System
- `/settings`
- `/system`
- `/featureflags`

Команди можуть мати aliases, але canonical names мають залишатися стабільними.

---

# 72. Bot Panel Navigation

Команди `/help` — резервний і power-user спосіб навігації.

Основний UX — inline Bot Panel.

Приклад Owner Panel:

```text
👥 Users        ⭐ VIP
✅ Whitelist    ⛔ Blacklist
🧑‍💼 Staff       🧾 Requests
💰 Pricing      🧽 Services
📊 Analytics    🔗 Referrals
📝 Content      ⚙️ Settings
❓ Help
```

Manager бачить коротший набір.

---

# 73. Anti-Clutter Bot Rule

Для всіх management flow:

- по можливості редагувати поточне повідомлення;
- не створювати нову message на кожен клік;
- confirmation dialogs також робити через edit;
- списки — pagination;
- після завершення action повертати користувача в попередній panel;
- старі transient messages очищати, якщо Telegram API це дозволяє.

---

# 74. Locked Product Rules — v0.4

Зафіксовано:

1. Blacklist керується тільки через Bot Panel.
2. Blacklist має public reason + internal note.
3. Заблокований користувач бачить тепле, неагресивне повідомлення.
4. Ведеться all-time user base.
5. Окремо рахуються нові користувачі поточного місяця.
6. VIP має повну історію, а не тільки current flag.
7. Виділяються recent VIP та long-time VIP.
8. Після реального розрахунку створюється service request.
9. Client + relevant Manager/Admin отримують notification.
10. Роботу можна підтвердити, відхилити або завершити.
11. Статистика completed jobs базується на статусі `COMPLETED`.
12. Тестові записи не входять у бізнес-статистику.
13. `/help` показує всі доступні команди по розділах і відповідно до ролі.


---

# 75. Anti-Spam / Request Rate Limit

Ліміт стосується тільки реального запиту на виконання роботи.

Користувач може:
- необмежено відкривати калькулятор;
- необмежено змінювати параметри;
- робити кілька розрахунків;
- переглядати різні послуги та ціни.

Але:

```text
1 Telegram account = максимум 1 service request / 60 хвилин
```

## Перевірка

Rate limit перевіряється backend-side по `telegram_user_id`.

Frontend не є джерелом істини.

Перед створенням `service_request` Worker перевіряє останній реальний request користувача.

Якщо 60 хвилин ще не минуло:
- request не створюється;
- користувач бачить friendly message;
- показується орієнтовний час, коли можна повторити запит.

Приклад:

> Ваш попередній запит уже передано команді ✨  
> Щоб уникнути дублювання, новий запит можна буде надіслати трохи пізніше.  
> Ви все ще можете користуватися калькулятором і переглядати інші послуги.

## Не рахувати в rate limit

- calculator-only sessions;
- test records;
- cancelled draft до фактичної відправки;
- staff-created internal test requests.

## Рекомендована реалізація

У D1:
- перевірка останнього `service_request.created_at`;
- додатково optional Cloudflare KV / rate-limit cache для швидкої перевірки.

Source of truth — D1.

---

# 76. Calculator → Explicit Work Request

Калькуляція НЕ створює заявку автоматично.

Flow:

```text
Calculator
 ↓
User sees final price
 ↓
Price breakdown
 ↓
"Надіслати запит на виконання"
 ↓
Confirmation screen
 ↓
User confirms
 ↓
Backend rate-limit check
 ↓
service_request created
```

## Confirmation screen

Перед відправкою користувач бачить:

- service;
- vehicle;
- condition;
- options;
- final calculated price;
- VIP discount, якщо є;
- currency;
- примітку, що це заявка на виконання роботи.

CTA:

```text
✅ Підтвердити та надіслати
← Повернутися до розрахунку
```

---

# 77. Order Lifecycle v1

Рекомендований lifecycle:

```text
CALCULATED
   ↓ user confirms
REQUESTED
   ↓ staff accepts
CONFIRMED
   ↓ work starts
IN_PROGRESS
   ↓ work finished
COMPLETED_UNPAID
   ↓ payment
PAID
```

Alternative exits:

```text
REQUESTED → REJECTED
CONFIRMED → CANCELLED
any eligible state → TEST
```

## Важливо

`COMPLETED` і `PAID` — не одне й те саме.

Робота може бути:
- виконана, але ще не оплачена;
- оплачена онлайн;
- оплачена готівкою;
- оплачена іншим manual способом у майбутньому.

---

# 78. Payment Architecture

Після того як staff позначив роботу як виконану:

```text
status = COMPLETED_UNPAID
```

у Mini App клієнт бачить:

- виконану роботу;
- фінальну суму;
- кнопку оплати;
- статус `Очікує оплати`.

## Online payment

Flow:

```text
COMPLETED_UNPAID
 ↓
Pay in Mini App
 ↓
Payment Provider
 ↓
Webhook / verified callback
 ↓
Backend verifies payment
 ↓
payment = SUCCESS
 ↓
service_request = PAID
```

Не можна переводити order в PAID тільки на основі frontend success screen.

Потрібне backend verification.

## Payment Provider Abstraction

Оскільки конкретний платіжний провайдер ще не зафіксований, інтеграція має бути через adapter:

```text
payments/
  provider.ts
  types.ts
  webhook.ts
  adapters/
    provider-a.ts
```

Щоб можна було змінити платіжну систему без переписування order logic.

---

# 79. Cash Payment

Працівник, який має permission:

```text
payment.cash.confirm
```

може в Bot Panel:

```text
Order
 ↓
Payment
 ↓
💵 Оплачено готівкою
 ↓
Confirm amount
 ↓
PAID
```

Зберігати:

- amount;
- currency;
- method = CASH;
- marked_by;
- paid_at;
- optional note.

Після цього клієнту можна відправити:

> Оплату отримано. Дякуємо, що обрали нас 🤍

---

# 80. Payment Methods

На рівні database підтримувати:

```text
ONLINE
CASH
BANK_TRANSFER
OTHER
```

У v1 можна активувати тільки:
- ONLINE;
- CASH.

---

# 81. Payments Table

Додати:

## payments

- id
- service_request_id
- user_id
- amount
- currency
- method
- provider
- provider_payment_id
- status
- created_at
- paid_at
- marked_by
- metadata_json

Payment statuses:

```text
PENDING
PROCESSING
SUCCESS
FAILED
CANCELLED
REFUNDED
```

---

# 82. Final Price Snapshot

При створенні service request зберігається snapshot розрахунку.

При завершенні роботи Staff може, якщо permission дозволяє, змінити фінальну суму тільки з обов'язковою причиною.

Наприклад:

```text
calculated_price = 2000
final_job_price = 2300
adjustment_reason = "додаткова очистка сидінь"
```

Історія зміни ціни обов'язково йде в audit log.

---

# 83. Completed Work Database

Для кожної реально виконаної роботи зберігати:

- client;
- service;
- service options;
- vehicle type;
- vehicle condition;
- calculated price;
- final price;
- VIP discount;
- staff member;
- created date;
- confirmed date;
- completed date;
- payment date;
- payment method;
- payment status;
- referral source;
- whether first or repeat job.

Це основа фінансової та retention аналітики.

---

# 84. Repeat Client / Retention Logic

Потрібно окремо рахувати:

## First-time customer

Клієнт із першою `PAID` роботою.

## Returning customer

Клієнт, який має 2+ `PAID` jobs.

## Active returning customer

Клієнт, який уже користувався послугами та повернувся в заданий період.

## Retention

Базовий v1 показник:

```text
customers_with_2_or_more_paid_jobs
/
customers_with_at_least_1_paid_job
```

Додатково:
- repeat rate 30 days;
- repeat rate 90 days;
- repeat rate 180 days.

---

# 85. Revenue Analytics

Owner/Admin мають бачити фінансову аналітику.

## Revenue metrics

- Total revenue;
- Revenue this month;
- Revenue today;
- Revenue by service;
- Revenue by payment method;
- Revenue from VIP clients;
- Revenue from standard clients;
- Average order value;
- Highest-value services;
- Number of paid jobs;
- Outstanding unpaid completed jobs.

Тестові записи:
- завжди виключаються.

Rejected/Cancelled:
- не входять у revenue.

Revenue source:
- тільки `payments.status = SUCCESS`
  або manual cash payment confirmed.

---

# 86. Business Report

Через Bot Panel Owner/Admin може сформувати звіт.

Наприклад:

```text
📊 Звіт за вересень 2026

Нових користувачів: 184
Користувачів Mini App: 149
Розрахунків: 276
Запитів на роботу: 92
Підтверджено: 74
Виконано: 66
Оплачено: 63

Нових клієнтів: 41
Повторних клієнтів: 22
VIP клієнтів: 18

Виручка: 168 400 PLN
Середній чек: 2 673 PLN
Онлайн: 103 200 PLN
Готівка: 65 200 PLN
```

## Filters

- today;
- this week;
- this month;
- previous month;
- 30 days;
- 90 days;
- custom range.

---

# 87. Revenue Permissions

## Owner

Повний financial dashboard.

## Admin

Повний financial dashboard, якщо permission:

```text
analytics.revenue
```

## Manager

За замовчуванням НЕ бачить повну виручку компанії.

Може бачити:
- свої requests;
- свої completed jobs;
- payment status конкретного order;
- operational stats.

Якщо в майбутньому потрібно — Owner може окремо видати permission.

---

# 88. Staff Order Notifications

Після `REQUESTED` відповідні Manager/Admin отримують:

```text
🧾 Новий запит

Клієнт: ...
Послуга: ...
Авто: ...
Стан: ...
Сума: 2 300 PLN
Статус: Standard / VIP

[✅ Підтвердити]
[❌ Відхилити]
[🧪 Тест]
[👤 Клієнт]
```

Після виконання:

```text
[✅ Роботу виконано]
```

Після цього:

```text
[💵 Оплачено готівкою]
[💳 Очікує онлайн-оплати]
```

---

# 89. Client Order Screen

Mini App отримує новий клієнтський розділ:

```text
My Orders
```

Це не management screen.

Клієнт бачить тільки свої записи.

Для кожного order:

- service;
- date;
- price;
- status;
- payment status;
- payment CTA, якщо дозволено;
- history/status timeline.

---

# 90. Revenue Integrity Rules

1. Не рахувати calculator estimate як revenue.
2. Не рахувати REQUESTED як revenue.
3. Не рахувати CONFIRMED як revenue.
4. Не рахувати COMPLETED_UNPAID як revenue.
5. Revenue виникає тільки після підтвердженої оплати.
6. Cash payment має бути підтверджений staff.
7. Online payment має бути підтверджений webhook/backend.
8. Test orders ніколи не входять у revenue.
9. Refund віднімається від net revenue.
10. Зміна final price обов'язково audit-иться.

---

# 91. New Database Fields

У `service_requests` додати:

- final_job_price
- price_adjustment_reason
- started_at
- started_by
- completed_at
- completed_by
- payment_status
- first_paid_job_for_user
- is_repeat_customer

У `users` або aggregated profile:
- first_paid_job_at
- last_paid_job_at
- paid_jobs_count
- lifetime_value

`lifetime_value` можна кешувати, але source of truth — payments/jobs.

---

# 92. Anti-Spam Audit Events

Додати:

```text
request_rate_limit_hit
duplicate_request_blocked
```

Для abuse monitoring Owner/Admin можуть бачити:

- accounts with frequent blocked attempts;
- suspicious activity;
- blacklist candidate suggestions.

Автоматично blacklist за rate-limit не видавати без окремого правила.

---

# 93. Locked Product Rules — v0.5

1. Calculator usage не обмежується hourly request limit.
2. Реальний work request — максимум 1 раз на 60 хвилин з одного Telegram account.
3. Розрахунок не стає заявкою автоматично.
4. Користувач завчасно бачить фінальну розраховану вартість.
5. Користувач окремо підтверджує надсилання work request.
6. Після виконання робота переходить у `COMPLETED_UNPAID`.
7. Клієнт може оплатити виконану роботу онлайн у Mini App.
8. Online payment зараховується тільки після backend verification.
9. Staff може вручну позначити order як оплачений готівкою.
10. Ведеться повна база виконаних і оплачених робіт.
11. Зберігаються service, price, final price, payment method та staff.
12. Owner/Admin бачать revenue analytics.
13. Окремо рахуються first-time та returning customers.
14. Формується business report по користувачах, requests, jobs, retention і revenue.
15. Test records повністю виключаються з business analytics.


---

# 94. Social Links Module

Соціальні мережі та месенджери в Mini App мають бути повністю керованими через Telegram Bot Panel.

За замовчуванням жоден соціальний канал не показується в Mini App.

Підтримувані канали v1:

```text
INSTAGRAM
LINKEDIN
TWITCH
TIKTOK
TELEGRAM
VIBER
WHATSAPP
```

У майбутньому список може бути розширений без зміни UI-архітектури.

---

# 95. Default Visibility Rule

За замовчуванням:

```text
social_links = hidden
```

Кнопка/іконка конкретного сервісу з'являється в Mini App тільки якщо:

1. через Bot Panel додано валідне посилання;
2. запис активний;
3. канал не вимкнено вручну.

Якщо посилання не задане — елемент взагалі не рендериться.

Не показувати:
- disabled-кнопки;
- порожні плейсхолдери;
- "Coming soon";
- сірі іконки без URL.

---

# 96. Bot Panel — Social Networks Management

Owner/Admin отримують окремий розділ:

```text
⚙️ Settings
  ↓
🌐 Social Links
```

або швидку команду:

```text
/socials
```

## Список каналів

```text
Instagram
LinkedIn
Twitch
TikTok
Telegram
Viber
WhatsApp
```

Для кожного каналу:

```text
➕ Додати посилання
✏️ Змінити посилання
👁 Увімкнути / приховати
🗑 Видалити
```

---

# 97. Social Link Flow

Приклад:

```text
Bot Panel
 ↓
Settings
 ↓
Social Links
 ↓
Instagram
 ↓
Add link
 ↓
https://instagram.com/brand
 ↓
Validate
 ↓
Preview
 ↓
Confirm
 ↓
Save
```

Після збереження:

- запис стає `enabled = true`;
- кнопка Instagram автоматично з'являється в Mini App;
- deploy не потрібен.

---

# 98. Social Link Permissions

## Owner

Може:
- додавати;
- редагувати;
- видаляти;
- вмикати;
- приховувати;
- змінювати порядок.

## Admin

Має ті самі права, якщо permission:

```text
social_links.manage
```

## Manager

За замовчуванням не має доступу до social settings.

---

# 99. Mini App Social UI

Соціальні мережі не повинні засмічувати Home.

Рекомендовані місця:

### Варіант A — Profile / Contacts

```text
Profile
 ↓
Contacts & Social
```

### Варіант B — Contact block

Наприклад:

```text
Follow us
[Instagram] [TikTok] [Telegram]
```

### Варіант C — Footer

Компактний icon-row внизу контактної сторінки.

Рекомендація:
використовувати `Profile / Contact` як основне місце.

---

# 100. Dynamic Rendering

Frontend отримує з backend тільки активні канали.

Приклад API response:

```json
{
  "socials": [
    {
      "type": "INSTAGRAM",
      "url": "https://instagram.com/brand",
      "enabled": true,
      "sortOrder": 10
    },
    {
      "type": "TELEGRAM",
      "url": "https://t.me/brand",
      "enabled": true,
      "sortOrder": 20
    }
  ]
}
```

Mini App рендерить тільки ці елементи.

---

# 101. Database — social_links

Додати таблицю:

## social_links

- id
- type
- url
- enabled
- sort_order
- created_by
- updated_by
- created_at
- updated_at

Допустимі `type`:

```text
INSTAGRAM
LINKEDIN
TWITCH
TIKTOK
TELEGRAM
VIBER
WHATSAPP
```

---

# 102. URL Validation

Backend обов'язково перевіряє URL.

Приклади:

```text
Instagram → instagram.com
LinkedIn  → linkedin.com
Twitch    → twitch.tv
TikTok    → tiktok.com
Telegram  → t.me / telegram.me
Viber     → viber:// або supported public Viber link
WhatsApp  → wa.me / whatsapp.com
```

Не покладатися тільки на frontend validation.

---

# 103. Safe External Link Handling

При натисканні:

- відкривати через Telegram WebApp API / safe external navigation;
- не використовувати raw arbitrary schemes без allowlist;
- підтримувати стандартні HTTPS links;
- спеціальні URI schemes — тільки для дозволених сервісів.

---

# 104. Icon Architecture for Socials

Іконки соціальних платформ мають бути окремими файлами/компонентами.

Наприклад:

```text
assets/icons/social/instagram.svg
assets/icons/social/linkedin.svg
assets/icons/social/twitch.svg
assets/icons/social/tiktok.svg
assets/icons/social/telegram.svg
assets/icons/social/viber.svg
assets/icons/social/whatsapp.svg
```

Не hardcode-ити SVG прямо в сторінку.

---

# 105. Social Links Sorting

Owner/Admin може задавати порядок.

Наприклад:

```text
1. Instagram
2. TikTok
3. Telegram
4. WhatsApp
```

Поле:

```text
sort_order
```

Mini App відображає активні соціальні канали саме в цьому порядку.

---

# 106. Bot Panel Example

```text
🌐 SOCIAL LINKS

✅ Instagram
https://instagram.com/chameleon

❌ LinkedIn
Not configured

❌ Twitch
Not configured

✅ TikTok
https://tiktok.com/@chameleon

✅ Telegram
https://t.me/chameleon

❌ Viber
Not configured

✅ WhatsApp
https://wa.me/48XXXXXXXXX

[➕ Add]
[✏️ Edit]
[↕️ Order]
[⬅️ Back]
```

---

# 107. Audit Events

Кожна зміна social links має логуватися:

```text
social_link_added
social_link_updated
social_link_enabled
social_link_disabled
social_link_removed
social_links_reordered
```

Зберігати:

- actor;
- channel;
- old URL;
- new URL;
- timestamp.

---

# 108. Locked Product Rules — v0.6

1. Social links керуються тільки через Telegram Bot Panel.
2. За замовчуванням усі social channels приховані.
3. Канал з'являється в Mini App тільки після додавання URL.
4. Після видалення URL канал автоматично зникає.
5. Підтримуються Instagram, LinkedIn, Twitch, TikTok, Telegram, Viber, WhatsApp.
6. Owner/Admin можуть керувати social links.
7. Manager за замовчуванням не має цього permission.
8. Deploy після зміни social links не потрібен.
9. Frontend рендерить тільки активні записи з backend.
10. Social icons зберігаються модульно окремими файлами.
11. URL перевіряються backend-side.
12. Порядок соціальних каналів налаштовується через Bot Panel.


---

# 109. Excel Reports & Data Export Module

Продукт повинен вміти формувати основні звіти та бази у форматі Microsoft Excel:

```text
.xlsx
```

Експорт запускається виключно через Telegram Bot Panel.

Mini App не містить адміністративних export-функцій.

---

# 110. Хто може скачувати Excel-звіти

## Owner

Має повний доступ до всіх експортів.

## Admin

Може формувати і скачувати звіти, якщо має permission:

```text
reports.export
```

## Manager

За замовчуванням:
- не має доступу до фінансових звітів;
- може мати окремий permission на операційні експорти.

Наприклад:

```text
reports.operational.export
```

---

# 111. Bot Panel — Reports

Окремий розділ:

```text
📊 Reports & Exports
```

або команда:

```text
/reports
```

Приклад меню:

```text
📊 REPORTS

👥 Users
⭐ VIP
🧾 Orders
💳 Payments
💰 Revenue
🔗 Referrals
📈 Retention
⛔ Blacklist
✅ Whitelist
🧑‍💼 Staff Activity
📦 Full Business Report
```

---

# 112. User Database Export

Excel-файл повинен містити, залежно від permission:

- internal user ID;
- Telegram user ID;
- username;
- first name;
- last name;
- locale;
- registration date;
- last seen;
- referral source;
- VIP status;
- VIP since;
- blacklist status;
- whitelist status;
- paid jobs count;
- last paid job date;
- lifetime value.

Рекомендована назва:

```text
users_2026-09-21.xlsx
```

---

# 113. VIP Export

Файл:

```text
vip_clients_YYYY-MM-DD.xlsx
```

Колонки:

- user;
- Telegram username;
- current tier;
- assigned at;
- assigned by;
- expiry;
- status;
- paid jobs;
- lifetime value;
- last visit;
- VIP age / duration.

Окремі sheet:

```text
Active VIP
Recent VIP
Long-time VIP
VIP History
```

---

# 114. Orders Export

Файл:

```text
orders_YYYY-MM-DD_YYYY-MM-DD.xlsx
```

Колонки:

- order ID;
- user;
- Telegram username;
- service;
- vehicle;
- condition;
- options;
- calculated price;
- final price;
- currency;
- status;
- created at;
- confirmed at;
- completed at;
- payment status;
- payment method;
- assigned manager;
- first/repeat client;
- referral source;
- is_test.

Test records за замовчуванням не включати.

---

# 115. Payments & Revenue Export

Файл:

```text
revenue_YYYY-MM.xlsx
```

Sheets:

```text
Summary
Payments
Revenue by Service
Revenue by Manager
Revenue by Payment Method
VIP vs Standard
Unpaid Completed Jobs
Refunds
```

Summary metrics:

- gross revenue;
- net revenue;
- paid jobs;
- average order value;
- cash revenue;
- online revenue;
- VIP revenue;
- standard-client revenue;
- outstanding unpaid amount.

---

# 116. Referral Export

Файл:

```text
referrals_YYYY-MM-DD.xlsx
```

Колонки:

- referrer;
- referred user;
- referral code;
- start date;
- Mini App opened;
- calculator used;
- request created;
- first paid job;
- became VIP;
- revenue generated.

---

# 117. Retention Report

Файл:

```text
retention_YYYY-MM.xlsx
```

Sheets:

```text
Overview
First-time Customers
Returning Customers
30-Day Retention
90-Day Retention
180-Day Retention
Customer Lifetime Value
```

---

# 118. Blacklist / Whitelist Export

## Blacklist

Файл:

```text
blacklist_YYYY-MM-DD.xlsx
```

Колонки:

- user;
- username;
- public reason;
- internal note;
- blocked by;
- blocked at;
- expires at;
- active status.

## Whitelist

Файл:

```text
whitelist_YYYY-MM-DD.xlsx
```

Колонки:

- user;
- username;
- type;
- reason;
- added by;
- created at;
- expires at;
- active.

---

# 119. Full Business Report

Owner/Admin може сформувати один комплексний Excel:

```text
business_report_YYYY-MM.xlsx
```

Sheets:

```text
Dashboard
Users
New Users
VIP
Orders
Completed Jobs
Payments
Revenue
Retention
Referrals
Services
Managers
Blacklist
Whitelist
```

---

# 120. Excel Report Formatting

Файли мають бути не "сирим дампом", а читабельним бізнес-звітом.

Обов'язково:

- human-readable column names;
- frozen header row;
- filters;
- sensible column widths;
- currency formatting;
- date formatting;
- totals where appropriate;
- summary sheet;
- no internal JSON blobs unless окремий technical export;
- separate sheets by logical section.

---

# 121. Report Filters

Через Bot Panel перед генерацією можна вибрати:

```text
Today
This Week
This Month
Previous Month
Last 30 Days
Last 90 Days
Custom Range
All Time
```

Додаткові фільтри:

- service;
- staff;
- payment method;
- VIP / Standard;
- new / returning;
- referral / organic;
- order status.

---

# 122. Bot Export Flow

Приклад:

```text
Bot Panel
 ↓
Reports & Exports
 ↓
Revenue
 ↓
This Month
 ↓
Generate Excel
 ↓
Worker builds report
 ↓
.xlsx file created
 ↓
Bot sends file to Owner/Admin
```

Після генерації Telegram Bot відправляє файл як document.

---

# 123. Export Generation Architecture

Рекомендована схема без серверного зберігання готового файлу:

```text
D1
 ↓
Report Query Layer
 ↓
Report Builder
 ↓
XLSX Generator
 ↓
in-memory ArrayBuffer / stream
 ↓
Telegram Bot document
 ↓
END
```

Готовий `.xlsx` не потрібно зберігати в R2 або будь-якому іншому persistent storage.

Після успішної відправки файл існує тільки в Telegram-чаті отримувача.

Для великих звітів:
- будувати workbook частинами;
- по можливості використовувати streaming/memory-efficient generation;
- після `sendDocument` звільняти буфер;
- не створювати архів готових Excel-файлів на сервері.

---

# 124. Export Storage

Правило:

```text
GENERATE → SEND TO TELEGRAM → DISCARD
```

Сервер не зберігає готові Excel-звіти після відправлення.

Не використовувати R2 для постійного або тимчасового архіву звітів у стандартному flow.

У D1 залишаються тільки:
- вихідні business data;
- audit event про генерацію;
- тип звіту;
- період;
- хто сформував;
- timestamp;
- success/failure.

Сам файл після `sendDocument` не зберігається продуктом.

---

# 125. Export Security

1. Генерація тільки після permission check.
2. Report URL не має бути публічним.
3. Signed / temporary access.
4. Telegram Bot відправляє документ тільки дозволеному staff.
5. Логувати кожне формування.
6. Фінансові звіти — тільки Owner/Admin з відповідним permission.
7. Не включати secrets/tokens.
8. Test records виключати за замовчуванням.
9. При custom export чітко показувати період у файлі.

---

# 126. Export Audit Events

Додати:

```text
report_generated
report_downloaded
report_sent_to_telegram
report_generation_failed
```

Зберігати:

- actor;
- report type;
- date range;
- filters;
- generated at;
- file name;
- result status.

---

# 127. Scheduled Reports — Future Ready

Архітектура повинна дозволяти пізніше увімкнути:

```text
Daily Report
Weekly Report
Monthly Report
```

Наприклад:

```text
1-го числа кожного місяця
→ сформувати business_report_previous_month.xlsx
→ відправити Owner у Telegram
```

У v1 це можна залишити вимкненим, але структура має підтримувати.

---

# 128. Locked Product Rules — v0.7

1. Основні бази та звіти експортуються у `.xlsx`.
2. Експорт керується через Telegram Bot Panel.
3. Mini App не містить export/admin functionality.
4. Owner має доступ до всіх звітів.
5. Admin отримує доступ через `reports.export`.
6. Manager за замовчуванням не бачить фінансові exports.
7. Підтримуються Users, VIP, Orders, Payments, Revenue, Referrals, Retention, Blacklist, Whitelist та Full Business Report.
8. Excel-файли мають форматування, filters та summary sheets.
9. Перед генерацією доступні date-range та business filters.
10. Bot надсилає готовий Excel як Telegram document.
11. Готовий Excel не зберігається в R2/server storage після відправлення.
12. Файл формується, надсилається в Telegram-чат і одразу відкидається сервером.
13. Кожен export логуються в audit log без збереження самого файлу.


---

# 129. Services Management — Bot Panel CRUD

Усі послуги повинні керуватися через Telegram Bot Panel.

Mini App не містить адміністративного редактора послуг.

## Доступ

### Owner
Повний CRUD.

### Admin
Повний CRUD через permission:

```text
services.manage
```

### Manager
За замовчуванням не може змінювати послуги.

---

# 130. Services Bot Panel

Окремий розділ:

```text
🧽 Services
```

або команда:

```text
/services
```

Приклад:

```text
🧽 SERVICES

✅ Exterior Detailing
✅ Interior Detailing
✅ Full Detailing
✅ Ceramic Coating
❌ Engine Bay Cleaning

[➕ Add Service]
[✏️ Edit]
[↕️ Order]
[⬅️ Back]
```

---

# 131. Add Service Flow

```text
Bot Panel
 ↓
Services
 ↓
➕ Add Service
 ↓
Name
 ↓
Category
 ↓
Description
 ↓
Base Price
 ↓
Input Currency
 ↓
Live FX Preview
 ↓
Duration
 ↓
Image/Icon
 ↓
Enabled / Hidden
 ↓
Preview
 ↓
Confirm
```

---

# 132. Service Editable Fields

Кожна послуга повинна мати:

- internal ID;
- slug;
- title UA;
- title PL;
- title EN;
- description UA;
- description PL;
- description EN;
- category;
- image;
- icon;
- enabled;
- sort order;
- duration;
- base price;
- base currency;
- currency mode;
- optional fixed currency overrides;
- created by;
- updated by;
- created at;
- updated at.

---

# 133. Service Actions

Owner/Admin може:

```text
➕ Add
✏️ Edit
👁 Enable / Hide
💰 Change Price
🖼 Change Image
📝 Change Text
🌍 Edit Translations
↕️ Change Order
📦 Change Category
🗑 Archive
```

Рекомендація:
не робити hard delete для вже використаної послуги.

Якщо послуга має orders/history:
- `archived = true`;
- у нових калькуляціях не показується;
- стара історія залишається валідною.

---

# 134. Supported Currencies

Обов'язкові валюти v1:

```text
USD
UAH
PLN
```

Вони не прив'язані до мови.

Користувач може мати:

```text
locale = uk
currency = PLN
```

або будь-яку іншу комбінацію.

---

# 135. Currency Selector — Mini App

Клієнт сам обирає валюту.

Доступні:

```text
$ USD
₴ UAH
zł PLN
```

Currency selector можна розмістити:

- Profile → Currency;
- Calculator header;
- Price result screen.

Вибір зберігається в профілі користувача.

Наприклад:

```text
preferred_currency = PLN
```

Після вибору всі ціни в Mini App автоматично відображаються у цій валюті.

---

# 136. Pricing Source of Truth

Не зберігати три незалежні live-ціни як головне джерело істини.

Рекомендована модель:

```text
base_price = 100
base_currency = USD
```

Далі:

```text
USD → 100.00
UAH → live converted amount
PLN → live converted amount
```

Перевага:
курс змінюється — ціна автоматично перераховується без ручного оновлення кожної послуги.

---

# 137. Admin Price Entry UX

Коли Owner/Admin задає ціну, він може вводити її в будь-якій із трьох валют.

Приклад:

```text
Enter price:
2500 UAH
```

Bot одразу показує live preview:

```text
💰 PRICE PREVIEW

UAH  2,500.00 ₴
USD     60.42 $
PLN    217.36 zł

Rate updated: 22:14
```

Після підтвердження:

- введена валюта стає `base_currency`;
- введене число стає `base_price`;
- решта валют розраховуються live.

---

# 138. Fixed Currency Override — Optional

Іноді бізнес може захотіти красиві фіксовані ціни.

Наприклад:

```text
USD = 60
UAH = 2500
PLN = 220
```

Тому архітектура повинна підтримувати optional override:

```text
currency_mode = LIVE
```

або:

```text
currency_mode = FIXED_OVERRIDES
```

## LIVE

Одна базова ціна + live FX.

## FIXED_OVERRIDES

Для кожної валюти можна задати окрему фіксовану ціну.

За замовчуванням:

```text
LIVE
```

---

# 139. Live FX Service

Потрібен окремий backend-модуль:

```text
fx/
  provider.ts
  rates.ts
  cache.ts
  convert.ts
```

Він відповідає за:

- USD ↔ UAH;
- USD ↔ PLN;
- UAH ↔ PLN;
- current rate;
- timestamp;
- fallback rate;
- stale-rate protection.

---

# 140. FX Provider Abstraction

Не прив'язувати business logic до одного зовнішнього API.

Інтерфейс:

```ts
interface FxProvider {
  getRates(base: Currency): Promise<FxRates>
}
```

Це дозволяє змінити provider без переписування калькулятора.

---

# 141. FX Cache

Не робити зовнішній API-запит на кожне відкриття картки.

Рекомендовано:

```text
refresh FX every 5–15 minutes
```

Можливе використання:
- KV;
- Worker cache;
- D1 fx_rates table.

Зберігати:

- base currency;
- USD rate;
- UAH rate;
- PLN rate;
- provider;
- fetched_at.

---

# 142. Stale FX Protection

Якщо provider тимчасово недоступний:

1. використати останній успішний курс;
2. перевірити його вік;
3. позначити як stale внутрішньо;
4. не ламати калькулятор.

Наприклад:

```text
fresh <= 30 min
acceptable fallback <= 24h
older → block live-priced payment / require refresh
```

Для звичайного estimate можна показати останній доступний курс із timestamp.

---

# 143. Price Calculation Snapshot

При створенні реального work request обов'язково snapshot-ити:

- service base price;
- service base currency;
- selected user currency;
- FX rate;
- converted price;
- discount;
- final price;
- FX provider;
- FX timestamp.

Інакше старе замовлення змінювало б суму після коливання курсу.

---

# 144. Payment Currency

Клієнт бачить ціну і платить у вибраній підтримуваній валюті, якщо payment provider її підтримує.

Flow:

```text
User preferred currency = PLN
 ↓
Calculator shows PLN
 ↓
Work request snapshots PLN price
 ↓
Order completed
 ↓
Payment screen = PLN
 ↓
Payment provider charge = PLN
```

Якщо конкретний payment provider не підтримує вибрану валюту:

- показати підтримувану fallback currency;
- перед оплатою чітко показати конвертацію;
- не міняти валюту непомітно.

---

# 145. Revenue Base Currency

Для загальної фінансової аналітики потрібна одна reporting currency.

Рекомендовано configurable:

```text
reporting_currency = PLN
```

або інша вибрана Owner.

Кожна оплата зберігає:

- paid amount;
- paid currency;
- FX snapshot;
- normalized reporting amount.

Так Owner може мати один коректний Total Revenue навіть при оплатах у USD/UAH/PLN.

---

# 146. Payments Table — Currency Extension

У `payments` додати:

- amount;
- currency;
- reporting_amount;
- reporting_currency;
- fx_rate;
- fx_provider;
- fx_timestamp.

---

# 147. Service Prices Table — Updated

Рекомендована структура:

## service_prices

- id
- service_id
- base_price
- base_currency
- currency_mode
- usd_override
- uah_override
- pln_override
- enabled
- updated_by
- updated_at

---

# 148. Currency Audit

Логувати:

```text
service_price_changed
service_base_currency_changed
service_currency_mode_changed
service_currency_override_changed
reporting_currency_changed
```

Для price change:

- old price;
- new price;
- currency;
- actor;
- timestamp.

---

# 149. Locked Product Rules — v0.8

1. Excel-файл після генерації не зберігається на сервері.
2. Excel одразу надсилається в Telegram Bot chat як document.
3. Після відправлення server-side buffer/file discarded.
4. Owner/Admin керують послугами тільки через Bot Panel.
5. Послуги можна додавати, редагувати, приховувати, архівувати та сортувати.
6. Ціни підтримують USD, UAH та PLN.
7. Клієнт сам обирає валюту відображення.
8. За замовчуванням ціна має одну base currency та live FX conversion.
9. Admin при введенні ціни одразу бачить live equivalents у всіх трьох валютах.
10. Архітектура підтримує optional fixed override для кожної валюти.
11. FX provider абстрагований і може бути замінений.
12. Курси кешуються та мають stale fallback.
13. Реальна заявка зберігає FX snapshot, тому її ціна не змінюється заднім числом.
14. Payment використовує snapshot price замовлення.
15. Revenue analytics нормалізує мультивалютні оплати в reporting currency.


---

# 150. Completed Order → Vehicle Ready Notification

Для прийнятого замовлення Staff повинен мати можливість через Telegram Bot Panel змінити статус на:

```text
✅ ВИКОНАНО
```

Ця дія означає, що детейлінг завершений і автомобіль готовий до видачі клієнту.

Доступ:

- Owner;
- Admin;
- Manager / Staff із permission:

```text
orders.complete
```

---

# 151. Complete Order Flow

Flow:

```text
Accepted Order
 ↓
IN_PROGRESS
 ↓
Staff натискає:
✅ Роботу виконано
 ↓
Backend validation
 ↓
status = COMPLETED_UNPAID або COMPLETED_PAID
 ↓
completed_at
completed_by
 ↓
Telegram notification клієнту
 ↓
Offer vehicle delivery
```

Якщо замовлення вже оплачено:

```text
status = COMPLETED_PAID
```

Якщо ще не оплачено:

```text
status = COMPLETED_UNPAID
```

---

# 152. Automatic Customer Notification

Одразу після встановлення статусу `Виконано` бот автоматично надсилає власнику автомобіля повідомлення.

Тон повідомлення:
- теплий;
- короткий;
- преміальний;
- без сухої технічної мови.

Приклад UA:

> ✨ Ваш автомобіль готовий!  
> Ми завершили всі роботи, і він уже чекає на вас.  
>  
> Бажаєте, щоб ми доставили авто на вашу адресу за додаткову плату?

Buttons:

```text
🚗 Доставити авто
🙌 Заберу сам
📋 Переглянути замовлення
```

---

# 153. Multilanguage Ready Notification

Повідомлення обов'язково локалізується:

```text
UA
PL
EN
```

Мова береться з профілю клієнта.

---

# 154. Vehicle Delivery as Optional Paid Service

Доставка автомобіля — окрема optional service.

Вона НЕ повинна автоматично додаватися до замовлення.

Клієнт сам погоджується:

```text
🚗 Доставити авто
```

Після цього відкривається delivery flow.

---

# 155. Delivery Flow

```text
Customer clicks "Доставити авто"
 ↓
Mini App / Bot delivery confirmation
 ↓
Enter/select address
 ↓
Backend checks delivery availability
 ↓
Calculate delivery price
 ↓
Show final delivery price
 ↓
Customer confirms
 ↓
delivery_request created
```

Якщо клієнт обирає:

```text
🙌 Заберу сам
```

зберігається:

```text
delivery_requested = false
pickup_type = SELF_PICKUP
```

---

# 156. Delivery Address

Клієнт може:

- ввести адресу вручну;
- використати раніше збережену адресу;
- у майбутньому — надіслати геолокацію через Telegram.

Не зберігати адресу без потреби довше, ніж цього вимагає business flow.

---

# 157. Delivery Pricing

Ціна доставки повинна бути configurable через Bot Panel.

Підтримати v1:

## Fixed Price

Наприклад:

```text
Delivery = 20 PLN
```

## Distance-based — Future Ready

Наприклад:

```text
base_fee + price_per_km
```

Архітектура повинна дозволити додати це пізніше без rewrite.

---

# 158. Delivery Currency

Доставка працює в тій самій currency architecture:

```text
USD
UAH
PLN
```

Клієнт бачить delivery price у своїй `preferred_currency`.

При створенні delivery request:
- FX snapshot фіксується;
- price не змінюється після підтвердження.

---

# 159. Delivery Service Management

Через Bot Panel:

```text
🚗 Vehicle Delivery
```

Owner/Admin можуть:

- enable / disable delivery;
- задати базову ціну;
- вибрати base currency;
- побачити live FX equivalents;
- змінити description UA/PL/EN;
- налаштувати availability;
- задати service area у майбутньому.

Permission:

```text
delivery.manage
```

---

# 160. Delivery Request Statuses

```text
NOT_REQUESTED
OFFERED
REQUESTED
CONFIRMED
DRIVER_ASSIGNED
IN_DELIVERY
DELIVERED
DECLINED
CANCELLED
```

Для MVP достатньо:

```text
OFFERED
REQUESTED
CONFIRMED
DELIVERED
DECLINED
```

---

# 161. Delivery Request Database

Додати таблицю:

## delivery_requests

- id
- service_request_id
- user_id
- address_text
- status
- price
- currency
- base_price
- base_currency
- fx_rate
- fx_provider
- fx_timestamp
- requested_at
- confirmed_at
- confirmed_by
- delivered_at
- delivered_by
- declined_at
- cancelled_at
- notes
- metadata_json

---

# 162. Order Payment + Delivery Relationship

Доставка може оплачуватися:

### Variant A
разом із замовленням, якщо ще не оплачено.

```text
Job Total
+ Delivery
= Final Payable
```

### Variant B
окремим payment, якщо основна робота вже оплачена.

Архітектура повинна підтримувати обидва варіанти.

---

# 163. Payment Screen with Delivery

Якщо клієнт погодився на доставку:

```text
Detailing service     2 500 UAH
Vehicle delivery        400 UAH
--------------------------------
Total                  2 900 UAH
```

Якщо main order вже оплачено:

```text
Vehicle delivery        400 UAH
Pay now                 400 UAH
```

---

# 164. Staff Delivery Notification

Після підтвердження доставки відповідний Staff отримує:

```text
🚗 DELIVERY REQUEST

Order: #...
Client: ...
Address: ...
Delivery price: ...
Payment status: ...

[✅ Confirm Delivery]
[❌ Reject]
[📍 Details]
```

---

# 165. Customer Delivery Status

У `My Orders` клієнт бачить:

```text
Car ready
Delivery requested
Delivery confirmed
On the way
Delivered
```

Якщо self-pickup:

```text
Car ready for pickup
```

---

# 166. Vehicle Ready Analytics

Додати events:

```text
order_marked_completed
vehicle_ready_notification_sent
delivery_offered
delivery_requested
delivery_declined
delivery_confirmed
delivery_completed
```

---

# 167. Delivery Analytics

Owner/Admin можуть бачити:

- completed jobs;
- self-pickup count;
- delivery offers;
- accepted delivery offers;
- delivery conversion rate;
- delivery revenue;
- average delivery value.

---

# 168. Anti-Duplicate Completion

Статус `Виконано` має бути idempotent.

Повторне натискання:
- не створює друге повідомлення;
- не створює другий delivery offer;
- не дублює analytics event.

Backend перевіряє поточний order status.

---

# 169. Notification Failure Handling

Якщо Telegram notification клієнту не відправилась:

- order все одно залишається `COMPLETED`;
- записати `notification_failed`;
- показати Staff warning у Bot Panel;
- дозволити кнопку:

```text
🔁 Надіслати повідомлення ще раз
```

---

# 170. Locked Product Rules — v0.9

1. Staff може на прийнятому замовленні поставити статус `Виконано`.
2. Backend фіксує `completed_at` та `completed_by`.
3. Клієнт автоматично отримує Telegram-повідомлення, що автомобіль готовий.
4. Повідомлення має теплий premium tone.
5. У тому самому повідомленні пропонується платна доставка авто на адресу.
6. Клієнт може вибрати `Доставити авто` або `Заберу сам`.
7. Доставка не додається автоматично.
8. Delivery є окремою configurable service.
9. Delivery price підтримує USD/UAH/PLN та FX snapshot.
10. Delivery може бути оплачена разом із замовленням або окремо.
11. Ведеться окремий delivery request і його статус.
12. Completion notification не дублюється при повторному натисканні.
13. Уся delivery активність потрапляє в analytics та Excel reports.


---

# 171. Maintenance Mode

Продукт повинен мати глобальний режим технічного обслуговування, який вмикається виключно Owner через Telegram Bot Panel.

Основне правило:

```text
OWNER_TELEGRAM_ID = 375938798
```

Тільки цей Owner може:
- увімкнути Maintenance Mode;
- вимкнути Maintenance Mode;
- змінити повідомлення;
- задати орієнтовний час завершення;
- отримати Owner bypass;
- перевірити продукт під час обслуговування.

Admin та Manager не можуть самостійно вимикати або вмикати глобальне обслуговування.

---

# 172. Bot Panel — Maintenance Control

Окремий розділ:

```text
⚙️ System
  ↓
🛠 Maintenance
```

або команда:

```text
/maintenance
```

Панель:

```text
🛠 MAINTENANCE MODE

Status: 🟢 OFF

[🔴 Enable Maintenance]
[📝 Edit Message]
[⏱ Set ETA]
[🔐 Owner Access]
[⬅️ Back]
```

Коли режим активний:

```text
🛠 MAINTENANCE MODE

Status: 🔴 ON

Started: 23:14
ETA: ~30 min
Owner bypass: ACTIVE

[🟢 Disable Maintenance]
[📝 Edit Message]
[⏱ Change ETA]
[🔐 Open as Owner]
```

---

# 173. Enable Maintenance Flow

```text
Owner
 ↓
Bot Panel
 ↓
System
 ↓
Maintenance
 ↓
Enable
 ↓
Preview customer message
 ↓
Optional ETA
 ↓
Confirm
 ↓
maintenance.enabled = true
```

Перед активацією Bot обов'язково показує confirmation screen:

```text
Увімкнути режим обслуговування?

Усі користувачі, крім Owner, побачать maintenance screen.

[✅ Увімкнути]
[← Скасувати]
```

---

# 174. Maintenance Screen — Customer Experience

Під час Maintenance Mode звичайний користувач не бачить:
- Home;
- Calculator;
- Services;
- Orders;
- Payment;
- Profile;
- будь-які business screens.

Замість цього показується окремий branded maintenance screen.

Тон:
- спокійний;
- теплий;
- без тривожних формулювань;
- без технічних stack/error повідомлень;
- у стилі Chameleon Detailing.

---

# 175. Maintenance Message — UA

Приклад базового тексту:

```text
🦎 Ми ненадовго наводимо порядок

Chameleon Detailing зараз проходить невелике технічне оновлення, щоб сервіс працював ще краще.

Ваші дані та замовлення в безпеці.
Спробуйте зайти трохи пізніше — ми скоро повернемося ✨
```

Якщо задано ETA:

```text
Орієнтовно повернемося: {eta}
```

CTA:

```text
🔄 Перевірити ще раз
💬 Зв'язатися з нами
```

---

# 176. Maintenance Message — PL

Базовий текст:

```text
🦎 Robimy krótką przerwę techniczną

Chameleon Detailing przechodzi właśnie małą aktualizację, aby wszystko działało jeszcze lepiej.

Twoje dane i zamówienia są bezpieczne.
Spróbuj ponownie za chwilę — niedługo wracamy ✨
```

Якщо задано ETA:

```text
Planowany powrót: {eta}
```

CTA:

```text
🔄 Sprawdź ponownie
💬 Skontaktuj się z nami
```

---

# 177. Maintenance Message — EN

Базовий текст:

```text
🦎 We’re making a quick improvement

Chameleon Detailing is undergoing a short update so we can make the experience even better.

Your data and orders are safe.
Please check back shortly — we’ll be back soon ✨
```

Якщо задано ETA:

```text
Expected back: {eta}
```

CTA:

```text
🔄 Check again
💬 Contact us
```

---

# 178. Maintenance Localization

Maintenance content keys:

```text
maintenance.title
maintenance.message
maintenance.eta
maintenance.retry
maintenance.contact
```

Locales:

```text
uk
pl
en
```

Owner може редагувати повідомлення через Bot Panel окремо для кожної мови.

Якщо custom текст не заданий — використовується системний default.

---

# 179. Owner Maintenance Bypass

Owner повинен мати доступ до Mini App навіть коли для всіх інших увімкнено Maintenance Mode.

Не використовувати простий "секретний URL", який можна переслати іншій людині.

Правильний механізм:

```text
Telegram auth
 ↓
Backend validates initData
 ↓
telegram_user_id == 375938798
 ↓
maintenance bypass granted
```

Тобто Owner bypass базується на реальному Telegram identity.

---

# 180. Owner Gateway

У Bot Panel кнопка:

```text
🔐 Open as Owner
```

відкриває Mini App у спеціальному Owner maintenance session.

Backend створює короткоживучий signed bypass token.

Token:
- одноразовий або short-lived;
- прив'язаний до Owner Telegram ID;
- не дає доступу іншому Telegram account;
- автоматично протухає.

Рекомендований TTL:

```text
5–15 minutes
```

---

# 181. No Static Backdoor Rule

Заборонено створювати:

```text
/hidden-admin
/secret-maintenance
?bypass=true
```

або будь-який статичний параметр, який сам по собі обходить Maintenance Mode.

Owner access повинен вимагати:
1. валідний Telegram initData;
2. Telegram user ID `375938798`;
3. valid short-lived bypass/session.

---

# 182. Maintenance Middleware

Перевірка виконується backend-side до бізнес-роутів.

Pseudo-flow:

```text
request
 ↓
validate Telegram session
 ↓
read maintenance state
 ↓
if maintenance OFF:
    continue
 ↓
if maintenance ON:
    if user == OWNER:
        continue
    else:
        return MAINTENANCE_RESPONSE
```

Frontend не вирішує, чи має користувач bypass.

---

# 183. API Behavior During Maintenance

Під час Maintenance Mode звичайним користувачам можна залишити мінімальний allowlist:

```text
/auth/telegram
/system/status
/contact
```

Business endpoints блокуються:

```text
/calculator/*
/orders/*
/payments/*
/profile/*
/services/*
/referrals/*
```

Owner bypass дозволяє повний доступ.

---

# 184. Maintenance Status API

Публічний мінімальний endpoint:

```text
GET /api/system/status
```

Приклад:

```json
{
  "maintenance": true,
  "eta": "2026-09-22T00:00:00+03:00",
  "messageKey": "maintenance.default"
}
```

Не повертати:
- внутрішні причини;
- debug info;
- deploy info;
- Owner details;
- security metadata.

---

# 185. Maintenance Scope

Архітектура повинна підтримувати:

```text
GLOBAL
MINI_APP
CALCULATOR
PAYMENTS
ORDERS
```

Для v1 основний режим:

```text
GLOBAL
```

Але в майбутньому Owner зможе, наприклад:
- закрити тільки Payments;
- закрити тільки Calculator;
- залишити Home/Contacts доступними.

---

# 186. Maintenance Reason

Owner може задати внутрішню причину:

```text
Deploy v1.4.2
D1 migration
Payment provider update
Pricing correction
UI hotfix
```

Внутрішня причина:
- не показується клієнту;
- пишеться в audit log.

---

# 187. Maintenance Audit

Події:

```text
maintenance_enabled
maintenance_disabled
maintenance_message_changed
maintenance_eta_changed
maintenance_owner_bypass_created
maintenance_owner_bypass_used
```

Зберігати:

- actor;
- timestamp;
- scope;
- internal reason;
- ETA;
- previous state;
- new state.

---

# 188. Safety Before Enabling Maintenance

Перед ввімкненням система може показати Owner:

```text
Active orders: 4
Payments processing: 1
Delivery requests: 2
```

Якщо є payment у статусі `PROCESSING`, Bot показує warning.

Maintenance Mode не повинен:
- скасовувати існуючі orders;
- змінювати payment status;
- видаляти sessions;
- втрачати дані.

---

# 189. Active Payment Handling

Якщо payment уже був розпочатий до Maintenance Mode:

рекомендовано:
- webhook endpoint payment provider залишити доступним;
- backend приймає та верифікує callback;
- payment може коректно завершитися.

Тобто Maintenance Mode блокує user UI, але не критичні machine-to-machine webhooks.

---

# 190. Telegram Bot During Maintenance

Telegram Bot Panel для Staff продовжує працювати.

Owner:
- повний доступ до Bot Panel.

Admin/Manager:
- можуть бачити operational data, якщо Owner не ввімкнув окреме staff lock;
- не можуть вимкнути Maintenance Mode.

Клієнтські bot-команди можуть відповідати:

```text
🛠 Зараз ми проводимо невелике оновлення.
Mini App скоро знову буде доступний.
```

---

# 191. Optional Staff Lock

Future-ready setting:

```text
maintenance.staff_access = true / false
```

Default:

```text
true
```

Тобто Staff Bot Panel працює навіть коли Mini App закритий.

Owner завжди має access.

---

# 192. Maintenance Retry

Кнопка:

```text
🔄 Перевірити ще раз
```

робить новий status check.

Коли Owner вимкнув maintenance:

```text
maintenance = false
```

користувач одразу може перейти в Mini App без повторного `/start`.

---

# 193. Disable Maintenance Flow

```text
Owner
 ↓
Bot Panel
 ↓
Maintenance
 ↓
Disable
 ↓
Confirm
 ↓
maintenance.enabled = false
 ↓
Mini App available to everyone
```

Після вимкнення Bot показує:

```text
✅ Сервіс знову доступний.

Maintenance duration: 28 min
Users blocked during maintenance: 17
```

---

# 194. Maintenance Database / Config

Можна зберігати в `system_settings`:

```text
maintenance_enabled
maintenance_scope
maintenance_started_at
maintenance_started_by
maintenance_eta
maintenance_reason_internal
maintenance_message_uk
maintenance_message_pl
maintenance_message_en
```

Якщо потрібна історія — окремий `maintenance_events`.

---

# 195. Maintenance UI Brand Tone

У стилі нашого Chameleon Detailing концепту:

- dark graphite / black background;
- lime-green accents;
- chameleon mascot;
- мінімальна анімація;
- sparkle / detailing shine;
- rounded premium cards;
- жодних червоних error screens.

Можлива ідея:
ящірка "полірує" логотип або сидить біля маленького індикатора оновлення.

Тон:
"ми покращуємо сервіс", а не "сервіс зламаний".

---

# 196. Locked Product Rules — v1.0

1. Maintenance Mode вмикає і вимикає тільки Owner `375938798`.
2. Керування відбувається через Telegram Bot Panel.
3. Усі звичайні користувачі бачать branded maintenance screen.
4. Maintenance screen локалізований UA/PL/EN.
5. Owner може задавати ETA.
6. Owner може редагувати повідомлення на кожній мові.
7. Owner продовжує мати повний доступ до Mini App.
8. Owner bypass базується на Telegram identity, а не на статичному секретному URL.
9. Bot може створювати short-lived Owner gateway session.
10. Admin/Manager не можуть вимкнути глобальний Maintenance Mode.
11. Business API блокується backend middleware.
12. Critical payment/webhook callbacks продовжують працювати.
13. Existing orders/data не змінюються при ввімкненні maintenance.
14. Bot Panel продовжує працювати для Staff.
15. Усі maintenance actions записуються в audit log.
16. Після вимкнення сервіс одразу доступний без повторного `/start`.


---

# 197. Client Phone Sharing

Клієнт повинен мати можливість добровільно поділитися своїм особистим номером телефону, щоб команда могла за потреби зв'язатися щодо деталей замовлення.

Основний принцип:

```text
NO PHONE WITHOUT EXPLICIT CONSENT
```

Номер не вимагається автоматично під час першого входу.

---

# 198. Telegram Contact Sharing Flow

Рекомендований flow через Bot:

```text
Bot
 ↓
Need contact details?
 ↓
[📱 Поділитися номером]
 ↓
Telegram request_contact
 ↓
User confirms
 ↓
Backend validates contact owner
 ↓
Save phone to CRM
```

Важливо:
- приймати тільки contact, який належить самому користувачу;
- не дозволяти Manager/Admin вручну підставляти чужий номер як “підтверджений користувачем”;
- записувати timestamp згоди.

---

# 199. Phone Data Fields

Додати до `client_profiles` або окремої таблиці:

- phone_number
- phone_country_code
- phone_verified_via_telegram
- phone_shared_at
- phone_share_consent
- phone_updated_at
- preferred_contact_method

Можливі contact methods:

```text
TELEGRAM
PHONE
WHATSAPP
VIBER
```

---

# 200. Phone Usage

Номер може використовуватися для:

- уточнення деталей замовлення;
- зв'язку перед виконанням;
- delivery coordination;
- emergency order;
- уточнення адреси;
- питання по оплаті.

Не використовувати номер для маркетингових розсилок без окремої згоди.

---

# 201. Phone Visibility

## Owner
Бачить номер.

## Admin
Бачить номер.

## Manager
Бачить номер тільки якщо має permission:

```text
client.phone.read
```

Клієнт у Mini App може:
- бачити свій збережений номер;
- оновити його;
- видалити;
- змінити preferred contact method.

---

# 202. Business Schedule Module

Через Telegram Bot Panel Owner/Admin можуть визначати:

- робочі дні;
- години роботи;
- timezone;
- спеціальні вихідні;
- святкові дні;
- тимчасові зміни графіку.

---

# 203. Working Days Command

Команда:

```text
/schedule
```

або Bot Panel:

```text
⚙️ Settings
 ↓
🗓 Working Schedule
```

Приклад:

```text
🗓 WORKING SCHEDULE

Mon  ✅ 09:00–18:00
Tue  ✅ 09:00–18:00
Wed  ✅ 09:00–18:00
Thu  ✅ 09:00–18:00
Fri  ✅ 09:00–18:00
Sat  ✅ 10:00–16:00
Sun  ❌ Closed

Timezone: Europe/Warsaw

[✏️ Edit Days]
[⏰ Edit Hours]
[🎉 Holidays]
[⚡ Emergency Mode]
```

---

# 204. Schedule Permissions

## Owner
Повний контроль.

## Admin
Може змінювати schedule через permission:

```text
schedule.manage
```

## Manager
Не змінює глобальний schedule.

---

# 205. Business Calendar

Звичайний weekly schedule доповнюється exception dates.

Наприклад:

```text
2026-12-24 = Closed
2026-12-25 = Closed
2026-12-31 = 09:00–14:00
```

Таблиця:

## business_calendar_exceptions

- id
- date
- status
- opens_at
- closes_at
- reason
- created_by
- created_at

`status`:

```text
OPEN
CLOSED
CUSTOM_HOURS
```

---

# 206. Holiday Mode

Якщо поточний день є неробочим:

```text
isBusinessOpen = false
```

звичайний flow для нового стандартного замовлення блокується.

Клієнт не може:
- створити immediate work request;
- підтвердити стандартне замовлення на сьогодні;
- відправити роботу як active today.

---

# 207. Holiday Screen

У Mini App показується окремий branded state.

Рекомендований headline:

```text
Holiday — time to rest 🌿
```

Tone:
- теплий;
- спокійний;
- не як error;
- у стилі Chameleon Detailing.

UA приклад:

> 🦎 Сьогодні ми відпочиваємо  
> Команда Chameleon Detailing сьогодні не приймає звичайні замовлення.  
> Ви можете залишити заявку на найближчий робочий день — ми передамо її команді, щойно робочий день почнеться.

PL:

> 🦎 Dziś odpoczywamy  
> Zespół Chameleon Detailing nie przyjmuje dziś standardowych zleceń.  
> Możesz zostawić zgłoszenie na najbliższy dzień roboczy — przekażemy je zespołowi, gdy tylko rozpocznie się praca.

EN:

> 🦎 Holiday — time to rest  
> Chameleon Detailing is not accepting standard jobs today.  
> You can leave a request for the next working day, and we’ll deliver it to the team when business hours begin.

---

# 208. Holiday Screen Actions

Buttons:

```text
📅 Залишити заявку на найближчий робочий день
⚡ Екстрений виклик
💬 Зв'язатися
```

`⚡ Екстрений виклик` показується тільки якщо emergency mode enabled.

---

# 209. Deferred Request

У неробочий день клієнт може створити:

```text
DEFERRED_REQUEST
```

Це не active work request.

Flow:

```text
Holiday screen
 ↓
Create request for next working day
 ↓
Select/confirm service
 ↓
Vehicle / condition / options
 ↓
See estimated price
 ↓
Confirm deferred request
 ↓
Store in D1
 ↓
Status = DEFERRED
 ↓
scheduled_for = next_business_opening
```

---

# 210. Next Working Day Logic

Не hardcode-ити “завтра”.

Backend повинен обчислити:

```text
next_business_day
```

з урахуванням:

- weekly schedule;
- holidays;
- custom closures;
- timezone;
- special opening hours.

Якщо завтра вихідний — заявка переноситься на найближчий наступний робочий день.

---

# 211. Deferred Request Delivery to Staff

Коли настає `scheduled_for`:

```text
Cloudflare Cron / scheduled Worker
 ↓
find DEFERRED requests due now
 ↓
send to Manager/Admin
 ↓
status = REQUESTED
 ↓
notify client
```

Staff отримує звичайну operational card:

```text
📅 Відкладена заявка

Клієнт: ...
Послуга: ...
Сума: ...
Створено: Sunday
Scheduled for: Monday 09:00

[✅ Підтвердити]
[❌ Відхилити]
[👤 Клієнт]
```

---

# 212. Deferred Request Notification to Client

Коли заявка активується:

UA:

> ✨ Вашу заявку передано команді.  
> Робочий день уже розпочався, і ми можемо взяти її в обробку.

PL / EN — локалізовано.

---

# 213. Deferred Request Rate Limit

Звичайний rule:

```text
1 real request / 60 min / Telegram account
```

має також враховувати deferred requests.

Рекомендація:
- один active/deferred request per 60 minutes;
- не дозволяти створити 10 відкладених заявок у неробочий день.

---

# 214. Calculator Behavior on Closed Days

Оскільки product requirement — звичайний розрахунок і прийняття тільки в робочі дні:

Default v1:

```text
standard calculator booking flow = closed
```

Але для deferred request system клієнт може пройти estimation flow тільки як частину:

```text
"Request for next working day"
```

тобто:
- не створюється immediate order;
- price показується;
- status = DEFERRED після підтвердження.

---

# 215. Emergency Mode

Owner/Admin може окремо вмикати:

```text
⚡ Emergency Orders
```

Це дозволяє приймати екстрені замовлення:
- поза графіком;
- у вихідні;
- у святкові дні;
- за підвищеним тарифом.

---

# 216. Emergency Mode Control

Bot Panel:

```text
⚡ EMERGENCY MODE

Status: OFF
Multiplier: 1.5x

[🟢 Enable]
[💰 Change Multiplier]
[⏱ Availability]
[📝 Edit Message]
```

Permission:

```text
emergency.manage
```

Owner має завжди.

Admin може мати permission.

---

# 217. Emergency Multiplier

Configurable range:

```text
1.5x – 2.0x
```

Приклади:

```text
1.50
1.75
2.00
```

Backend validation:

```text
min = 1.5
max = 2.0
```

---

# 218. Emergency Pricing

Формула:

```text
emergency_price =
standard_final_price
× emergency_multiplier
```

Приклад:

```text
Standard price: 2 000 PLN
Emergency multiplier: 1.5x
Emergency price: 3 000 PLN
```

Клієнт бачить це ДО підтвердження.

---

# 219. Emergency Price Breakdown

UI:

```text
Standard service          2 000 PLN
Emergency service +50%    1 000 PLN
-----------------------------------
Total                     3 000 PLN
```

або при 2x:

```text
Emergency multiplier: 2.0x
```

Жодних прихованих surcharge.

---

# 220. Emergency Request Flow

```text
Closed day / outside hours
 ↓
Holiday screen
 ↓
⚡ Emergency order
 ↓
Explain surcharge
 ↓
Calculate
 ↓
Show final emergency price
 ↓
User confirms
 ↓
Emergency request created
 ↓
Immediate Manager/Admin notification
```

Status:

```text
EMERGENCY_REQUESTED
```

---

# 221. Emergency Staff Notification

Staff message:

```text
⚡ EMERGENCY REQUEST

Client: ...
Phone: ...
Service: ...
Vehicle: ...
Standard price: ...
Multiplier: 1.5x
Emergency total: ...

[✅ Accept Emergency]
[❌ Reject]
[📞 Contact Client]
```

---

# 222. Emergency Availability

Emergency mode може бути:

```text
GLOBAL_ENABLED
```

або future-ready:

```text
enabled_only_on_closed_days
enabled_after_hours
enabled_specific_dates
```

Для v1 рекомендовано:

```text
enabled_on_closed_days_and_after_hours
```

---

# 223. Emergency Contact Requirement

Для emergency request рекомендується попросити номер телефону, якщо його ще немає.

Flow:

```text
Emergency request
 ↓
No verified phone?
 ↓
Ask to share contact
 ↓
Continue after share / allow Telegram-only fallback if configured
```

Owner/Admin можуть зробити phone required:

```text
emergency.phone_required = true
```

---

# 224. Emergency Analytics

Events:

```text
emergency_mode_enabled
emergency_mode_disabled
emergency_request_started
emergency_request_created
emergency_request_accepted
emergency_request_rejected
emergency_completed
```

Metrics:

- emergency request count;
- acceptance rate;
- emergency revenue;
- average emergency order;
- surcharge revenue;
- by day/time.

---

# 225. Schedule Analytics

Owner/Admin можуть бачити:

- deferred requests;
- requests activated next business day;
- requests created on holidays;
- closed-day demand;
- emergency demand;
- after-hours demand.

---

# 226. Excel Report Extension

Додати в exports:

## Orders sheet
- deferred / immediate / emergency type;
- scheduled_for;
- emergency multiplier;
- emergency surcharge.

## Revenue
- normal revenue;
- emergency revenue;
- emergency surcharge revenue.

## Customers
- phone available;
- preferred contact method.

---

# 227. Holiday & Emergency Commands

`/help` для Owner/Admin доповнюється:

```text
/schedule
/holidays
/emergency
```

Optional:

```text
/today
```

`/today` показує:

```text
Today: OPEN
09:00–18:00
Emergency: OFF
Deferred requests waiting: 3
```

---

# 228. Friendly Closed-Day Rules

У неробочий день:
- не показувати error;
- не казати “service unavailable” сухо;
- показувати branded Holiday screen;
- пропонувати next working day;
- якщо emergency enabled — показати emergency option.

---

# 229. Business Timezone

Усі schedule calculations робляться в configured business timezone.

Наприклад:

```text
Europe/Warsaw
```

Не використовувати device timezone клієнта для визначення, чи бізнес відкритий.

---

# 230. System Settings Extension

Додати:

```text
business_timezone
working_days
working_hours
holiday_message_uk
holiday_message_pl
holiday_message_en
emergency_enabled
emergency_multiplier
emergency_phone_required
```

---

# 231. Database Extensions

## client_profiles

додати:
- phone_number
- phone_verified_via_telegram
- phone_shared_at
- preferred_contact_method

## service_requests

додати:
- request_type
- scheduled_for
- emergency_multiplier
- emergency_surcharge
- is_deferred

`request_type`:

```text
STANDARD
DEFERRED
EMERGENCY
```

---

# 232. Locked Product Rules — v1.1

1. Клієнт може добровільно поділитися особистим номером через Telegram `request_contact`.
2. Номер зберігається в CRM тільки після explicit consent.
3. Owner/Admin можуть налаштовувати робочі дні й години через Bot Panel.
4. Business schedule використовує business timezone.
5. Weekly schedule підтримує holidays/custom exceptions.
6. У неробочий день standard immediate request недоступний.
7. Клієнт бачить branded `Holiday — time to rest` screen UA/PL/EN.
8. Клієнт може створити deferred request на найближчий робочий день.
9. Backend сам обчислює next business day, а не просто “завтра”.
10. Deferred request автоматично надсилається Manager/Admin на початку робочого дня.
11. Rate limit поширюється на deferred requests.
12. Owner/Admin можуть вмикати Emergency Mode через Bot Panel.
13. Emergency multiplier configurable у межах `1.5x–2.0x`.
14. Emergency final price показується клієнту до підтвердження.
15. Emergency requests надходять Staff негайно навіть поза графіком.
16. Emergency, deferred та normal orders окремо потрапляють в analytics і Excel reports.


---

# 233. Motion & Animation System

Усі елементи Mini App повинні мати продуману motion-систему.

Основний принцип:

```text
ANIMATION = FUNCTION + FEEDBACK + PREMIUM FEEL
```

Анімації не повинні бути випадковими або декоративними заради декоративності.

Вони повинні:
- підтверджувати дію користувача;
- пояснювати зміну стану;
- робити переходи між екранами природними;
- приховувати короткі network/loading затримки;
- підтримувати premium brand tone Chameleon Detailing.

---

# 234. Global Animation Rules

Основні правила:

1. Без різких стрибків UI.
2. Без надмірного bounce.
3. Без довгих анімацій, що гальмують interaction.
4. Кнопка завжди дає tactile/visual feedback.
5. Modal / sheet має природно входити й виходити.
6. Card selection повинна анімувати border/glow/check.
7. Status change повинен мати transition.
8. Skeleton/loading не повинен мигати.
9. Bottom navigation indicator плавно переходить між пунктами.
10. Motion має працювати однаково на iOS / Android / Telegram Desktop.

---

# 235. Motion Timing Tokens

Використовувати централізовані animation tokens:

```text
motion.instant = 90ms
motion.fast = 160ms
motion.normal = 240ms
motion.slow = 360ms
motion.hero = 520ms
```

Easing:

```text
ease.standard
ease.enter
ease.exit
ease.spring_soft
```

Не hardcode-ити duration у десятках компонентів.

---

# 236. Button Animation

Primary button:

```text
idle
 ↓
touch
 ↓
scale 0.98
 ↓
slight lime glow
 ↓
release
 ↓
action
```

Disabled:
- без glow;
- lower opacity;
- без misleading press animation.

Loading button:
- текст плавно змінюється на spinner/status;
- ширина кнопки не стрибає.

---

# 237. Card Animation

Service / vehicle / condition cards:

При selection:

```text
border → lime
icon/check → fade + scale
background → subtle highlight
```

При deselection:
- reverse transition;
- без різкого flash.

---

# 238. Navigation Animation

Bottom Navigation:

- active icon має lightweight scale/translate;
- active label fade/slide;
- indicator плавно переміщується;
- screen content transition короткий і непомітний.

Не використовувати важкий page slide на кожному tab switch.

---

# 239. Modal / Sheet Motion

Modal:

```text
backdrop fade-in
modal scale 0.96 → 1.0
opacity 0 → 1
```

Bottom sheet:

```text
translateY
+
soft spring
```

Закриття:
- швидше за відкриття.

---

# 240. Calculator Processing Overlay

Після натискання:

```text
Розрахувати
```

не показувати миттєво сухий результат.

Потрібен компактний processing overlay.

Важливо:

```text
NOT FULL SCREEN
```

Основний екран залишається видимим, але трохи dimmed / blurred.

---

# 241. Calculator Loading UI

Компонент:

```text
CalculationProcessingOverlay
```

Приклад структури:

```text
┌──────────────────────────────┐
│          🦎 / brand mark      │
│                              │
│      Розраховуємо вартість   │
│                              │
│      ▰▰▰▰▱▱ subtle loader     │
│                              │
│  Враховуємо авто, стан, VIP  │
└──────────────────────────────┘
```

Візуально:
- dark glass panel;
- lime glow;
- rounded corners;
- chameleon / icon micro-animation;
- no blocking white spinner.

---

# 242. Calculator Processing Animation

Можливий sequence:

```text
0 ms
overlay appears

200 ms
brand/chameleon icon starts subtle animation

400 ms
status = "Перевіряємо послугу"

700 ms
status = "Враховуємо стан авто"

1000 ms
status = "Застосовуємо ваш тариф"

1300 ms
status = "Готово"
```

Ці статуси не повинні штучно затримувати реально швидку відповідь надовго.

Якщо API відповів швидко:
- мінімальна perceptual animation duration ~600–900ms.

Якщо API довше:
- loader продовжується реально.

---

# 243. Calculator Result Transition

Після успішного calculation:

```text
processing overlay
 ↓
success micro-animation
 ↓
overlay fades
 ↓
result modal opens
```

Не робити:

```text
loader disappears
→ blank pause
→ result appears
```

Потрібен seamless transition.

---

# 244. Calculator Result Modal

Після розрахунку відкривається modal:

```text
✨ Ваш розрахунок готовий
```

Він містить:

- service;
- vehicle;
- condition;
- options;
- base price;
- VIP discount;
- currency;
- final price;
- FX timestamp if relevant;
- CTA to submit work request.

Buttons:

```text
✅ Надіслати заявку
✏️ Змінити параметри
```

---

# 245. Calculation Error State

Якщо calculation API повернув error:

processing overlay не повинен просто зникнути.

Flow:

```text
loading
 ↓
small warning animation
 ↓
modal/message
```

Tone:

```text
Не вдалося завершити розрахунок.
Спробуйте ще раз за кілька секунд.
```

Buttons:

```text
🔄 Спробувати ще раз
← Повернутися
```

---

# 246. Mini App Startup Splash Screen

При запуску Mini App потрібен окремий branded splash screen.

Це:

```text
FULL SCREEN
```

На відміну від calculator processing overlay.

---

# 247. Startup Splash Visual

Стиль:

- black / graphite background;
- lime accent glow;
- Chameleon brand icon / lizard mascot;
- subtle detailing shine;
- logo centered;
- no clutter.

Центральний елемент:

```text
Chameleon icon / mascot
```

або брендований знак.

---

# 248. Startup Splash Status Bar

Під основною іконкою / логотипом розміщується status/progress indicator.

Структура:

```text
        [ CHAMELEON ICON ]

        Chameleon Detailing

        ▰▰▰▰▰▱▱▱
        Все найкраще тут
```

Текст під progress/status bar є локалізованою частиною launch identity.

Варіанти:

```text
UA: Все найкраще тут
PL: Wszystko, co najlepsze, jest tutaj
EN: The best is here
```

Правило вибору мови:

1. якщо у профілі користувача вже збережено locale — використати його;
2. якщо locale ще не завантажено, але Telegram language_code підтримується — використати його;
3. якщо мова невідома / перший запуск / unsupported locale — використовувати англійську.

Default:

```text
EN
```

---

# 249. Splash Progress States

Splash screen відображає реальні startup stages, а не fake 0–100%.

Рекомендовані stages:

```text
INIT
AUTH
PROFILE
CONFIG
READY
```

Приклад UX mapping:

```text
INIT     15%
AUTH     35%
PROFILE  55%
CONFIG   80%
READY   100%
```

---

# 250. Splash Startup Flow

```text
Mini App opens
 ↓
Splash
 ↓
Telegram initData validation
 ↓
Session restore/create
 ↓
Maintenance check
 ↓
Blacklist check
 ↓
Load user profile
 ↓
Load locale
 ↓
Load currency
 ↓
Load services/config
 ↓
READY
 ↓
Splash exit animation
 ↓
Home / relevant state
```

---

# 251. Splash Exit

При `READY`:

```text
progress reaches 100%
 ↓
small sparkle / mascot reaction
 ↓
logo slight scale
 ↓
splash fades
 ↓
Home appears underneath
```

Не робити різкий cut.

---

# 252. Splash Special Routes

Startup splash повинен коректно route-ити:

## Normal user
→ Home

## Maintenance
→ Maintenance Screen

## Blacklisted user
→ Friendly blocked screen

## Deferred holiday mode
→ Holiday state / Home with schedule state

## Owner maintenance bypass
→ Full Mini App

---

# 253. Splash Minimum / Maximum Timing

Не тримати splash штучно довго.

Рекомендація:

```text
minimum visual duration: 700–1000ms
```

щоб launch не виглядав як flash.

При slow network:
- progress/status залишається живим;
- loader не зависає візуально.

---

# 254. App Loading Fallback

Якщо startup займає більше, наприклад:

```text
8 seconds
```

показати:

```text
Ще декілька секунд…
```

Якщо довше:

```text
Не вдалося завершити завантаження.
```

Buttons:

```text
🔄 Повторити
💬 Підтримка
```

---

# 255. Skeleton Loading

Після startup splash не використовувати full-screen loader для кожного section.

Для:
- services;
- orders;
- profile cards;
- social links;

використовувати skeleton placeholders.

Це робить UI швидшим суб'єктивно.

---

# 256. Status Animations

Order statuses:

```text
REQUESTED
CONFIRMED
IN_PROGRESS
COMPLETED
PAID
```

При зміні status:
- icon morph/fade;
- status pill transition;
- timeline progress animation.

Не запускати надмірні confetti effects.

---

# 257. Payment Animation

Successful payment:

```text
processing
 ↓
verified backend
 ↓
checkmark animation
 ↓
Paid status
```

Не показувати success animation до backend verification.

---

# 258. VIP Motion

VIP status:
- subtle crown shimmer;
- lime/gold accent;
- no casino-like effects.

VIP card може мати:
- slow highlight sweep;
- premium glass reflection.

---

# 259. Chameleon Mascot Micro-Animations

Ящірка може використовуватися як functional brand character.

Наприклад:

## Startup
- blink;
- tail movement;
- shine.

## Calculator loading
- small tail rotation;
- eye movement;
- polish sparkle.

## Success
- short confident nod / sparkle.

## Holiday
- relaxed pose.

## Maintenance
- mascot with tool/polish metaphor.

Анімації короткі та ненав'язливі.

---

# 260. Reduced Motion Accessibility

Потрібно підтримати:

```text
prefers-reduced-motion
```

Якщо користувач зменшив animation:

- прибрати spring;
- мінімізувати scaling;
- замінити complex movement на fade;
- progress/status залишити функціональним.

---

# 261. Performance Rules

Animation не повинна:
- блокувати main thread;
- викликати layout thrashing;
- використовувати важке відео для простих transition;
- погано працювати на середніх Android-пристроях.

Пріоритет:
- transform;
- opacity;
- lightweight SVG/Lottie only where justified.

---

# 262. Animation Assets Architecture

Структура:

```text
assets/
  animations/
    splash/
    calculator/
    success/
    payment/
    holiday/
    maintenance/
    mascot/
```

Кожна animation asset замінюється окремо.

Не pack-ити всі motion assets в один великий файл.

---

# 263. Animation Config

Централізований config:

```text
config/motion.ts
```

Містить:

- durations;
- easing;
- reduced motion behavior;
- splash minimum duration;
- overlay minimum duration;
- modal timing;
- status transitions.

---

# 264. Locked Product Rules — v1.2

1. Усі UI elements мають продуману animation feedback.
2. Motion system централізований через tokens/config.
3. Calculator має компактний processing overlay, не full screen.
4. Після processing overlay відкривається result modal.
5. Calculator loading має branded Chameleon animation.
6. Startup Mini App має окремий full-screen splash screen.
7. Splash містить brand icon/mascot.
8. Під icon розміщується status/progress bar.
9. Launch phrase локалізується UA/PL/EN; default language — EN.
10. Для first launch або невідомої locale splash використовує англійський текст.
11. Splash progress відображає реальні startup stages.
11. Startup splash route-ить Maintenance / Blacklist / Holiday / Owner bypass states.
12. Success/payment animations запускаються тільки після backend confirmation.
13. Skeleton loaders використовуються для локального content loading.
14. Chameleon mascot використовується у functional micro-animation states.
15. `prefers-reduced-motion` підтримується обов'язково.
16. Animation assets зберігаються модульно й замінюються окремо.


---

# 265. Startup Splash Locale Priority

Порядок визначення мови splash:

```text
saved user locale
    ↓
Telegram language_code
    ↓
EN fallback
```

Підтримувані launch strings:

```text
uk → Все найкраще тут
pl → Wszystko, co najlepsze, jest tutaj
en → The best is here
```

Splash не повинен чекати повного завантаження профілю, якщо мову можна визначити з локального/session cache або Telegram metadata.

Якщо після startup профіль повернув іншу збережену locale, весь наступний UI переходить на неї без перезавантаження Mini App.

---

# 266. Locked Product Rules — v1.3

1. Startup slogan не є статичним українським текстом.
2. Він локалізується відповідно до locale користувача.
3. Default locale при першому запуску — English.
4. Fallback string: `The best is here`.
5. Підтримуються UA / PL / EN.


---

# 267. Visual Quality Standard

Фінальний продукт повинен виглядати як завершений premium product, а не як прототип.

Заборонені стани:

- текст виходить за межі card/container;
- headline перекриває mascot/image;
- кнопки змінюють висоту хаотично;
- локалізація ламає layout;
- елементи занадто близько до країв;
- різні screens мають різну систему відступів;
- іконки мають різну товщину або різний стиль;
- одна мова змішується з іншою на одному екрані;
- UI виглядає добре тільки в одній ширині екрана.

---

# 268. Responsive Typography

Текст не повинен мати фіксований desktop-like розмір.

Використовувати responsive typography tokens.

Приклад:

```text
display.hero
heading.h1
heading.h2
heading.h3
body.large
body.normal
body.small
label
caption
price.large
price.normal
```

Розмір headline повинен адаптуватися до:
- ширини screen;
- довжини перекладу;
- accessibility settings;
- конкретної мови.

---

# 269. Long Text Protection

Для всіх локалізованих блоків:

- `min-width: 0`;
- коректний wrapping;
- max lines тільки там, де це безпечно;
- `line-clamp` не використовувати для критичного тексту;
- кнопки не обрізати важливі CTA;
- dynamic height замість fixed height для language-sensitive cards.

Hero headline:
- максимум 3–4 рядки;
- не перекриває mascot/image;
- image zone і text zone мають окрему responsive grid area.

---

# 270. Hero Layout Rules

Hero в Mini App повинен будуватися не як одна картинка з текстом поверх у випадковій позиції, а як responsive composition.

Рекомендована структура:

```text
HeroCard
 ├─ copy area
 ├─ mascot/image area
 ├─ CTA
 └─ benefits row
```

На вузьких екранах:
- text area отримує пріоритет;
- mascot/image може зміщуватися вправо/вниз;
- headline scale зменшується;
- decorative elements можуть приховуватися.

---

# 271. Safe Mobile Widths

Обов'язково QA мінімум на:

```text
320 px
360 px
375 px
390 px
414 px
430 px
```

Перевірити:
- iPhone SE-like widths;
- modern iPhone;
- Android medium;
- Telegram in-app browser;
- standalone browser fallback.

---

# 272. Safe Areas

Враховувати:

```text
env(safe-area-inset-top)
env(safe-area-inset-bottom)
env(safe-area-inset-left)
env(safe-area-inset-right)
```

Bottom navigation:
- не перекривається browser bar;
- не торкається home indicator;
- має достатній padding.

---

# 273. Language Architecture — Full Product Coverage

Весь продукт повинен бути перекладений на:

```text
UA / UKRAINIAN
PL / POLISH
EN / ENGLISH
```

Canonical locale codes:

```text
uk
pl
en
```

У UI labels використовувати:

```text
UA
PL
EN
```

Не використовувати `UK` для Ukrainian.

---

# 274. No Mixed-Language Rule

На одному екрані не повинно бути одночасно:

```text
Holiday — time to rest
+
Сьогодні сервіс не працює
```

якщо це не спеціально задуманий брендований bilingual block.

За замовчуванням:

```text
ONE SCREEN = ONE ACTIVE LOCALE
```

---

# 275. Language Switch Behavior

При зміні мови:

```text
UA → PL → EN
```

весь видимий UI оновлюється без reload.

Оновлюються:

- navigation;
- hero;
- services;
- calculator;
- modal;
- validation;
- profile;
- orders;
- VIP;
- holiday;
- maintenance;
- blacklist;
- payment;
- delivery;
- referral;
- help;
- errors;
- empty states;
- loading states;
- splash;
- notifications preview.

---

# 276. Translation Coverage

Не дозволяти hardcoded customer-facing strings у components.

Усе customer-facing:

```text
t("...")
```

або equivalent i18n layer.

Hardcoded допускається тільки для:
- internal IDs;
- enum keys;
- debug-only technical text.

---

# 277. Translation Key Structure

Приклад:

```text
common.*
nav.*
home.*
services.*
calculator.*
orders.*
profile.*
vip.*
payment.*
delivery.*
referral.*
holiday.*
maintenance.*
blacklist.*
errors.*
loading.*
bot.*
```

---

# 278. Translation Validation

На build / CI запускати:

```text
translation completeness check
```

Перевірити:

- key існує в `uk`;
- key існує в `pl`;
- key існує в `en`;
- немає orphan keys;
- немає duplicate keys;
- немає accidental fallback у production.

---

# 279. Fallback Language

Default fallback:

```text
en
```

Priority:

```text
saved locale
 ↓
Telegram language_code
 ↓
en
```

Якщо translation key відсутній:
- fallback EN;
- записати dev warning;
- не показувати raw key користувачу.

---

# 280. Locale-Specific Typography

Дозволено використовувати різні font fallbacks для кращої читабельності.

Рекомендований підхід:

```text
Primary UI font:
Inter / Manrope / Sora / similar

Display / branded:
окремий brand font тільки для коротких заголовків
```

Не використовувати декоративний italic/display font для:
- довгих paragraph;
- buttons;
- settings;
- calculator;
- status text.

---

# 281. Cyrillic Support

Обраний primary font обов'язково повинен якісно підтримувати:

- Ukrainian Cyrillic;
- Polish Latin Extended;
- English Latin.

Перевірити glyphs:

```text
і ї є ґ
ą ć ę ł ń ó ś ź ż
```

---

# 282. Readability Rules

Minimum recommended:

```text
body: 15–16px
secondary: 13–14px
caption: 12px
CTA: 16px+
```

Не використовувати:
- ultra-thin font weight на темному фоні;
- low-contrast gray;
- lime text для довгих paragraph;
- condensed display font для основного content.

---

# 283. Contrast Standard

Dark UI:

- primary text → near-white;
- secondary text → readable gray;
- accent → lime;
- warning/error → окремі semantic colors;
- disabled → не виглядає активним.

Контраст перевіряти мінімум приблизно на WCAG AA для тексту.

---

# 284. Localization-Aware Component Sizing

Компонент не повинен бути спроєктований тільки під English.

Наприклад:

```text
Book now
```

коротше за:

```text
Розрахувати вартість
```

Тому:
- buttons auto-size / wrap appropriately;
- nav labels допускають 2 lines тільки якщо це дизайн-система дозволяє;
- toolbar labels не обрізаються;
- cards ростуть по висоті.

---

# 285. Bottom Navigation Localization

Bottom nav має окремий QA.

Для UA:

```text
Головна
Послуги
Калькулятор
VIP
Профіль
```

Для PL:

```text
Główna
Usługi
Kalkulator
VIP
Profil
```

Для EN:

```text
Home
Services
Calculator
VIP
Profile
```

Якщо label занадто довгий:
- зменшити font у межах token;
- не ламати spacing;
- не використовувати горизонтальний scroll.

---

# 286. Language Selector UI

Показувати:

```text
UA
PL
EN
```

з коректними locale labels.

Не показувати:
- `UK`;
- випадкові flags без потреби;
- mixed country/language naming.

Краще:

```text
Українська
Polski
English
```

у dropdown, а compact chip:

```text
UA / PL / EN
```

---

# 287. Screenshot-Based QA Rule

Перед релізом кожного екрана робити visual QA screenshot check у всіх трьох мовах.

Matrix:

```text
Screen × Locale × Width
```

Наприклад:

```text
Home × UA × 375
Home × PL × 375
Home × EN × 375
Home × UA × 430
...
```

---

# 288. Visual Regression Testing

Рекомендовано додати screenshot regression tests для ключових screens:

```text
Home
Services
Calculator
Estimate Modal
Orders
Profile
VIP
Holiday
Maintenance
Blacklist
Payment
Delivery
```

Goal:
- зловити layout break до deploy.

---

# 289. Overflow Test Mode

Dev-only mode:

```text
?debugLocale=long
```

або internal test locale з навмисно довгими рядками.

Це дозволяє знайти:
- fixed-height bugs;
- button overflow;
- title clipping;
- navigation collision.

---

# 290. Content Length Guidelines

Для marketing copy:

- hero title: до 45–55 chars на locale;
- hero subtitle: до 90–120 chars;
- card title: до 30–40 chars;
- CTA: до 28–32 chars.

Якщо переклад довший:
- адаптувати wording;
- не обрізати механічно.

---

# 291. Product Polish Checklist

Перед release screen вважається готовим тільки якщо:

```text
✓ no overflow
✓ no clipped text
✓ no mixed locale
✓ no wrong locale code
✓ no broken safe area
✓ readable contrast
✓ animation smooth
✓ touch targets >= 44px
✓ UA checked
✓ PL checked
✓ EN checked
✓ 375px checked
✓ 430px checked
```

---

# 292. Locked Product Rules — v1.4

1. Весь продукт повністю перекладається UA/PL/EN.
2. Canonical locale codes: `uk`, `pl`, `en`.
3. UI badge для української: `UA`, не `UK`.
4. Один активний screen не змішує мови.
5. English є fallback.
6. Усі customer-facing strings проходять через i18n.
7. Hero та cards responsive і не мають fixed-height text traps.
8. Typography адаптується до ширини та мови.
9. Primary font повинен підтримувати Ukrainian Cyrillic і Polish Latin Extended.
10. Допускається зміна шрифтів заради читабельності.
11. Display font використовується тільки для короткого branded copy.
12. Кожен ключовий screen проходить visual QA в UA/PL/EN.
13. QA проводиться на кількох mobile widths.
14. Visual regression tests рекомендовані для ключових screens.
15. Жоден production screen не може мати text overflow, clipping або broken spacing.
