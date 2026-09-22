import type {Env,TelegramUser} from './types';
import {fallbackServicesFor,normalizeServiceLocale,serviceCatalog} from './services';
import {convertCurrency,normalizeCurrency} from './currency';

let ready=false;

async function safeAlter(env:Env,sql:string){
 if(!env.DB)return;
 try{await env.DB.exec(sql)}catch{}
}

export async function ensureDb(env:Env){
 if(!env.DB)return false;
 if(ready)return true;
 await env.DB.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,telegram_user_id INTEGER NOT NULL UNIQUE,username TEXT,first_name TEXT,last_name TEXT,language TEXT NOT NULL DEFAULT 'en',management_language TEXT,preferred_currency TEXT NOT NULL DEFAULT 'PLN',role TEXT NOT NULL DEFAULT 'CLIENT',status TEXT NOT NULL DEFAULT 'ACTIVE',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS client_profiles(user_id INTEGER PRIMARY KEY,client_tier TEXT NOT NULL DEFAULT 'STANDARD',phone_number TEXT,phone_verified_via_telegram INTEGER NOT NULL DEFAULT 0,phone_shared_at TEXT,preferred_contact_method TEXT,notes TEXT,vip_since TEXT,assigned_manager_id INTEGER,first_paid_job_at TEXT,last_paid_job_at TEXT,paid_jobs_count INTEGER NOT NULL DEFAULT 0,lifetime_value REAL NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS vip_history(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,tier TEXT NOT NULL,assigned_by INTEGER,assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,expires_at TEXT,removed_by INTEGER,removed_at TEXT,removal_reason TEXT,metadata_json TEXT);
CREATE TABLE IF NOT EXISTS whitelist(user_id INTEGER PRIMARY KEY,created_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS blacklist(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,public_reason TEXT NOT NULL,internal_note TEXT,blocked_by INTEGER,blocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,expires_at TEXT,is_active INTEGER NOT NULL DEFAULT 1,unblocked_by INTEGER,unblocked_at TEXT);
CREATE TABLE IF NOT EXISTS services(id INTEGER PRIMARY KEY AUTOINCREMENT,slug TEXT NOT NULL UNIQUE,enabled INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0,category TEXT NOT NULL DEFAULT 'DETAILING',duration_min INTEGER NOT NULL DEFAULT 60,archived INTEGER NOT NULL DEFAULT 0,image_url TEXT,icon_key TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS service_translations(service_id INTEGER NOT NULL,locale TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,PRIMARY KEY(service_id,locale));
CREATE TABLE IF NOT EXISTS service_prices(service_id INTEGER PRIMARY KEY,base_price REAL NOT NULL,base_currency TEXT NOT NULL DEFAULT 'PLN',currency_mode TEXT NOT NULL DEFAULT 'LIVE',usd_override REAL,uah_override REAL,pln_override REAL,enabled INTEGER NOT NULL DEFAULT 1,updated_by INTEGER,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS vip_pricing_rules(service_id INTEGER NOT NULL,tier TEXT NOT NULL,mode TEXT NOT NULL DEFAULT 'PERCENT',percent_discount REAL,multiplier REAL,fixed_price REAL,currency TEXT,enabled INTEGER NOT NULL DEFAULT 1,updated_by INTEGER,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(service_id,tier));
CREATE TABLE IF NOT EXISTS vehicle_types(id INTEGER PRIMARY KEY AUTOINCREMENT,slug TEXT NOT NULL UNIQUE,multiplier REAL NOT NULL DEFAULT 1,enabled INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS condition_levels(id INTEGER PRIMARY KEY AUTOINCREMENT,slug TEXT NOT NULL UNIQUE,multiplier REAL NOT NULL DEFAULT 1,enabled INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS service_options(id INTEGER PRIMARY KEY AUTOINCREMENT,service_id INTEGER,slug TEXT NOT NULL,price REAL NOT NULL DEFAULT 0,pricing_type TEXT NOT NULL DEFAULT 'FIXED',enabled INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS calculator_sessions(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,service_id INTEGER,vehicle_type_id INTEGER,condition_level_id INTEGER,base_price_snapshot REAL,vehicle_multiplier_snapshot REAL,condition_multiplier_snapshot REAL,options_total_snapshot REAL,discount_snapshot REAL,calculated_price REAL NOT NULL,currency TEXT NOT NULL,pricing_version TEXT,fx_rate REAL,fx_provider TEXT,fx_timestamp TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS service_requests(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,calculation_id INTEGER,assigned_manager_id INTEGER,status TEXT NOT NULL DEFAULT 'REQUESTED',is_test INTEGER NOT NULL DEFAULT 0,service_slug TEXT,vehicle_slug TEXT,condition_slug TEXT,options_json TEXT,request_type TEXT NOT NULL DEFAULT 'STANDARD',scheduled_for TEXT,is_deferred INTEGER NOT NULL DEFAULT 0,base_price_snapshot REAL,options_total_snapshot REAL,discount_snapshot REAL,calculated_price REAL NOT NULL,final_job_price REAL,price_adjustment_reason TEXT,currency TEXT NOT NULL,emergency_multiplier REAL,emergency_surcharge REAL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,confirmed_at TEXT,completed_at TEXT,payment_status TEXT NOT NULL DEFAULT 'PENDING',updated_at TEXT);
CREATE TABLE IF NOT EXISTS payments(id INTEGER PRIMARY KEY AUTOINCREMENT,service_request_id INTEGER,user_id INTEGER,amount REAL NOT NULL,currency TEXT NOT NULL,reporting_amount REAL,reporting_currency TEXT,fx_rate REAL,fx_provider TEXT,fx_timestamp TEXT,method TEXT NOT NULL DEFAULT 'MANUAL',provider TEXT,provider_payment_id TEXT,status TEXT NOT NULL DEFAULT 'PENDING',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,paid_at TEXT,marked_by INTEGER,metadata_json TEXT);
CREATE TABLE IF NOT EXISTS delivery_requests(id INTEGER PRIMARY KEY AUTOINCREMENT,service_request_id INTEGER NOT NULL,user_id INTEGER NOT NULL,address_text TEXT,status TEXT NOT NULL DEFAULT 'OFFERED',price REAL,currency TEXT,base_price REAL,base_currency TEXT,fx_rate REAL,fx_provider TEXT,fx_timestamp TEXT,requested_at TEXT,confirmed_at TEXT,confirmed_by INTEGER,delivered_at TEXT,delivered_by INTEGER,declined_at TEXT,cancelled_at TEXT,notes TEXT,metadata_json TEXT);
CREATE TABLE IF NOT EXISTS referrals(id INTEGER PRIMARY KEY AUTOINCREMENT,referrer_user_id INTEGER,referred_user_id INTEGER,code TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,miniapp_opened_at TEXT,calculator_used_at TEXT,request_created_at TEXT,first_paid_job_at TEXT,became_vip_at TEXT);
CREATE TABLE IF NOT EXISTS analytics_events(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,event_type TEXT NOT NULL,metadata_json TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS content_blocks(key TEXT NOT NULL,locale TEXT NOT NULL,value TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(key,locale));
CREATE TABLE IF NOT EXISTS feature_flags(key TEXT PRIMARY KEY,enabled INTEGER NOT NULL DEFAULT 0,config_json TEXT);
CREATE TABLE IF NOT EXISTS social_links(id INTEGER PRIMARY KEY AUTOINCREMENT,type TEXT NOT NULL UNIQUE,url TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS schedule_exceptions(id INTEGER PRIMARY KEY AUTOINCREMENT,date TEXT NOT NULL UNIQUE,is_closed INTEGER NOT NULL DEFAULT 1,open_time TEXT,close_time TEXT,note TEXT,created_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS business_weekly_schedule(day_of_week INTEGER PRIMARY KEY,enabled INTEGER NOT NULL DEFAULT 0,open_time TEXT NOT NULL DEFAULT '09:00',close_time TEXT NOT NULL DEFAULT '18:00',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS bot_state(user_id INTEGER PRIMARY KEY,state TEXT,payload_json TEXT,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT,actor_user_id INTEGER,action TEXT NOT NULL,entity_type TEXT,entity_id TEXT,old_data_json TEXT,new_data_json TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS staff_invites_v2(token TEXT PRIMARY KEY,username TEXT NOT NULL,role TEXT NOT NULL,created_by_user_id INTEGER,status TEXT NOT NULL DEFAULT 'PENDING',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,claimed_by_user_id INTEGER,claimed_at TEXT);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON analytics_events(event_type,created_at);
`);
 // Backward-compatible upgrades for D1 databases created by older builds.
 await safeAlter(env,"ALTER TABLE users ADD COLUMN management_language TEXT");
 // client_profiles was smaller in early production builds. Keep runtime upgrades
 // exhaustive so reports, VIP and retention never depend on a manual D1 reset.
 await safeAlter(env,"ALTER TABLE client_profiles ADD COLUMN phone_number TEXT");
 await safeAlter(env,"ALTER TABLE client_profiles ADD COLUMN phone_verified_via_telegram INTEGER NOT NULL DEFAULT 0");
 await safeAlter(env,"ALTER TABLE client_profiles ADD COLUMN phone_shared_at TEXT");
 await safeAlter(env,"ALTER TABLE client_profiles ADD COLUMN preferred_contact_method TEXT");
 await safeAlter(env,"ALTER TABLE client_profiles ADD COLUMN notes TEXT");
 await safeAlter(env,"ALTER TABLE client_profiles ADD COLUMN vip_since TEXT");
 await safeAlter(env,"ALTER TABLE client_profiles ADD COLUMN assigned_manager_id INTEGER");
 await safeAlter(env,"ALTER TABLE client_profiles ADD COLUMN first_paid_job_at TEXT");
 await safeAlter(env,"ALTER TABLE client_profiles ADD COLUMN last_paid_job_at TEXT");
 await safeAlter(env,"ALTER TABLE client_profiles ADD COLUMN paid_jobs_count INTEGER NOT NULL DEFAULT 0");
 await safeAlter(env,"ALTER TABLE client_profiles ADD COLUMN lifetime_value REAL NOT NULL DEFAULT 0");
 await safeAlter(env,"ALTER TABLE whitelist ADD COLUMN created_by INTEGER");
 await safeAlter(env,"ALTER TABLE services ADD COLUMN image_url TEXT");
 await safeAlter(env,"ALTER TABLE services ADD COLUMN icon_key TEXT");
 await safeAlter(env,"ALTER TABLE services ADD COLUMN created_at TEXT");
 await safeAlter(env,"ALTER TABLE services ADD COLUMN updated_at TEXT");
 await safeAlter(env,"ALTER TABLE service_prices ADD COLUMN currency_mode TEXT NOT NULL DEFAULT 'LIVE'");
 await safeAlter(env,"ALTER TABLE service_prices ADD COLUMN usd_override REAL");
 await safeAlter(env,"ALTER TABLE service_prices ADD COLUMN uah_override REAL");
 await safeAlter(env,"ALTER TABLE service_prices ADD COLUMN pln_override REAL");
 await safeAlter(env,"ALTER TABLE service_prices ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1");
 await safeAlter(env,"ALTER TABLE service_prices ADD COLUMN updated_by INTEGER");
 await safeAlter(env,"ALTER TABLE service_prices ADD COLUMN updated_at TEXT");
 await safeAlter(env,"ALTER TABLE service_requests ADD COLUMN client_deleted_at TEXT");
 await safeAlter(env,"ALTER TABLE service_requests ADD COLUMN final_job_price REAL");
 await safeAlter(env,"ALTER TABLE service_requests ADD COLUMN price_adjustment_reason TEXT");
 await safeAlter(env,"ALTER TABLE service_requests ADD COLUMN confirmed_at TEXT");
 await safeAlter(env,"ALTER TABLE service_requests ADD COLUMN completed_at TEXT");
 await safeAlter(env,"ALTER TABLE service_requests ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'PENDING'");
 await safeAlter(env,"ALTER TABLE service_requests ADD COLUMN updated_at TEXT");
 await seed(env);
 ready=true;
 return true;
}

async function seed(env:Env){
 if(!env.DB)return;
 for(const service of serviceCatalog){
  await env.DB.prepare(`INSERT INTO services(slug,sort_order,category,duration_min,enabled,archived,image_url,icon_key) VALUES(?,?,?,?,1,0,?,?) ON CONFLICT(slug) DO UPDATE SET sort_order=excluded.sort_order,category=excluded.category,duration_min=excluded.duration_min,image_url=COALESCE(services.image_url,excluded.image_url),icon_key=COALESCE(services.icon_key,excluded.icon_key)`).bind(service.slug,service.id*10,service.category,service.durationMin,service.defaultImageUrl||null,service.defaultIconKey||service.slug).run();
  const row=await env.DB.prepare('SELECT id FROM services WHERE slug=?').bind(service.slug).first<{id:number}>();
  if(!row?.id)continue;
  for(const locale of ['uk','pl','en'] as const){
   const tr=service.translations[locale];
   await env.DB.prepare(`INSERT INTO service_translations(service_id,locale,title,description) VALUES(?,?,?,?) ON CONFLICT(service_id,locale) DO UPDATE SET title=excluded.title,description=excluded.description`).bind(row.id,locale,tr.title,tr.description).run();
  }
  await env.DB.prepare(`INSERT INTO service_prices(service_id,base_price,base_currency) VALUES(?,?,?) ON CONFLICT(service_id) DO NOTHING`).bind(row.id,service.basePrice,service.currency).run();
 }
 const vehicles=[['car',1,10],['suv',1.15,20],['truck',1.3,30],['van',1.25,40]];
 for(const [slug,mult,sort] of vehicles)await env.DB.prepare(`INSERT INTO vehicle_types(slug,multiplier,sort_order) VALUES(?,?,?) ON CONFLICT(slug) DO NOTHING`).bind(slug,mult,sort).run();
 const conditions=[['light',1,10],['medium',1.15,20],['heavy',1.35,30]];
 for(const [slug,mult,sort] of conditions)await env.DB.prepare(`INSERT INTO condition_levels(slug,multiplier,sort_order) VALUES(?,?,?) ON CONFLICT(slug) DO NOTHING`).bind(slug,mult,sort).run();
 await env.DB.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('maintenance.enabled','0'),('maintenance.message',''),('maintenance.eta',''),('business_timezone','Europe/Warsaw'),('working_days','1,2,3,4,5'),('working_hours','09:00-18:00'),('emergency_enabled','0'),('emergency_multiplier','1.5'),('reporting_currency','PLN'),('default_locale','en'),('available_locales','uk,pl,en'),('referral_enabled','1'),('calculator_enabled','1'),('vip_enabled','1'),('brand_name','Chameleon Detailing'),('contact_phone',''),('theme.font_h1','clamp(1.7rem,7vw,2.35rem)'),('theme.font_h2','clamp(1.25rem,5.4vw,1.6rem)'),('theme.font_body','clamp(.94rem,3.8vw,1rem)'),('theme.font_small','clamp(.78rem,3.2vw,.875rem)'),('business_status_override','AUTO'),('bot.owner_contact_url','')").run().catch(()=>{});
 const contentKeys=['home.hero.title','home.hero.subtitle','bot.welcome','bot.returning','bot.client_menu_text','bot.help_text','calculator.result.note','vip.description','referral.description','contact.description'];
 for(const key of contentKeys)for(const locale of ['uk','pl','en'])await env.DB.prepare(`INSERT OR IGNORE INTO content_blocks(key,locale,value) VALUES(?,?,?)`).bind(key,locale,'').run();
 const weeklyCount=await env.DB.prepare('SELECT COUNT(*) n FROM business_weekly_schedule').first<any>();
 if(!Number(weeklyCount?.n||0)){
  const oldDays=String((await env.DB.prepare("SELECT value FROM settings WHERE key='working_days'").first<any>())?.value||'1,2,3,4,5').split(',').map((x:string)=>Number(x.trim())).filter((x:number)=>x>=1&&x<=7);
  const oldHours=String((await env.DB.prepare("SELECT value FROM settings WHERE key='working_hours'").first<any>())?.value||'09:00-18:00');
  const [openTime,closeTime]=oldHours.split('-');
  for(let d=1;d<=7;d++)await env.DB.prepare('INSERT INTO business_weekly_schedule(day_of_week,enabled,open_time,close_time) VALUES(?,?,?,?)').bind(d,oldDays.includes(d)?1:0,openTime||'09:00',closeTime||'18:00').run();
 }
 const referralCopy={
  uk:{'referral.title':'Запроси друга в Chameleon','referral.subtitle':'Поділися сервісом, якому довіряєш. Друг отримає зручний доступ до Chameleon Detailing, а ми подбаємо про його авто так само уважно.','referral.share_text':'Рекомендую Chameleon Detailing 🦎 Тут зручно підібрати послугу, розрахувати вартість і залишити заявку прямо в Telegram.'},
  pl:{'referral.title':'Zaproś znajomego do Chameleon','referral.subtitle':'Poleć miejsce, któremu ufasz. Znajomy szybko otworzy Chameleon Detailing w Telegramie, a my zadbamy o jego auto z taką samą uwagą.','referral.share_text':'Polecam Chameleon Detailing 🦎 W Telegramie możesz wygodnie wybrać usługę, sprawdzić cenę i wysłać zgłoszenie.'},
  en:{'referral.title':'Invite a friend to Chameleon','referral.subtitle':'Share a service you trust. Your friend gets quick access to Chameleon Detailing in Telegram, and we will care for their car with the same attention.','referral.share_text':'I recommend Chameleon Detailing 🦎 Choose a service, check the estimate and send a request directly in Telegram.'}
 } as const;
 for(const locale of ['uk','pl','en'] as const)for(const [key,value] of Object.entries(referralCopy[locale]))await env.DB.prepare(`INSERT OR IGNORE INTO content_blocks(key,locale,value) VALUES(?,?,?)`).bind(key,locale,value).run();

 const botMenuCopy={
  uk:{'bot.client_menu_text':`Ласкаво просимо до Chameleon Detailing 🦎

Усі послуги, розрахунок і заявки зібрані в Mini App. Якщо потрібна допомога — ми поруч.`,'bot.help_text':`💚 <b>Потрібна допомога?</b>

Напишіть власнику Chameleon Detailing або змініть мову бота — оберіть потрібну дію нижче.`},
  pl:{'bot.client_menu_text':`Witamy w Chameleon Detailing 🦎

Wszystkie usługi, wyceny i zgłoszenia znajdziesz w Mini App. Jeśli potrzebujesz pomocy — jesteśmy obok.`,'bot.help_text':`💚 <b>Potrzebujesz pomocy?</b>

Napisz do właściciela Chameleon Detailing lub zmień język bota — wybierz opcję poniżej.`},
  en:{'bot.client_menu_text':`Welcome to Chameleon Detailing 🦎

Services, estimates and requests are all inside the Mini App. If you need help, we are here for you.`,'bot.help_text':`💚 <b>Need a hand?</b>

Message the owner of Chameleon Detailing or change the bot language — choose an option below.`}
 } as const;
 for(const locale of ['uk','pl','en'] as const)for(const [key,value] of Object.entries(botMenuCopy[locale]))await env.DB.prepare(`INSERT OR IGNORE INTO content_blocks(key,locale,value) VALUES(?,?,?)`).bind(key,locale,value).run();
}

export async function upsertUser(env:Env,u:TelegramUser,owner=false){
 const lang=u.language_code?.startsWith('uk')?'uk':u.language_code?.startsWith('pl')?'pl':'en';
 if(!env.DB)return {id:0,telegram_user_id:u.id,first_name:u.first_name,username:u.username,language:lang,preferred_currency:env.DEFAULT_CURRENCY,role:owner?'OWNER':'CLIENT',client_tier:'STANDARD',phone_number:null};
 await ensureDb(env);
 await env.DB.prepare(`INSERT INTO users(telegram_user_id,username,first_name,last_name,language,preferred_currency,role) VALUES(?,?,?,?,?,?,?) ON CONFLICT(telegram_user_id) DO UPDATE SET username=excluded.username,first_name=excluded.first_name,last_name=excluded.last_name,last_seen_at=CURRENT_TIMESTAMP,role=CASE WHEN excluded.role='OWNER' THEN 'OWNER' ELSE users.role END`).bind(u.id,u.username||null,u.first_name,u.last_name||null,lang,env.DEFAULT_CURRENCY,owner?'OWNER':'CLIENT').run();
 const row=await env.DB.prepare(`SELECT u.*,COALESCE(p.client_tier,'STANDARD') client_tier,p.phone_number FROM users u LEFT JOIN client_profiles p ON p.user_id=u.id WHERE u.telegram_user_id=?`).bind(u.id).first<any>();
 await env.DB.prepare('INSERT OR IGNORE INTO client_profiles(user_id) VALUES(?)').bind(row.id).run();
 return row;
}
export async function getServices(env:Env,locale='en',targetCurrency?:string|null){
 const normalized=normalizeServiceLocale(locale),target=targetCurrency?normalizeCurrency(targetCurrency):null;
 const convertItem=(item:any)=>{if(!target)return item;const baseCurrency=normalizeCurrency(item.currency);const override=target==='USD'?item.usdOverride:target==='UAH'?item.uahOverride:target==='PLN'?item.plnOverride:null;const price=override!=null&&Number(override)>0?Number(override):convertCurrency(Number(item.basePrice||0),baseCurrency,target);return {...item,basePrice:price,currency:target}};
 if(!env.DB)return fallbackServicesFor(normalized).map(convertItem);
 await ensureDb(env);
 const r=await env.DB.prepare(`SELECT s.id,s.slug,COALESCE(t.title,s.slug) title,COALESCE(t.description,'') description,p.base_price basePrice,p.base_currency currency,p.usd_override usdOverride,p.uah_override uahOverride,p.pln_override plnOverride,s.duration_min durationMin,s.category,s.image_url imageUrl,s.icon_key iconKey FROM services s LEFT JOIN service_translations t ON t.service_id=s.id AND t.locale=? JOIN service_prices p ON p.service_id=s.id WHERE s.enabled=1 AND s.archived=0 ORDER BY s.sort_order,s.id`).bind(normalized).all<any>();
 const items=r.results.length?r.results:fallbackServicesFor(normalized);
 return items.map(convertItem).map(({usdOverride,uahOverride,plnOverride,...item}:any)=>item); // imageUrl/iconKey preserved
}
export async function event(env:Env,userId:number|undefined,type:string,meta:any={}){if(!env.DB)return;await ensureDb(env);await env.DB.prepare('INSERT INTO analytics_events(user_id,event_type,metadata_json) VALUES(?,?,?)').bind(userId||null,type,JSON.stringify(meta)).run()}
export async function getSetting(env:Env,key:string,fallback:string):Promise<string>{if(!env.DB)return fallback;await ensureDb(env);const r=await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(key).first<{value?:unknown}>();return String(r?.value??fallback)}
export async function setSetting(env:Env,key:string,value:string){if(!env.DB)return;await ensureDb(env);await env.DB.prepare(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).bind(key,value).run()}
export async function getUserByTelegramId(env:Env,telegramId:number){if(!env.DB)return null;await ensureDb(env);return env.DB.prepare(`SELECT u.*,COALESCE(p.client_tier,'STANDARD') client_tier,p.phone_number FROM users u LEFT JOIN client_profiles p ON p.user_id=u.id WHERE u.telegram_user_id=?`).bind(telegramId).first<any>()}
export async function getActiveBlock(env:Env,userId:number){if(!env.DB||!userId)return null;await ensureDb(env);return env.DB.prepare(`SELECT public_reason FROM blacklist WHERE user_id=? AND is_active=1 AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP) ORDER BY id DESC LIMIT 1`).bind(userId).first<any>()}
