import type {Env,TelegramUser} from './types';
import {ensureDb,event,getSetting,setSetting,upsertUser} from './db';
import {can,type Permission} from './permissions';
import {editMessage,sendMessage,tgApi} from './telegram';

type TgFrom={id:number;first_name?:string;last_name?:string;username?:string;language_code?:string};
type TgMessage={message_id:number;chat:{id:number;type:string};from?:TgFrom;text?:string;contact?:{phone_number:string;user_id?:number;first_name?:string;last_name?:string}};
type TgCallback={id:string;from:TgFrom;message?:TgMessage;data?:string};
type TgUpdate={update_id:number;message?:TgMessage;callback_query?:TgCallback};
type BotLocale='uk'|'pl'|'en';
type Role='OWNER'|'ADMIN'|'MANAGER'|'CLIENT';
type BotState={state:string;payload_json?:string|null};

const LOCKED_OWNER_ID='375938798';
const asUser=(u:TgFrom):TelegramUser=>({id:u.id,first_name:u.first_name||'Telegram user',last_name:u.last_name,username:u.username,language_code:u.language_code});
const esc=(s:unknown)=>String(s??'').replace(/[&<>]/g,c=>c==='&'?'&amp;':c==='<'?'&lt;':'&gt;');
const localeOf=(u?:TgFrom):BotLocale=>{const v=(u?.language_code||'').toLowerCase();return v.startsWith('uk')||v.startsWith('ua')?'uk':v.startsWith('pl')?'pl':'en'};
const isOwner=(env:Env,id:number|string|undefined)=>String(id??'')===String(env.OWNER_TELEGRAM_ID||LOCKED_OWNER_ID);
const num=(v:unknown)=>Number(v||0);
const yes=(v:unknown)=>String(v)==='1'||v===true;
const fmtDate=(v:unknown)=>v?esc(String(v).slice(0,16).replace('T',' ')):'—';
const parsePayload=(s?:string|null)=>{try{return s?JSON.parse(s):{}}catch{return {}}};

const copy={
 uk:{open:'🦎 Відкрити Chameleon Detailing',calculator:'🧮 Калькулятор',orders:'📋 Мої заявки',help:'💬 Допомога',hello:'Привіт',body:'Преміальний догляд за авто, розрахунок вартості та заявки — прямо в Telegram.',tap:'Натисніть кнопку нижче, щоб відкрити Mini App.',owner:'👑 Ви увійшли як Owner. Панель керування доступна нижче.',choose:'Оберіть дію нижче 👇',saved:'✅ Номер телефону збережено. Дякуємо.',own:'Будь ласка, поділіться власним контактом Telegram.',helpText:'<b>Chameleon Detailing — Допомога</b>\n\n/start — головне меню\n/panel — панель керування (staff)\n/help — допомога',menu:'Відкрити застосунок',panel:'👑 Панель Owner'},
 pl:{open:'🦎 Otwórz Chameleon Detailing',calculator:'🧮 Kalkulator',orders:'📋 Moje zlecenia',help:'💬 Pomoc',hello:'Cześć',body:'Pielęgnacja auta premium, wyceny i zlecenia — bezpośrednio w Telegramie.',tap:'Naciśnij przycisk poniżej, aby otworzyć Mini App.',owner:'👑 Jesteś zalogowany jako Owner. Panel zarządzania jest dostępny poniżej.',choose:'Wybierz działanie poniżej 👇',saved:'✅ Numer telefonu został zapisany. Dziękujemy.',own:'Udostępnij proszę swój własny kontakt Telegram.',helpText:'<b>Chameleon Detailing — Pomoc</b>\n\n/start — menu główne\n/panel — panel zarządzania (staff)\n/help — pomoc',menu:'Otwórz aplikację',panel:'👑 Panel Owner'},
 en:{open:'🦎 Open Chameleon Detailing',calculator:'🧮 Calculator',orders:'📋 My requests',help:'💬 Help',hello:'Hi',body:'Premium car care, estimates and requests — directly in Telegram.',tap:'Tap the button below to open the Mini App.',owner:'👑 You are signed in as Owner. The management panel is available below.',choose:'Choose an action below 👇',saved:'✅ Phone number saved. Thank you.',own:'Please share your own Telegram contact.',helpText:'<b>Chameleon Detailing — Help</b>\n\n/start — main menu\n/panel — staff management panel\n/help — help',menu:'Open app',panel:'👑 Owner Panel'}
} as const;

