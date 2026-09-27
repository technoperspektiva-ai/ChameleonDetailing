import type {Env} from './types';
import {ensureDb,getSetting,setSetting} from './db';
import {managerBlockEnabled} from './permissions';
import {sendMessage} from './telegram';
import {buildReport,type ReportType} from './reports';
import {convertCurrency,normalizeCurrency,fx} from './currency';

export type DesktopPermission='desktop_access'|'sales_access'|'broadcast_access'|'reports_access'|'financial_access'|'clients_access'|'workspace_editor';
type StaffRole='OWNER'|'ADMIN'|'MANAGER';

let ready=false;
const enc=new TextEncoder();
const reply=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const body=async(r:Request)=>{try{return await r.json() as any}catch{return {}}};
const digest=async(s:string)=>{const b=await crypto.subtle.digest('SHA-256',enc.encode(s));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')};
const randomToken=()=>crypto.randomUUID().replace(/-/g,'')+crypto.randomUUID().replace(/-/g,'');
const safeAlter=async(env:Env,sql:string)=>{try{await env.DB?.exec(sql)}catch{}};
const parse=(v:any,fallback:any)=>{try{return JSON.parse(String(v||''))}catch{return fallback}};
const htmlEscape=(s:any)=>String(s??'').replace(/[&<>]/g,c=>c==='&'?'&amp;':c==='<'?'&lt;':'&gt;');
const isPhoneRequest=(request:Request)=>{
 const ua=String(request.headers.get('user-agent')||'');
 const phoneUa=/iPhone|iPod|Windows Phone|IEMobile|Opera Mini|BlackBerry|BB10|Android[^)]*Mobile/i.test(ua);
 const chMobile=String(request.headers.get('sec-ch-ua-mobile')||'')==='?1';
 // iPad / iPadOS and Android tablets remain allowed; phones are blocked.
 const tablet=/iPad|Tablet|Android(?![^)]*Mobile)/i.test(ua);
 return !tablet&&(phoneUa||chMobile);
};
const log=async(env:Env,actor:number,action:string,type?:string,id?:string,oldValue?:any,newValue?:any)=>{
 if(!env.DB)return;
 await env.DB.prepare('INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,old_data_json,new_data_json) VALUES(?,?,?,?,?,?)')
  .bind(actor,action,type||null,id||null,oldValue==null?null:JSON.stringify(oldValue),newValue==null?null:JSON.stringify(newValue)).run();
};

export const defaultWorkspace={
 schemaVersion:1,
 locked:true,
 defaultPage:'orders',
 theme:{accent:'#7aa63a',mode:'light',radius:18,density:'comfortable',fontScale:1,animations:true,sidebarStyle:'glass'},
 sidebar:[
  {id:'dashboard',label:'Dashboard',icon:'home',group:'Operations',roles:['OWNER','ADMIN','MANAGER'],hidden:false},
  {id:'orders',label:'Замовлення',icon:'clipboard',group:'Operations',roles:['OWNER','ADMIN','MANAGER'],hidden:false},
  {id:'sales',label:'Sales',icon:'search',group:'CRM',roles:['OWNER','ADMIN','MANAGER'],hidden:false},
  {id:'cars',label:'Автомобілі',icon:'car',group:'CRM',roles:['OWNER','ADMIN','MANAGER'],hidden:false},
  {id:'clients',label:'Клієнти',icon:'users',group:'CRM',roles:['OWNER','ADMIN','MANAGER'],hidden:false},
  {id:'calendar',label:'Календар',icon:'calendar',group:'Operations',roles:['OWNER','ADMIN','MANAGER'],hidden:false},
  {id:'services',label:'Послуги',icon:'wrench',group:'Operations',roles:['OWNER','ADMIN','MANAGER'],hidden:false},
  {id:'payments',label:'Оплати',icon:'credit-card',group:'Management',roles:['OWNER','ADMIN'],hidden:false},
  {id:'broadcasts',label:'Розсилки',icon:'megaphone',group:'Management',roles:['OWNER','ADMIN'],hidden:false},
  {id:'analytics',label:'Аналітика',icon:'chart',group:'Management',roles:['OWNER','ADMIN'],hidden:false},
  {id:'reports',label:'Звіти',icon:'file',group:'Management',roles:['OWNER','ADMIN'],hidden:false},
  {id:'staff',label:'Персонал',icon:'badge',group:'Management',roles:['OWNER','ADMIN'],hidden:false},
  {id:'audit',label:'Audit Log',icon:'history',group:'System',roles:['OWNER','ADMIN'],hidden:false},
  {id:'workspace',label:'Layout Editor',icon:'layout',group:'System',roles:['OWNER','ADMIN'],hidden:false},
  {id:'settings',label:'Налаштування',icon:'settings',group:'System',roles:['OWNER','ADMIN'],hidden:false}
 ],
 widgets:[
  {id:'orders_today',type:'kpi',title:'Orders Today',x:0,y:0,width:3,height:1,minWidth:2,minHeight:1,roles:['OWNER','ADMIN','MANAGER'],hidden:false},
  {id:'revenue_today',type:'kpi',title:'Revenue Today',x:3,y:0,width:3,height:1,minWidth:2,minHeight:1,roles:['OWNER','ADMIN'],hidden:false},
  {id:'cars_in_work',type:'kpi',title:'Cars in Work',x:6,y:0,width:3,height:1,minWidth:2,minHeight:1,roles:['OWNER','ADMIN','MANAGER'],hidden:false},
  {id:'ready_cars',type:'kpi',title:'Ready Cars',x:9,y:0,width:3,height:1,minWidth:2,minHeight:1,roles:['OWNER','ADMIN','MANAGER'],hidden:false},
  {id:'recent_orders',type:'orders',title:'Recent Orders',x:0,y:1,width:8,height:4,minWidth:4,minHeight:3,roles:['OWNER','ADMIN','MANAGER'],hidden:false},
  {id:'today_schedule',type:'calendar',title:'Today Schedule',x:8,y:1,width:4,height:4,minWidth:3,minHeight:3,roles:['OWNER','ADMIN','MANAGER'],hidden:false}
 ],
 layouts:{OWNER:['orders_today','revenue_today','cars_in_work','ready_cars','recent_orders','today_schedule'],ADMIN:['orders_today','revenue_today','cars_in_work','ready_cars','recent_orders','today_schedule'],MANAGER:['orders_today','cars_in_work','ready_cars','recent_orders','today_schedule']},
 presets:['Default','Compact','Operations','CRM','Management','Tablet'],
 mappings:{orders:'orders',clients:'clients',vehicles:'vehicles',services:'services',payments:'payments',staff:'staff',broadcasts:'broadcasts'}
};

export async function ensureDesktopDb(env:Env){
 if(!env.DB)throw new Error('D1 is not connected.');
 await ensureDb(env);
 if(ready)return;
 const ddl=[
  "CREATE TABLE IF NOT EXISTS staff_role_permissions(role TEXT NOT NULL,permission_key TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 0,updated_by INTEGER,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(role,permission_key));",
  "CREATE TABLE IF NOT EXISTS desktop_login_tokens(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL,expires_at TEXT NOT NULL,used_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);",
  "CREATE TABLE IF NOT EXISTS desktop_sessions(id INTEGER PRIMARY KEY AUTOINCREMENT,session_hash TEXT NOT NULL UNIQUE,user_id INTEGER NOT NULL,device_label TEXT,user_agent TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,expires_at TEXT NOT NULL,revoked_at TEXT);",
  "CREATE INDEX IF NOT EXISTS idx_desktop_sessions_user ON desktop_sessions(user_id,revoked_at,expires_at);",
  "CREATE TABLE IF NOT EXISTS desktop_workspace_draft(id INTEGER PRIMARY KEY CHECK(id=1),config_json TEXT NOT NULL,locked INTEGER NOT NULL DEFAULT 1,updated_by INTEGER,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);",
  "CREATE TABLE IF NOT EXISTS desktop_workspace_versions(id INTEGER PRIMARY KEY AUTOINCREMENT,version_number INTEGER NOT NULL UNIQUE,config_json TEXT NOT NULL,comment TEXT,created_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,is_active INTEGER NOT NULL DEFAULT 0);",
  "CREATE TABLE IF NOT EXISTS desktop_personal_workspace(user_id INTEGER PRIMARY KEY,config_json TEXT NOT NULL DEFAULT '{}',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);",
  "CREATE TABLE IF NOT EXISTS desktop_campaigns(id INTEGER PRIMARY KEY AUTOINCREMENT,type TEXT NOT NULL DEFAULT 'STANDARD',text TEXT NOT NULL,audience_json TEXT NOT NULL DEFAULT '{\"type\":\"all\"}',schedule_at TEXT,timezone TEXT NOT NULL DEFAULT 'Europe/Warsaw',repeat_type TEXT NOT NULL DEFAULT 'ONCE',repeat_interval INTEGER NOT NULL DEFAULT 1,repeat_count INTEGER,repeat_until TEXT,status TEXT NOT NULL DEFAULT 'DRAFT',next_run_at TEXT,runs_completed INTEGER NOT NULL DEFAULT 0,recipient_count INTEGER NOT NULL DEFAULT 0,sent_count INTEGER NOT NULL DEFAULT 0,failed_count INTEGER NOT NULL DEFAULT 0,blocked_count INTEGER NOT NULL DEFAULT 0,created_by INTEGER NOT NULL,updated_by INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,last_run_at TEXT);",
  "CREATE TABLE IF NOT EXISTS desktop_campaign_runs(id INTEGER PRIMARY KEY AUTOINCREMENT,campaign_id INTEGER NOT NULL,started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,finished_at TEXT,recipient_count INTEGER NOT NULL DEFAULT 0,sent_count INTEGER NOT NULL DEFAULT 0,failed_count INTEGER NOT NULL DEFAULT 0,blocked_count INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'RUNNING');",
  "CREATE TABLE IF NOT EXISTS desktop_campaign_deliveries(id INTEGER PRIMARY KEY AUTOINCREMENT,run_id INTEGER NOT NULL,campaign_id INTEGER NOT NULL,user_id INTEGER NOT NULL,status TEXT NOT NULL,error TEXT,sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(run_id,user_id));"
 ];
 await env.DB.exec(ddl.join('\n'));
 await safeAlter(env,'ALTER TABLE service_requests ADD COLUMN staff_note TEXT');
 await safeAlter(env,'ALTER TABLE service_requests ADD COLUMN accelerated INTEGER NOT NULL DEFAULT 0');
 await safeAlter(env,'ALTER TABLE service_requests ADD COLUMN accelerated_surcharge REAL NOT NULL DEFAULT 0');
 await safeAlter(env,'ALTER TABLE service_requests ADD COLUMN responsible_staff_id INTEGER');
 await safeAlter(env,'ALTER TABLE desktop_campaign_deliveries ADD COLUMN read_at TEXT');
 const defs:{role:string,key:DesktopPermission,value:number}[]=[];
 (['desktop_access','sales_access','broadcast_access','reports_access','financial_access','clients_access'] as DesktopPermission[]).forEach(key=>defs.push({role:'ADMIN',key,value:1}));
 defs.push({role:'ADMIN',key:'workspace_editor',value:0});
 (['desktop_access','sales_access','broadcast_access','reports_access','financial_access'] as DesktopPermission[]).forEach(key=>defs.push({role:'MANAGER',key,value:0}));
 defs.push({role:'MANAGER',key:'clients_access',value:1},{role:'MANAGER',key:'workspace_editor',value:0});
 for(const d of defs)await env.DB.prepare('INSERT OR IGNORE INTO staff_role_permissions(role,permission_key,enabled) VALUES(?,?,?)').bind(d.role,d.key,d.value).run();
 for(const d of [['desktop',0],['sales',0],['campaigns',0],['financial',0],['clients',1]])await env.DB.prepare('INSERT OR IGNORE INTO manager_permissions(permission_key,enabled) VALUES(?,?)').bind(d[0],d[1]).run();
 if(!(await env.DB.prepare('SELECT 1 ok FROM desktop_workspace_draft WHERE id=1').first<any>()))await env.DB.prepare('INSERT INTO desktop_workspace_draft(id,config_json,locked) VALUES(1,?,1)').bind(JSON.stringify(defaultWorkspace)).run();
 if(!(await env.DB.prepare('SELECT 1 ok FROM desktop_workspace_versions WHERE is_active=1 LIMIT 1').first<any>()))await env.DB.prepare('INSERT INTO desktop_workspace_versions(version_number,config_json,comment,is_active) VALUES(1,?,?,1)').bind(JSON.stringify(defaultWorkspace),'Initial workspace').run();
 if((await getSetting(env,'desktop.mode',''))==='')await setSetting(env,'desktop.mode','ONLINE');
 ready=true;
}

