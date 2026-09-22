import type {Env} from './types';
import {ensureDb,getSetting,setSetting} from './db';

export type SheetsEnv=Env&{
 GOOGLE_SHEETS_WEBHOOK_URL?:string;
 GOOGLE_SHEETS_WEBHOOK_SECRET?:string;
};
export type SheetsInterval='OFF'|'1h'|'6h'|'24h';
type Cell=string|number|boolean|null;
type SheetSpec={headers:string[];rows:Cell[][]};
type SheetsPayload={generatedAt:string;trigger:string;sheets:Record<string,SheetSpec>};

const INTERVAL_MS:Record<Exclude<SheetsInterval,'OFF'>,number>={
 '1h':60*60*1000,
 '6h':6*60*60*1000,
 '24h':24*60*60*1000,
};
const normalizeInterval=(value:string):SheetsInterval=>{
 const v=String(value||'').trim();
 return v==='OFF'||v==='6h'||v==='24h'||v==='1h'?v:'1h';
};
const envConfigured=(env:SheetsEnv)=>Boolean(String(env.GOOGLE_SHEETS_WEBHOOK_URL||'').trim()&&String(env.GOOGLE_SHEETS_WEBHOOK_SECRET||'').trim());
const cleanCell=(value:any):Cell=>value===null||value===undefined?'':typeof value==='number'||typeof value==='boolean'?value:String(value);
const values=(rows:any[],keys:string[])=>rows.map(row=>keys.map(k=>cleanCell(row?.[k])));

async function query(env:SheetsEnv,sql:string,bindings:any[]=[]){
 if(!env.DB)return[] as any[];
 try{
  let stmt=env.DB.prepare(sql);
  if(bindings.length)stmt=stmt.bind(...bindings);
  const result=await stmt.all<any>();
  return result.results||[];
 }catch(error){
  console.error('Google Sheets report query failed',sql,error);
  return[] as any[];
 }
}
async function scalar(env:SheetsEnv,sql:string,bindings:any[]=[]){
 if(!env.DB)return 0;
 try{
  let stmt=env.DB.prepare(sql);
  if(bindings.length)stmt=stmt.bind(...bindings);
  const row=await stmt.first<any>();
  return Number(row?.n??row?.value??0)||0;
 }catch{return 0}
}
const humanEvent=(key:string)=>({
 bot_start:'Bot starts',miniapp_open:'Mini App opens',calculator_completed:'Completed calculations',service_request_created:'Created requests',currency_changed:'Currency changes',personal_discount_activated:'Activated personal discounts',referral_link_created:'Referral links created',phone_shared_via_telegram:'Phones shared via Telegram',referral_open:'Referral link opens',service_request_client_deleted:'Requests deleted by clients','client.notifications.toggle':'Notification setting changes'
} as Record<string,string>)[key]||key.replace(/[._-]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase());

export async function getGoogleSheetsState(env:SheetsEnv){
 if(env.DB)await ensureDb(env);
 const interval=normalizeInterval(env.DB?await getSetting(env,'google_sheets_sync_interval','1h'):'1h');
 const lastSyncAt=env.DB?await getSetting(env,'google_sheets_last_sync_at',''):'';
 const lastAttemptAt=env.DB?await getSetting(env,'google_sheets_last_attempt_at',''):'';
 const lastStatus=env.DB?await getSetting(env,'google_sheets_last_status','NEVER'):'NO_DB';
 const lastError=env.DB?await getSetting(env,'google_sheets_last_error',''):'';
 const sheetUrl=env.DB?await getSetting(env,'google_sheets_sheet_url',''):'';
 return {configured:envConfigured(env),interval,lastSyncAt,lastAttemptAt,lastStatus,lastError,sheetUrl};
}

export async function setGoogleSheetsInterval(env:SheetsEnv,interval:SheetsInterval){
 if(!env.DB)throw new Error('D1 is not configured');
 await ensureDb(env);
 const normalized=normalizeInterval(interval);
 await setSetting(env,'google_sheets_sync_interval',normalized);
 return normalized;
}