export const telegramWebhookSecret=(env:Env)=>{const v=String(env.TELEGRAM_WEBHOOK_SECRET||'').trim();return /^[A-Za-z0-9_-]{1,256}$/.test(v)?v:''};
function appUrl(env:Env,origin?:string){const live=(origin||'').trim();if(/^https:\/\//i.test(live))return live.replace(/\/$/,'');return String(env.APP_URL||'').replace(/\/$/,'')}
function mainKeyboard(env:Env,origin:string,locale:BotLocale,role:Role='CLIENT'){const c=copy[locale],url=appUrl(env,origin);const rows:any[]=[[{text:c.open,web_app:{url}}],[{text:c.calculator,web_app:{url:url+'/?startapp=calculator'}},{text:c.orders,web_app:{url:url+'/?startapp=orders'}}]];if(role!=='CLIENT')rows.push([{text:role==='OWNER'?c.panel:'🛠 Management panel',callback_data:'staff:panel'}]);rows.push([{text:c.help,callback_data:'help'}]);return {inline_keyboard:rows}}

const roleLabel=(role:Role)=>role==='OWNER'?'👑 OWNER':role==='ADMIN'?'🛡 ADMIN':role==='MANAGER'?'🧑‍💼 MANAGER':'👤 CLIENT';
const panelKeyboard=(role:Role)=> {
 const rows:any[]=[];
 rows.push([{text:'📊 Dashboard',callback_data:'panel:dashboard'},{text:'👥 Users',callback_data:'panel:users'}]);
 rows.push([{text:'💎 VIP',callback_data:'panel:vip'},{text:'✅ Whitelist',callback_data:'panel:whitelist'}]);
 rows.push([{text:'⛔ Blacklist',callback_data:'panel:blacklist'},{text:'🧾 Calculations',callback_data:'panel:calculations'}]);
 if(role==='OWNER'||role==='ADMIN'){
  rows.push([{text:'🧑‍💼 Managers',callback_data:'panel:managers'},...(role==='OWNER'?[{text:'🛡 Admins',callback_data:'panel:admins'}]:[])]);
  rows.push([{text:'🧽 Services',callback_data:'panel:services'},{text:'💰 Pricing',callback_data:'panel:pricing'}]);
  rows.push([{text:'🧮 Calculator Rules',callback_data:'panel:calculator'},{text:'📝 Content',callback_data:'panel:content'}]);
  rows.push([{text:'🌐 Languages',callback_data:'panel:languages'},{text:'🤝 Referrals',callback_data:'panel:referrals'}]);
  rows.push([{text:'📈 Analytics',callback_data:'panel:analytics'},{text:'📜 Audit Log',callback_data:'panel:audit'}]);
  rows.push([{text:'⚙️ Settings',callback_data:'panel:settings'}]);
 }else{
  rows.push([{text:'📝 Client Notes',callback_data:'panel:notes'},{text:'📈 Basic Analytics',callback_data:'panel:analytics'}]);
 }
 rows.push([{text:'🦎 Client menu',callback_data:'panel:client'}]);
 return {inline_keyboard:rows};
};
const backPanel=(extra:any[]=[])=>({inline_keyboard:[...extra,[{text:'⬅️ Management Panel',callback_data:'panel:home'}]]});
const confirmKb=(yesCb:string,noCb='panel:home')=>({inline_keyboard:[[{text:'✅ Confirm',callback_data:yesCb},{text:'❌ Cancel',callback_data:noCb}]]});

async function registerUser(env:Env,from:TgFrom){const owner=isOwner(env,from.id);const u=await upsertUser(env,asUser(from),owner);await event(env,u.id,'bot_start');return u}
async function getRole(env:Env,from:TgFrom):Promise<{u:any;role:Role}>{const u=await registerUser(env,from);return {u,role:(isOwner(env,from.id)?'OWNER':String(u.role||'CLIENT')) as Role}}
async function safeEdit(env:Env,msg:TgMessage,text:string,reply_markup?:unknown){try{await editMessage(env,msg.chat.id,msg.message_id,text,reply_markup)}catch{await sendMessage(env,msg.chat.id,text,reply_markup)}}
async function audit(env:Env,actorId:number,action:string,entityType?:string,entityId?:string,oldData?:unknown,newData?:unknown){if(!env.DB)return;await ensureDb(env);await env.DB.prepare('INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,old_data_json,new_data_json) VALUES(?,?,?,?,?,?)').bind(actorId,action,entityType||null,entityId||null,oldData?JSON.stringify(oldData):null,newData?JSON.stringify(newData):null).run()}
async function setBotState(env:Env,userId:number,state:string|null,payload:any={}){if(!env.DB)return;await ensureDb(env);if(!state){await env.DB.prepare('DELETE FROM bot_state WHERE user_id=?').bind(userId).run();return}await env.DB.prepare(`INSERT INTO bot_state(user_id,state,payload_json) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET state=excluded.state,payload_json=excluded.payload_json,updated_at=CURRENT_TIMESTAMP`).bind(userId,state,JSON.stringify(payload)).run()}
async function getBotState(env:Env,userId:number):Promise<BotState|null>{if(!env.DB)return null;await ensureDb(env);return env.DB.prepare('SELECT state,payload_json FROM bot_state WHERE user_id=?').bind(userId).first<BotState>()}
async function requireStaff(env:Env,from:TgFrom,permission?:Permission){const {u,role}=await getRole(env,from);if(role==='CLIENT')return null;if(permission&&!can(role,permission))return null;return {u,role}}
async function userBySelector(env:Env,raw:string){if(!env.DB)return null;await ensureDb(env);const s=raw.trim();if(/^@/.test(s))return env.DB.prepare('SELECT u.*,COALESCE(p.client_tier,\'STANDARD\') client_tier,p.notes FROM users u LEFT JOIN client_profiles p ON p.user_id=u.id WHERE lower(u.username)=lower(?) LIMIT 1').bind(s.slice(1)).first<any>();if(/^\d+$/.test(s))return env.DB.prepare('SELECT u.*,COALESCE(p.client_tier,\'STANDARD\') client_tier,p.notes FROM users u LEFT JOIN client_profiles p ON p.user_id=u.id WHERE u.telegram_user_id=? OR u.id=? LIMIT 1').bind(Number(s),Number(s)).first<any>();return null}
async function userFlags(env:Env,userId:number){if(!env.DB)return {whitelist:false,blacklist:false};const [w,b]=await Promise.all([env.DB.prepare('SELECT 1 ok FROM whitelist WHERE user_id=? LIMIT 1').bind(userId).first<any>(),env.DB.prepare('SELECT 1 ok FROM blacklist WHERE user_id=? AND is_active=1 LIMIT 1').bind(userId).first<any>()]);return {whitelist:!!w,blacklist:!!b}}
async function showPanel(env:Env,msg:TgMessage,from:TgFrom){const staff=await requireStaff(env,from);if(!staff){await sendMessage(env,msg.chat.id,'⛔ Staff access required.');return}await safeEdit(env,msg,`${roleLabel(staff.role)} <b>CONTROL PANEL</b>\n\nКерування Chameleon Detailing через Telegram Bot Panel.\nУсі критичні зміни перевіряються backend permissions і пишуться в audit log.`,panelKeyboard(staff.role))}
async function showUser(env:Env,msg:TgMessage,from:TgFrom,userId:number){const staff=await requireStaff(env,from,'user.read');if(!staff||!env.DB)return;await ensureDb(env);const u=await env.DB.prepare(`SELECT u.*,COALESCE(p.client_tier,'STANDARD') client_tier,p.phone_number,p.notes FROM users u LEFT JOIN client_profiles p ON p.user_id=u.id WHERE u.id=?`).bind(userId).first<any>();if(!u){await safeEdit(env,msg,'User not found.',backPanel());return}const f=await userFlags(env,u.id);const rows:any[]=[];
 if(can(staff.role,'vip.assign')||can(staff.role,'vip.remove'))rows.push([{text:u.client_tier==='STANDARD'?'💎 Set VIP':'♻️ Remove VIP',callback_data:`user:${u.id}:vip`}]);
 if(can(staff.role,'whitelist.manage'))rows.push([{text:f.whitelist?'➖ Remove whitelist':'✅ Add whitelist',callback_data:`user:${u.id}:whitelist`}]);
 if(can(staff.role,'blacklist.manage'))rows.push([{text:f.blacklist?'🔓 Remove blacklist':'⛔ Add blacklist',callback_data:`user:${u.id}:blacklist`}]);
 if(can(staff.role,'user.update'))rows.push([{text:'📝 Edit note',callback_data:`user:${u.id}:note`}]);
 if((staff.role==='OWNER'||staff.role==='ADMIN')&&u.role==='MANAGER')rows.push([{text:'👤 Remove Manager role',callback_data:`user:${u.id}:demote`}]);
 if(staff.role==='OWNER'&&u.role==='ADMIN')rows.push([{text:'👤 Remove Admin role',callback_data:`user:${u.id}:demote`}],[{text:'🔁 Admin → Manager',callback_data:`user:${u.id}:to_manager`}]);
 if(staff.role==='OWNER'&&u.role==='MANAGER')rows.push([{text:'⬆️ Manager → Admin',callback_data:`user:${u.id}:to_admin`}]);
 rows.push([{text:'⬅️ Users',callback_data:'panel:users'}]);
 const text=`👤 <b>${esc(u.first_name||'User')} ${esc(u.last_name||'')}</b>\n${u.username?'@'+esc(u.username)+'\n':''}<code>${u.telegram_user_id}</code>\n\nRole: <b>${esc(u.role)}</b>\nStatus: <b>${esc(u.status)}</b>\nTier: <b>${esc(u.client_tier)}</b>\nWhitelist: <b>${f.whitelist?'YES':'NO'}</b>\nBlacklist: <b>${f.blacklist?'YES':'NO'}</b>\nPhone: ${esc(u.phone_number||'—')}\nLast seen: ${fmtDate(u.last_seen_at)}\n\nNote: ${esc(u.notes||'—')}`;
 await safeEdit(env,msg,text,{inline_keyboard:rows});
}

async function welcome(env:Env,origin:string,msg:TgMessage,startPayload=''){
 if(!msg.from)return;const u=await registerUser(env,msg.from),locale=localeOf(msg.from),c=copy[locale];
 if(startPayload.startsWith('staff_'))await claimStaffInvite(env,msg.from,startPayload.slice(6));
 if(startPayload.startsWith('ref_')&&env.DB){
  const code=startPayload.slice(4).trim();
  if(code){
   await ensureDb(env);
   const referral=await env.DB.prepare('SELECT id,referrer_user_id,referred_user_id FROM referrals WHERE code=? LIMIT 1').bind(code).first<any>();
   if(referral&&!referral.referred_user_id&&Number(referral.referrer_user_id)!==Number(u.id)){
    await env.DB.prepare('UPDATE referrals SET referred_user_id=? WHERE id=? AND referred_user_id IS NULL').bind(u.id,referral.id).run();
    await event(env,u.id,'referral_open',{code,referrerUserId:referral.referrer_user_id});
   }
  }
 }
 const {role}=await getRole(env,msg.from);const name=esc(msg.from.first_name||'friend');const roleText=role==='OWNER'?`\n\n${c.owner}`:'';
 await sendMessage(env,msg.chat.id,`🦎 <b>Chameleon Detailing</b>\n\n${c.hello}, <b>${name}</b>! ${c.body}${roleText}\n\n${c.tap}`,mainKeyboard(env,origin,locale,role));
 if(role!=='CLIENT')await sendMessage(env,msg.chat.id,`${roleLabel(role)} <b>CONTROL PANEL</b>\n\nRole-aware management panel is ready.`,panelKeyboard(role));
}
async function help(env:Env,origin:string,msg:TgMessage){const locale=localeOf(msg.from),c=copy[locale];const role=msg.from?(await getRole(env,msg.from)).role:'CLIENT';await sendMessage(env,msg.chat.id,c.helpText,mainKeyboard(env,origin,locale,role))}
async function saveContact(env:Env,origin:string,msg:TgMessage){const from=msg.from,contact=msg.contact;if(!from||!contact)return;const locale=localeOf(from),c=copy[locale];if(contact.user_id&&contact.user_id!==from.id){await sendMessage(env,msg.chat.id,c.own);return}const {u,role}=await getRole(env,from);if(env.DB&&u.id){await env.DB.prepare(`INSERT INTO client_profiles(user_id,phone_number,phone_verified_via_telegram,phone_shared_at) VALUES(?,?,1,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET phone_number=excluded.phone_number,phone_verified_via_telegram=1,phone_shared_at=CURRENT_TIMESTAMP`).bind(u.id,contact.phone_number).run();await event(env,u.id,'phone_shared_via_telegram')}await sendMessage(env,msg.chat.id,c.saved,mainKeyboard(env,origin,locale,role))}

async function panelSection(env:Env,msg:TgMessage,from:TgFrom,section:string){
 const staff=await requireStaff(env,from);if(!staff){await sendMessage(env,msg.chat.id,'⛔ Staff access required.');return}if(!env.DB){await safeEdit(env,msg,'⚠️ <b>D1 is not connected.</b>',backPanel());return}await ensureDb(env);
 let text='';let kb:any=backPanel();
 if(section==='dashboard'){
  const period="datetime('now','-30 days')";
  const [users,newToday,vip,reqs,calcs,opens]=await Promise.all([
   env.DB.prepare('SELECT COUNT(*) n FROM users').first<any>(),
   env.DB.prepare("SELECT COUNT(*) n FROM users WHERE date(created_at)=date('now')").first<any>(),
   env.DB.prepare("SELECT COUNT(*) n FROM client_profiles WHERE client_tier<>'STANDARD'").first<any>(),
   env.DB.prepare('SELECT COUNT(*) n FROM service_requests').first<any>(),
   env.DB.prepare('SELECT COUNT(*) n FROM calculator_sessions').first<any>(),
   env.DB.prepare(`SELECT COUNT(*) n FROM analytics_events WHERE event_type='miniapp_open' AND created_at>=${period}`).first<any>()]);
  text=`📊 <b>Dashboard</b>\n\n👥 Total users: <b>${num(users?.n)}</b>\n🆕 New today: <b>${num(newToday?.n)}</b>\n💎 Active VIP: <b>${num(vip?.n)}</b>\n🧮 Calculations: <b>${num(calcs?.n)}</b>\n📋 Requests: <b>${num(reqs?.n)}</b>\n📱 Mini App opens (30d): <b>${num(opens?.n)}</b>`;
 }else if(section==='users'){
  const r=await env.DB.prepare('SELECT id,telegram_user_id,username,first_name,role,status FROM users ORDER BY last_seen_at DESC LIMIT 10').all<any>();
  text='👥 <b>Users</b>\n\nОберіть користувача або знайдіть його за @username / Telegram ID.';
  const rows=(r.results||[]).map((x:any)=>[{text:`${x.role==='ADMIN'?'🛡':x.role==='MANAGER'?'🧑‍💼':'👤'} ${x.first_name||x.username||x.telegram_user_id}`,callback_data:`user:${x.id}:open`}]);
  rows.push([{text:'🔎 Search user',callback_data:'action:user:search'}]);if(can(staff.role,'user.create'))rows.push([{text:'➕ Add client',callback_data:'action:user:add'}]);kb=backPanel(rows);
 }else if(section==='vip'){
  const r=await env.DB.prepare("SELECT u.id,u.first_name,u.username,u.telegram_user_id,p.client_tier,p.vip_since FROM users u JOIN client_profiles p ON p.user_id=u.id WHERE p.client_tier<>'STANDARD' ORDER BY p.vip_since DESC LIMIT 12").all<any>();
  text='💎 <b>VIP clients</b>\n\n'+((r.results||[]).map((x:any)=>`${esc(x.first_name||'')} ${x.username?'@'+esc(x.username):''} · <b>${esc(x.client_tier)}</b> · ${fmtDate(x.vip_since)}`).join('\n')||'No VIP clients.');
  kb=backPanel(can(staff.role,'vip.assign')?[[{text:'➕ Assign VIP',callback_data:'action:vip:assign'}]]:[]);
 }else if(section==='whitelist'){
  const r=await env.DB.prepare('SELECT u.id,u.first_name,u.username,u.telegram_user_id FROM whitelist w JOIN users u ON u.id=w.user_id ORDER BY w.created_at DESC LIMIT 20').all<any>();
  text='✅ <b>Whitelist</b>\n\n'+((r.results||[]).map((x:any)=>`${esc(x.first_name||'')} ${x.username?'@'+esc(x.username):''} · <code>${x.telegram_user_id}</code>`).join('\n')||'Whitelist is empty.');
  kb=backPanel(can(staff.role,'whitelist.manage')?[[{text:'➕ Add / remove user',callback_data:'action:whitelist:find'}]]:[]);
 }else if(section==='blacklist'){
  const r=await env.DB.prepare('SELECT b.id,u.id user_id,u.first_name,u.username,b.public_reason,b.blocked_at FROM blacklist b JOIN users u ON u.id=b.user_id WHERE b.is_active=1 ORDER BY b.blocked_at DESC LIMIT 20').all<any>();
  text='⛔ <b>Blacklist</b>\n\n'+((r.results||[]).map((x:any)=>`${esc(x.first_name||'')} ${x.username?'@'+esc(x.username):''}\nReason: ${esc(x.public_reason)} · ${fmtDate(x.blocked_at)}`).join('\n\n')||'Blacklist is empty.');
  kb=backPanel(can(staff.role,'blacklist.manage')?[[{text:'➕ Block / unblock user',callback_data:'action:blacklist:find'}]]:[]);
 }else if(section==='admins'||section==='managers'){
  const targetRole=section==='admins'?'ADMIN':'MANAGER';if(targetRole==='ADMIN'&&staff.role!=='OWNER'){await safeEdit(env,msg,'⛔ Only Owner can manage Admins.',backPanel());return}
  const r=await env.DB.prepare('SELECT id,first_name,username,telegram_user_id FROM users WHERE role=? ORDER BY id DESC LIMIT 20').bind(targetRole).all<any>();
  text=`${targetRole==='ADMIN'?'🛡':'🧑‍💼'} <b>${targetRole==='ADMIN'?'Admins':'Managers'}</b>\n\n`+((r.results||[]).map((x:any)=>`${esc(x.first_name||'')} ${x.username?'@'+esc(x.username):''} · <code>${x.telegram_user_id}</code>`).join('\n')||`No ${targetRole.toLowerCase()}s.`);
  const p:Permission=targetRole==='ADMIN'?'admin.create':'manager.create';kb=backPanel(can(staff.role,p)?[[{text:`➕ Add ${targetRole}`,callback_data:`action:staff:add:${targetRole}`}]]:[]);
 }else if(section==='services'){
  if(!can(staff.role,'service.edit')){await safeEdit(env,msg,'⛔ No permission to edit services.',backPanel());return}
  const r=await env.DB.prepare(`SELECT s.id,s.slug,s.enabled,s.archived,COALESCE(t.title,s.slug) title FROM services s LEFT JOIN service_translations t ON t.service_id=s.id AND t.locale='en' ORDER BY s.sort_order,s.id`).all<any>();
  text='🧽 <b>SERVICES</b>\n\nОберіть послугу для редагування.';
  const rows=(r.results||[]).map((x:any)=>[{text:`${x.archived?'📦':x.enabled?'✅':'❌'} ${x.title}`,callback_data:`service:${x.id}:open`}]);rows.push([{text:'➕ Add Service',callback_data:'action:service:add'}]);kb=backPanel(rows);
 }else if(section==='pricing'){
  if(!can(staff.role,'pricing.edit')){await safeEdit(env,msg,'⛔ No permission to edit pricing.',backPanel());return}
  const r=await env.DB.prepare(`SELECT s.id,COALESCE(t.title,s.slug) title,p.base_price,p.base_currency FROM services s LEFT JOIN service_translations t ON t.service_id=s.id AND t.locale='en' LEFT JOIN service_prices p ON p.service_id=s.id WHERE s.archived=0 ORDER BY s.sort_order`).all<any>();
  text='💰 <b>PRICING</b>\n\nОберіть послугу, щоб змінити base price та currency.';
  kb=backPanel((r.results||[]).map((x:any)=>[{text:`${x.title} · ${Number(x.base_price||0).toFixed(2)} ${x.base_currency||'PLN'}`,callback_data:`service:${x.id}:price`}]));
 }else if(section==='calculator'){
  if(!can(staff.role,'calculator.edit')){await safeEdit(env,msg,'⛔ No permission.',backPanel());return}
  const em=await getSetting(env,'emergency_multiplier','1.5'),enabled=await getSetting(env,'emergency_enabled','0'),currency=await getSetting(env,'reporting_currency','PLN');
  text=`🧮 <b>Calculator Rules</b>\n\nEmergency: <b>${enabled==='1'?'ON':'OFF'}</b>\nEmergency multiplier: <b>${esc(em)}</b>\nReporting currency: <b>${esc(currency)}</b>`;
  kb=backPanel([[{text:enabled==='1'?'🟢 Disable emergency':'🔴 Enable emergency',callback_data:'action:setting:toggle:emergency_enabled'}],[{text:'✖️ Emergency multiplier',callback_data:'action:setting:edit:emergency_multiplier'},{text:'💱 Reporting currency',callback_data:'action:setting:edit:reporting_currency'}],[{text:'🚙 Vehicle multipliers',callback_data:'panel:vehicles'},{text:'🧼 Condition multipliers',callback_data:'panel:conditions'}]]);
 }else if(section==='vehicles'||section==='conditions'){
  if(!can(staff.role,'calculator.edit'))return;
  const table=section==='vehicles'?'vehicle_types':'condition_levels';const r=await env.DB.prepare(`SELECT id,slug,multiplier,enabled FROM ${table} ORDER BY sort_order,id`).all<any>();
  text=`${section==='vehicles'?'🚙 Vehicle':'🧼 Condition'} <b>multipliers</b>\n\nTap item to edit multiplier.`;
  kb=backPanel((r.results||[]).map((x:any)=>[{text:`${x.enabled?'✅':'❌'} ${x.slug} × ${Number(x.multiplier).toFixed(2)}`,callback_data:`mult:${section}:${x.id}`}]));
 }else if(section==='content'){
  if(!can(staff.role,'content.edit'))return;const keys=['home.hero.title','home.hero.subtitle','bot.welcome','bot.returning','calculator.result.note','vip.description','referral.description','contact.description'];
  text='📝 <b>Content</b>\n\nВиберіть content key. Далі — мову та новий текст.';
  kb=backPanel(keys.map((k,i)=>[{text:`${i+1}. ${k}`,callback_data:`content:${i}`}]));
 }else if(section==='languages'){
  if(!can(staff.role,'localization.edit'))return;const def=await getSetting(env,'default_locale','en'),avail=await getSetting(env,'available_locales','uk,pl,en');
  text=`🌐 <b>Languages</b>\n\nDefault locale: <b>${esc(def)}</b>\nAvailable: <code>${esc(avail)}</code>\n\nTranslations for services/content are editable from their sections.`;
  kb=backPanel([[{text:'🇺🇦 Default UA',callback_data:'action:setting:set:default_locale:uk'},{text:'🇵🇱 Default PL',callback_data:'action:setting:set:default_locale:pl'},{text:'🇬🇧 Default EN',callback_data:'action:setting:set:default_locale:en'}],[{text:'✏️ Available locales',callback_data:'action:setting:edit:available_locales'}]]);
 }else if(section==='referrals'){
  const enabled=await getSetting(env,'referral_enabled','1');const [refs,events]=await Promise.all([env.DB.prepare('SELECT COUNT(*) n FROM referrals').first<any>(),env.DB.prepare("SELECT COUNT(*) n FROM analytics_events WHERE event_type LIKE 'referral%'").first<any>()]);
  text=`🤝 <b>Referrals</b>\n\nModule: <b>${enabled==='1'?'ON':'OFF'}</b>\nReferral records: <b>${num(refs?.n)}</b>\nReferral events: <b>${num(events?.n)}</b>`;
  kb=backPanel(can(staff.role,'settings.edit')?[[{text:enabled==='1'?'🟢 Disable module':'🔴 Enable module',callback_data:'action:setting:toggle:referral_enabled'}]]:[]);
 }else if(section==='analytics'){
  const filter=staff.role==='MANAGER'?"datetime('now','-30 days')":"datetime('now','-7 days')";
  const r=await env.DB.prepare(`SELECT event_type,COUNT(*) n FROM analytics_events WHERE created_at>=${filter} GROUP BY event_type ORDER BY n DESC LIMIT 15`).all<any>();
  text=`📈 <b>${staff.role==='MANAGER'?'Basic ':' '}Analytics</b>\n\n`+((r.results||[]).map((x:any)=>`${esc(x.event_type)}: <b>${x.n}</b>`).join('\n')||'No events yet.');
  kb=backPanel(staff.role!=='MANAGER'?[[{text:'Today',callback_data:'analytics:today'},{text:'7 days',callback_data:'analytics:7'},{text:'30 days',callback_data:'analytics:30'}]]:[]);
 }else if(section==='calculations'){
  const r=await env.DB.prepare(`SELECT c.id,c.calculated_price,c.currency,c.created_at,u.first_name,u.username FROM calculator_sessions c LEFT JOIN users u ON u.id=c.user_id ORDER BY c.id DESC LIMIT 15`).all<any>();
  text='🧾 <b>Recent calculations</b>\n\n'+((r.results||[]).map((x:any)=>`#${x.id} · ${esc(x.first_name||x.username||'User')} · <b>${Number(x.calculated_price||0).toFixed(2)} ${esc(x.currency)}</b> · ${fmtDate(x.created_at)}`).join('\n')||'No calculations.');
 }else if(section==='notes'){
  text='📝 <b>Client Notes</b>\n\nВідкрий Users → обери клієнта → Edit note.';
 }else if(section==='audit'){
  if(!can(staff.role,'audit.read'))return;const r=await env.DB.prepare(`SELECT a.action,a.entity_type,a.entity_id,a.created_at,u.first_name,u.username FROM audit_log a LEFT JOIN users u ON u.id=a.actor_user_id ORDER BY a.id DESC LIMIT 15`).all<any>();
  text='📜 <b>Audit Log</b>\n\n'+((r.results||[]).map((x:any)=>`${fmtDate(x.created_at)} · ${esc(x.first_name||x.username||'System')}\n<b>${esc(x.action)}</b>${x.entity_type?' · '+esc(x.entity_type):''}${x.entity_id?' #'+esc(x.entity_id):''}`).join('\n\n')||'Audit log is empty.');
 }else if(section==='settings'){
  if(!can(staff.role,'settings.edit'))return;const maintenance=await getSetting(env,'maintenance.enabled','0'),days=await getSetting(env,'working_days','1,2,3,4,5'),hours=await getSetting(env,'working_hours','09:00-18:00'),tz=await getSetting(env,'business_timezone','Europe/Warsaw'),phone=await getSetting(env,'contact_phone','—');
  text=`⚙️ <b>Settings</b>\n\nWorking days: <code>${esc(days)}</code>\nWorking hours: <code>${esc(hours)}</code>\nTimezone: <code>${esc(tz)}</code>\nContact phone: <code>${esc(phone)}</code>\nMaintenance: <b>${maintenance==='1'?'ON':'OFF'}</b>`;
  const rows:any[]=[[{text:'📅 Working days',callback_data:'action:setting:edit:working_days'},{text:'🕘 Working hours',callback_data:'action:setting:edit:working_hours'}],[{text:'🌍 Timezone',callback_data:'action:setting:edit:business_timezone'},{text:'☎️ Contact phone',callback_data:'action:setting:edit:contact_phone'}]];
  if(staff.role==='OWNER')rows.push([{text:maintenance==='1'?'🟢 Disable maintenance':'🔴 Enable maintenance',callback_data:'action:setting:toggle:maintenance.enabled'}],[{text:'📝 Maintenance message',callback_data:'action:setting:edit:maintenance.message'},{text:'⏱ Maintenance ETA',callback_data:'action:setting:edit:maintenance.eta'}]);
  kb=backPanel(rows);
 }else{text=`${roleLabel(staff.role)} <b>CONTROL PANEL</b>`;kb=panelKeyboard(staff.role)}
 await safeEdit(env,msg,text,kb);
}

async function serviceDetail(env:Env,msg:TgMessage,from:TgFrom,id:number){const staff=await requireStaff(env,from,'service.edit');if(!staff||!env.DB)return;await ensureDb(env);const s=await env.DB.prepare(`SELECT s.*,p.base_price,p.base_currency,p.currency_mode,p.usd_override,p.uah_override,p.pln_override FROM services s LEFT JOIN service_prices p ON p.service_id=s.id WHERE s.id=?`).bind(id).first<any>();if(!s)return;const tr=await env.DB.prepare('SELECT locale,title,description FROM service_translations WHERE service_id=? ORDER BY locale').bind(id).all<any>();const translations=(tr.results||[]).map((x:any)=>`${x.locale.toUpperCase()}: <b>${esc(x.title)}</b>\n${esc(x.description)}`).join('\n\n');const text=`🧽 <b>Service #${id}</b>\n\nSlug: <code>${esc(s.slug)}</code>\nCategory: <b>${esc(s.category)}</b>\nDuration: <b>${s.duration_min} min</b>\nStatus: <b>${s.archived?'ARCHIVED':s.enabled?'ENABLED':'HIDDEN'}</b>\nPrice: <b>${Number(s.base_price||0).toFixed(2)} ${esc(s.base_currency||'PLN')}</b>\n\n${translations}`;
 const rows:any[]=[[{text:s.enabled?'👁 Hide':'✅ Enable',callback_data:`service:${id}:toggle`},{text:'💰 Price',callback_data:`service:${id}:price`}],[{text:'⏱ Duration',callback_data:`service:${id}:duration`},{text:'📦 Category',callback_data:`service:${id}:category`}],[{text:'🇺🇦 UA text',callback_data:`service:${id}:tr:uk`},{text:'🇵🇱 PL text',callback_data:`service:${id}:tr:pl`},{text:'🇬🇧 EN text',callback_data:`service:${id}:tr:en`}],[{text:s.archived?'♻️ Restore':'🗄 Archive',callback_data:`service:${id}:archive`}],[{text:'⬅️ Services',callback_data:'panel:services'}]];
 await safeEdit(env,msg,text,{inline_keyboard:rows});
}

async function beginState(env:Env,from:TgFrom,state:string,payload:any){const staff=await requireStaff(env,from);if(!staff)return false;await setBotState(env,staff.u.id,state,payload);return true}
async function promptState(env:Env,msg:TgMessage,from:TgFrom,state:string,payload:any,prompt:string){if(await beginState(env,from,state,payload))await safeEdit(env,msg,prompt,backPanel())}
async function setVip(env:Env,actor:any,target:any,tier='VIP'){if(!env.DB)return;await ensureDb(env);const old=await env.DB.prepare("SELECT COALESCE(client_tier,'STANDARD') tier,vip_since FROM client_profiles WHERE user_id=?").bind(target.id).first<any>();if(tier==='STANDARD'){await env.DB.prepare("UPDATE client_profiles SET client_tier='STANDARD',vip_since=NULL WHERE user_id=?").bind(target.id).run();await env.DB.prepare("UPDATE vip_history SET removed_by=?,removed_at=CURRENT_TIMESTAMP,removal_reason='Manual removal' WHERE user_id=? AND removed_at IS NULL").bind(actor.id,target.id).run();await audit(env,actor.id,'vip.remove','user',String(target.id),old,{tier:'STANDARD'});return}await env.DB.prepare(`INSERT INTO client_profiles(user_id,client_tier,vip_since) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET client_tier=excluded.client_tier,vip_since=COALESCE(client_profiles.vip_since,CURRENT_TIMESTAMP)`).bind(target.id,tier).run();await env.DB.prepare('INSERT INTO vip_history(user_id,tier,assigned_by) VALUES(?,?,?)').bind(target.id,tier,actor.id).run();await audit(env,actor.id,'vip.assign','user',String(target.id),old,{tier})}
async function toggleWhitelist(env:Env,actor:any,targetId:number){if(!env.DB)return;const exists=await env.DB.prepare('SELECT * FROM whitelist WHERE user_id=? LIMIT 1').bind(targetId).first<any>();if(exists){await env.DB.prepare('DELETE FROM whitelist WHERE user_id=?').bind(targetId).run();await audit(env,actor.id,'whitelist.remove','user',String(targetId),exists,null)}else{await env.DB.prepare('INSERT INTO whitelist(user_id,created_by) VALUES(?,?)').bind(targetId,actor.id).run();await audit(env,actor.id,'whitelist.add','user',String(targetId),null,{userId:targetId})}}
async function toggleBlacklistRemove(env:Env,actor:any,targetId:number){if(!env.DB)return;const b=await env.DB.prepare('SELECT * FROM blacklist WHERE user_id=? AND is_active=1 ORDER BY id DESC LIMIT 1').bind(targetId).first<any>();if(!b)return false;await env.DB.prepare('UPDATE blacklist SET is_active=0,unblocked_by=?,unblocked_at=CURRENT_TIMESTAMP WHERE id=?').bind(actor.id,b.id).run();await audit(env,actor.id,'blacklist.remove','user',String(targetId),b,{active:false});return true}

async function handleTextState(env:Env,origin:string,msg:TgMessage,from:TgFrom,u:any,role:Role){
 const st=await getBotState(env,u.id);if(!st?.state)return false;const p=parsePayload(st.payload_json);const raw=(msg.text||'').trim();const done=async(text:string)=>{await setBotState(env,u.id,null);await sendMessage(env,msg.chat.id,text,panelKeyboard(role))};
 if(st.state==='USER_SEARCH'){const target=await userBySelector(env,raw);if(!target){await sendMessage(env,msg.chat.id,'⚠️ User not found. Send @username or Telegram ID again, or /cancel.');return true}await setBotState(env,u.id,null);await showUser(env,msg,from,target.id);return true}
 if(st.state==='USER_ADD'){if(!/^@?[A-Za-z0-9_]{5,32}$/.test(raw)){await sendMessage(env,msg.chat.id,'⚠️ Send a valid @username.');return true}const username=raw.replace(/^@/,'');const known=await env.DB!.prepare('SELECT * FROM users WHERE lower(username)=lower(?) LIMIT 1').bind(username).first<any>();if(known){await done(`✅ @${esc(username)} is already in the user base.`);return true}await done(`ℹ️ @${esc(username)} has not started the bot yet. Ask the client to open @${esc(env.BOT_USERNAME||'ChameleonDetailing_bot')} and press /start; Telegram ID cannot be guessed safely.`);return true}
 if(st.state==='STAFF_ADD'){const targetRole=String(p.role) as 'ADMIN'|'MANAGER';const username=raw.replace(/^@/,'').trim();if(!/^[A-Za-z0-9_]{5,32}$/.test(username)){await sendMessage(env,msg.chat.id,'⚠️ Send a valid @username.');return true}const known=await env.DB!.prepare('SELECT id,telegram_user_id,username,role FROM users WHERE lower(username)=lower(?) LIMIT 1').bind(username).first<any>();if(known){await env.DB!.prepare('UPDATE users SET role=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(targetRole,known.id).run();await audit(env,u.id,'staff.role.assign','user',String(known.id),{role:known.role},{role:targetRole,username});await done(`✅ @${esc(username)} now has role <b>${targetRole}</b>.`);return true}const token=crypto.randomUUID().replace(/-/g,'').slice(0,24);await env.DB!.prepare('INSERT INTO staff_invites_v2(token,username,role,created_by_user_id) VALUES(?,?,?,?)').bind(token,username,targetRole,u.id).run();await audit(env,u.id,'staff.invite.create','staff_invite',token,null,{role:targetRole,username});const bot=String(env.BOT_USERNAME||'ChameleonDetailing_bot').replace(/^@/,'');const link=`https://t.me/${bot}?start=staff_${token}`;await done(`🕓 @${esc(username)} is not known to the bot yet.\n\nSend this invitation:\n${esc(link)}\n\nAfter /start, Telegram ID will be verified and role <b>${targetRole}</b> activated.`);return true}
 if(st.state==='VIP_ASSIGN'){const target=await userBySelector(env,raw);if(!target){await sendMessage(env,msg.chat.id,'⚠️ User not found.');return true}await setVip(env,u,target,'VIP');await done(`✅ VIP assigned to ${esc(target.first_name||target.username||target.telegram_user_id)}.`);return true}
 if(st.state==='WHITELIST_FIND'){const target=await userBySelector(env,raw);if(!target){await sendMessage(env,msg.chat.id,'⚠️ User not found.');return true}await toggleWhitelist(env,u,target.id);await done(`✅ Whitelist updated for ${esc(target.first_name||target.username||target.telegram_user_id)}.`);return true}
 if(st.state==='BLACKLIST_FIND'){const target=await userBySelector(env,raw);if(!target){await sendMessage(env,msg.chat.id,'⚠️ User not found.');return true}const removed=await toggleBlacklistRemove(env,u,target.id);if(removed){await done(`✅ User removed from blacklist.`);return true}await setBotState(env,u.id,'BLACKLIST_REASON',{targetId:target.id});await sendMessage(env,msg.chat.id,'⛔ Send the <b>public reason</b> for blocking this user. This text may be shown to the client.');return true}
 if(st.state==='BLACKLIST_REASON'){await env.DB!.prepare('INSERT INTO blacklist(user_id,public_reason,blocked_by) VALUES(?,?,?)').bind(p.targetId,raw,u.id).run();await audit(env,u.id,'blacklist.add','user',String(p.targetId),null,{publicReason:raw});await done('✅ User added to blacklist.');return true}
 if(st.state==='USER_NOTE'){const old=await env.DB!.prepare('SELECT notes FROM client_profiles WHERE user_id=?').bind(p.targetId).first<any>();await env.DB!.prepare(`INSERT INTO client_profiles(user_id,notes) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET notes=excluded.notes`).bind(p.targetId,raw).run();await audit(env,u.id,'user.note.update','user',String(p.targetId),old,{notes:raw});await done('✅ Client note updated.');return true}
 if(st.state==='SETTING_EDIT'){const key=String(p.key||'');const old=await getSetting(env,key,'');if(key==='reporting_currency'&&!['PLN','UAH','USD'].includes(raw.toUpperCase())){await sendMessage(env,msg.chat.id,'Use PLN, UAH or USD.');return true}const value=key==='reporting_currency'?raw.toUpperCase():raw;await setSetting(env,key,value);await audit(env,u.id,'settings.update','settings',key,{value:old},{value});await done(`✅ ${esc(key)} updated.`);return true}
 if(st.state==='SERVICE_PRICE'){const m=raw.match(/^(\d+(?:[.,]\d+)?)\s*(PLN|UAH|USD)$/i);if(!m){await sendMessage(env,msg.chat.id,'Format: <code>250 PLN</code>, <code>2500 UAH</code> or <code>60 USD</code>.');return true}const price=Number(m[1].replace(',','.')),currency=m[2].toUpperCase();const old=await env.DB!.prepare('SELECT * FROM service_prices WHERE service_id=?').bind(p.serviceId).first<any>();await env.DB!.prepare(`INSERT INTO service_prices(service_id,base_price,base_currency) VALUES(?,?,?) ON CONFLICT(service_id) DO UPDATE SET base_price=excluded.base_price,base_currency=excluded.base_currency,updated_at=CURRENT_TIMESTAMP`).bind(p.serviceId,price,currency).run();await audit(env,u.id,'service.price.update','service',String(p.serviceId),old,{price,currency});await setBotState(env,u.id,null);await sendMessage(env,msg.chat.id,'✅ Price updated.');return true}
 if(st.state==='SERVICE_DURATION'){const v=Math.round(Number(raw));if(!Number.isFinite(v)||v<5||v>1440){await sendMessage(env,msg.chat.id,'Send duration in minutes (5–1440).');return true}const old=await env.DB!.prepare('SELECT duration_min FROM services WHERE id=?').bind(p.serviceId).first<any>();await env.DB!.prepare('UPDATE services SET duration_min=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(v,p.serviceId).run();await audit(env,u.id,'service.duration.update','service',String(p.serviceId),old,{duration:v});await done('✅ Duration updated.');return true}
 if(st.state==='SERVICE_CATEGORY'){const old=await env.DB!.prepare('SELECT category FROM services WHERE id=?').bind(p.serviceId).first<any>();await env.DB!.prepare('UPDATE services SET category=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(raw.toUpperCase().slice(0,40),p.serviceId).run();await audit(env,u.id,'service.category.update','service',String(p.serviceId),old,{category:raw.toUpperCase()});await done('✅ Category updated.');return true}
 if(st.state==='SERVICE_TR_TITLE'){await setBotState(env,u.id,'SERVICE_TR_DESC',p);await sendMessage(env,msg.chat.id,`Now send ${esc(String(p.locale).toUpperCase())} description.`);await env.DB!.prepare(`INSERT INTO service_translations(service_id,locale,title,description) VALUES(?,?,?,'') ON CONFLICT(service_id,locale) DO UPDATE SET title=excluded.title`).bind(p.serviceId,p.locale,raw).run();return true}
 if(st.state==='SERVICE_TR_DESC'){const old=await env.DB!.prepare('SELECT * FROM service_translations WHERE service_id=? AND locale=?').bind(p.serviceId,p.locale).first<any>();await env.DB!.prepare(`UPDATE service_translations SET description=? WHERE service_id=? AND locale=?`).bind(raw,p.serviceId,p.locale).run();await audit(env,u.id,'service.translation.update','service',String(p.serviceId),old,{locale:p.locale});await done('✅ Service translation updated.');return true}
 if(st.state==='SERVICE_ADD_SLUG'){const slug=raw.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');if(!slug){await sendMessage(env,msg.chat.id,'Invalid slug.');return true}const exists=await env.DB!.prepare('SELECT 1 ok FROM services WHERE slug=?').bind(slug).first<any>();if(exists){await sendMessage(env,msg.chat.id,'Slug already exists. Send another.');return true}await setBotState(env,u.id,'SERVICE_ADD_TITLE',{slug});await sendMessage(env,msg.chat.id,'Send English title.');return true}
 if(st.state==='SERVICE_ADD_TITLE'){await setBotState(env,u.id,'SERVICE_ADD_PRICE',{...p,title:raw});await sendMessage(env,msg.chat.id,'Send base price with currency, e.g. <code>150 PLN</code>.');return true}
 if(st.state==='SERVICE_ADD_PRICE'){const m=raw.match(/^(\d+(?:[.,]\d+)?)\s*(PLN|UAH|USD)$/i);if(!m){await sendMessage(env,msg.chat.id,'Format: <code>150 PLN</code>.');return true}const res=await env.DB!.prepare(`INSERT INTO services(slug,enabled,sort_order,category,duration_min,archived) VALUES(?,1,(SELECT COALESCE(MAX(sort_order),0)+10 FROM services),'DETAILING',60,0)`).bind(p.slug).run();const id=Number(res.meta.last_row_id);await env.DB!.prepare('INSERT INTO service_prices(service_id,base_price,base_currency) VALUES(?,?,?)').bind(id,Number(m[1].replace(',','.')),m[2].toUpperCase()).run();for(const loc of ['uk','pl','en'])await env.DB!.prepare('INSERT INTO service_translations(service_id,locale,title,description) VALUES(?,?,?,?)').bind(id,loc,p.title,'').run();await audit(env,u.id,'service.create','service',String(id),null,{slug:p.slug,title:p.title});await done(`✅ Service <b>${esc(p.title)}</b> created. Open Services to finish translations, duration and category.`);return true}
 if(st.state==='MULTIPLIER_EDIT'){const v=Number(raw.replace(',','.'));if(!Number.isFinite(v)||v<=0||v>10){await sendMessage(env,msg.chat.id,'Send multiplier between 0.1 and 10.');return true}const table=p.kind==='vehicles'?'vehicle_types':'condition_levels';const old=await env.DB!.prepare(`SELECT multiplier FROM ${table} WHERE id=?`).bind(p.id).first<any>();await env.DB!.prepare(`UPDATE ${table} SET multiplier=? WHERE id=?`).bind(v,p.id).run();await audit(env,u.id,'calculator.multiplier.update',table,String(p.id),old,{multiplier:v});await done('✅ Multiplier updated.');return true}
 if(st.state==='CONTENT_EDIT'){const old=await env.DB!.prepare('SELECT value FROM content_blocks WHERE key=? AND locale=?').bind(p.key,p.locale).first<any>();await env.DB!.prepare(`INSERT INTO content_blocks(key,locale,value) VALUES(?,?,?) ON CONFLICT(key,locale) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).bind(p.key,p.locale,raw).run();await audit(env,u.id,'content.update','content',`${p.key}:${p.locale}`,old,{value:raw});await done('✅ Content updated.');return true}
 return false;
}

async function claimStaffInvite(env:Env,from:TgFrom,token:string){if(!env.DB||!token)return;await ensureDb(env);const inv=await env.DB.prepare("SELECT * FROM staff_invites_v2 WHERE token=? AND status='PENDING'").bind(token).first<any>();if(!inv)return;const username=String(from.username||'').toLowerCase();if(!username||username!==String(inv.username||'').toLowerCase())return;const u=await upsertUser(env,asUser(from),false);await env.DB.prepare('UPDATE users SET role=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(inv.role,u.id).run();await env.DB.prepare("UPDATE staff_invites_v2 SET status='CLAIMED',claimed_by_user_id=?,claimed_at=CURRENT_TIMESTAMP WHERE token=?").bind(u.id,token).run();await audit(env,Number(inv.created_by_user_id||0),'staff.invite.claim','user',String(u.id),null,{role:inv.role,username:inv.username})}

export async function handleBotUpdate(env:Env,origin:string,update:TgUpdate){
 const msg=update.message;
 if(msg){
  if(msg.contact){await saveContact(env,origin,msg);return}
  const text=(msg.text||'').trim();
  if(/^\/cancel(?:@\w+)?$/i.test(text)&&msg.from){const {u,role}=await getRole(env,msg.from);await setBotState(env,u.id,null);await sendMessage(env,msg.chat.id,'✅ Cancelled.',panelKeyboard(role));return}
  const start=text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);if(start){await welcome(env,origin,msg,start[1]||'');return}
  if(/^\/(panel|owner)(?:@\w+)?(?:\s|$)/i.test(text)&&msg.from){const {role}=await getRole(env,msg.from);if(role!=='CLIENT')await sendMessage(env,msg.chat.id,`${roleLabel(role)} <b>CONTROL PANEL</b>`,panelKeyboard(role));else await sendMessage(env,msg.chat.id,'⛔ Staff access required.');return}
  if(/^\/services(?:@\w+)?(?:\s|$)/i.test(text)&&msg.from){await panelSection(env,msg,msg.from,'services');return}
  if(/^\/maintenance(?:@\w+)?(?:\s|$)/i.test(text)&&msg.from){await panelSection(env,msg,msg.from,'settings');return}
  if(/^\/help(?:@\w+)?(?:\s|$)/i.test(text)){await help(env,origin,msg);return}
  if(msg.from){const {u,role}=await getRole(env,msg.from);if(role!=='CLIENT'&&text&&await handleTextState(env,origin,msg,msg.from,u,role))return;if(text){const locale=localeOf(msg.from);await sendMessage(env,msg.chat.id,copy[locale].choose,mainKeyboard(env,origin,locale,role));return}}
 }
 const cb=update.callback_query;
 if(cb){
  await tgApi(env,'answerCallbackQuery',{callback_query_id:cb.id}).catch(()=>{});if(!cb.message)return;
  if(cb.data==='help'){await help(env,origin,{...cb.message,from:cb.from});return}
  if(cb.data==='staff:panel'||cb.data==='panel:home'){await showPanel(env,cb.message,cb.from);return}
  if(cb.data==='panel:client'){const {role}=await getRole(env,cb.from);await safeEdit(env,cb.message,'🦎 <b>Chameleon Detailing</b>\n\nClient menu',mainKeyboard(env,origin,localeOf(cb.from),role));return}
  if((cb.data||'').startsWith('panel:')){await panelSection(env,cb.message,cb.from,(cb.data||'').slice(6));return}
  const userMatch=(cb.data||'').match(/^user:(\d+):(.+)$/);if(userMatch){const targetId=Number(userMatch[1]),action=userMatch[2],staff=await requireStaff(env,cb.from);if(!staff||!env.DB)return;
   if(action==='open'){await showUser(env,cb.message,cb.from,targetId);return}
   if(action==='vip'){const target=await env.DB.prepare("SELECT u.*,COALESCE(p.client_tier,'STANDARD') client_tier FROM users u LEFT JOIN client_profiles p ON p.user_id=u.id WHERE u.id=?").bind(targetId).first<any>();if(target){await setVip(env,staff.u,target,target.client_tier==='STANDARD'?'VIP':'STANDARD');await showUser(env,cb.message,cb.from,targetId)}return}
   if(action==='whitelist'){if(can(staff.role,'whitelist.manage')){await toggleWhitelist(env,staff.u,targetId);await showUser(env,cb.message,cb.from,targetId)}return}
   if(action==='blacklist'){if(!can(staff.role,'blacklist.manage'))return;const removed=await toggleBlacklistRemove(env,staff.u,targetId);if(removed){await showUser(env,cb.message,cb.from,targetId);return}await promptState(env,cb.message,cb.from,'BLACKLIST_REASON',{targetId},'⛔ Send the public reason for blocking this client.');return}
   if(action==='note'){if(can(staff.role,'user.update'))await promptState(env,cb.message,cb.from,'USER_NOTE',{targetId},'📝 Send a new internal note for this client.');return}
   if(action==='demote'){const target=await env.DB.prepare('SELECT role FROM users WHERE id=?').bind(targetId).first<any>();if(target?.role==='ADMIN'&&staff.role!=='OWNER')return;await env.DB.prepare("UPDATE users SET role='CLIENT',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(targetId).run();await audit(env,staff.u.id,'staff.role.remove','user',String(targetId),target,{role:'CLIENT'});await showUser(env,cb.message,cb.from,targetId);return}
   if(action==='to_admin'&&staff.role==='OWNER'){const old=await env.DB.prepare('SELECT role FROM users WHERE id=?').bind(targetId).first<any>();await env.DB.prepare("UPDATE users SET role='ADMIN',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(targetId).run();await audit(env,staff.u.id,'staff.role.change','user',String(targetId),old,{role:'ADMIN'});await showUser(env,cb.message,cb.from,targetId);return}
   if(action==='to_manager'&&staff.role==='OWNER'){const old=await env.DB.prepare('SELECT role FROM users WHERE id=?').bind(targetId).first<any>();await env.DB.prepare("UPDATE users SET role='MANAGER',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(targetId).run();await audit(env,staff.u.id,'staff.role.change','user',String(targetId),old,{role:'MANAGER'});await showUser(env,cb.message,cb.from,targetId);return}
  }
  const serviceMatch=(cb.data||'').match(/^service:(\d+):(.+)$/);if(serviceMatch){const id=Number(serviceMatch[1]),action=serviceMatch[2],staff=await requireStaff(env,cb.from,'service.edit');if(!staff||!env.DB)return;
   if(action==='open'){await serviceDetail(env,cb.message,cb.from,id);return}
   if(action==='toggle'){const old=await env.DB.prepare('SELECT enabled FROM services WHERE id=?').bind(id).first<any>();await env.DB.prepare('UPDATE services SET enabled=CASE enabled WHEN 1 THEN 0 ELSE 1 END,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();await audit(env,staff.u.id,'service.visibility.toggle','service',String(id),old,null);await serviceDetail(env,cb.message,cb.from,id);return}
   if(action==='archive'){const old=await env.DB.prepare('SELECT archived FROM services WHERE id=?').bind(id).first<any>();await env.DB.prepare('UPDATE services SET archived=CASE archived WHEN 1 THEN 0 ELSE 1 END,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(id).run();await audit(env,staff.u.id,'service.archive.toggle','service',String(id),old,null);await serviceDetail(env,cb.message,cb.from,id);return}
   if(action==='price'){if(can(staff.role,'pricing.edit'))await promptState(env,cb.message,cb.from,'SERVICE_PRICE',{serviceId:id},'💰 Send new base price and currency, e.g. <code>250 PLN</code>.');return}
   if(action==='duration'){await promptState(env,cb.message,cb.from,'SERVICE_DURATION',{serviceId:id},'⏱ Send duration in minutes.');return}
   if(action==='category'){await promptState(env,cb.message,cb.from,'SERVICE_CATEGORY',{serviceId:id},'📦 Send service category, e.g. <code>EXTERIOR</code>.');return}
   const tr=action.match(/^tr:(uk|pl|en)$/);if(tr){await promptState(env,cb.message,cb.from,'SERVICE_TR_TITLE',{serviceId:id,locale:tr[1]},`🌐 Send ${tr[1].toUpperCase()} title.`);return}
  }
  const mult=(cb.data||'').match(/^mult:(vehicles|conditions):(\d+)$/);if(mult){const staff=await requireStaff(env,cb.from,'calculator.edit');if(!staff)return;await promptState(env,cb.message,cb.from,'MULTIPLIER_EDIT',{kind:mult[1],id:Number(mult[2])},'✖️ Send new multiplier, e.g. <code>1.25</code>.');return}
  const content=(cb.data||'').match(/^content:(\d+)$/);if(content){const keys=['home.hero.title','home.hero.subtitle','bot.welcome','bot.returning','calculator.result.note','vip.description','referral.description','contact.description'];const key=keys[Number(content[1])];if(!key)return;await safeEdit(env,cb.message,`📝 <b>${esc(key)}</b>\n\nChoose locale.`,{inline_keyboard:[[{text:'UA',callback_data:`contentloc:${content[1]}:uk`},{text:'PL',callback_data:`contentloc:${content[1]}:pl`},{text:'EN',callback_data:`contentloc:${content[1]}:en`}],[{text:'⬅️ Content',callback_data:'panel:content'}]]});return}
  const contentLoc=(cb.data||'').match(/^contentloc:(\d+):(uk|pl|en)$/);if(contentLoc){const keys=['home.hero.title','home.hero.subtitle','bot.welcome','bot.returning','calculator.result.note','vip.description','referral.description','contact.description'];const key=keys[Number(contentLoc[1])];await promptState(env,cb.message,cb.from,'CONTENT_EDIT',{key,locale:contentLoc[2]},`📝 Send new value for <b>${esc(key)}</b> [${contentLoc[2].toUpperCase()}].`);return}
  if((cb.data||'').startsWith('action:')){
   const parts=(cb.data||'').split(':');const staff=await requireStaff(env,cb.from);if(!staff)return;
   if(parts[1]==='user'&&parts[2]==='search'){await promptState(env,cb.message,cb.from,'USER_SEARCH',{},'🔎 Send <code>@username</code>, Telegram ID or internal user ID.');return}
   if(parts[1]==='user'&&parts[2]==='add'){await promptState(env,cb.message,cb.from,'USER_ADD',{},'➕ Send client <code>@username</code>. If the bot has not seen them yet, they must open /start first.');return}
   if(parts[1]==='vip'&&parts[2]==='assign'){await promptState(env,cb.message,cb.from,'VIP_ASSIGN',{},'💎 Send <code>@username</code> or Telegram ID.');return}
   if(parts[1]==='whitelist'&&parts[2]==='find'){await promptState(env,cb.message,cb.from,'WHITELIST_FIND',{},'✅ Send <code>@username</code> or Telegram ID to add/remove whitelist.');return}
   if(parts[1]==='blacklist'&&parts[2]==='find'){await promptState(env,cb.message,cb.from,'BLACKLIST_FIND',{},'⛔ Send <code>@username</code> or Telegram ID to block/unblock.');return}
   if(parts[1]==='staff'&&parts[2]==='add'){const r=parts[3] as 'ADMIN'|'MANAGER';if(r==='ADMIN'&&staff.role!=='OWNER')return;const perm:Permission=r==='ADMIN'?'admin.create':'manager.create';if(!can(staff.role,perm))return;await promptState(env,cb.message,cb.from,'STAFF_ADD',{role:r},`➕ Send Telegram <code>@username</code> for ${r}.`);return}
   if(parts[1]==='service'&&parts[2]==='add'){if(!can(staff.role,'service.edit'))return;await promptState(env,cb.message,cb.from,'SERVICE_ADD_SLUG',{},'➕ Send service slug, e.g. <code>engine-bay-cleaning</code>.');return}
   if(parts[1]==='setting'&&parts[2]==='toggle'){const key=parts.slice(3).join(':');if(key==='maintenance.enabled'&&staff.role!=='OWNER')return;const old=await getSetting(env,key,'0'),next=old==='1'?'0':'1';await setSetting(env,key,next);await audit(env,staff.u.id,'settings.toggle','settings',key,{value:old},{value:next});await panelSection(env,cb.message,cb.from,key==='emergency_enabled'?'calculator':key==='referral_enabled'?'referrals':'settings');return}
   if(parts[1]==='setting'&&parts[2]==='set'){const key=parts[3],value=parts.slice(4).join(':');await setSetting(env,key,value);await audit(env,staff.u.id,'settings.update','settings',key,null,{value});await panelSection(env,cb.message,cb.from,key==='default_locale'?'languages':'settings');return}
   if(parts[1]==='setting'&&parts[2]==='edit'){const key=parts.slice(3).join(':');if(key.startsWith('maintenance.')&&staff.role!=='OWNER')return;await promptState(env,cb.message,cb.from,'SETTING_EDIT',{key},`✏️ Send new value for <code>${esc(key)}</code>.\n\n/cancel — cancel.`);return}
  }
  const a=(cb.data||'').match(/^analytics:(today|7|30)$/);if(a){const staff=await requireStaff(env,cb.from,'analytics.full');if(!staff||!env.DB)return;const where=a[1]==='today'?"date(created_at)=date('now')":`created_at>=datetime('now','-${a[1]} days')`;const r=await env.DB.prepare(`SELECT event_type,COUNT(*) n FROM analytics_events WHERE ${where} GROUP BY event_type ORDER BY n DESC LIMIT 20`).all<any>();await safeEdit(env,cb.message,`📈 <b>Analytics — ${a[1]==='today'?'Today':a[1]+' days'}</b>\n\n`+((r.results||[]).map((x:any)=>`${esc(x.event_type)}: <b>${x.n}</b>`).join('\n')||'No events.'),backPanel([[{text:'Today',callback_data:'analytics:today'},{text:'7 days',callback_data:'analytics:7'},{text:'30 days',callback_data:'analytics:30'}]]));return}
  const {role}=await getRole(env,cb.from);await sendMessage(env,cb.message.chat.id,copy[localeOf(cb.from)].choose,mainKeyboard(env,origin,localeOf(cb.from),role));
 }
}

export async function ensureTelegramWebhook(env:Env,origin?:string){if(!env.BOT_TOKEN)return {ok:false,reason:'BOT_TOKEN missing'};const base=appUrl(env,origin);if(!base)return {ok:false,reason:'APP_URL missing'};const me=await tgApi(env,'getMe',{});const url=base+'/api/telegram/webhook';const body:any={url,allowed_updates:['message','callback_query'],drop_pending_updates:false};const secret=telegramWebhookSecret(env);if(secret)body.secret_token=secret;await tgApi(env,'setWebhook',body);await tgApi(env,'setChatMenuButton',{menu_button:{type:'web_app',text:copy.en.menu,web_app:{url:base}}});const info=await tgApi(env,'getWebhookInfo',{});return {ok:true,url,bot:`@${me.username||''}`,webhook:info}}
export async function repairTelegramBot(env:Env,origin:string){if(!env.BOT_TOKEN)throw new Error('BOT_TOKEN missing');const base=appUrl(env,origin);if(!base)throw new Error('Worker origin missing');const me=await tgApi(env,'getMe',{});await tgApi(env,'deleteWebhook',{drop_pending_updates:false});const webhookUrl=base+'/api/telegram/webhook';const body:any={url:webhookUrl,allowed_updates:['message','callback_query'],drop_pending_updates:false};const secret=telegramWebhookSecret(env);if(secret)body.secret_token=secret;await tgApi(env,'setWebhook',body);await tgApi(env,'setMyCommands',{commands:[{command:'start',description:'Open Chameleon Detailing'},{command:'panel',description:'Staff / Owner control panel'},{command:'services',description:'Services editor (staff)'},{command:'maintenance',description:'System settings / maintenance'},{command:'help',description:'Help'}]});await tgApi(env,'setChatMenuButton',{menu_button:{type:'web_app',text:copy.en.menu,web_app:{url:base}}});const info=await tgApi(env,'getWebhookInfo',{});const expected=webhookUrl,actual=String(info?.url||'');return {ok:actual===expected,bot:`@${me.username||''}`,botId:me.id,workerOrigin:base,expectedWebhook:expected,actualWebhook:actual,hasCustomSecret:!!secret,pendingUpdateCount:Number(info?.pending_update_count||0),lastErrorDate:info?.last_error_date||null,lastErrorMessage:info?.last_error_message||null,webhook:info,testBotUrl:`https://t.me/${me.username||'ChameleonDetailing_bot'}?start=webfix`}}
export async function telegramBotHealth(env:Env){if(!env.BOT_TOKEN)return {ok:false,botConfigured:false,reason:'BOT_TOKEN missing'};try{const me=await tgApi(env,'getMe',{});const webhook=await tgApi(env,'getWebhookInfo',{});return {ok:true,botConfigured:true,bot:`@${me.username||''}`,webhook}}catch(error){return {ok:false,botConfigured:true,reason:error instanceof Error?error.message:String(error)}}}
