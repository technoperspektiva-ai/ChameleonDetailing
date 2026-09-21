import type {Env,TelegramUser} from './types';
import {fallbackServicesFor,normalizeServiceLocale,serviceCatalog} from './services';
let ready=false;
export async function ensureDb(env:Env){if(!env.DB)return false;if(ready)return true;await env.DB.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,telegram_user_id INTEGER NOT NULL UNIQUE,username TEXT,first_name TEXT,last_name TEXT,language TEXT NOT NULL DEFAULT 'en',preferred_currency TEXT NOT NULL DEFAULT 'PLN',role TEXT NOT NULL DEFAULT 'CLIENT',status TEXT NOT NULL DEFAULT 'ACTIVE',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS client_profiles(user_id INTEGER PRIMARY KEY,client_tier TEXT NOT NULL DEFAULT 'STANDARD',phone_number TEXT,phone_verified_via_telegram INTEGER NOT NULL DEFAULT 0,phone_shared_at TEXT,preferred_contact_method TEXT,notes TEXT,vip_since TEXT);
CREATE TABLE IF NOT EXISTS blacklist(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,public_reason TEXT NOT NULL,internal_note TEXT,blocked_by INTEGER,blocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,expires_at TEXT,is_active INTEGER NOT NULL DEFAULT 1,unblocked_by INTEGER,unblocked_at TEXT);
CREATE TABLE IF NOT EXISTS services(id INTEGER PRIMARY KEY AUTOINCREMENT,slug TEXT NOT NULL UNIQUE,enabled INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0,category TEXT NOT NULL DEFAULT 'DETAILING',duration_min INTEGER NOT NULL DEFAULT 60,archived INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS service_translations(service_id INTEGER NOT NULL,locale TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,PRIMARY KEY(service_id,locale));
CREATE TABLE IF NOT EXISTS service_prices(service_id INTEGER PRIMARY KEY,base_price REAL NOT NULL,base_currency TEXT NOT NULL DEFAULT 'PLN',currency_mode TEXT NOT NULL DEFAULT 'LIVE',usd_override REAL,uah_override REAL,pln_override REAL);
CREATE TABLE IF NOT EXISTS calculator_sessions(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,service_id INTEGER,vehicle_type_id INTEGER,condition_level_id INTEGER,base_price_snapshot REAL,vehicle_multiplier_snapshot REAL,condition_multiplier_snapshot REAL,options_total_snapshot REAL,discount_snapshot REAL,calculated_price REAL NOT NULL,currency TEXT NOT NULL,pricing_version TEXT,fx_rate REAL,fx_provider TEXT,fx_timestamp TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS service_requests(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,calculation_id INTEGER,assigned_manager_id INTEGER,status TEXT NOT NULL DEFAULT 'REQUESTED',is_test INTEGER NOT NULL DEFAULT 0,service_slug TEXT,vehicle_slug TEXT,condition_slug TEXT,options_json TEXT,request_type TEXT NOT NULL DEFAULT 'STANDARD',scheduled_for TEXT,is_deferred INTEGER NOT NULL DEFAULT 0,base_price_snapshot REAL,options_total_snapshot REAL,discount_snapshot REAL,calculated_price REAL NOT NULL,final_job_price REAL,price_adjustment_reason TEXT,currency TEXT NOT NULL,emergency_multiplier REAL,emergency_surcharge REAL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,confirmed_at TEXT,completed_at TEXT,payment_status TEXT NOT NULL DEFAULT 'PENDING');
CREATE TABLE IF NOT EXISTS analytics_events(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,event_type TEXT NOT NULL,metadata_json TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS social_links(id INTEGER PRIMARY KEY AUTOINCREMENT,type TEXT NOT NULL UNIQUE,url TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS schedule_exceptions(id INTEGER PRIMARY KEY AUTOINCREMENT,date TEXT NOT NULL UNIQUE,is_closed INTEGER NOT NULL DEFAULT 1,open_time TEXT,close_time TEXT,note TEXT,created_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS bot_state(user_id INTEGER PRIMARY KEY,state TEXT,payload_json TEXT,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY AUTOINCREMENT,actor_user_id INTEGER,action TEXT NOT NULL,entity_type TEXT,entity_id TEXT,old_data_json TEXT,new_data_json TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
`);await seed(env);ready=true;return true}
async function seed(env:Env){
 if(!env.DB)return;
 // Services are upserted on every cold start so existing D1 databases created by older
 // builds also receive corrected UA/PL/EN translations without a manual reset.
 for(const service of serviceCatalog){
  await env.DB.prepare(`INSERT INTO services(slug,sort_order,category,duration_min,enabled,archived) VALUES(?,?,?,?,1,0) ON CONFLICT(slug) DO UPDATE SET sort_order=excluded.sort_order,category=excluded.category,duration_min=excluded.duration_min`).bind(service.slug,service.id*10,service.category,service.durationMin).run();
  const row=await env.DB.prepare('SELECT id FROM services WHERE slug=?').bind(service.slug).first<{id:number}>();
  if(!row?.id)continue;
  for(const locale of ['uk','pl','en'] as const){
   const tr=service.translations[locale];
   await env.DB.prepare(`INSERT INTO service_translations(service_id,locale,title,description) VALUES(?,?,?,?) ON CONFLICT(service_id,locale) DO UPDATE SET title=excluded.title,description=excluded.description`).bind(row.id,locale,tr.title,tr.description).run();
  }
  await env.DB.prepare(`INSERT INTO service_prices(service_id,base_price,base_currency) VALUES(?,?,?) ON CONFLICT(service_id) DO NOTHING`).bind(row.id,service.basePrice,service.currency).run();
 }
 await env.DB.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('maintenance.enabled','0'),('business_timezone','Europe/Warsaw'),('working_days','1,2,3,4,5'),('working_hours','09:00-18:00'),('emergency_enabled','0'),('emergency_multiplier','1.5'),('reporting_currency','PLN')").run().catch(()=>{});
}
export async function upsertUser(env:Env,u:TelegramUser,owner=false){const lang=u.language_code?.startsWith('uk')?'uk':u.language_code?.startsWith('pl')?'pl':'en';if(!env.DB)return {id:0,telegram_user_id:u.id,first_name:u.first_name,username:u.username,language:lang,preferred_currency:env.DEFAULT_CURRENCY,role:owner?'OWNER':'CLIENT',client_tier:'STANDARD',phone_number:null};await ensureDb(env);await env.DB.prepare(`INSERT INTO users(telegram_user_id,username,first_name,last_name,language,preferred_currency,role) VALUES(?,?,?,?,?,?,?) ON CONFLICT(telegram_user_id) DO UPDATE SET username=excluded.username,first_name=excluded.first_name,last_name=excluded.last_name,last_seen_at=CURRENT_TIMESTAMP,role=CASE WHEN excluded.role='OWNER' THEN 'OWNER' ELSE users.role END`).bind(u.id,u.username||null,u.first_name,u.last_name||null,lang,env.DEFAULT_CURRENCY,owner?'OWNER':'CLIENT').run();const row=await env.DB.prepare(`SELECT u.*,COALESCE(p.client_tier,'STANDARD') client_tier,p.phone_number FROM users u LEFT JOIN client_profiles p ON p.user_id=u.id WHERE u.telegram_user_id=?`).bind(u.id).first<any>();await env.DB.prepare('INSERT OR IGNORE INTO client_profiles(user_id) VALUES(?)').bind(row.id).run();return row}
export async function getServices(env:Env,locale='en'){
 const normalized=normalizeServiceLocale(locale);
 if(!env.DB)return fallbackServicesFor(normalized);
 await ensureDb(env);
 const r=await env.DB.prepare(`SELECT s.id,s.slug,COALESCE(t.title,s.slug) title,COALESCE(t.description,'') description,p.base_price basePrice,p.base_currency currency,s.duration_min durationMin,s.category FROM services s LEFT JOIN service_translations t ON t.service_id=s.id AND t.locale=? JOIN service_prices p ON p.service_id=s.id WHERE s.enabled=1 AND s.archived=0 ORDER BY s.sort_order,s.id`).bind(normalized).all<any>();
 return r.results.length?r.results:fallbackServicesFor(normalized);
}
export async function event(env:Env,userId:number|undefined,type:string,meta:any={}){if(!env.DB)return;await ensureDb(env);await env.DB.prepare('INSERT INTO analytics_events(user_id,event_type,metadata_json) VALUES(?,?,?)').bind(userId||null,type,JSON.stringify(meta)).run()}
export async function getSetting(env:Env,key:string,fallback:string):Promise<string>{if(!env.DB)return fallback;await ensureDb(env);const r=await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(key).first<{value?:unknown}>();return String(r?.value??fallback)}
export async function setSetting(env:Env,key:string,value:string){if(!env.DB)return;await ensureDb(env);await env.DB.prepare(`INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).bind(key,value).run()}
export async function getUserByTelegramId(env:Env,telegramId:number){if(!env.DB)return null;await ensureDb(env);return env.DB.prepare(`SELECT u.*,COALESCE(p.client_tier,'STANDARD') client_tier,p.phone_number FROM users u LEFT JOIN client_profiles p ON p.user_id=u.id WHERE u.telegram_user_id=?`).bind(telegramId).first<any>()}
export async function getActiveBlock(env:Env,userId:number){if(!env.DB||!userId)return null;await ensureDb(env);return env.DB.prepare(`SELECT public_reason FROM blacklist WHERE user_id=? AND is_active=1 AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP) ORDER BY id DESC LIMIT 1`).bind(userId).first<any>()}
