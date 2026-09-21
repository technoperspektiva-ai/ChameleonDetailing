PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id INTEGER NOT NULL UNIQUE,
  username TEXT, first_name TEXT, last_name TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  management_language TEXT,
  preferred_currency TEXT NOT NULL DEFAULT 'PLN',
  role TEXT NOT NULL DEFAULT 'CLIENT',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_tg ON users(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS client_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  client_tier TEXT NOT NULL DEFAULT 'STANDARD',
  vip_since TEXT, notes TEXT, assigned_manager_id INTEGER,
  phone_number TEXT, phone_verified_via_telegram INTEGER NOT NULL DEFAULT 0,
  phone_shared_at TEXT, preferred_contact_method TEXT,
  first_paid_job_at TEXT, last_paid_job_at TEXT, paid_jobs_count INTEGER NOT NULL DEFAULT 0,
  lifetime_value REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS vip_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,tier TEXT NOT NULL,assigned_by INTEGER,
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,expires_at TEXT,removed_by INTEGER,removed_at TEXT,removal_reason TEXT,metadata_json TEXT
);
CREATE TABLE IF NOT EXISTS whitelist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,type TEXT NOT NULL DEFAULT 'GENERAL',reason TEXT,created_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,expires_at TEXT,is_active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,public_reason TEXT NOT NULL,internal_note TEXT,blocked_by INTEGER,blocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,expires_at TEXT,is_active INTEGER NOT NULL DEFAULT 1,unblocked_by INTEGER,unblocked_at TEXT
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,slug TEXT NOT NULL UNIQUE,enabled INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0,category TEXT NOT NULL DEFAULT 'DETAILING',duration_min INTEGER NOT NULL DEFAULT 60,archived INTEGER NOT NULL DEFAULT 0,image_url TEXT,icon_key TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS service_translations (service_id INTEGER NOT NULL,locale TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,PRIMARY KEY(service_id,locale));
CREATE TABLE IF NOT EXISTS service_prices (service_id INTEGER PRIMARY KEY,base_price REAL NOT NULL,base_currency TEXT NOT NULL DEFAULT 'PLN',currency_mode TEXT NOT NULL DEFAULT 'LIVE',usd_override REAL,uah_override REAL,pln_override REAL,enabled INTEGER NOT NULL DEFAULT 1,updated_by INTEGER,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS vip_pricing_rules (
 service_id INTEGER NOT NULL,tier TEXT NOT NULL,mode TEXT NOT NULL DEFAULT 'PERCENT',percent_discount REAL,multiplier REAL,fixed_price REAL,currency TEXT,enabled INTEGER NOT NULL DEFAULT 1,updated_by INTEGER,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(service_id,tier)
);
CREATE TABLE IF NOT EXISTS vehicle_types (id INTEGER PRIMARY KEY AUTOINCREMENT,slug TEXT NOT NULL UNIQUE,multiplier REAL NOT NULL DEFAULT 1,enabled INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS condition_levels (id INTEGER PRIMARY KEY AUTOINCREMENT,slug TEXT NOT NULL UNIQUE,multiplier REAL NOT NULL DEFAULT 1,enabled INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS service_options (id INTEGER PRIMARY KEY AUTOINCREMENT,service_id INTEGER,slug TEXT NOT NULL,price REAL NOT NULL DEFAULT 0,pricing_type TEXT NOT NULL DEFAULT 'FIXED',enabled INTEGER NOT NULL DEFAULT 1);

CREATE TABLE IF NOT EXISTS calculator_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,service_id INTEGER,vehicle_type_id INTEGER,condition_level_id INTEGER,
  base_price_snapshot REAL,vehicle_multiplier_snapshot REAL,condition_multiplier_snapshot REAL,options_total_snapshot REAL,discount_snapshot REAL,
  calculated_price REAL NOT NULL,currency TEXT NOT NULL,pricing_version TEXT,fx_rate REAL,fx_provider TEXT,fx_timestamp TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS calculator_session_options (calculation_id INTEGER NOT NULL,option_id INTEGER NOT NULL,price_snapshot REAL NOT NULL,PRIMARY KEY(calculation_id,option_id));
CREATE TABLE IF NOT EXISTS service_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,calculation_id INTEGER,assigned_manager_id INTEGER,status TEXT NOT NULL DEFAULT 'REQUESTED',is_test INTEGER NOT NULL DEFAULT 0,
  service_slug TEXT,vehicle_slug TEXT,condition_slug TEXT,options_json TEXT,request_type TEXT NOT NULL DEFAULT 'STANDARD',scheduled_for TEXT,is_deferred INTEGER NOT NULL DEFAULT 0,
  base_price_snapshot REAL,options_total_snapshot REAL,discount_snapshot REAL,calculated_price REAL NOT NULL,final_job_price REAL,price_adjustment_reason TEXT,currency TEXT NOT NULL,
  emergency_multiplier REAL,emergency_surcharge REAL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,confirmed_at TEXT,confirmed_by INTEGER,started_at TEXT,started_by INTEGER,
  rejected_at TEXT,rejected_by INTEGER,rejection_reason TEXT,completed_at TEXT,completed_by INTEGER,payment_status TEXT NOT NULL DEFAULT 'PENDING',first_paid_job_for_user INTEGER NOT NULL DEFAULT 0,is_repeat_customer INTEGER NOT NULL DEFAULT 0,referral_id INTEGER,metadata_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_requests_user_created ON service_requests(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status ON service_requests(status);

CREATE TABLE IF NOT EXISTS payments (
 id INTEGER PRIMARY KEY AUTOINCREMENT,service_request_id INTEGER,user_id INTEGER,amount REAL NOT NULL,currency TEXT NOT NULL,reporting_amount REAL,reporting_currency TEXT,fx_rate REAL,fx_provider TEXT,fx_timestamp TEXT,
 method TEXT NOT NULL,provider TEXT,provider_payment_id TEXT,status TEXT NOT NULL DEFAULT 'PENDING',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,paid_at TEXT,marked_by INTEGER,metadata_json TEXT
);
CREATE TABLE IF NOT EXISTS delivery_requests (
 id INTEGER PRIMARY KEY AUTOINCREMENT,service_request_id INTEGER NOT NULL,user_id INTEGER NOT NULL,address_text TEXT,status TEXT NOT NULL DEFAULT 'OFFERED',price REAL,currency TEXT,base_price REAL,base_currency TEXT,fx_rate REAL,fx_provider TEXT,fx_timestamp TEXT,requested_at TEXT,confirmed_at TEXT,confirmed_by INTEGER,delivered_at TEXT,delivered_by INTEGER,declined_at TEXT,cancelled_at TEXT,notes TEXT,metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS referrals (id INTEGER PRIMARY KEY AUTOINCREMENT,referrer_user_id INTEGER,referred_user_id INTEGER,code TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,miniapp_opened_at TEXT,calculator_used_at TEXT,request_created_at TEXT,first_paid_job_at TEXT,became_vip_at TEXT);
CREATE TABLE IF NOT EXISTS analytics_events (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,event_type TEXT NOT NULL,metadata_json TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON analytics_events(event_type,created_at);
CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT,actor_user_id INTEGER,action TEXT NOT NULL,entity_type TEXT,entity_id TEXT,old_data_json TEXT,new_data_json TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS content_blocks (key TEXT NOT NULL,locale TEXT NOT NULL,value TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(key,locale));
CREATE TABLE IF NOT EXISTS feature_flags (key TEXT PRIMARY KEY,enabled INTEGER NOT NULL DEFAULT 0,config_json TEXT);
CREATE TABLE IF NOT EXISTS social_links (id INTEGER PRIMARY KEY AUTOINCREMENT,type TEXT NOT NULL UNIQUE,url TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0,created_by INTEGER,updated_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS schedule_exceptions (id INTEGER PRIMARY KEY AUTOINCREMENT,date TEXT NOT NULL UNIQUE,is_closed INTEGER NOT NULL DEFAULT 1,open_time TEXT,close_time TEXT,note TEXT,created_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS fx_rates (base_currency TEXT PRIMARY KEY,usd_rate REAL,uah_rate REAL,pln_rate REAL,provider TEXT,fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS bot_state (user_id INTEGER PRIMARY KEY,state TEXT,payload_json TEXT,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS staff_invites (id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT NOT NULL,target_role TEXT NOT NULL,code TEXT NOT NULL UNIQUE,created_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,accepted_by_user_id INTEGER,accepted_at TEXT,expires_at TEXT,status TEXT NOT NULL DEFAULT 'PENDING');
CREATE TABLE IF NOT EXISTS staff_invites_v2 (token TEXT PRIMARY KEY,username TEXT NOT NULL,role TEXT NOT NULL,created_by_user_id INTEGER,status TEXT NOT NULL DEFAULT 'PENDING',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,claimed_by_user_id INTEGER,claimed_at TEXT);

INSERT OR IGNORE INTO settings(key,value) VALUES
 ('maintenance.enabled','0'),('business_timezone','Europe/Warsaw'),('working_days','1,2,3,4,5'),('working_hours','09:00-18:00'),('emergency_enabled','0'),('emergency_multiplier','1.5'),('reporting_currency','PLN');

-- Canonical starter services. Runtime bootstrap also UPSERTs these rows so older D1
-- databases are repaired automatically after deploy.
INSERT INTO services(slug,enabled,sort_order,category,duration_min,archived) VALUES
 ('exterior-detailing',1,10,'EXTERIOR',90,0),
 ('interior-detailing',1,20,'INTERIOR',120,0),
 ('full-detailing',1,30,'FULL',180,0),
 ('ceramic-coating',1,40,'PROTECTION',360,0)
ON CONFLICT(slug) DO UPDATE SET enabled=excluded.enabled,sort_order=excluded.sort_order,category=excluded.category,duration_min=excluded.duration_min,archived=excluded.archived;

INSERT INTO service_prices(service_id,base_price,base_currency)
SELECT id,150,'PLN' FROM services WHERE slug='exterior-detailing'
ON CONFLICT(service_id) DO NOTHING;
INSERT INTO service_prices(service_id,base_price,base_currency)
SELECT id,120,'PLN' FROM services WHERE slug='interior-detailing'
ON CONFLICT(service_id) DO NOTHING;
INSERT INTO service_prices(service_id,base_price,base_currency)
SELECT id,250,'PLN' FROM services WHERE slug='full-detailing'
ON CONFLICT(service_id) DO NOTHING;
INSERT INTO service_prices(service_id,base_price,base_currency)
SELECT id,800,'PLN' FROM services WHERE slug='ceramic-coating'
ON CONFLICT(service_id) DO NOTHING;

INSERT INTO service_translations(service_id,locale,title,description)
SELECT id,'uk','Детейлінг екстер’єру','Глибоке очищення, деконтамінація та тривалий блиск.' FROM services WHERE slug='exterior-detailing'
ON CONFLICT(service_id,locale) DO UPDATE SET title=excluded.title,description=excluded.description;
INSERT INTO service_translations(service_id,locale,title,description)
SELECT id,'pl','Detailing zewnętrzny','Dokładne czyszczenie, dekontaminacja i długotrwały połysk.' FROM services WHERE slug='exterior-detailing'
ON CONFLICT(service_id,locale) DO UPDATE SET title=excluded.title,description=excluded.description;
INSERT INTO service_translations(service_id,locale,title,description)
SELECT id,'en','Exterior Detailing','Deep clean, decontamination and lasting shine.' FROM services WHERE slug='exterior-detailing'
ON CONFLICT(service_id,locale) DO UPDATE SET title=excluded.title,description=excluded.description;

INSERT INTO service_translations(service_id,locale,title,description)
SELECT id,'uk','Детейлінг інтер’єру','Свіжий, чистий і комфортний салон.' FROM services WHERE slug='interior-detailing'
ON CONFLICT(service_id,locale) DO UPDATE SET title=excluded.title,description=excluded.description;
INSERT INTO service_translations(service_id,locale,title,description)
SELECT id,'pl','Detailing wnętrza','Świeże, czyste i komfortowe wnętrze.' FROM services WHERE slug='interior-detailing'
ON CONFLICT(service_id,locale) DO UPDATE SET title=excluded.title,description=excluded.description;
INSERT INTO service_translations(service_id,locale,title,description)
SELECT id,'en','Interior Detailing','Fresh, clean and comfortable interior.' FROM services WHERE slug='interior-detailing'
ON CONFLICT(service_id,locale) DO UPDATE SET title=excluded.title,description=excluded.description;

INSERT INTO service_translations(service_id,locale,title,description)
SELECT id,'uk','Повний детейлінг','Комплексне оновлення авто всередині та зовні.' FROM services WHERE slug='full-detailing'
ON CONFLICT(service_id,locale) DO UPDATE SET title=excluded.title,description=excluded.description;
INSERT INTO service_translations(service_id,locale,title,description)
SELECT id,'pl','Pełny detailing','Kompleksowe odświeżenie auta wewnątrz i na zewnątrz.' FROM services WHERE slug='full-detailing'
ON CONFLICT(service_id,locale) DO UPDATE SET title=excluded.title,description=excluded.description;
INSERT INTO service_translations(service_id,locale,title,description)
SELECT id,'en','Full Detailing','Complete inside & out showroom refresh.' FROM services WHERE slug='full-detailing'
ON CONFLICT(service_id,locale) DO UPDATE SET title=excluded.title,description=excluded.description;

INSERT INTO service_translations(service_id,locale,title,description)
SELECT id,'uk','Керамічне покриття','Довготривалий захист лакофарбового покриття та глибокий блиск.' FROM services WHERE slug='ceramic-coating'
ON CONFLICT(service_id,locale) DO UPDATE SET title=excluded.title,description=excluded.description;
INSERT INTO service_translations(service_id,locale,title,description)
SELECT id,'pl','Powłoka ceramiczna','Długotrwała ochrona lakieru i głęboki połysk.' FROM services WHERE slug='ceramic-coating'
ON CONFLICT(service_id,locale) DO UPDATE SET title=excluded.title,description=excluded.description;
INSERT INTO service_translations(service_id,locale,title,description)
SELECT id,'en','Ceramic Coating','Long-term paint protection and gloss.' FROM services WHERE slug='ceramic-coating'
ON CONFLICT(service_id,locale) DO UPDATE SET title=excluded.title,description=excluded.description;


-- v1.1.11 referral panel copy defaults
INSERT OR IGNORE INTO content_blocks(key,locale,value) VALUES
('referral.title','uk','Запроси друга в Chameleon'),
('referral.subtitle','uk','Поділися сервісом, якому довіряєш. Друг отримає зручний доступ до Chameleon Detailing, а ми подбаємо про його авто так само уважно.'),
('referral.share_text','uk','Рекомендую Chameleon Detailing 🦎 Тут зручно підібрати послугу, розрахувати вартість і залишити заявку прямо в Telegram.'),
('referral.title','pl','Zaproś znajomego do Chameleon'),
('referral.subtitle','pl','Poleć miejsce, któremu ufasz. Znajomy szybko otworzy Chameleon Detailing w Telegramie, a my zadbamy o jego auto z taką samą uwagą.'),
('referral.share_text','pl','Polecam Chameleon Detailing 🦎 W Telegramie możesz wygodnie wybrać usługę, sprawdzić cenę i wysłać zgłoszenie.'),
('referral.title','en','Invite a friend to Chameleon'),
('referral.subtitle','en','Share a service you trust. Your friend gets quick access to Chameleon Detailing in Telegram, and we will care for their car with the same attention.'),
('referral.share_text','en','I recommend Chameleon Detailing 🦎 Choose a service, check the estimate and send a request directly in Telegram.');