const legacyKey=(key:DesktopPermission)=>({desktop_access:'desktop',sales_access:'sales',broadcast_access:'campaigns',reports_access:'reports',financial_access:'financial',clients_access:'clients',workspace_editor:'workspace'} as Record<DesktopPermission,string>)[key];
export async function desktopPermission(env:Env,role:string,key:DesktopPermission){
 if(role==='OWNER')return true;
 if(role!=='ADMIN'&&role!=='MANAGER')return false;
 await ensureDesktopDb(env);
 if(role==='MANAGER'){
  if(key==='workspace_editor')return false;
  const legacy=legacyKey(key);
  if(legacy&&await managerBlockEnabled(env,legacy))return true;
 }
 const row=await env.DB!.prepare('SELECT enabled FROM staff_role_permissions WHERE role=? AND permission_key=?').bind(role,key).first<any>();
 return Number(row?.enabled||0)===1;
}

export async function createDesktopLoginToken(env:Env,userId:number,role:string,origin:string){
 await ensureDesktopDb(env);
 if(!await desktopPermission(env,role,'desktop_access'))throw new Error('Desktop Control Center недоступний для вашої ролі.');
 const raw=randomToken(),h=await digest(raw);
 await env.DB!.prepare("DELETE FROM desktop_login_tokens WHERE user_id=? OR expires_at<CURRENT_TIMESTAMP OR used_at IS NOT NULL").bind(userId).run();
 await env.DB!.prepare("INSERT INTO desktop_login_tokens(token_hash,user_id,expires_at) VALUES(?,?,datetime('now','+10 minutes'))").bind(h,userId).run();
 return origin.replace(/\/$/,'')+'/desktop?token='+encodeURIComponent(raw);
}

export async function desktopSalesSearch(env:Env,q:string,limit=10){
 await ensureDesktopDb(env);
 const raw=String(q||'').trim(), like='%'+raw.replace(/^CHD-/i,'')+'%';
 const r=await env.DB!.prepare(
  "SELECT sr.id,sr.status,sr.scheduled_for,sr.final_job_price,sr.calculated_price,sr.currency,u.first_name,u.username,cp.phone_number,c.name car_name,c.brand,c.model,c.plate FROM service_requests sr LEFT JOIN users u ON u.id=sr.user_id LEFT JOIN client_profiles cp ON cp.user_id=u.id LEFT JOIN client_cars c ON c.id=sr.car_id WHERE sr.staff_deleted_at IS NULL AND (CAST(sr.id AS TEXT) LIKE ? OR lower(COALESCE(u.username,'')) LIKE lower(?) OR replace(replace(COALESCE(cp.phone_number,''),' ',''),'-','') LIKE replace(replace(?,' ',''),'-','') OR lower(COALESCE(c.plate,'')) LIKE lower(?) OR lower(COALESCE(c.brand,'')||' '||COALESCE(c.model,'')) LIKE lower(?)) ORDER BY sr.id DESC LIMIT ?"
 ).bind(like,'%'+raw.replace(/^@/,'')+'%','%'+raw+'%','%'+raw+'%','%'+raw+'%',limit).all<any>();
 return r.results||[];
}

const mode=async(env:Env)=>String(await getSetting(env,'desktop.mode','ONLINE')).toUpperCase();
const permissionSnapshot=async(env:Env,role:string)=>{
 const keys:DesktopPermission[]=['desktop_access','sales_access','broadcast_access','reports_access','financial_access','clients_access','workspace_editor'];
 const out:any={};for(const k of keys)out[k]=await desktopPermission(env,role,k);return out;
};
const auth=async(env:Env,request:Request)=>{
 await ensureDesktopDb(env);
 if(isPhoneRequest(request))return null;
 const raw=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
 if(!raw)return null;
 const h=await digest(raw);
 const row=await env.DB!.prepare("SELECT ds.id session_id,ds.user_id,ds.device_label,ds.expires_at,u.telegram_user_id,u.first_name,u.username,u.role,u.status FROM desktop_sessions ds JOIN users u ON u.id=ds.user_id WHERE ds.session_hash=? AND ds.revoked_at IS NULL AND ds.expires_at>CURRENT_TIMESTAMP").bind(h).first<any>();
 if(!row||row.status!=='ACTIVE'||!['OWNER','ADMIN','MANAGER'].includes(row.role))return null;
 if(!await desktopPermission(env,row.role,'desktop_access')){await env.DB!.prepare('UPDATE desktop_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE id=?').bind(row.session_id).run();return null}
 await env.DB!.prepare('UPDATE desktop_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE id=?').bind(row.session_id).run().catch(()=>{});
 return row;
};
const writable=async(env:Env)=>{const m=await mode(env);if(m==='READ_ONLY')throw new Error('Desktop is in Read Only mode.');if(m==='MAINTENANCE')throw new Error('Desktop is under maintenance.');if(m==='DISABLED')throw new Error('Desktop is disabled.');};