export async function buildGoogleSheetsSnapshot(env:SheetsEnv,trigger='manual'):Promise<SheetsPayload>{
 if(!env.DB)throw new Error('D1 is not configured');
 await ensureDb(env);
 const reportingCurrency=await getSetting(env,'reporting_currency','PLN');
 const generatedAt=new Date().toISOString();
 const [users,orders,payments,revenue,vip,referrals,analytics,audit]=await Promise.all([
  query(env,`SELECT u.id,u.telegram_user_id,COALESCE(u.username,'') username,COALESCE(u.first_name,'') first_name,COALESCE(u.last_name,'') last_name,u.role,u.status,u.language,u.preferred_currency,u.created_at,u.last_seen_at,COALESCE(p.client_tier,'STANDARD') client_tier,COALESCE(p.phone_number,'') phone_number,COALESCE(p.phone_verified_via_telegram,0) phone_verified,COALESCE(p.phone_shared_at,'') phone_shared_at,COALESCE(p.paid_jobs_count,0) paid_jobs_count,COALESCE(p.lifetime_value,0) lifetime_value,COALESCE(p.notes,'') notes FROM users u LEFT JOIN client_profiles p ON p.user_id=u.id ORDER BY u.id DESC LIMIT 10000`),
  query(env,`SELECT r.id,r.user_id,COALESCE(u.first_name,'') customer,COALESCE(u.username,'') username,r.status,r.request_type,COALESCE(r.service_slug,'') service,COALESCE(r.vehicle_slug,'') vehicle,COALESCE(r.condition_slug,'') condition,COALESCE(r.calculated_price,0) calculated_price,COALESCE(r.final_job_price,'') final_job_price,r.currency,COALESCE(r.emergency_multiplier,'') emergency_multiplier,COALESCE(r.emergency_surcharge,0) emergency_surcharge,r.payment_status,r.created_at,COALESCE(r.confirmed_at,'') confirmed_at,COALESCE(r.completed_at,'') completed_at,COALESCE(r.client_deleted_at,'') client_deleted_at,COALESCE(r.staff_deleted_at,'') staff_deleted_at FROM service_requests r LEFT JOIN users u ON u.id=r.user_id WHERE COALESCE(r.is_test,0)=0 ORDER BY r.id DESC LIMIT 10000`),
  query(env,`SELECT p.id,p.service_request_id,p.user_id,COALESCE(u.first_name,'') customer,COALESCE(u.username,'') username,p.amount,p.currency,COALESCE(p.reporting_amount,'') reporting_amount,COALESCE(p.reporting_currency,'') reporting_currency,p.method,COALESCE(p.provider,'') provider,p.status,p.created_at,COALESCE(p.paid_at,'') paid_at FROM payments p LEFT JOIN users u ON u.id=p.user_id ORDER BY p.id DESC LIMIT 10000`),
  query(env,`SELECT substr(COALESCE(paid_at,created_at),1,10) day,COALESCE(NULLIF(reporting_currency,''),currency) currency,COUNT(*) payments,ROUND(SUM(COALESCE(reporting_amount,amount)),2) revenue FROM payments WHERE status='PAID' GROUP BY day,COALESCE(NULLIF(reporting_currency,''),currency) ORDER BY day DESC LIMIT 5000`),
  query(env,`SELECT u.id,u.telegram_user_id,COALESCE(u.username,'') username,COALESCE(u.first_name,'') first_name,p.client_tier,COALESCE(p.vip_since,'') vip_since,COALESCE(p.phone_number,'') phone_number,COALESCE(p.paid_jobs_count,0) paid_jobs_count,COALESCE(p.lifetime_value,0) lifetime_value,u.last_seen_at FROM client_profiles p JOIN users u ON u.id=p.user_id WHERE p.client_tier<>'STANDARD' ORDER BY p.vip_since DESC LIMIT 10000`),
  query(env,`SELECT r.id,r.code,r.referrer_user_id,COALESCE(a.first_name,'') referrer,COALESCE(a.username,'') referrer_username,COALESCE(r.referred_user_id,'') referred_user_id,COALESCE(b.first_name,'') referred,COALESCE(b.username,'') referred_username,r.created_at,COALESCE(r.miniapp_opened_at,'') miniapp_opened_at,COALESCE(r.calculator_used_at,'') calculator_used_at,COALESCE(r.request_created_at,'') request_created_at,COALESCE(r.first_paid_job_at,'') first_paid_job_at,COALESCE(r.became_vip_at,'') became_vip_at FROM referrals r LEFT JOIN users a ON a.id=r.referrer_user_id LEFT JOIN users b ON b.id=r.referred_user_id ORDER BY r.id DESC LIMIT 10000`),
  query(env,`SELECT substr(created_at,1,10) day,event_type,COUNT(*) events FROM analytics_events GROUP BY substr(created_at,1,10),event_type ORDER BY day DESC,event_type LIMIT 10000`),
  query(env,`SELECT a.id,a.created_at,COALESCE(u.first_name,'System') actor,COALESCE(u.username,'') actor_username,COALESCE(u.role,'SYSTEM') actor_role,a.action,COALESCE(a.entity_type,'') entity_type,COALESCE(a.entity_id,'') entity_id FROM audit_log a LEFT JOIN users u ON u.id=a.actor_user_id ORDER BY a.id DESC LIMIT 5000`),
 ]);
 const [totalUsers,clients,requestCount,completedCount,paidCount,vipCount,opens30,revenueTotal]=await Promise.all([
  scalar(env,'SELECT COUNT(*) n FROM users'),
  scalar(env,"SELECT COUNT(*) n FROM users WHERE role='CLIENT'"),
  scalar(env,'SELECT COUNT(*) n FROM service_requests WHERE COALESCE(is_test,0)=0'),
  scalar(env,"SELECT COUNT(*) n FROM service_requests WHERE COALESCE(is_test,0)=0 AND status='COMPLETED'"),
  scalar(env,"SELECT COUNT(*) n FROM payments WHERE status='PAID'"),
  scalar(env,"SELECT COUNT(*) n FROM client_profiles WHERE client_tier<>'STANDARD'"),
  scalar(env,"SELECT COUNT(*) n FROM analytics_events WHERE event_type='miniapp_open' AND created_at>=datetime('now','-30 days')"),
  scalar(env,"SELECT COALESCE(SUM(CASE WHEN reporting_currency=? THEN reporting_amount WHEN (reporting_currency IS NULL OR reporting_currency='') AND currency=? THEN amount ELSE 0 END),0) n FROM payments WHERE status='PAID'",[reportingCurrency,reportingCurrency]),
 ]);
 const analyticsRows=(analytics||[]).map((row:any)=>[cleanCell(row.day),cleanCell(row.event_type),humanEvent(String(row.event_type||'')),cleanCell(row.events)]);
 const businessRows:Cell[][]=[
  ['Generated at',generatedAt],['Sync trigger',trigger],['Reporting currency',reportingCurrency],['Total users',totalUsers],['Client accounts',clients],['Requests',requestCount],['Completed requests',completedCount],['Paid payments',paidCount],['VIP clients',vipCount],['Mini App opens (30 days)',opens30],[`Paid revenue (${reportingCurrency})`,Math.round(revenueTotal*100)/100]
 ];
 return {generatedAt,trigger,sheets:{
  'Users':{headers:['ID','Telegram ID','Username','First name','Last name','Role','Status','Language','Currency','Created at','Last seen','Tier','Phone','Phone verified','Phone shared at','Paid jobs','Lifetime value','Notes'],rows:values(users,['id','telegram_user_id','username','first_name','last_name','role','status','language','preferred_currency','created_at','last_seen_at','client_tier','phone_number','phone_verified','phone_shared_at','paid_jobs_count','lifetime_value','notes'])},
  'Orders':{headers:['ID','User ID','Customer','Username','Status','Request type','Service','Vehicle','Condition','Calculated price','Final price','Currency','Emergency multiplier','Emergency surcharge','Payment status','Created at','Confirmed at','Completed at','Client deleted at','Staff deleted at'],rows:values(orders,['id','user_id','customer','username','status','request_type','service','vehicle','condition','calculated_price','final_job_price','currency','emergency_multiplier','emergency_surcharge','payment_status','created_at','confirmed_at','completed_at','client_deleted_at','staff_deleted_at'])},
  'Payments':{headers:['ID','Request ID','User ID','Customer','Username','Amount','Currency','Reporting amount','Reporting currency','Method','Provider','Status','Created at','Paid at'],rows:values(payments,['id','service_request_id','user_id','customer','username','amount','currency','reporting_amount','reporting_currency','method','provider','status','created_at','paid_at'])},
  'Revenue':{headers:['Date','Currency','Paid payments','Revenue'],rows:values(revenue,['day','currency','payments','revenue'])},
  'VIP':{headers:['User ID','Telegram ID','Username','First name','Tier','VIP since','Phone','Paid jobs','Lifetime value','Last seen'],rows:values(vip,['id','telegram_user_id','username','first_name','client_tier','vip_since','phone_number','paid_jobs_count','lifetime_value','last_seen_at'])},
  'Referrals':{headers:['ID','Code','Referrer user ID','Referrer','Referrer username','Referred user ID','Referred','Referred username','Created at','Mini App opened','Calculator used','Request created','First paid job','Became VIP'],rows:values(referrals,['id','code','referrer_user_id','referrer','referrer_username','referred_user_id','referred','referred_username','created_at','miniapp_opened_at','calculator_used_at','request_created_at','first_paid_job_at','became_vip_at'])},
  'Analytics':{headers:['Date','Event code','Event name','Count'],rows:analyticsRows},
  'Staff Activity':{headers:['ID','Created at','Actor','Username','Role','Action','Entity type','Entity ID'],rows:values(audit,['id','created_at','actor','actor_username','actor_role','action','entity_type','entity_id'])},
  'Business Report':{headers:['Metric','Value'],rows:businessRows},
 }};
}

