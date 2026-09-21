import type {Env,TelegramUser} from './types';
import {ensureDb,event,getSetting,setSetting,upsertUser} from './db';
import {editMessage,sendMessage,tgApi} from './telegram';

type TgFrom={id:number;first_name?:string;last_name?:string;username?:string;language_code?:string};
type TgMessage={message_id:number;chat:{id:number;type:string};from?:TgFrom;text?:string;contact?:{phone_number:string;user_id?:number;first_name?:string;last_name?:string}};
type TgCallback={id:string;from:TgFrom;message?:TgMessage;data?:string};
type TgUpdate={update_id:number;message?:TgMessage;callback_query?:TgCallback};
type BotLocale='uk'|'pl'|'en';
type Role='OWNER'|'ADMIN'|'MANAGER'|'CLIENT';

const LOCKED_OWNER_ID='375938798';
const asUser=(u:TgFrom):TelegramUser=>({id:u.id,first_name:u.first_name||'Telegram user',last_name:u.last_name,username:u.username,language_code:u.language_code});
const esc=(s:string)=>String(s||'').replace(/[&<>]/g,c=>c==='&'?'&amp;':c==='<'?'&lt;':'&gt;');
const localeOf=(u?:TgFrom):BotLocale=>{const v=(u?.language_code||'').toLowerCase();return v.startsWith('uk')||v.startsWith('ua')?'uk':v.startsWith('pl')?'pl':'en'};
const isOwner=(env:Env,id:number|string|undefined)=>String(id??'')===String(env.OWNER_TELEGRAM_ID||LOCKED_OWNER_ID);

const copy={
 uk:{open:'🦎 Відкрити Chameleon Detailing',calculator:'🧮 Калькулятор',orders:'📋 Мої заявки',help:'💬 Допомога',hello:'Привіт',body:'Преміальний догляд за авто, розрахунок вартості та заявки — прямо в Telegram.',tap:'Натисніть кнопку нижче, щоб відкрити Mini App.',owner:'👑 Ви увійшли як Owner. Панель керування доступна нижче.',choose:'Оберіть дію нижче 👇',saved:'✅ Номер телефону збережено. Дякуємо.',own:'Будь ласка, поділіться власним контактом Telegram.',helpText:'<b>Chameleon Detailing — Допомога</b>\n\n/start — головне меню\n/panel — панель керування (staff)\n/help — допомога',menu:'Відкрити застосунок',panel:'👑 Панель Owner'},
 pl:{open:'🦎 Otwórz Chameleon Detailing',calculator:'🧮 Kalkulator',orders:'📋 Moje zlecenia',help:'💬 Pomoc',hello:'Cześć',body:'Pielęgnacja auta premium, wyceny i zlecenia — bezpośrednio w Telegramie.',tap:'Naciśnij przycisk poniżej, aby otworzyć Mini App.',owner:'👑 Jesteś zalogowany jako Owner. Panel zarządzania jest dostępny poniżej.',choose:'Wybierz działanie poniżej 👇',saved:'✅ Numer telefonu został zapisany. Dziękujemy.',own:'Udostępnij proszę swój własny kontakt Telegram.',helpText:'<b>Chameleon Detailing — Pomoc</b>\n\n/start — menu główne\n/panel — panel zarządzania (staff)\n/help — pomoc',menu:'Otwórz aplikację',panel:'👑 Panel Owner'},
 en:{open:'🦎 Open Chameleon Detailing',calculator:'🧮 Calculator',orders:'📋 My requests',help:'💬 Help',hello:'Hi',body:'Premium car care, estimates and requests — directly in Telegram.',tap:'Tap the button below to open the Mini App.',owner:'👑 You are signed in as Owner. The management panel is available below.',choose:'Choose an action below 👇',saved:'✅ Phone number saved. Thank you.',own:'Please share your own Telegram contact.',helpText:'<b>Chameleon Detailing — Help</b>\n\n/start — main menu\n/panel — staff management panel\n/help — help',menu:'Open app',panel:'👑 Owner Panel'}
} as const;