const orderRows=async(env:Env,search='',status='')=>{
 const args:any[]=[];let where="sr.staff_deleted_at IS NULL";
 if(search){where+=" AND (CAST(sr.id AS TEXT) LIKE ? OR lower(COALESCE(u.username,'')) LIKE lower(?) OR COALESCE(cp.phone_number,'') LIKE ? OR lower(COALESCE(c.plate,'')) LIKE lower(?) OR lower(COALESCE(c.brand,'')||' '||COALESCE(c.model,'')) LIKE lower(?))";const q='%'+search.replace(/^CHD-/i,'').replace(/^@/,'')+'%';args.push(q,q,q,q,q)}
 if(status){where+=' AND sr.status=?';args.push(status)}
 const q="SELECT sr.id,sr.status,sr.payment_status,sr.request_type,sr.scheduled_for,sr.created_at,sr.completed_at,sr.final_job_price,sr.calculated_price,sr.currency,sr.service_slug,sr.services_json,sr.options_json,sr.car_id,sr.staff_note,sr.accelerated,sr.accelerated_surcharge,u.first_name,u.username,u.telegram_user_id,cp.phone_number,c.name car_name,c.brand,c.model,c.modification,c.body_type,c.plate,c.has_ceramic,rs.first_name responsible_name FROM service_requests sr LEFT JOIN users u ON u.id=sr.user_id LEFT JOIN client_profiles cp ON cp.user_id=u.id LEFT JOIN client_cars c ON c.id=sr.car_id LEFT JOIN users rs ON rs.id=sr.responsible_staff_id WHERE "+where+" ORDER BY sr.id DESC LIMIT 250";
 const r=await env.DB!.prepare(q).bind(...args).all<any>();return r.results||[];
};
const orderDetail=async(env:Env,id:number)=>{
 const row=await env.DB!.prepare("SELECT sr.*,u.first_name,u.last_name,u.username,u.telegram_user_id,cp.phone_number,cp.notes client_notes,c.name car_name,c.brand,c.model,c.modification,c.body_type,c.plate,c.has_ceramic,c.owner_phone,rs.first_name responsible_name FROM service_requests sr LEFT JOIN users u ON u.id=sr.user_id LEFT JOIN client_profiles cp ON cp.user_id=u.id LEFT JOIN client_cars c ON c.id=sr.car_id LEFT JOIN users rs ON rs.id=sr.responsible_staff_id WHERE sr.id=? AND sr.staff_deleted_at IS NULL").bind(id).first<any>();
 if(!row)return null;
 const ex=await env.DB!.prepare('SELECT * FROM service_request_extras WHERE request_id=? ORDER BY id').bind(id).all<any>();
 return {...row,extras:ex.results||[]};
};
const campaignRecipients=async(env:Env,a:any)=>{
 const type=String(a?.type||'all');let sql="SELECT DISTINCT u.id,u.telegram_user_id,u.notifications_enabled FROM users u LEFT JOIN client_profiles cp ON cp.user_id=u.id WHERE u.role='CLIENT' AND u.status='ACTIVE' AND u.telegram_user_id IS NOT NULL";const binds:any[]=[];
 if(type==='vip')sql+=" AND COALESCE(cp.client_tier,'STANDARD')<>'STANDARD'";
 else if(type==='new')sql+=" AND u.created_at>=datetime('now','-30 days')";
 else if(type==='returning')sql+=" AND COALESCE(cp.paid_jobs_count,0)>1";
 else if(type==='active_order')sql+=" AND EXISTS(SELECT 1 FROM service_requests sr WHERE sr.user_id=u.id AND sr.status NOT IN ('COMPLETED','PAID','REJECTED','CANCELLED') AND sr.staff_deleted_at IS NULL)";
 else if(type==='completed')sql+=" AND EXISTS(SELECT 1 FROM service_requests sr WHERE sr.user_id=u.id AND sr.status IN ('COMPLETED','PAID') AND sr.staff_deleted_at IS NULL)";
 else if(type==='brand'){sql+=" AND EXISTS(SELECT 1 FROM client_cars c WHERE c.user_id=u.id AND lower(c.brand)=lower(?))";binds.push(String(a.value||''))}
 else if(type==='phone'){sql+=" AND COALESCE(cp.phone_number,'') LIKE ?";binds.push('%'+String(a.value||'')+'%')}
 else if(type==='user'){sql+=" AND (u.id=? OR u.telegram_user_id=? OR lower(u.username)=lower(?))";const v=String(a.value||'').replace(/^@/,'');binds.push(Number(v)||-1,Number(v)||-1,v)}
 const r=await env.DB!.prepare(sql).bind(...binds).all<any>();return r.results||[];
};
const nextCampaignTime=(row:any)=>{
 const t=String(row.repeat_type||'ONCE').toUpperCase(),n=Math.max(1,Number(row.repeat_interval||1)),base=new Date(row.next_run_at||Date.now());
 if(t==='ONCE')return null;
 if(t==='DAILY'||t==='CUSTOM')base.setUTCDate(base.getUTCDate()+n);
 else if(t==='WEEKLY')base.setUTCDate(base.getUTCDate()+7*n);
 else if(t==='MONTHLY')base.setUTCMonth(base.getUTCMonth()+n);
 return base.toISOString();
};
async function runCampaign(env:Env,row:any){
 if(!env.DB||!env.BOT_TOKEN)return;
 const recipients=await campaignRecipients(env,parse(row.audience_json,{type:'all'}));
 let run=await env.DB.prepare("SELECT * FROM desktop_campaign_runs WHERE campaign_id=? AND status='RUNNING' ORDER BY id DESC LIMIT 1").bind(row.id).first<any>();
 if(!run){
  const created=await env.DB.prepare('INSERT INTO desktop_campaign_runs(campaign_id,recipient_count) VALUES(?,?)').bind(row.id,recipients.length).run();
  run={id:Number(created.meta.last_row_id),sent_count:0,failed_count:0,blocked_count:0};
 }
 const runId=Number(run.id);
 const delivered=await env.DB.prepare('SELECT user_id FROM desktop_campaign_deliveries WHERE run_id=?').bind(runId).all<any>();
 const doneIds=new Set((delivered.results||[]).map((x:any)=>Number(x.user_id)));
 const eligible=recipients.filter((u:any)=>String(row.type).toUpperCase()==='IMPORTANT'||Number(u.notifications_enabled||0)===1);
 const pending=eligible.filter((u:any)=>!doneIds.has(Number(u.id)));
 const batch=pending.slice(0,40);
 let sent=0,failed=0,blocked=0;
 for(const u of batch){
  try{
   await sendMessage(env,Number(u.telegram_user_id),htmlEscape(row.text));
   sent++;
   await env.DB.prepare('INSERT OR IGNORE INTO desktop_campaign_deliveries(run_id,campaign_id,user_id,status) VALUES(?,?,?,?)').bind(runId,row.id,u.id,'SENT').run();
  }catch(e:any){
   failed++;const message=String(e?.message||e);if(/blocked|chat not found|deactivated/i.test(message))blocked++;
   await env.DB.prepare('INSERT OR IGNORE INTO desktop_campaign_deliveries(run_id,campaign_id,user_id,status,error) VALUES(?,?,?,?,?)').bind(runId,row.id,u.id,'FAILED',message.slice(0,500)).run();
  }
 }
 await env.DB.prepare('UPDATE desktop_campaign_runs SET sent_count=sent_count+?,failed_count=failed_count+?,blocked_count=blocked_count+? WHERE id=?').bind(sent,failed,blocked,runId).run();
 await env.DB.prepare('UPDATE desktop_campaigns SET recipient_count=?,sent_count=sent_count+?,failed_count=failed_count+?,blocked_count=blocked_count+?,last_run_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(eligible.length,sent,failed,blocked,row.id).run();
 const remaining=pending.length-batch.length;
 if(remaining>0){
  await env.DB.prepare("UPDATE desktop_campaigns SET status='ACTIVE',next_run_at=datetime('now','+1 minute') WHERE id=?").bind(row.id).run();
  return;
 }
 const done=Number(row.runs_completed||0)+1,next=nextCampaignTime(row),limit=Number(row.repeat_count||0),until=row.repeat_until?Date.parse(row.repeat_until):0;
 const finished=!next||(limit>0&&done>=limit)||(until>0&&Date.parse(next)>until);
 await env.DB.prepare("UPDATE desktop_campaign_runs SET finished_at=CURRENT_TIMESTAMP,status='DONE' WHERE id=?").bind(runId).run();
 await env.DB.prepare("UPDATE desktop_campaigns SET status=?,next_run_at=?,runs_completed=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(finished?'COMPLETED':'ACTIVE',finished?null:next,done,row.id).run();
}
export async function enqueueDesktopCampaign(env:Env,actorId:number,text:string,opts?:{type?:string;audience?:any;scheduleAt?:string|null;timezone?:string;repeatType?:string;repeatInterval?:number;repeatCount?:number|null;repeatUntil?:string|null}){
 await ensureDesktopDb(env);
 const clean=String(text||'').trim();if(!clean)throw new Error('Message text is required.');
 const audience=opts?.audience||{type:'all'};
 const recipients=await campaignRecipients(env,audience);
 const when=opts?.scheduleAt||new Date().toISOString();
 const r=await env.DB!.prepare('INSERT INTO desktop_campaigns(type,text,audience_json,schedule_at,timezone,repeat_type,repeat_interval,repeat_count,repeat_until,status,next_run_at,recipient_count,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
  .bind(String(opts?.type||'STANDARD').toUpperCase(),clean,JSON.stringify(audience),when,String(opts?.timezone||'Europe/Warsaw'),String(opts?.repeatType||'ONCE').toUpperCase(),Math.max(1,Number(opts?.repeatInterval||1)),opts?.repeatCount??null,opts?.repeatUntil??null,'SCHEDULED',when,recipients.length,actorId,actorId).run();
 return {id:Number(r.meta.last_row_id),recipients:recipients.length};
}
export async function runDesktopScheduledJobs(env:Env){
 if(!env.DB||!env.BOT_TOKEN)return;
 await ensureDesktopDb(env);
 const r=await env.DB.prepare("SELECT * FROM desktop_campaigns WHERE status IN ('SCHEDULED','ACTIVE') AND next_run_at IS NOT NULL AND next_run_at<=CURRENT_TIMESTAMP ORDER BY next_run_at LIMIT 5").all<any>();
 for(const row of r.results||[])try{await runCampaign(env,row)}catch(e){console.error('Desktop campaign failed',e)}
}

const cleanWorkspace=(input:any)=>{
 const x=input&&typeof input==='object'?input:{};
 const sidebar=Array.isArray(x.sidebar)?x.sidebar.slice(0,40).map((i:any)=>({id:String(i.id||'').slice(0,40),label:String(i.label||i.id||'').slice(0,60),icon:String(i.icon||'circle').slice(0,30),group:String(i.group||'Other').slice(0,40),hidden:!!i.hidden,roles:(Array.isArray(i.roles)?i.roles:['OWNER']).filter((r:any)=>['OWNER','ADMIN','MANAGER'].includes(String(r)))})).filter((i:any)=>i.id):defaultWorkspace.sidebar;
 const widgets=Array.isArray(x.widgets)?x.widgets.slice(0,60).map((w:any)=>({id:String(w.id||'').slice(0,50),type:String(w.type||'kpi').slice(0,30),title:String(w.title||w.id||'').slice(0,80),x:Math.max(0,Math.min(11,Number(w.x)||0)),y:Math.max(0,Number(w.y)||0),width:Math.max(1,Math.min(12,Number(w.width)||3)),height:Math.max(1,Math.min(12,Number(w.height)||1)),minWidth:Math.max(1,Math.min(12,Number(w.minWidth)||1)),minHeight:Math.max(1,Number(w.minHeight)||1),roles:(Array.isArray(w.roles)?w.roles:['OWNER']).filter((r:any)=>['OWNER','ADMIN','MANAGER'].includes(String(r)))})).filter((w:any)=>w.id):defaultWorkspace.widgets;
 return {schemaVersion:1,locked:!!x.locked,defaultPage:String(x.defaultPage||'orders'),theme:{...defaultWorkspace.theme,...(x.theme&&typeof x.theme==='object'?x.theme:{})},sidebar,widgets,layouts:x.layouts&&typeof x.layouts==='object'?x.layouts:defaultWorkspace.layouts,presets:defaultWorkspace.presets,mappings:x.mappings&&typeof x.mappings==='object'?x.mappings:defaultWorkspace.mappings,kanbanLabels:x.kanbanLabels&&typeof x.kanbanLabels==='object'?x.kanbanLabels:{}};
};

export async function handleDesktopApi(request:Request,env:Env,url:URL):Promise<Response|null>{
 if(!url.pathname.startsWith('/api/desktop/'))return null;
 await ensureDesktopDb(env);
 if(url.pathname==='/api/desktop/login'&&request.method==='POST'){
  if(isPhoneRequest(request))return reply({error:'DESKTOP_MOBILE_BLOCKED',message:'Desktop Control Center доступний лише з PC, Mac, ноутбука або планшета.'},403);
  const b=await body(request),raw=String(b.token||'');if(!raw)return reply({error:'Login token is required.'},400);
  const h=await digest(raw),row=await env.DB!.prepare("SELECT lt.*,u.first_name,u.username,u.role,u.status FROM desktop_login_tokens lt JOIN users u ON u.id=lt.user_id WHERE lt.token_hash=? AND lt.used_at IS NULL AND lt.expires_at>CURRENT_TIMESTAMP").bind(h).first<any>();
  if(!row||row.status!=='ACTIVE'||!['OWNER','ADMIN','MANAGER'].includes(row.role))return reply({error:'Login token is invalid or expired.'},401);
  if(!await desktopPermission(env,row.role,'desktop_access'))return reply({error:'Desktop Control Center недоступний для вашої ролі.'},403);
  const session=randomToken(),sh=await digest(session),ua=(request.headers.get('user-agent')||'').slice(0,300),device=String(b.device||'Desktop').slice(0,80);
  await env.DB!.prepare("INSERT INTO desktop_sessions(session_hash,user_id,device_label,user_agent,expires_at) VALUES(?,?,?,?,datetime('now','+14 days'))").bind(sh,row.user_id,device,ua).run();
  await env.DB!.prepare('UPDATE desktop_login_tokens SET used_at=CURRENT_TIMESTAMP WHERE token_hash=?').bind(h).run();
  await log(env,row.user_id,'desktop.login','desktop_session',undefined,null,{device});
  return reply({ok:true,session,user:{id:row.user_id,firstName:row.first_name,username:row.username,role:row.role}});
 }
 if(isPhoneRequest(request))return reply({error:'DESKTOP_MOBILE_BLOCKED',message:'Desktop Control Center доступний лише з PC, Mac, ноутбука або планшета.'},403);
 const staff=await auth(env,request);if(!staff)return reply({error:'Desktop session is missing, expired or revoked.'},401);
 const m=await mode(env);if(m==='DISABLED')return reply({error:'DESKTOP_DISABLED',mode:m},503);if(m==='MAINTENANCE'&&url.pathname!=='/api/desktop/bootstrap')return reply({error:'DESKTOP_MAINTENANCE',mode:m},503);
 const perms=await permissionSnapshot(env,staff.role);
 if(url.pathname==='/api/desktop/bootstrap'&&request.method==='GET'){
  const active=await env.DB!.prepare('SELECT version_number,config_json FROM desktop_workspace_versions WHERE is_active=1 ORDER BY version_number DESC LIMIT 1').first<any>();
  const personal=await env.DB!.prepare('SELECT config_json FROM desktop_personal_workspace WHERE user_id=?').bind(staff.user_id).first<any>();
  return reply({user:{id:staff.user_id,telegramId:staff.telegram_user_id,firstName:staff.first_name,username:staff.username,role:staff.role},permissions:perms,mode:m,workspace:{version:Number(active?.version_number||1),config:parse(active?.config_json,defaultWorkspace)},personal:parse(personal?.config_json,{}),kanbanLabels:parse(await getSetting(env,'desktop.kanban_labels','{}'),{})});
 }
 if(url.pathname==='/api/desktop/kanban-labels'&&request.method==='PATCH'){
  if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);
  await writable(env);const b=await body(request),allowed=['REQUESTED','PENDING_CONFIRMATION','CONFIRMED','IN_PROGRESS','READY','COMPLETED'],next:any={};
  for(const key of allowed){const value=String(b?.labels?.[key]||'').trim();if(value)next[key]=value.slice(0,40)}
  await setSetting(env,'desktop.kanban_labels',JSON.stringify(next));await log(env,staff.user_id,'desktop.kanban.labels','settings','desktop.kanban_labels',null,next);return reply({ok:true,labels:next});
 }
 if(url.pathname==='/api/desktop/dashboard'&&request.method==='GET'){
  const [newOrders,confirmed,inWork,readyCars,unpaid,revenue]=await Promise.all([
   env.DB!.prepare("SELECT COUNT(*) n FROM service_requests WHERE date(created_at)=date('now') AND staff_deleted_at IS NULL").first<any>(),
   env.DB!.prepare("SELECT COUNT(*) n FROM service_requests WHERE status='CONFIRMED' AND staff_deleted_at IS NULL").first<any>(),
   env.DB!.prepare("SELECT COUNT(*) n FROM service_requests WHERE status IN ('IN_PROGRESS','CAR_ACCEPTED','INSPECTION') AND staff_deleted_at IS NULL").first<any>(),
   env.DB!.prepare("SELECT COUNT(*) n FROM service_requests WHERE status IN ('READY','COMPLETED') AND payment_status<>'PAID' AND staff_deleted_at IS NULL").first<any>(),
   env.DB!.prepare("SELECT COUNT(*) n FROM service_requests WHERE payment_status<>'PAID' AND status NOT IN ('REJECTED','CANCELLED') AND staff_deleted_at IS NULL").first<any>(),
   env.DB!.prepare("SELECT COALESCE(SUM(COALESCE(final_job_price,calculated_price)),0) n FROM service_requests WHERE payment_status='PAID' AND date(COALESCE(completed_at,created_at))=date('now') AND staff_deleted_at IS NULL").first<any>()
  ]);
  return reply({kpi:{newOrders:Number(newOrders?.n||0),confirmed:Number(confirmed?.n||0),inWork:Number(inWork?.n||0),ready:Number(readyCars?.n||0),unpaid:Number(unpaid?.n||0),revenue:Number(revenue?.n||0)},currency:await getSetting(env,'reporting_currency','PLN'),serviceStatus:await getSetting(env,'business_status_override','AUTO')});
 }
 if(url.pathname==='/api/desktop/payments'&&request.method==='GET'){
  if(!perms.financial_access)return reply({error:'Financial access is disabled.'},403);
  const target=normalizeCurrency(url.searchParams.get('currency')||await getSetting(env,'reporting_currency','PLN'));
  const r=await env.DB!.prepare("SELECT sr.id,sr.payment_status,sr.status,sr.final_job_price,sr.calculated_price,sr.currency,sr.created_at,sr.completed_at,u.first_name,u.username,c.brand,c.model,c.plate FROM service_requests sr LEFT JOIN users u ON u.id=sr.user_id LEFT JOIN client_cars c ON c.id=sr.car_id WHERE sr.staff_deleted_at IS NULL ORDER BY sr.id DESC LIMIT 250").all<any>();
  const rows=(r.results||[]).map((x:any)=>{const original=Number(x.final_job_price??x.calculated_price??0),from=normalizeCurrency(x.currency);return {...x,original_amount:original,original_currency:from,display_amount:convertCurrency(original,from,target),display_currency:target}});
  const paid=rows.filter((x:any)=>x.payment_status==='PAID'),unpaid=rows.filter((x:any)=>x.payment_status!=='PAID');
  return reply({currency:target,rates:fx[target]||{},rows,summary:{paid:paid.length,unpaid:unpaid.length,paidTotal:Math.round(paid.reduce((s:number,x:any)=>s+Number(x.display_amount||0),0)*100)/100,unpaidTotal:Math.round(unpaid.reduce((s:number,x:any)=>s+Number(x.display_amount||0),0)*100)/100}});
 }
 if(url.pathname==='/api/desktop/search'&&request.method==='GET'){if(!perms.sales_access)return reply({error:'Sales access is disabled.'},403);return reply({results:await desktopSalesSearch(env,url.searchParams.get('q')||'',40)});}
 if(url.pathname==='/api/desktop/orders'&&request.method==='GET')return reply({orders:await orderRows(env,url.searchParams.get('q')||'',url.searchParams.get('status')||'')});
 const orderMatch=url.pathname.match(/^\/api\/desktop\/orders\/(\d+)$/);
 if(orderMatch&&request.method==='GET')return reply({order:await orderDetail(env,Number(orderMatch[1]))});
 if(orderMatch&&request.method==='PATCH'){
  await writable(env);const id=Number(orderMatch[1]),b=await body(request),old=await orderDetail(env,id);if(!old)return reply({error:'Order not found.'},404);
  const fields:{key:string,col:string}[]=[{key:'status',col:'status'},{key:'paymentStatus',col:'payment_status'},{key:'scheduledFor',col:'scheduled_for'},{key:'staffNote',col:'staff_note'},{key:'responsibleStaffId',col:'responsible_staff_id'}];
  for(const f of fields)if(Object.prototype.hasOwnProperty.call(b,f.key)){await env.DB!.prepare('UPDATE service_requests SET '+f.col+'=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(b[f.key]||null,id).run()}
  if(Object.prototype.hasOwnProperty.call(b,'finalPrice'))await env.DB!.prepare('UPDATE service_requests SET final_job_price=?,price_adjustment_reason=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(Number(b.finalPrice),String(b.priceReason||'Desktop adjustment').slice(0,300),id).run();
  if(Object.prototype.hasOwnProperty.call(b,'accelerated'))await env.DB!.prepare('UPDATE service_requests SET accelerated=?,accelerated_surcharge=?,final_job_price=COALESCE(calculated_price,0)+?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(b.accelerated?1:0,Number(b.acceleratedSurcharge||0),b.accelerated?Number(b.acceleratedSurcharge||0):0,id).run();
  const now=await orderDetail(env,id);await log(env,staff.user_id,'desktop.order.update','service_request',String(id),old,now);return reply({ok:true,order:now});
 }
 const orderSelectionMatch=url.pathname.match(/^\/api\/desktop\/orders\/(\d+)\/catalog-selection$/);
 if(orderSelectionMatch&&request.method==='PATCH'){await writable(env);const id=Number(orderSelectionMatch[1]),b=await body(request),old=await orderDetail(env,id);if(!old)return reply({error:'Order not found.'},404);const clean=(v:any)=>Array.isArray(v)?v.map(x=>String(x||'').trim()).filter(Boolean).slice(0,40):[];const services=clean(b.services),options=clean(b.options);await env.DB!.prepare('UPDATE service_requests SET services_json=?,options_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(JSON.stringify(services),JSON.stringify(options),id).run();await log(env,staff.user_id,'order.catalog_selection.update','service_request',String(id),{services_json:old.services_json,options_json:old.options_json},{services,options});return reply({ok:true,services,options});}
 const orderCatalogMatch=url.pathname.match(/^\/api\/desktop\/orders\/(\d+)\/catalog$/);
 if(orderCatalogMatch&&request.method==='GET'){const id=Number(orderCatalogMatch[1]),order=await orderDetail(env,id);if(!order)return reply({error:'Order not found.'},404);const [services,options]=await Promise.all([env.DB!.prepare("SELECT s.id,s.slug,COALESCE(t.title,s.slug) title,p.base_price price,p.base_currency currency FROM services s LEFT JOIN service_translations t ON t.service_id=s.id AND t.locale='uk' LEFT JOIN service_prices p ON p.service_id=s.id WHERE s.enabled=1 AND s.archived=0 ORDER BY s.sort_order,s.id").all<any>(),env.DB!.prepare("SELECT o.id,o.slug,COALESCE(t.title,o.slug) title,o.price,o.base_currency currency FROM service_options o LEFT JOIN service_option_translations t ON t.option_id=o.id AND t.locale='uk' WHERE o.enabled=1 ORDER BY o.sort_order,o.id").all<any>()]);return reply({services:services.results||[],options:options.results||[],extras:order.extras||[]});}
 const extraMatch=url.pathname.match(/^\/api\/desktop\/orders\/(\d+)\/services$/);
 if(extraMatch&&request.method==='POST'){await writable(env);const id=Number(extraMatch[1]),b=await body(request);let serviceId=Number(b.serviceId||0),slug=String(b.slug||'custom'),title=String(b.title||'Additional service'),price=Number(b.price||0),currency=normalizeCurrency(b.currency||'PLN');
  if(b.catalogType==='service'&&serviceId){const row=await env.DB!.prepare("SELECT s.id,s.slug,COALESCE(t.title,s.slug) title,p.base_price price,p.base_currency currency FROM services s LEFT JOIN service_translations t ON t.service_id=s.id AND t.locale='uk' LEFT JOIN service_prices p ON p.service_id=s.id WHERE s.id=?").bind(serviceId).first<any>();if(!row)return reply({error:'Service not found.'},404);slug=row.slug;title=row.title;price=Number(row.price||0);currency=normalizeCurrency(row.currency)}
  if(b.catalogType==='option'&&serviceId){const row=await env.DB!.prepare("SELECT o.id,o.slug,COALESCE(t.title,o.slug) title,o.price,o.base_currency currency FROM service_options o LEFT JOIN service_option_translations t ON t.option_id=o.id AND t.locale='uk' WHERE o.id=?").bind(serviceId).first<any>();if(!row)return reply({error:'Option not found.'},404);slug=row.slug;title=row.title;price=Number(row.price||0);currency=normalizeCurrency(row.currency)}
  const r=await env.DB!.prepare('INSERT INTO service_request_extras(request_id,service_id,service_slug,title_snapshot,price_snapshot,currency,added_by) VALUES(?,?,?,?,?,?,?)').bind(id,serviceId,slug,title.slice(0,120),price,currency,staff.user_id).run();await env.DB!.prepare('UPDATE service_requests SET final_job_price=COALESCE(final_job_price,calculated_price,0)+?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(convertCurrency(price,currency,(await env.DB!.prepare('SELECT currency FROM service_requests WHERE id=?').bind(id).first<any>())?.currency||currency),id).run();await log(env,staff.user_id,'order.service.add','service_request',String(id),null,{extraId:r.meta.last_row_id,slug,title,price,currency});return reply({ok:true,id:r.meta.last_row_id});}
 const extraDelete=url.pathname.match(/^\/api\/desktop\/orders\/(\d+)\/services\/(\d+)$/);
 if(extraDelete&&request.method==='DELETE'){await writable(env);const id=Number(extraDelete[1]),eid=Number(extraDelete[2]),old=await env.DB!.prepare('SELECT * FROM service_request_extras WHERE id=? AND request_id=?').bind(eid,id).first<any>();if(!old)return reply({error:'Extra service not found.'},404);await env.DB!.prepare('DELETE FROM service_request_extras WHERE id=?').bind(eid).run();await env.DB!.prepare('UPDATE service_requests SET final_job_price=MAX(0,COALESCE(final_job_price,calculated_price,0)-?),updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(Number(old.price_snapshot||0),id).run();await log(env,staff.user_id,'desktop.order.service.remove','service_request',String(id),old,null);return reply({ok:true});}
 if(url.pathname==='/api/desktop/clients'&&request.method==='GET'){if(!perms.clients_access)return reply({error:'Client access is disabled.'},403);const r=await env.DB!.prepare("SELECT u.id,u.telegram_user_id,u.username,u.first_name,u.last_seen_at,cp.phone_number,cp.client_tier,cp.paid_jobs_count,cp.lifetime_value,cp.notes,(SELECT COUNT(*) FROM client_cars c WHERE c.user_id=u.id) cars,(SELECT MAX(COALESCE(sr.completed_at,sr.created_at)) FROM service_requests sr WHERE sr.user_id=u.id AND sr.staff_deleted_at IS NULL) last_visit FROM users u LEFT JOIN client_profiles cp ON cp.user_id=u.id WHERE u.role='CLIENT' ORDER BY u.last_seen_at DESC LIMIT 300").all<any>();return reply({clients:r.results||[]});}
 if(url.pathname==='/api/desktop/cars'&&request.method==='GET'){if(!perms.clients_access)return reply({error:'Client access is disabled.'},403);const r=await env.DB!.prepare("SELECT c.*,u.first_name,u.username,cp.phone_number,(SELECT MAX(COALESCE(sr.completed_at,sr.created_at)) FROM service_requests sr WHERE sr.car_id=c.id AND sr.staff_deleted_at IS NULL) last_service,(SELECT COUNT(*) FROM service_requests sr WHERE sr.car_id=c.id AND sr.staff_deleted_at IS NULL) visits FROM client_cars c JOIN users u ON u.id=c.user_id LEFT JOIN client_profiles cp ON cp.user_id=u.id ORDER BY c.updated_at DESC LIMIT 400").all<any>();return reply({cars:r.results||[]});}
 if(url.pathname==='/api/desktop/services/catalog'&&request.method==='GET'){
  const [services,options]=await Promise.all([
   env.DB!.prepare("SELECT s.id,s.slug,s.enabled,s.archived,s.category,s.duration_min,s.image_url,s.icon_key,s.is_popular,p.base_price,p.base_currency,COALESCE(t.title,s.slug) title FROM services s LEFT JOIN service_prices p ON p.service_id=s.id LEFT JOIN service_translations t ON t.service_id=s.id AND t.locale='uk' ORDER BY s.sort_order,s.id").all<any>(),
   env.DB!.prepare("SELECT o.id,o.slug,o.enabled,o.price,o.base_currency,o.pricing_type,o.icon_key,COALESCE(t.title,o.slug) title FROM service_options o LEFT JOIN service_option_translations t ON t.option_id=o.id AND t.locale='uk' ORDER BY o.sort_order,o.id").all<any>()
  ]);return reply({services:services.results||[],options:options.results||[]});
 }
 const serviceDetailMatch=url.pathname.match(/^\/api\/desktop\/services\/detail\/(\d+)$/);
 if(serviceDetailMatch&&request.method==='GET'){
  const id=Number(serviceDetailMatch[1]);
  const [row,tr,req,links,vip]=await Promise.all([
   env.DB!.prepare("SELECT s.*,p.base_price,p.base_currency,p.currency_mode,p.usd_override,p.uah_override,p.pln_override FROM services s LEFT JOIN service_prices p ON p.service_id=s.id WHERE s.id=?").bind(id).first<any>(),
   env.DB!.prepare('SELECT locale,title,description FROM service_translations WHERE service_id=? ORDER BY locale').bind(id).all<any>(),
   env.DB!.prepare('SELECT * FROM service_requirements WHERE service_id=?').bind(id).first<any>(),
   env.DB!.prepare('SELECT option_id FROM service_option_links WHERE service_id=? ORDER BY sort_order,option_id').bind(id).all<any>(),
   env.DB!.prepare('SELECT * FROM vip_pricing_rules WHERE service_id=? ORDER BY tier').bind(id).all<any>()
  ]);if(!row)return reply({error:'Service not found.'},404);return reply({service:row,translations:tr.results||[],requirements:req||{},optionIds:(links.results||[]).map((x:any)=>Number(x.option_id)),vip:vip.results||[]});
 }
 if(url.pathname==='/api/desktop/services'&&request.method==='POST'){
  if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);const b=await body(request);
  const slug=String(b.slug||'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');if(!slug)return reply({error:'Slug is required.'},400);
  const exists=await env.DB!.prepare('SELECT id FROM services WHERE slug=?').bind(slug).first<any>();if(exists)return reply({error:'Slug already exists.'},409);
  const max=await env.DB!.prepare('SELECT COALESCE(MAX(sort_order),0)+10 n FROM services').first<any>();
  const ins=await env.DB!.prepare('INSERT INTO services(slug,enabled,sort_order,category,duration_min,archived,image_url,icon_key,is_popular) VALUES(?,?,?,?,?,0,?,?,?)').bind(slug,b.enabled===false?0:1,Number(max?.n||10),String(b.category||'DETAILING').slice(0,40),Math.max(0,Number(b.durationMin||60)),b.imageUrl?String(b.imageUrl).slice(0,2000):null,b.iconKey?String(b.iconKey).slice(0,100):null,b.isPopular?1:0).run();
  const id=Number(ins.meta.last_row_id),currency=normalizeCurrency(b.currency||'PLN'),price=Math.max(0,Number(b.price||0));
  await env.DB!.prepare('INSERT INTO service_prices(service_id,base_price,base_currency,updated_by) VALUES(?,?,?,?)').bind(id,price,currency,staff.user_id).run();
  await env.DB!.prepare('INSERT INTO service_requirements(service_id,require_condition,require_vehicle,allow_options,allow_multiple_options) VALUES(?,?,?,?,?)').bind(id,b.requireCondition===false?0:1,b.requireVehicle===false?0:1,b.allowOptions===false?0:1,b.allowMultipleOptions===false?0:1).run();
  const translations=b.translations&&typeof b.translations==='object'?b.translations:{uk:{title:b.title||slug,description:b.description||''}};
  for(const loc of ['uk','pl','en','de','fr']){const x=translations[loc];if(x?.title)await env.DB!.prepare('INSERT OR REPLACE INTO service_translations(service_id,locale,title,description) VALUES(?,?,?,?)').bind(id,loc,String(x.title).slice(0,160),String(x.description||'').slice(0,3000)).run()}
  await log(env,staff.user_id,'desktop.service.create','service',String(id),null,{slug,price,currency});return reply({ok:true,id});
 }
 const serviceDeleteMatch=url.pathname.match(/^\/api\/desktop\/services\/(\d+)$/);
 if(serviceDeleteMatch&&request.method==='DELETE'){
  if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);const id=Number(serviceDeleteMatch[1]),old=await env.DB!.prepare('SELECT * FROM services WHERE id=?').bind(id).first<any>();if(!old)return reply({error:'Service not found.'},404);
  await env.DB!.prepare('UPDATE services SET archived=1,enabled=0,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();await log(env,staff.user_id,'desktop.service.archive','service',String(id),old,{archived:1,enabled:0});return reply({ok:true});
 }
 if(url.pathname==='/api/desktop/services'&&request.method==='GET'){
  const [main,extras]=await Promise.all([
   env.DB!.prepare("SELECT s.id,s.slug,s.enabled,s.archived,s.is_popular,s.duration_min,s.category,COALESCE(t.title,s.slug) title,COALESCE(t.description,'') description,p.base_price,p.base_currency FROM services s LEFT JOIN service_translations t ON t.service_id=s.id AND t.locale='uk' LEFT JOIN service_prices p ON p.service_id=s.id ORDER BY s.sort_order,s.id").all<any>(),
   env.DB!.prepare("SELECT o.id,o.slug,o.enabled,o.price,o.base_currency,o.pricing_type,o.icon_key,COALESCE(t.title,o.slug) title,COALESCE(t.description,'') description,COALESCE(GROUP_CONCAT(DISTINCT s.slug),'') service_slugs FROM service_options o LEFT JOIN service_option_translations t ON t.option_id=o.id AND t.locale='uk' LEFT JOIN service_option_links l ON l.option_id=o.id LEFT JOIN services s ON s.id=l.service_id GROUP BY o.id,o.slug,o.enabled,o.price,o.base_currency,o.pricing_type,o.icon_key,t.title,t.description ORDER BY o.sort_order,o.id").all<any>()
  ]);
  return reply({services:main.results||[],options:extras.results||[],total:Number((main.results||[]).length)+Number((extras.results||[]).length)});
 }

 const servicePriceMatch=url.pathname.match(/^\/api\/desktop\/services\/(\d+)$/);
 if(servicePriceMatch&&request.method==='PATCH'){
  if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);
  await writable(env);const id=Number(servicePriceMatch[1]),b=await body(request);
  const old=await env.DB!.prepare('SELECT s.*,p.base_price,p.base_currency FROM services s LEFT JOIN service_prices p ON p.service_id=s.id WHERE s.id=?').bind(id).first<any>();if(!old)return reply({error:'Service not found.'},404);
  if(Object.prototype.hasOwnProperty.call(b,'price')||Object.prototype.hasOwnProperty.call(b,'currency')){const price=Number(Object.prototype.hasOwnProperty.call(b,'price')?b.price:old.base_price||0),currency=normalizeCurrency(b.currency||old.base_currency||'PLN');if(!Number.isFinite(price)||price<0)return reply({error:'Invalid price.'},400);await env.DB!.prepare("INSERT INTO service_prices(service_id,base_price,base_currency,updated_by) VALUES(?,?,?,?) ON CONFLICT(service_id) DO UPDATE SET base_price=excluded.base_price,base_currency=excluded.base_currency,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP").bind(id,price,currency,staff.user_id).run()}
  const updates:any[]=[];const vals:any[]=[];const add=(col:string,v:any)=>{updates.push(col+'=?');vals.push(v)};
  if(Object.prototype.hasOwnProperty.call(b,'enabled'))add('enabled',b.enabled?1:0);
  if(Object.prototype.hasOwnProperty.call(b,'archived'))add('archived',b.archived?1:0);
  if(Object.prototype.hasOwnProperty.call(b,'durationMin'))add('duration_min',Math.max(0,Math.round(Number(b.durationMin)||0)));
  if(Object.prototype.hasOwnProperty.call(b,'category'))add('category',String(b.category||'DETAILING').slice(0,40));
  if(Object.prototype.hasOwnProperty.call(b,'imageUrl'))add('image_url',String(b.imageUrl||'').slice(0,2000)||null);
  if(Object.prototype.hasOwnProperty.call(b,'iconKey'))add('icon_key',String(b.iconKey||'').slice(0,100)||null);
  if(Object.prototype.hasOwnProperty.call(b,'isPopular'))add('is_popular',b.isPopular?1:0);
  if(Object.prototype.hasOwnProperty.call(b,'sortOrder'))add('sort_order',Math.round(Number(b.sortOrder)||0));
  if(updates.length){vals.push(id);await env.DB!.prepare('UPDATE services SET '+updates.join(',')+',updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(...vals).run()}
  if(b.requirements&&typeof b.requirements==='object'){const q=b.requirements;await env.DB!.prepare("INSERT INTO service_requirements(service_id,require_condition,require_vehicle,allow_options,allow_multiple_options) VALUES(?,?,?,?,?) ON CONFLICT(service_id) DO UPDATE SET require_condition=excluded.require_condition,require_vehicle=excluded.require_vehicle,allow_options=excluded.allow_options,allow_multiple_options=excluded.allow_multiple_options,updated_at=CURRENT_TIMESTAMP").bind(id,q.requireCondition===false?0:1,q.requireVehicle===false?0:1,q.allowOptions===false?0:1,q.allowMultipleOptions===false?0:1).run()}
  if(b.translations&&typeof b.translations==='object'){for(const loc of ['uk','pl','en','de','fr']){const x=b.translations[loc];if(x?.title)await env.DB!.prepare('INSERT OR REPLACE INTO service_translations(service_id,locale,title,description) VALUES(?,?,?,?)').bind(id,loc,String(x.title).slice(0,160),String(x.description||'').slice(0,3000)).run()}}
  if(Array.isArray(b.optionIds)){await env.DB!.prepare('DELETE FROM service_option_links WHERE service_id=?').bind(id).run();let order=0;for(const oid of b.optionIds){await env.DB!.prepare('INSERT OR IGNORE INTO service_option_links(service_id,option_id,sort_order) VALUES(?,?,?)').bind(id,Number(oid),order++).run()}}
  const now=await env.DB!.prepare('SELECT s.*,p.base_price,p.base_currency FROM services s LEFT JOIN service_prices p ON p.service_id=s.id WHERE s.id=?').bind(id).first<any>();await log(env,staff.user_id,'desktop.service.update','service',String(id),old,now);return reply({ok:true,service:now});
 }
 const optionDetailMatch=url.pathname.match(/^\/api\/desktop\/service-options\/detail\/(\d+)$/);
 if(optionDetailMatch&&request.method==='GET'){const id=Number(optionDetailMatch[1]);const [row,tr,links]=await Promise.all([env.DB!.prepare('SELECT * FROM service_options WHERE id=?').bind(id).first<any>(),env.DB!.prepare('SELECT locale,title,description FROM service_option_translations WHERE option_id=? ORDER BY locale').bind(id).all<any>(),env.DB!.prepare('SELECT service_id FROM service_option_links WHERE option_id=? ORDER BY sort_order,service_id').bind(id).all<any>()]);if(!row)return reply({error:'Option not found.'},404);return reply({option:row,translations:tr.results||[],serviceIds:(links.results||[]).map((x:any)=>Number(x.service_id))});}
 if(url.pathname==='/api/desktop/service-options'&&request.method==='POST'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);const b=await body(request),slug=String(b.slug||'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');if(!slug)return reply({error:'Slug is required.'},400);if(await env.DB!.prepare('SELECT id FROM service_options WHERE slug=?').bind(slug).first<any>())return reply({error:'Slug already exists.'},409);const max=await env.DB!.prepare('SELECT COALESCE(MAX(sort_order),0)+10 n FROM service_options').first<any>();const ins=await env.DB!.prepare('INSERT INTO service_options(slug,price,base_currency,pricing_type,icon_key,enabled,sort_order) VALUES(?,?,?,?,?,?,?)').bind(slug,Math.max(0,Number(b.price||0)),normalizeCurrency(b.currency||'PLN'),String(b.pricingType||'FIXED').slice(0,30),String(b.iconKey||'').slice(0,100)||null,b.enabled===false?0:1,Number(max?.n||10)).run();const id=Number(ins.meta.last_row_id),translations=b.translations&&typeof b.translations==='object'?b.translations:{uk:{title:b.title||slug,description:b.description||''}};for(const loc of ['uk','pl','en','de','fr']){const x=translations[loc];if(x?.title)await env.DB!.prepare('INSERT OR REPLACE INTO service_option_translations(option_id,locale,title,description) VALUES(?,?,?,?)').bind(id,loc,String(x.title).slice(0,160),String(x.description||'').slice(0,3000)).run()}if(Array.isArray(b.serviceIds)){let order=0;for(const sid of b.serviceIds)await env.DB!.prepare('INSERT OR IGNORE INTO service_option_links(service_id,option_id,sort_order) VALUES(?,?,?)').bind(Number(sid),id,order++).run()}await log(env,staff.user_id,'desktop.service_option.create','service_option',String(id),null,{slug});return reply({ok:true,id});}
 const optionDeleteMatch=url.pathname.match(/^\/api\/desktop\/service-options\/(\d+)$/);if(optionDeleteMatch&&request.method==='DELETE'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);const id=Number(optionDeleteMatch[1]),old=await env.DB!.prepare('SELECT * FROM service_options WHERE id=?').bind(id).first<any>();if(!old)return reply({error:'Option not found.'},404);await env.DB!.prepare('DELETE FROM service_option_links WHERE option_id=?').bind(id).run();await env.DB!.prepare('DELETE FROM service_option_translations WHERE option_id=?').bind(id).run();await env.DB!.prepare('DELETE FROM service_options WHERE id=?').bind(id).run();await log(env,staff.user_id,'desktop.service_option.delete','service_option',String(id),old,null);return reply({ok:true});}
 const optionPriceMatch=url.pathname.match(/^\/api\/desktop\/service-options\/(\d+)$/);
 if(optionPriceMatch&&request.method==='PATCH'){
  if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);const id=Number(optionPriceMatch[1]),b=await body(request),old=await env.DB!.prepare('SELECT * FROM service_options WHERE id=?').bind(id).first<any>();if(!old)return reply({error:'Option not found.'},404);
  const updates:any[]=[];const vals:any[]=[];const add=(col:string,v:any)=>{updates.push(col+'=?');vals.push(v)};
  if(Object.prototype.hasOwnProperty.call(b,'price')){const v=Number(b.price);if(!Number.isFinite(v)||v<0)return reply({error:'Invalid price.'},400);add('price',v)}
  if(Object.prototype.hasOwnProperty.call(b,'currency'))add('base_currency',normalizeCurrency(b.currency));
  if(Object.prototype.hasOwnProperty.call(b,'pricingType'))add('pricing_type',String(b.pricingType||'FIXED').slice(0,30));
  if(Object.prototype.hasOwnProperty.call(b,'iconKey'))add('icon_key',String(b.iconKey||'').slice(0,100)||null);
  if(Object.prototype.hasOwnProperty.call(b,'enabled'))add('enabled',b.enabled?1:0);
  if(Object.prototype.hasOwnProperty.call(b,'sortOrder'))add('sort_order',Math.round(Number(b.sortOrder)||0));
  if(updates.length){vals.push(id);await env.DB!.prepare('UPDATE service_options SET '+updates.join(',')+',updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(...vals).run()}
  if(b.translations&&typeof b.translations==='object'){for(const loc of ['uk','pl','en','de','fr']){const x=b.translations[loc];if(x?.title)await env.DB!.prepare('INSERT OR REPLACE INTO service_option_translations(option_id,locale,title,description) VALUES(?,?,?,?)').bind(id,loc,String(x.title).slice(0,160),String(x.description||'').slice(0,3000)).run()}}
  if(Array.isArray(b.serviceIds)){await env.DB!.prepare('DELETE FROM service_option_links WHERE option_id=?').bind(id).run();let order=0;for(const sid of b.serviceIds)await env.DB!.prepare('INSERT OR IGNORE INTO service_option_links(service_id,option_id,sort_order) VALUES(?,?,?)').bind(Number(sid),id,order++).run()}
  const now=await env.DB!.prepare('SELECT * FROM service_options WHERE id=?').bind(id).first<any>();await log(env,staff.user_id,'desktop.service_option.update','service_option',String(id),old,now);return reply({ok:true,option:now});
 }
 if(url.pathname==='/api/desktop/staff'&&request.method==='GET'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Not allowed.'},403);const r=await env.DB!.prepare("SELECT id,telegram_user_id,username,first_name,role,status,last_seen_at FROM users WHERE role IN ('OWNER','ADMIN','MANAGER') ORDER BY role,id").all<any>();return reply({staff:r.results||[]});}
 if(url.pathname==='/api/desktop/audit'&&request.method==='GET'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Not allowed.'},403);const r=await env.DB!.prepare("SELECT a.*,u.first_name,u.username,u.role FROM audit_log a LEFT JOIN users u ON u.id=a.actor_user_id ORDER BY a.id DESC LIMIT 300").all<any>();return reply({events:r.results||[]});}
 if(url.pathname.startsWith('/api/desktop/reports/')&&request.method==='GET'){
  if(!perms.reports_access)return reply({error:'Reports access is disabled.'},403);
  const type=String(url.pathname.split('/').pop()||'business') as ReportType;
  const allowed=['users','vip','orders','payments','revenue','referrals','retention','blacklist','whitelist','staff','reviews','suggestions','business'];
  if(!allowed.includes(type))return reply({error:'Unsupported report type.'},400);
  const days=Math.max(0,Math.min(3650,Number(url.searchParams.get('days')||30)));
  const localeRaw=String(url.searchParams.get('locale')||'uk').toLowerCase(),locale=(localeRaw==='pl'?'pl':localeRaw==='en'?'en':'uk') as 'uk'|'pl'|'en';
  const {filename,buffer}=await buildReport(env,type,days,locale);
  await log(env,staff.user_id,'desktop.report.export','report',type,null,{days,filename,locale});
  return new Response(buffer,{headers:{'content-type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','content-disposition':'attachment; filename="'+filename+'"','cache-control':'no-store'}});
 }
 if(url.pathname==='/api/desktop/campaigns'&&request.method==='GET'){if(!perms.broadcast_access)return reply({error:'Broadcast access is disabled.'},403);const r=await env.DB!.prepare('SELECT * FROM desktop_campaigns ORDER BY id DESC LIMIT 100').all<any>();return reply({campaigns:r.results||[]});}
 if(url.pathname==='/api/desktop/campaigns'&&request.method==='POST'){if(!perms.broadcast_access)return reply({error:'Broadcast access is disabled.'},403);await writable(env);const b=await body(request),text=String(b.text||'').trim();if(!text)return reply({error:'Message text is required.'},400);const scheduleAt=b.sendNow?new Date().toISOString():String(b.scheduleAt||'');if(!b.sendNow&&!scheduleAt)return reply({error:'Schedule date/time is required.'},400);const queued=await enqueueDesktopCampaign(env,staff.user_id,text,{type:b.type||'STANDARD',audience:b.audience||{type:'all'},scheduleAt,timezone:b.timezone||'Europe/Warsaw',repeatType:b.repeatType||'ONCE',repeatInterval:Number(b.repeatInterval||1),repeatCount:b.repeatCount?Number(b.repeatCount):null,repeatUntil:b.repeatUntil||null});await log(env,staff.user_id,'desktop.campaign.create','desktop_campaign',String(queued.id),null,{status:'SCHEDULED',recipients:queued.recipients});if(b.sendNow)await runDesktopScheduledJobs(env);const row=await env.DB!.prepare('SELECT * FROM desktop_campaigns WHERE id=?').bind(queued.id).first<any>();return reply({ok:true,id:queued.id,recipients:queued.recipients,campaign:row});}
 const campaignMatch=url.pathname.match(/^\/api\/desktop\/campaigns\/(\d+)$/);
 if(campaignMatch&&request.method==='PATCH'){if(!perms.broadcast_access)return reply({error:'Broadcast access is disabled.'},403);await writable(env);const id=Number(campaignMatch[1]),b=await body(request),old=await env.DB!.prepare('SELECT * FROM desktop_campaigns WHERE id=?').bind(id).first<any>();if(!old)return reply({error:'Campaign not found.'},404);let status=String(old.status),next=old.next_run_at;if(b.action==='pause')status='PAUSED';if(b.action==='resume'){status='SCHEDULED';next=old.next_run_at||new Date().toISOString()}if(b.action==='cancel'){status='CANCELLED';next=null}if(b.action==='send_now'){status='SCHEDULED';next=new Date().toISOString()}await env.DB!.prepare('UPDATE desktop_campaigns SET status=?,next_run_at=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(status,next,staff.user_id,id).run();await log(env,staff.user_id,'desktop.campaign.update','desktop_campaign',String(id),old,{status,next});return reply({ok:true});}
 if(url.pathname==='/api/desktop/personal-workspace'&&request.method==='GET'){
  const r=await env.DB!.prepare('SELECT config_json FROM desktop_personal_workspace WHERE user_id=?').bind(staff.user_id).first<any>();
  return reply({config:parse(r?.config_json,{})});
 }
 if(url.pathname==='/api/desktop/personal-workspace'&&request.method==='PUT'){
  await writable(env);const b=await body(request);
  const locale=['uk','pl','en','de','fr'].includes(String(b.locale))?String(b.locale):'en';
  const config={compact:!!b.compact,sidebarCollapsed:!!b.sidebarCollapsed,density:['compact','comfortable'].includes(String(b.density))?String(b.density):'comfortable',theme:String(b.theme)==='light'?'light':'dark',locale,favoritePages:Array.isArray(b.favoritePages)?b.favoritePages.map(String).slice(0,12):[]};
  await env.DB!.prepare("INSERT INTO desktop_personal_workspace(user_id,config_json) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET config_json=excluded.config_json,updated_at=CURRENT_TIMESTAMP").bind(staff.user_id,JSON.stringify(config)).run();
  return reply({ok:true,config});
 }
 if(url.pathname==='/api/desktop/personal-workspace'&&request.method==='DELETE'){
  await writable(env);await env.DB!.prepare('DELETE FROM desktop_personal_workspace WHERE user_id=?').bind(staff.user_id).run();return reply({ok:true});
 }
 if(url.pathname==='/api/desktop/admin-hub'&&request.method==='GET'){
  if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);
  const safeSettingKeys=['available_locales','default_locale','business_status_override','business_timezone','client_status_notifications_enabled','contact_phone','emergency_enabled','emergency_multiplier','home.socials_enabled','home.specialists_enabled','maintenance.enabled','maintenance.message','maintenance.eta','manager_offer_requires_approval','order_notifications.chat_enabled','order_notifications.chat_locale','reactivation.days','reactivation.enabled','reactivation.message','reactivation.time','referral_enabled','referral_friend_service_id','referral_referrer_bonus_currency','referral_referrer_bonus_type','referral_referrer_bonus_value','referral_success_status','reporting_currency','request_cooldown_enabled','seasonal.easter.end','seasonal.easter.start','seasonal.halloween.end','seasonal.halloween.start','seasonal.manual_theme','seasonal.mode','seasonal.new_year.end','seasonal.new_year.start','theme.neon_color','theme.neon_mode','web_direct_access_enabled'];
  const marks=safeSettingKeys.map(()=>'?').join(',');
  const [settings,vehicles,conditions,schedule,content,socials,specialists,flags,managerPerms,vips,white,black,calculations,referrals,promos,discounts,offers,notifications]=await Promise.all([
   env.DB!.prepare('SELECT key,value,updated_at FROM settings WHERE key IN ('+marks+') ORDER BY key').bind(...safeSettingKeys).all<any>(),
   env.DB!.prepare('SELECT * FROM vehicle_types ORDER BY sort_order,id').all<any>(),
   env.DB!.prepare('SELECT * FROM condition_levels ORDER BY sort_order,id').all<any>(),
   env.DB!.prepare('SELECT * FROM business_weekly_schedule ORDER BY day_of_week').all<any>(),
   env.DB!.prepare("SELECT key,locale,value,updated_at FROM content_blocks WHERE key IN ('home.hero.title','home.hero.subtitle','bot.welcome','bot.returning','calculator.result.note','vip.description','referral.title','referral.subtitle','referral.share_text','referral.description','contact.description','bot.client_menu_text','bot.client_settings_text','bot.help_text') ORDER BY key,locale").all<any>(),
   env.DB!.prepare('SELECT * FROM social_links ORDER BY sort_order,id').all<any>(),
   env.DB!.prepare('SELECT * FROM specialists ORDER BY sort_order,id').all<any>(),
   env.DB!.prepare('SELECT * FROM feature_flags ORDER BY key').all<any>(),
   env.DB!.prepare('SELECT * FROM manager_permissions ORDER BY permission_key').all<any>(),
   env.DB!.prepare("SELECT u.id,u.first_name,u.username,u.telegram_user_id,cp.client_tier,cp.vip_since FROM users u JOIN client_profiles cp ON cp.user_id=u.id WHERE cp.client_tier<>'STANDARD' ORDER BY cp.vip_since DESC LIMIT 100").all<any>(),
   env.DB!.prepare("SELECT u.id,u.first_name,u.username,u.telegram_user_id,w.created_at FROM whitelist w JOIN users u ON u.id=w.user_id ORDER BY w.created_at DESC LIMIT 100").all<any>(),
   env.DB!.prepare("SELECT b.id,u.id user_id,u.first_name,u.username,u.telegram_user_id,b.public_reason,b.internal_note,b.blocked_at,b.expires_at FROM blacklist b JOIN users u ON u.id=b.user_id WHERE b.is_active=1 ORDER BY b.blocked_at DESC LIMIT 100").all<any>(),
   env.DB!.prepare("SELECT cs.id,cs.calculated_price,cs.currency,cs.created_at,u.first_name,u.username,s.slug service_slug FROM calculator_sessions cs LEFT JOIN users u ON u.id=cs.user_id LEFT JOIN services s ON s.id=cs.service_id ORDER BY cs.id DESC LIMIT 100").all<any>(),
   env.DB!.prepare("SELECT r.*,ru.first_name referrer_name,ru.username referrer_username,uu.first_name referred_name,uu.username referred_username FROM referrals r LEFT JOIN users ru ON ru.id=r.referrer_user_id LEFT JOIN users uu ON uu.id=r.referred_user_id ORDER BY r.id DESC LIMIT 100").all<any>(),
   env.DB!.prepare("SELECT sp.*,COALESCE(t.title,s.slug) service_title FROM service_promotions sp JOIN services s ON s.id=sp.service_id LEFT JOIN service_translations t ON t.service_id=s.id AND t.locale='uk' ORDER BY sp.id DESC LIMIT 100").all<any>(),
   env.DB!.prepare("SELECT pd.*,u.first_name,u.username FROM personal_discounts pd JOIN users u ON u.id=pd.user_id ORDER BY pd.id DESC LIMIT 100").all<any>(),
   env.DB!.prepare("SELECT po.*,u.first_name,u.username FROM personal_offers po JOIN users u ON u.id=po.user_id ORDER BY po.id DESC LIMIT 100").all<any>(),
   env.DB!.prepare("SELECT n.user_id,n.enabled,n.updated_at,u.first_name,u.username,u.role FROM staff_order_notifications n JOIN users u ON u.id=n.user_id ORDER BY u.role,u.id").all<any>()
  ]);
  return reply({settings:settings.results||[],vehicles:vehicles.results||[],conditions:conditions.results||[],schedule:schedule.results||[],content:content.results||[],socials:socials.results||[],specialists:specialists.results||[],featureFlags:flags.results||[],managerPermissions:managerPerms.results||[],vip:vips.results||[],whitelist:white.results||[],blacklist:black.results||[],calculations:calculations.results||[],referrals:referrals.results||[],promotions:promos.results||[],personalDiscounts:discounts.results||[],offers:offers.results||[],notifications:notifications.results||[]});
 }
 if(url.pathname==='/api/desktop/admin-hub/settings'&&request.method==='PATCH'){
  if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);const b=await body(request),allowed=new Set(['available_locales','default_locale','business_status_override','business_timezone','client_status_notifications_enabled','contact_phone','emergency_enabled','emergency_multiplier','home.socials_enabled','home.specialists_enabled','maintenance.enabled','maintenance.message','maintenance.eta','manager_offer_requires_approval','order_notifications.chat_enabled','order_notifications.chat_locale','reactivation.days','reactivation.enabled','reactivation.message','reactivation.time','referral_enabled','referral_friend_service_id','referral_referrer_bonus_currency','referral_referrer_bonus_type','referral_referrer_bonus_value','referral_success_status','reporting_currency','request_cooldown_enabled','seasonal.easter.end','seasonal.easter.start','seasonal.halloween.end','seasonal.halloween.start','seasonal.manual_theme','seasonal.mode','seasonal.new_year.end','seasonal.new_year.start','theme.neon_color','theme.neon_mode','web_direct_access_enabled']);
  const key=String(b.key||'');if(!allowed.has(key))return reply({error:'Setting is not editable here.'},400);const old=await getSetting(env,key,'');await setSetting(env,key,String(b.value??''));await log(env,staff.user_id,'desktop.setting.update','settings',key,{value:old},{value:b.value});return reply({ok:true});
 }
 const multMatch=url.pathname.match(/^\/api\/desktop\/admin-hub\/(vehicles|conditions)\/(\d+)$/);
 if(multMatch&&request.method==='PATCH'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);const table=multMatch[1]==='vehicles'?'vehicle_types':'condition_levels',id=Number(multMatch[2]),b=await body(request),old=await env.DB!.prepare('SELECT * FROM '+table+' WHERE id=?').bind(id).first<any>();if(!old)return reply({error:'Item not found.'},404);const multiplier=Math.max(.01,Math.min(20,Number(b.multiplier??old.multiplier)||1)),enabled=Object.prototype.hasOwnProperty.call(b,'enabled')?(b.enabled?1:0):Number(old.enabled||0),sortOrder=Object.prototype.hasOwnProperty.call(b,'sortOrder')?Math.round(Number(b.sortOrder)||0):Number(old.sort_order||0);await env.DB!.prepare('UPDATE '+table+' SET multiplier=?,enabled=?,sort_order=? WHERE id=?').bind(multiplier,enabled,sortOrder,id).run();await log(env,staff.user_id,'desktop.multiplier.update',table,String(id),old,{multiplier,enabled,sortOrder});return reply({ok:true});}
 const schedMatch=url.pathname.match(/^\/api\/desktop\/admin-hub\/schedule\/(\d)$/);
 if(schedMatch&&request.method==='PATCH'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);const day=Number(schedMatch[1]),b=await body(request),old=await env.DB!.prepare('SELECT * FROM business_weekly_schedule WHERE day_of_week=?').bind(day).first<any>();await env.DB!.prepare("INSERT INTO business_weekly_schedule(day_of_week,enabled,open_time,close_time) VALUES(?,?,?,?) ON CONFLICT(day_of_week) DO UPDATE SET enabled=excluded.enabled,open_time=excluded.open_time,close_time=excluded.close_time,updated_at=CURRENT_TIMESTAMP").bind(day,b.enabled?1:0,String(b.openTime||old?.open_time||'09:00'),String(b.closeTime||old?.close_time||'18:00')).run();await log(env,staff.user_id,'desktop.schedule.update','business_weekly_schedule',String(day),old,b);return reply({ok:true});}
 if(url.pathname==='/api/desktop/admin-hub/content'&&request.method==='PUT'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);const b=await body(request),key=String(b.key||'').slice(0,120),locale=String(b.locale||'en');if(!key||!['uk','pl','en','de','fr'].includes(locale))return reply({error:'Invalid content key/locale.'},400);const old=await env.DB!.prepare('SELECT value FROM content_blocks WHERE key=? AND locale=?').bind(key,locale).first<any>();await env.DB!.prepare("INSERT INTO content_blocks(key,locale,value) VALUES(?,?,?) ON CONFLICT(key,locale) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(key,locale,String(b.value||'').slice(0,8000)).run();await log(env,staff.user_id,'desktop.content.update','content_block',key+':'+locale,old,{value:b.value});return reply({ok:true});}
 if(url.pathname==='/api/desktop/admin-hub/user-access'&&request.method==='POST'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);const b=await body(request),userId=Number(b.userId||0),action=String(b.action||'');const user=await env.DB!.prepare('SELECT id FROM users WHERE id=?').bind(userId).first<any>();if(!user)return reply({error:'User not found.'},404);
  if(action==='vip'){await env.DB!.prepare("INSERT OR IGNORE INTO client_profiles(user_id) VALUES(?)").bind(userId).run();await env.DB!.prepare("UPDATE client_profiles SET client_tier=?,vip_since=COALESCE(vip_since,CURRENT_TIMESTAMP) WHERE user_id=?").bind(String(b.tier||'VIP'),userId).run();await env.DB!.prepare('INSERT INTO vip_history(user_id,tier,assigned_by) VALUES(?,?,?)').bind(userId,String(b.tier||'VIP'),staff.user_id).run()}
  else if(action==='unvip'){await env.DB!.prepare("UPDATE client_profiles SET client_tier='STANDARD',vip_since=NULL WHERE user_id=?").bind(userId).run();await env.DB!.prepare("UPDATE vip_history SET removed_by=?,removed_at=CURRENT_TIMESTAMP,removal_reason=? WHERE user_id=? AND removed_at IS NULL").bind(staff.user_id,String(b.reason||'Desktop'),userId).run()}
  else if(action==='whitelist')await env.DB!.prepare('INSERT OR REPLACE INTO whitelist(user_id,created_by,created_at) VALUES(?,?,CURRENT_TIMESTAMP)').bind(userId,staff.user_id).run();
  else if(action==='unwhitelist')await env.DB!.prepare('DELETE FROM whitelist WHERE user_id=?').bind(userId).run();
  else if(action==='blacklist')await env.DB!.prepare('INSERT INTO blacklist(user_id,public_reason,internal_note,blocked_by,is_active) VALUES(?,?,?,?,1)').bind(userId,String(b.reason||'Access restricted').slice(0,300),String(b.note||'').slice(0,500),staff.user_id).run();
  else if(action==='unblacklist')await env.DB!.prepare('UPDATE blacklist SET is_active=0,unblocked_by=?,unblocked_at=CURRENT_TIMESTAMP WHERE user_id=? AND is_active=1').bind(staff.user_id,userId).run();
  else return reply({error:'Unsupported user-access action.'},400);await log(env,staff.user_id,'desktop.user_access.'+action,'user',String(userId),null,b);return reply({ok:true});
 }
 if(url.pathname==='/api/desktop/admin-hub/manager-permissions'&&request.method==='PUT'){if(staff.role!=='OWNER')return reply({error:'Owner required.'},403);await writable(env);const b=await body(request),key=String(b.key||'').slice(0,80);if(!key)return reply({error:'Permission key required.'},400);await env.DB!.prepare("INSERT INTO manager_permissions(permission_key,enabled,updated_by) VALUES(?,?,?) ON CONFLICT(permission_key) DO UPDATE SET enabled=excluded.enabled,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP").bind(key,b.enabled?1:0,staff.user_id).run();await log(env,staff.user_id,'desktop.manager_permission.update','manager_permission',key,null,{enabled:!!b.enabled});return reply({ok:true});}
 if(url.pathname==='/api/desktop/admin-hub/staff-notifications'&&request.method==='PUT'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);const b=await body(request),userId=Number(b.userId||0);await env.DB!.prepare("INSERT INTO staff_order_notifications(user_id,enabled) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled,updated_at=CURRENT_TIMESTAMP").bind(userId,b.enabled?1:0).run();return reply({ok:true});}
 if(url.pathname==='/api/desktop/admin-hub/socials'&&request.method==='POST'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);const b=await body(request),type=String(b.type||'').trim(),urlValue=String(b.url||'').trim();if(!type||!urlValue)return reply({error:'Type and URL are required.'},400);await env.DB!.prepare("INSERT INTO social_links(type,url,enabled,sort_order) VALUES(?,?,?,?) ON CONFLICT(type) DO UPDATE SET url=excluded.url,enabled=excluded.enabled,sort_order=excluded.sort_order,updated_at=CURRENT_TIMESTAMP").bind(type.slice(0,40),urlValue.slice(0,2000),b.enabled===false?0:1,Number(b.sortOrder||0)).run();return reply({ok:true});}
 const socialMatch=url.pathname.match(/^\/api\/desktop\/admin-hub\/socials\/(\d+)$/);if(socialMatch&&request.method==='DELETE'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);await env.DB!.prepare('DELETE FROM social_links WHERE id=?').bind(Number(socialMatch[1])).run();return reply({ok:true});}
 if(url.pathname==='/api/desktop/admin-hub/specialists'&&request.method==='POST'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);const b=await body(request),id=Number(b.id||0);if(id)await env.DB!.prepare('UPDATE specialists SET name=?,role_title=?,portfolio_url=?,contact_url=?,contact_label=?,photo_url=?,enabled=?,sort_order=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(String(b.name||''),String(b.roleTitle||''),String(b.portfolioUrl||''),String(b.contactUrl||''),String(b.contactLabel||''),String(b.photoUrl||''),b.enabled===false?0:1,Number(b.sortOrder||0),id).run();else await env.DB!.prepare('INSERT INTO specialists(name,role_title,portfolio_url,contact_url,contact_label,photo_url,enabled,sort_order) VALUES(?,?,?,?,?,?,?,?)').bind(String(b.name||'Specialist'),String(b.roleTitle||''),String(b.portfolioUrl||''),String(b.contactUrl||''),String(b.contactLabel||''),String(b.photoUrl||''),b.enabled===false?0:1,Number(b.sortOrder||0)).run();return reply({ok:true});}
 const specMatch=url.pathname.match(/^\/api\/desktop\/admin-hub\/specialists\/(\d+)$/);if(specMatch&&request.method==='DELETE'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);await env.DB!.prepare('DELETE FROM specialists WHERE id=?').bind(Number(specMatch[1])).run();return reply({ok:true});}
 if(url.pathname==='/api/desktop/admin-hub/promotions'&&request.method==='POST'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);const b=await body(request);const r=await env.DB!.prepare('INSERT INTO service_promotions(service_id,percent_discount,starts_at,ends_at,label,enabled,created_by) VALUES(?,?,?,?,?,1,?)').bind(Number(b.serviceId||0),Math.max(0,Math.min(100,Number(b.percentDiscount||0))),String(b.startsAt||new Date().toISOString()),String(b.endsAt||new Date(Date.now()+7*86400000).toISOString()),String(b.label||'').slice(0,160),staff.user_id).run();return reply({ok:true,id:r.meta.last_row_id});}
 const promoMatch=url.pathname.match(/^\/api\/desktop\/admin-hub\/promotions\/(\d+)$/);if(promoMatch&&request.method==='DELETE'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Owner/Admin required.'},403);await writable(env);await env.DB!.prepare('UPDATE service_promotions SET enabled=0 WHERE id=?').bind(Number(promoMatch[1])).run();return reply({ok:true});}
 if(url.pathname==='/api/desktop/workspace'&&request.method==='GET'){const [draft,active,versions]=await Promise.all([env.DB!.prepare('SELECT * FROM desktop_workspace_draft WHERE id=1').first<any>(),env.DB!.prepare('SELECT * FROM desktop_workspace_versions WHERE is_active=1 ORDER BY version_number DESC LIMIT 1').first<any>(),env.DB!.prepare('SELECT id,version_number,comment,created_by,created_at,is_active FROM desktop_workspace_versions ORDER BY version_number DESC LIMIT 30').all<any>()]);return reply({draft:{config:parse(draft?.config_json,defaultWorkspace),locked:Number(draft?.locked||0)===1},active:{version:Number(active?.version_number||1),config:parse(active?.config_json,defaultWorkspace)},versions:versions.results||[]});}
 if(url.pathname==='/api/desktop/workspace/draft'&&request.method==='PUT'){if(!perms.workspace_editor)return reply({error:'Workspace Editor access is disabled.'},403);await writable(env);const b=await body(request),d=await env.DB!.prepare('SELECT locked FROM desktop_workspace_draft WHERE id=1').first<any>();if(Number(d?.locked||0)===1&&!b.unlock)return reply({error:'Workspace is locked.'},409);const cfg=cleanWorkspace(b.config);await env.DB!.prepare('UPDATE desktop_workspace_draft SET config_json=?,locked=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=1').bind(JSON.stringify(cfg),b.locked?1:0,staff.user_id).run();return reply({ok:true,config:cfg});}
 if(url.pathname==='/api/desktop/workspace/lock'&&request.method==='POST'){if(!perms.workspace_editor)return reply({error:'Workspace Editor access is disabled.'},403);await writable(env);const b=await body(request);await env.DB!.prepare('UPDATE desktop_workspace_draft SET locked=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=1').bind(b.locked===false?0:1,staff.user_id).run();return reply({ok:true});}
 if(url.pathname==='/api/desktop/workspace/publish'&&request.method==='POST'){if(!perms.workspace_editor)return reply({error:'Workspace Editor access is disabled.'},403);await writable(env);const b=await body(request),d=await env.DB!.prepare('SELECT config_json FROM desktop_workspace_draft WHERE id=1').first<any>(),cfg=cleanWorkspace(parse(d?.config_json,defaultWorkspace)),mx=await env.DB!.prepare('SELECT COALESCE(MAX(version_number),0)+1 n FROM desktop_workspace_versions').first<any>(),v=Number(mx?.n||1);await env.DB!.prepare('UPDATE desktop_workspace_versions SET is_active=0').run();await env.DB!.prepare('INSERT INTO desktop_workspace_versions(version_number,config_json,comment,created_by,is_active) VALUES(?,?,?,?,1)').bind(v,JSON.stringify(cfg),String(b.comment||'Published from Layout Editor').slice(0,300),staff.user_id).run();await env.DB!.prepare('UPDATE desktop_workspace_draft SET locked=1,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=1').bind(staff.user_id).run();await log(env,staff.user_id,'desktop.workspace.publish','workspace',String(v),null,{version:v});return reply({ok:true,version:v});}
 if(url.pathname==='/api/desktop/workspace/revert'&&request.method==='POST'){if(!perms.workspace_editor)return reply({error:'Workspace Editor access is disabled.'},403);await writable(env);const b=await body(request),v=await env.DB!.prepare('SELECT * FROM desktop_workspace_versions WHERE version_number=?').bind(Number(b.version)).first<any>();if(!v)return reply({error:'Version not found.'},404);await env.DB!.prepare('UPDATE desktop_workspace_versions SET is_active=CASE WHEN version_number=? THEN 1 ELSE 0 END').bind(Number(b.version)).run();await env.DB!.prepare('UPDATE desktop_workspace_draft SET config_json=?,locked=1,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=1').bind(v.config_json,staff.user_id).run();await log(env,staff.user_id,'desktop.workspace.revert','workspace',String(b.version));return reply({ok:true});}
 if(url.pathname==='/api/desktop/workspace/export'&&request.method==='GET'){if(staff.role!=='OWNER')return reply({error:'Owner access required.'},403);const v=await env.DB!.prepare('SELECT version_number,config_json FROM desktop_workspace_versions WHERE is_active=1 ORDER BY version_number DESC LIMIT 1').first<any>();return new Response(JSON.stringify({template:'ChameleonDesktopWorkspace',templateVersion:1,exportedAt:new Date().toISOString(),workspaceVersion:Number(v?.version_number||1),config:cleanWorkspace(parse(v?.config_json,defaultWorkspace))},null,2),{headers:{'content-type':'application/json','content-disposition':'attachment; filename="chameleon-desktop-template.json"'}})}
 if(url.pathname==='/api/desktop/workspace/import'&&request.method==='POST'){if(staff.role!=='OWNER')return reply({error:'Owner access required.'},403);await writable(env);const b=await body(request),cfg=cleanWorkspace(b.config||b);await env.DB!.prepare('UPDATE desktop_workspace_draft SET config_json=?,locked=1,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=1').bind(JSON.stringify(cfg),staff.user_id).run();await log(env,staff.user_id,'desktop.workspace.import','workspace','1');return reply({ok:true,preview:cfg});}
 if(url.pathname==='/api/desktop/system/mode'&&request.method==='PATCH'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Not allowed.'},403);const b=await body(request),next=String(b.mode||'').toUpperCase();if(!['ONLINE','READ_ONLY','MAINTENANCE','DISABLED'].includes(next))return reply({error:'Invalid desktop mode.'},400);const old=await mode(env);await setSetting(env,'desktop.mode',next);await log(env,staff.user_id,'desktop.mode.update','settings','desktop.mode',{mode:old},{mode:next});return reply({ok:true,mode:next});}
 if(url.pathname==='/api/desktop/permissions'&&request.method==='GET'){if(staff.role!=='OWNER')return reply({error:'Owner access required.'},403);const r=await env.DB!.prepare('SELECT * FROM staff_role_permissions ORDER BY role,permission_key').all<any>();return reply({permissions:r.results||[]});}
 if(url.pathname==='/api/desktop/permissions'&&request.method==='PUT'){if(staff.role!=='OWNER')return reply({error:'Owner access required.'},403);await writable(env);const b=await body(request),role=String(b.role||'').toUpperCase(),key=String(b.key||'') as DesktopPermission;if(!['ADMIN','MANAGER'].includes(role)||!['desktop_access','sales_access','broadcast_access','reports_access','financial_access','clients_access','workspace_editor'].includes(key))return reply({error:'Invalid permission.'},400);if(role==='MANAGER'&&key==='workspace_editor')return reply({error:'Manager cannot access Workspace Editor.'},400);await env.DB!.prepare('INSERT INTO staff_role_permissions(role,permission_key,enabled,updated_by) VALUES(?,?,?,?) ON CONFLICT(role,permission_key) DO UPDATE SET enabled=excluded.enabled,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP').bind(role,key,b.enabled?1:0,staff.user_id).run();if(role==='MANAGER'){const lk=legacyKey(key);if(lk)await env.DB!.prepare('INSERT INTO manager_permissions(permission_key,enabled,updated_by) VALUES(?,?,?) ON CONFLICT(permission_key) DO UPDATE SET enabled=excluded.enabled,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP').bind(lk,b.enabled?1:0,staff.user_id).run()}if(!b.enabled&&key==='desktop_access')await env.DB!.prepare("UPDATE desktop_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id IN (SELECT id FROM users WHERE role=?) AND revoked_at IS NULL").bind(role).run();await log(env,staff.user_id,'desktop.permission.update','permission',role+':'+key,null,{enabled:!!b.enabled});return reply({ok:true});}
 if(url.pathname==='/api/desktop/sessions'&&request.method==='GET'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Not allowed.'},403);const r=await env.DB!.prepare("SELECT ds.id,ds.user_id,ds.device_label,ds.user_agent,ds.created_at,ds.last_seen_at,ds.expires_at,u.first_name,u.username,u.role FROM desktop_sessions ds JOIN users u ON u.id=ds.user_id WHERE ds.revoked_at IS NULL AND ds.expires_at>CURRENT_TIMESTAMP ORDER BY ds.last_seen_at DESC").all<any>();return reply({sessions:r.results||[]});}
 const sm=url.pathname.match(/^\/api\/desktop\/sessions\/(\d+)$/);if(sm&&request.method==='DELETE'){if(!['OWNER','ADMIN'].includes(staff.role))return reply({error:'Not allowed.'},403);await env.DB!.prepare('UPDATE desktop_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE id=?').bind(Number(sm[1])).run();await log(env,staff.user_id,'desktop.session.revoke','desktop_session',sm[1]);return reply({ok:true});}
 if(url.pathname==='/api/desktop/logout'&&request.method==='POST'){await env.DB!.prepare('UPDATE desktop_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE id=?').bind(staff.session_id).run();return reply({ok:true});}
 return reply({error:'Desktop endpoint not found.'},404);
}