async function postAppsScript(env:SheetsEnv,action:'sync'|'health'|'reset',payload?:any){
 const url=String(env.GOOGLE_SHEETS_WEBHOOK_URL||'').trim();
 const secret=String(env.GOOGLE_SHEETS_WEBHOOK_SECRET||'').trim();
 if(!url||!secret)throw new Error('Google Sheets webhook is not configured in Cloudflare');
 const response=await fetch(url,{method:'POST',headers:{'content-type':'text/plain;charset=UTF-8','accept':'application/json'},body:JSON.stringify({secret,action,payload:payload||null})});
 const text=await response.text();
 let data:any={};try{data=JSON.parse(text)}catch{}
 if(!response.ok||!data?.ok)throw new Error(data?.error||`Apps Script HTTP ${response.status}: ${text.slice(0,180)}`);
 if(data.sheetUrl&&env.DB)await setSetting(env,'google_sheets_sheet_url',String(data.sheetUrl));
 return data;
}

export async function checkGoogleSheetsHealth(env:SheetsEnv){
 if(env.DB)await ensureDb(env);
 return postAppsScript(env,'health');
}

export async function syncGoogleSheets(env:SheetsEnv,trigger='manual'){
 if(!env.DB)throw new Error('D1 is not configured');
 await ensureDb(env);
 const attempt=new Date().toISOString();
 await setSetting(env,'google_sheets_last_attempt_at',attempt);
 try{
  const payload=await buildGoogleSheetsSnapshot(env,trigger);
  const response=await postAppsScript(env,'sync',payload);
  const finished=new Date().toISOString();
  await setSetting(env,'google_sheets_last_sync_at',finished);
  await setSetting(env,'google_sheets_last_status','OK');
  await setSetting(env,'google_sheets_last_error','');
  return {ok:true,at:finished,rowCounts:Object.fromEntries(Object.entries(payload.sheets).map(([name,spec])=>[name,spec.rows.length])),sheetUrl:response.sheetUrl||''};
 }catch(error:any){
  await setSetting(env,'google_sheets_last_status','ERROR').catch(()=>{});
  await setSetting(env,'google_sheets_last_error',String(error?.message||error).slice(0,500)).catch(()=>{});
  throw error;
 }
}

export async function resetGoogleSheetsMirror(env:SheetsEnv){
 if(!envConfigured(env))return {ok:false,skipped:true,reason:'not_configured'};
 return postAppsScript(env,'reset');
}

export async function runGoogleSheetsAutoSync(env:SheetsEnv){
 if(!env.DB||!envConfigured(env))return {ok:false,skipped:true,reason:'not_configured'};
 await ensureDb(env);
 const state=await getGoogleSheetsState(env);
 if(state.interval==='OFF')return {ok:false,skipped:true,reason:'disabled'};
 const period=INTERVAL_MS[state.interval as Exclude<SheetsInterval,'OFF'>]||INTERVAL_MS['1h'];
 const last=Date.parse(state.lastSyncAt||'');
 if(Number.isFinite(last)&&Date.now()-last<period)return {ok:false,skipped:true,reason:'not_due'};
 return syncGoogleSheets(env,'cron');
}