export const telegramWebhookSecret=(env:Env)=>{const v=String(env.TELEGRAM_WEBHOOK_SECRET||'').trim();return /^[A-Za-z0-9_-]{1,256}$/.test(v)?v:''};
function appUrl(env:Env,origin?:string){const live=(origin||'').trim();if(/^https:\/\//i.test(live))return live.replace(/\/$/,'');return String(env.APP_URL||'').replace(/\/$/,'')}
function mainKeyboard(env:Env,origin:string,locale:BotLocale,role:Role='CLIENT'){const c=copy[locale],url=appUrl(env,origin);const rows:any[]=[[{text:c.open,web_app:{url}}],[{text:c.calculator,web_app:{url:url+'/?startapp=calculator'}},{text:c.orders,web_app:{url:url+'/?startapp=orders'}}]];if(role==='OWNER'||role==='ADMIN'||role==='MANAGER')rows.push([{text:role==='OWNER'?c.panel:'🛠 Management panel',callback_data:'staff:panel'}]);rows.push([{text:c.help,callback_data:'help'}]);return {inline_keyboard:rows}}

const ownerKeyboard=()=>({inline_keyboard:[
 [{text:'📊 Dashboard',callback_data:'owner:dashboard'},{text:'👥 Users',callback_data:'owner:users'}],
 [{text:'💎 VIP',callback_data:'owner:vip'},{text:'✅ Whitelist',callback_data:'owner:whitelist'}],
 [{text:'🧑‍💼 Managers',callback_data:'owner:managers'},{text:'🛡 Admins',callback_data:'owner:admins'}],
 [{text:'🧽 Services',callback_data:'owner:services'},{text:'💰 Pricing',callback_data:'owner:pricing'}],
 [{text:'🧮 Calculator Rules',callback_data:'owner:calculator'},{text:'📝 Content',callback_data:'owner:content'}],
 [{text:'🌐 Languages',callback_data:'owner:languages'},{text:'🤝 Referrals',callback_data:'owner:referrals'}],
 [{text:'📈 Analytics',callback_data:'owner:analytics'},{text:'📜 Audit Log',callback_data:'owner:audit'}],
 [{text:'⚙️ Settings',callback_data:'owner:settings'}],
 [{text:'🦎 Client menu',callback_data:'owner:client'}]
]});
const backOwner=(extra:any[]=[])=>( {inline_keyboard:[...extra,[{text:'⬅️ Owner Panel',callback_data:'owner:home'}]]} );

async function registerUser(env:Env,from:TgFrom){const owner=isOwner(env,from.id);const u=await upsertUser(env,asUser(from),owner);await event(env,u.id,'bot_start');return u}
async function getRole(env:Env,from:TgFrom):Promise<{u:any;role:Role}>{const u=await registerUser(env,from);return {u,role:(isOwner(env,from.id)?'OWNER':String(u.role||'CLIENT')) as Role}}
async function safeEdit(env:Env,msg:TgMessage,text:string,reply_markup?:unknown){try{await editMessage(env,msg.chat.id,msg.message_id,text,reply_markup)}catch{await sendMessage(env,msg.chat.id,text,reply_markup)}}
async function audit(env:Env,actorId:number,action:string,entityType?:string,entityId?:string,newData?:unknown){if(!env.DB)return;await ensureDb(env);await env.DB.prepare('INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,new_data_json) VALUES(?,?,?,?,?)').bind(actorId,action,entityType||null,entityId||null,newData?JSON.stringify(newData):null).run()}
async function setBotState(env:Env,userId:number,state:string|null,payload:any={}){if(!env.DB)return;await ensureDb(env);if(!state){await env.DB.prepare('DELETE FROM bot_state WHERE user_id=?').bind(userId).run();return}await env.DB.prepare(`INSERT INTO bot_state(user_id,state,payload_json) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET state=excluded.state,payload_json=excluded.payload_json,updated_at=CURRENT_TIMESTAMP`).bind(userId,state,JSON.stringify(payload)).run()}
async function getBotState(env:Env,userId:number){if(!env.DB)return null;await ensureDb(env);return env.DB.prepare('SELECT state,payload_json FROM bot_state WHERE user_id=?').bind(userId).first<any>()}

async function welcome(env:Env,origin:string,msg:TgMessage,startPayload=''){
 if(!msg.from)return;const u=await registerUser(env,msg.from),locale=localeOf(msg.from),c=copy[locale];
 if(startPayload.startsWith('staff_'))await claimStaffInvite(env,msg.from,startPayload.slice(6));
 const {role}=await getRole(env,msg.from);const name=esc(msg.from.first_name||'friend');const roleText=role==='OWNER'?`\n\n${c.owner}`:'';
 await sendMessage(env,msg.chat.id,`🦎 <b>Chameleon Detailing</b>\n\n${c.hello}, <b>${name}</b>! ${c.body}${roleText}\n\n${c.tap}`,mainKeyboard(env,origin,locale,role));
 if(role==='OWNER')await sendMessage(env,msg.chat.id,'👑 <b>OWNER CONTROL PANEL</b>\n\nПовний контроль продукту доступний тут, у Telegram-боті. Mini App навмисно залишається клієнтським.',ownerKeyboard());
}
async function help(env:Env,origin:string,msg:TgMessage){const locale=localeOf(msg.from),c=copy[locale];const role=msg.from?(await getRole(env,msg.from)).role:'CLIENT';await sendMessage(env,msg.chat.id,c.helpText,mainKeyboard(env,origin,locale,role))}
async function saveContact(env:Env,origin:string,msg:TgMessage){const from=msg.from,contact=msg.contact;if(!from||!contact)return;const locale=localeOf(from),c=copy[locale];if(contact.user_id&&contact.user_id!==from.id){await sendMessage(env,msg.chat.id,c.own);return}const {u,role}=await getRole(env,from);if(env.DB&&u.id){await env.DB.prepare(`INSERT INTO client_profiles(user_id,phone_number,phone_verified_via_telegram,phone_shared_at) VALUES(?,?,1,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET phone_number=excluded.phone_number,phone_verified_via_telegram=1,phone_shared_at=CURRENT_TIMESTAMP`).bind(u.id,contact.phone_number).run();await event(env,u.id,'phone_shared_via_telegram')}await sendMessage(env,msg.chat.id,c.saved,mainKeyboard(env,origin,locale,role))}

async function ownerPanel(env:Env,msg:TgMessage,from:TgFrom){if(!isOwner(env,from.id)){await sendMessage(env,msg.chat.id,'⛔ Owner access required.');return}await safeEdit(env,msg,'👑 <b>OWNER CONTROL PANEL</b>\n\nКерування продуктом Chameleon Detailing.\nOwner ID: <code>375938798</code>',ownerKeyboard())}
async function ownerSection(env:Env,msg:TgMessage,from:TgFrom,section:string){if(!isOwner(env,from.id)){await sendMessage(env,msg.chat.id,'⛔ Owner access required.');return}if(!env.DB){await safeEdit(env,msg,'⚠️ <b>D1 is not connected.</b>',backOwner());return}await ensureDb(env);
 let text='';let kb:any=backOwner();
 if(section==='dashboard'){
  const [users,vip,reqs,admins,managers,calcs]=await Promise.all([
   env.DB.prepare('SELECT COUNT(*) n FROM users').first<any>(),env.DB.prepare("SELECT COUNT(*) n FROM client_profiles WHERE client_tier='VIP'").first<any>(),env.DB.prepare('SELECT COUNT(*) n FROM service_requests').first<any>(),env.DB.prepare("SELECT COUNT(*) n FROM users WHERE role='ADMIN'").first<any>(),env.DB.prepare("SELECT COUNT(*) n FROM users WHERE role='MANAGER'").first<any>(),env.DB.prepare('SELECT COUNT(*) n FROM calculator_sessions').first<any>()]);
  text=`📊 <b>Dashboard</b>\n\n👥 Users: <b>${users?.n||0}</b>\n💎 VIP: <b>${vip?.n||0}</b>\n🛡 Admins: <b>${admins?.n||0}</b>\n🧑‍💼 Managers: <b>${managers?.n||0}</b>\n🧮 Calculations: <b>${calcs?.n||0}</b>\n📋 Requests: <b>${reqs?.n||0}</b>`;
 }else if(section==='users'){
  const r=await env.DB.prepare('SELECT id,telegram_user_id,username,first_name,role,status FROM users ORDER BY id DESC LIMIT 12').all<any>();
  text='👥 <b>Users — latest</b>\n\n'+(r.results.map((x:any)=>`#${x.id} ${esc(x.first_name||'')} ${x.username?'@'+esc(x.username):''}\n<code>${x.telegram_user_id}</code> · ${x.role} · ${x.status}`).join('\n\n')||'No users yet.');
 }else if(section==='vip'){
  const r=await env.DB.prepare("SELECT u.first_name,u.username,u.telegram_user_id FROM users u JOIN client_profiles p ON p.user_id=u.id WHERE p.client_tier='VIP' ORDER BY p.vip_since DESC LIMIT 20").all<any>();
  text='💎 <b>VIP clients</b>\n\n'+(r.results.map((x:any)=>`${esc(x.first_name||'')} ${x.username?'@'+esc(x.username):''} · <code>${x.telegram_user_id}</code>`).join('\n')||'No VIP clients.');
 }else if(section==='whitelist'){
  const r=await env.DB.prepare('SELECT u.first_name,u.username,u.telegram_user_id FROM whitelist w JOIN users u ON u.id=w.user_id ORDER BY w.created_at DESC LIMIT 20').all<any>();
  text='✅ <b>Whitelist</b>\n\n'+(r.results.map((x:any)=>`${esc(x.first_name||'')} ${x.username?'@'+esc(x.username):''} · <code>${x.telegram_user_id}</code>`).join('\n')||'Whitelist is empty.');
 }else if(section==='admins'||section==='managers'){
  const role=section==='admins'?'ADMIN':'MANAGER';const r=await env.DB.prepare('SELECT id,first_name,username,telegram_user_id FROM users WHERE role=? ORDER BY id DESC LIMIT 20').bind(role).all<any>();
  text=`${role==='ADMIN'?'🛡':'🧑‍💼'} <b>${role==='ADMIN'?'Admins':'Managers'}</b>\n\n`+(r.results.map((x:any)=>`${esc(x.first_name||'')} ${x.username?'@'+esc(x.username):''} · <code>${x.telegram_user_id}</code>`).join('\n')||`No ${role.toLowerCase()}s.`);
  const addCb=role==='ADMIN'?'owner:admin:add':'owner:manager:add';kb=backOwner([[{text:role==='ADMIN'?'➕ Add Admin':'➕ Add Manager',callback_data:addCb}]]);
 }else if(section==='services'||section==='pricing'){
  const r=await env.DB.prepare(`SELECT s.slug,s.enabled,p.base_price,p.base_currency,COALESCE(t.title,s.slug) title FROM services s LEFT JOIN service_translations t ON t.service_id=s.id AND t.locale='en' LEFT JOIN service_prices p ON p.service_id=s.id ORDER BY s.sort_order`).all<any>();
  text=`${section==='services'?'🧽 <b>Services</b>':'💰 <b>Pricing</b>'}\n\n`+r.results.map((x:any)=>`${x.enabled?'✅':'⛔'} <b>${esc(x.title)}</b>\n${x.slug} · ${Number(x.base_price||0).toFixed(2)} ${x.base_currency||'PLN'}`).join('\n\n');
 }else if(section==='calculator'){
  const em=await getSetting(env,'emergency_multiplier','1.5'),enabled=await getSetting(env,'emergency_enabled','0');text=`🧮 <b>Calculator Rules</b>\n\nEmergency: <b>${enabled==='1'?'ON':'OFF'}</b>\nEmergency multiplier: <b>${esc(em)}</b>\nReporting currency: <b>${esc(await getSetting(env,'reporting_currency','PLN'))}</b>`;
 }else if(section==='content'){text='📝 <b>Content</b>\n\nBot welcome, product copy and UI content are managed from settings/content records. A dedicated editor flow can be extended from this panel.';
 }else if(section==='languages'){text='🌐 <b>Languages</b>\n\n✅ Ukrainian (uk)\n✅ Polish (pl)\n✅ English (en)\n\nMini App and bot locale are selected from Telegram language with EN fallback.';
 }else if(section==='referrals'){
  const r=await env.DB.prepare("SELECT COUNT(*) n FROM analytics_events WHERE event_type LIKE 'referral%'").first<any>();text=`🤝 <b>Referrals</b>\n\nTracked referral events: <b>${r?.n||0}</b>`;
 }else if(section==='analytics'){
  const r=await env.DB.prepare("SELECT event_type,COUNT(*) n FROM analytics_events GROUP BY event_type ORDER BY n DESC LIMIT 12").all<any>();text='📈 <b>Analytics</b>\n\n'+(r.results.map((x:any)=>`${esc(x.event_type)}: <b>${x.n}</b>`).join('\n')||'No events yet.');
 }else if(section==='audit'){
  const r=await env.DB.prepare('SELECT action,entity_type,entity_id,created_at FROM audit_log ORDER BY id DESC LIMIT 12').all<any>();text='📜 <b>Audit Log</b>\n\n'+(r.results.map((x:any)=>`${esc(x.created_at)}\n<b>${esc(x.action)}</b>${x.entity_type?' · '+esc(x.entity_type):''}${x.entity_id?' #'+esc(x.entity_id):''}`).join('\n\n')||'Audit log is empty.');
 }else if(section==='settings'){
  const maintenance=await getSetting(env,'maintenance.enabled','0');const days=await getSetting(env,'working_days','1,2,3,4,5'),hours=await getSetting(env,'working_hours','09:00-18:00');text=`⚙️ <b>Settings</b>\n\nMaintenance: <b>${maintenance==='1'?'ON':'OFF'}</b>\nWorking days: <code>${esc(days)}</code>\nWorking hours: <code>${esc(hours)}</code>\nTimezone: <code>${esc(await getSetting(env,'business_timezone','Europe/Warsaw'))}</code>`;kb=backOwner([[{text:maintenance==='1'?'🟢 Disable maintenance':'🔴 Enable maintenance',callback_data:'owner:maintenance:toggle'}]]);
 }else{text='👑 <b>OWNER CONTROL PANEL</b>';kb=ownerKeyboard()}
 await safeEdit(env,msg,text,kb);
}

async function beginStaffAdd(env:Env,msg:TgMessage,from:TgFrom,role:'ADMIN'|'MANAGER'){if(!isOwner(env,from.id)){await sendMessage(env,msg.chat.id,'⛔ Owner access required.');return}const {u}=await getRole(env,from);await setBotState(env,u.id,role==='ADMIN'?'ADD_ADMIN':'ADD_MANAGER');await safeEdit(env,msg,`${role==='ADMIN'?'🛡':'🧑‍💼'} <b>Add ${role}</b>\n\nНадішли одним повідомленням Telegram username у форматі <code>@username</code>.\n\nЯкщо користувач уже запускав бота — роль активується одразу. Якщо ні — я створю персональне deep-link запрошення.`,backOwner())}
async function handleOwnerTextState(env:Env,origin:string,msg:TgMessage,from:TgFrom,u:any){const st=await getBotState(env,u.id);if(!st?.state)return false;if(st.state!=='ADD_ADMIN'&&st.state!=='ADD_MANAGER')return false;const role:Role=st.state==='ADD_ADMIN'?'ADMIN':'MANAGER';const raw=(msg.text||'').trim();const username=raw.replace(/^@/,'').trim();if(!/^[A-Za-z0-9_]{5,32}$/.test(username)){await sendMessage(env,msg.chat.id,'⚠️ Надішли коректний <code>@username</code>.');return true}await ensureDb(env);const known=await env.DB!.prepare('SELECT id,telegram_user_id,username,role FROM users WHERE lower(username)=lower(?) LIMIT 1').bind(username).first<any>();if(known){await env.DB!.prepare('UPDATE users SET role=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(role,known.id).run();await audit(env,u.id,'staff.role.assign','user',String(known.id),{role,username});await setBotState(env,u.id,null);await sendMessage(env,msg.chat.id,`✅ <b>@${esc(username)}</b> тепер має роль <b>${role}</b>.`,ownerKeyboard());return true}
 const token=crypto.randomUUID().replace(/-/g,'').slice(0,24);await env.DB!.prepare('INSERT INTO staff_invites(token,username,role,created_by_user_id) VALUES(?,?,?,?)').bind(token,username,role,u.id).run();await audit(env,u.id,'staff.invite.create','staff_invite',token,{role,username});await setBotState(env,u.id,null);const bot=String(env.BOT_USERNAME||'ChameleonDetailing_bot').replace(/^@/,'');const link=`https://t.me/${bot}?start=staff_${token}`;await sendMessage(env,msg.chat.id,`🕓 Користувач <b>@${esc(username)}</b> ще не відомий боту.\n\nНадішли йому персональне запрошення:\n${esc(link)}\n\nПісля відкриття /start Telegram ID буде підтверджений і роль <b>${role}</b> активується.`,ownerKeyboard());return true}
async function claimStaffInvite(env:Env,from:TgFrom,token:string){if(!env.DB||!token)return;await ensureDb(env);const inv=await env.DB.prepare("SELECT * FROM staff_invites WHERE token=? AND status='PENDING'").bind(token).first<any>();if(!inv)return;const username=String(from.username||'').toLowerCase();if(!username||username!==String(inv.username||'').toLowerCase())return;const u=await upsertUser(env,asUser(from),false);await env.DB.prepare('UPDATE users SET role=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(inv.role,u.id).run();await env.DB.prepare("UPDATE staff_invites SET status='CLAIMED',claimed_by_user_id=?,claimed_at=CURRENT_TIMESTAMP WHERE token=?").bind(u.id,token).run();await audit(env,Number(inv.created_by_user_id||0),'staff.invite.claim','user',String(u.id),{role:inv.role,username:inv.username})}

export async function handleBotUpdate(env:Env,origin:string,update:TgUpdate){
 const msg=update.message;
 if(msg){
  if(msg.contact){await saveContact(env,origin,msg);return}
  const text=(msg.text||'').trim();
  const start=text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);if(start){await welcome(env,origin,msg,start[1]||'');return}
  if(/^\/(panel|owner)(?:@\w+)?(?:\s|$)/i.test(text)&&msg.from){const {role}=await getRole(env,msg.from);if(role==='OWNER')await sendMessage(env,msg.chat.id,'👑 <b>OWNER CONTROL PANEL</b>\n\nПовний контроль продукту доступний у Bot Panel.',ownerKeyboard());else await sendMessage(env,msg.chat.id,'⛔ Owner access required.');return}
  if(/^\/help(?:@\w+)?(?:\s|$)/i.test(text)){await help(env,origin,msg);return}
  if(msg.from){const {u,role}=await getRole(env,msg.from);if(role==='OWNER'&&text&&await handleOwnerTextState(env,origin,msg,msg.from,u))return;if(text){const locale=localeOf(msg.from);await sendMessage(env,msg.chat.id,copy[locale].choose,mainKeyboard(env,origin,locale,role));return}}
 }
 const cb=update.callback_query;
 if(cb){
  await tgApi(env,'answerCallbackQuery',{callback_query_id:cb.id});if(!cb.message)return;
  if(cb.data==='help'){await help(env,origin,{...cb.message,from:cb.from});return}
  if(cb.data==='staff:panel'){const {role}=await getRole(env,cb.from);if(role==='OWNER'){await ownerPanel(env,cb.message,cb.from);return}await safeEdit(env,cb.message,'🛠 <b>Management Panel</b>\n\nRole: '+esc(role)+'\n\nYour role-specific operational panel is active.',backOwner());return}
  if(cb.data==='owner:home'){await ownerPanel(env,cb.message,cb.from);return}
  if(cb.data==='owner:client'){const {role}=await getRole(env,cb.from);await safeEdit(env,cb.message,'🦎 <b>Chameleon Detailing</b>\n\nClient menu',mainKeyboard(env,origin,localeOf(cb.from),role));return}
  if(cb.data==='owner:admin:add'){await beginStaffAdd(env,cb.message,cb.from,'ADMIN');return}
  if(cb.data==='owner:manager:add'){await beginStaffAdd(env,cb.message,cb.from,'MANAGER');return}
  if(cb.data==='owner:maintenance:toggle'){
   if(!isOwner(env,cb.from.id))return;const actor=await registerUser(env,cb.from);const old=await getSetting(env,'maintenance.enabled','0');const next=old==='1'?'0':'1';await setSetting(env,'maintenance.enabled',next);await audit(env,actor.id,'settings.maintenance.toggle','settings','maintenance.enabled',{value:next});await ownerSection(env,cb.message,cb.from,'settings');return;
  }
  if((cb.data||'').startsWith('owner:')){await ownerSection(env,cb.message,cb.from,(cb.data||'').slice(6));return}
  const {role}=await getRole(env,cb.from);await sendMessage(env,cb.message.chat.id,copy[localeOf(cb.from)].choose,mainKeyboard(env,origin,localeOf(cb.from),role));
 }
}

export async function ensureTelegramWebhook(env:Env,origin?:string){if(!env.BOT_TOKEN)return {ok:false,reason:'BOT_TOKEN missing'};const base=appUrl(env,origin);if(!base)return {ok:false,reason:'APP_URL missing'};const me=await tgApi(env,'getMe',{});const url=base+'/api/telegram/webhook';const body:any={url,allowed_updates:['message','callback_query'],drop_pending_updates:false};const secret=telegramWebhookSecret(env);if(secret)body.secret_token=secret;await tgApi(env,'setWebhook',body);await tgApi(env,'setChatMenuButton',{menu_button:{type:'web_app',text:copy.en.menu,web_app:{url:base}}});const info=await tgApi(env,'getWebhookInfo',{});return {ok:true,url,bot:`@${me.username||''}`,webhook:info}}
export async function repairTelegramBot(env:Env,origin:string){if(!env.BOT_TOKEN)throw new Error('BOT_TOKEN missing');const base=appUrl(env,origin);if(!base)throw new Error('Worker origin missing');const me=await tgApi(env,'getMe',{});await tgApi(env,'deleteWebhook',{drop_pending_updates:false});const webhookUrl=base+'/api/telegram/webhook';const body:any={url:webhookUrl,allowed_updates:['message','callback_query'],drop_pending_updates:false};const secret=telegramWebhookSecret(env);if(secret)body.secret_token=secret;await tgApi(env,'setWebhook',body);await tgApi(env,'setMyCommands',{commands:[{command:'start',description:'Open Chameleon Detailing'},{command:'panel',description:'Staff / Owner control panel'},{command:'help',description:'Help'}]});await tgApi(env,'setChatMenuButton',{menu_button:{type:'web_app',text:copy.en.menu,web_app:{url:base}}});const info=await tgApi(env,'getWebhookInfo',{});const expected=webhookUrl,actual=String(info?.url||'');return {ok:actual===expected,bot:`@${me.username||''}`,botId:me.id,workerOrigin:base,expectedWebhook:expected,actualWebhook:actual,hasCustomSecret:!!secret,pendingUpdateCount:Number(info?.pending_update_count||0),lastErrorDate:info?.last_error_date||null,lastErrorMessage:info?.last_error_message||null,webhook:info,testBotUrl:`https://t.me/${me.username||'ChameleonDetailing_bot'}?start=webfix`}}
export async function telegramBotHealth(env:Env){if(!env.BOT_TOKEN)return {ok:false,botConfigured:false,reason:'BOT_TOKEN missing'};try{const me=await tgApi(env,'getMe',{});const webhook=await tgApi(env,'getWebhookInfo',{});return {ok:true,botConfigured:true,bot:`@${me.username||''}`,webhook}}catch(error){return {ok:false,botConfigured:true,reason:error instanceof Error?error.message:String(error)}}}
