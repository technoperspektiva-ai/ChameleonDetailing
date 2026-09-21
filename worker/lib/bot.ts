import type {Env,TelegramUser} from './types';
import {event,upsertUser} from './db';
import {sendMessage,tgApi} from './telegram';

type TgFrom={id:number;first_name?:string;last_name?:string;username?:string;language_code?:string};
type TgMessage={message_id:number;chat:{id:number;type:string};from?:TgFrom;text?:string;contact?:{phone_number:string;user_id?:number;first_name?:string;last_name?:string}};
type TgCallback={id:string;from:TgFrom;message?:TgMessage;data?:string};
type TgUpdate={update_id:number;message?:TgMessage;callback_query?:TgCallback};
type BotLocale='uk'|'pl'|'en';

const asUser=(u:TgFrom):TelegramUser=>({id:u.id,first_name:u.first_name||'Telegram user',last_name:u.last_name,username:u.username,language_code:u.language_code});
const esc=(s:string)=>s.replace(/[&<>]/g,c=>c==='&'?'&amp;':c==='<'?'&lt;':'&gt;');
const localeOf=(u?:TgFrom):BotLocale=>{const v=(u?.language_code||'').toLowerCase();return v.startsWith('uk')||v.startsWith('ua')?'uk':v.startsWith('pl')?'pl':'en'};

const copy={
 uk:{open:'🦎 Відкрити Chameleon Detailing',calculator:'🧮 Калькулятор',orders:'📋 Мої заявки',help:'💬 Допомога',hello:'Привіт',body:'Преміальний догляд за авто, розрахунок вартості та заявки — прямо в Telegram.',tap:'Натисніть кнопку нижче, щоб відкрити Mini App.',owner:'👑 Доступ власника активний.',choose:'Оберіть дію нижче 👇',saved:'✅ Номер телефону збережено. Дякуємо.',own:'Будь ласка, поділіться власним контактом Telegram.',helpText:'<b>Chameleon Detailing — Допомога</b>\n\n/start — головне меню\n/help — допомога\n\nПослуги, калькулятор, заявки та профіль доступні у Mini App.',menu:'Відкрити застосунок'},
 pl:{open:'🦎 Otwórz Chameleon Detailing',calculator:'🧮 Kalkulator',orders:'📋 Moje zlecenia',help:'💬 Pomoc',hello:'Cześć',body:'Pielęgnacja auta premium, wyceny i zlecenia — bezpośrednio w Telegramie.',tap:'Naciśnij przycisk poniżej, aby otworzyć Mini App.',owner:'👑 Dostęp właściciela jest aktywny.',choose:'Wybierz działanie poniżej 👇',saved:'✅ Numer telefonu został zapisany. Dziękujemy.',own:'Udostępnij proszę swój własny kontakt Telegram.',helpText:'<b>Chameleon Detailing — Pomoc</b>\n\n/start — menu główne\n/help — pomoc\n\nUsługi, kalkulator, zlecenia i profil są dostępne w Mini App.',menu:'Otwórz aplikację'},
 en:{open:'🦎 Open Chameleon Detailing',calculator:'🧮 Calculator',orders:'📋 My requests',help:'💬 Help',hello:'Hi',body:'Premium car care, estimates and requests — directly in Telegram.',tap:'Tap the button below to open the Mini App.',owner:'👑 Owner access is active.',choose:'Choose an action below 👇',saved:'✅ Phone number saved. Thank you.',own:'Please share your own Telegram contact.',helpText:'<b>Chameleon Detailing — Help</b>\n\n/start — main menu\n/help — help\n\nServices, calculator, requests and your profile are available in the Mini App.',menu:'Open app'}
} as const;

export const telegramWebhookSecret=(env:Env)=>{const v=String(env.TELEGRAM_WEBHOOK_SECRET||'').trim();return /^[A-Za-z0-9_-]{1,256}$/.test(v)?v:''};

// During a live Worker request, the current request origin is the source of truth.
// APP_URL is used only when there is no request origin (for example a cron trigger).
function appUrl(env:Env,origin?:string){
 const live=(origin||'').trim();
 if(/^https:\/\//i.test(live))return live.replace(/\/$/,'');
 return String(env.APP_URL||'').replace(/\/$/,'');
}
function mainKeyboard(env:Env,origin:string,locale:BotLocale){const c=copy[locale],url=appUrl(env,origin);return {inline_keyboard:[
  [{text:c.open,web_app:{url}}],
  [{text:c.calculator,web_app:{url:url+'/?startapp=calculator'}},{text:c.orders,web_app:{url:url+'/?startapp=orders'}}],
  [{text:c.help,callback_data:'help'}]
]}}

async function registerUser(env:Env,from:TgFrom){
 const owner=String(from.id)===String(env.OWNER_TELEGRAM_ID);
 const u=await upsertUser(env,asUser(from),owner);
 await event(env,u.id,'bot_start');
 return u;
}

async function welcome(env:Env,origin:string,msg:TgMessage){
 if(!msg.from)return;
 const u=await registerUser(env,msg.from),locale=localeOf(msg.from),c=copy[locale];
 const name=esc(msg.from.first_name||'friend');
 const role=u.role==='OWNER'?`\n\n${c.owner}`:'';
 await sendMessage(env,msg.chat.id,`🦎 <b>Chameleon Detailing</b>\n\n${c.hello}, <b>${name}</b>! ${c.body}${role}\n\n${c.tap}`,mainKeyboard(env,origin,locale));
}

async function help(env:Env,origin:string,msg:TgMessage){
 const locale=localeOf(msg.from),c=copy[locale];
 await sendMessage(env,msg.chat.id,c.helpText,mainKeyboard(env,origin,locale));
}

async function saveContact(env:Env,origin:string,msg:TgMessage){
 const from=msg.from,contact=msg.contact;if(!from||!contact)return;
 const locale=localeOf(from),c=copy[locale];
 if(contact.user_id&&contact.user_id!==from.id){await sendMessage(env,msg.chat.id,c.own);return}
 const u=await registerUser(env,from);
 if(env.DB&&u.id){
  await env.DB.prepare(`INSERT INTO client_profiles(user_id,phone_number,phone_verified_via_telegram,phone_shared_at) VALUES(?,?,1,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET phone_number=excluded.phone_number,phone_verified_via_telegram=1,phone_shared_at=CURRENT_TIMESTAMP`).bind(u.id,contact.phone_number).run();
  await event(env,u.id,'phone_shared_via_telegram');
 }
 await sendMessage(env,msg.chat.id,c.saved,mainKeyboard(env,origin,locale));
}

export async function handleBotUpdate(env:Env,origin:string,update:TgUpdate){
 const msg=update.message;
 if(msg){
  if(msg.contact){await saveContact(env,origin,msg);return}
  const text=(msg.text||'').trim();
  if(/^\/start(?:@\w+)?(?:\s|$)/i.test(text)){await welcome(env,origin,msg);return}
  if(/^\/help(?:@\w+)?(?:\s|$)/i.test(text)){await help(env,origin,msg);return}
  if(text){const locale=localeOf(msg.from);await sendMessage(env,msg.chat.id,copy[locale].choose,mainKeyboard(env,origin,locale));return}
 }
 const cb=update.callback_query;
 if(cb){
  await tgApi(env,'answerCallbackQuery',{callback_query_id:cb.id});
  if(cb.message){
   if(cb.data==='help')await help(env,origin,{...cb.message,from:cb.from});
   else{const locale=localeOf(cb.from);await sendMessage(env,cb.message.chat.id,copy[locale].choose,mainKeyboard(env,origin,locale));}
  }
 }
}

export async function ensureTelegramWebhook(env:Env,origin?:string){
 if(!env.BOT_TOKEN)return {ok:false,reason:'BOT_TOKEN missing'};
 const base=appUrl(env,origin);
 if(!base)return {ok:false,reason:'APP_URL missing'};
 const me=await tgApi(env,'getMe',{});
 const url=base+'/api/telegram/webhook';
 const body:any={url,allowed_updates:['message','callback_query'],drop_pending_updates:false};
 const secret=telegramWebhookSecret(env);
 if(secret)body.secret_token=secret;
 await tgApi(env,'setWebhook',body);
 const locale:BotLocale='en';
 await tgApi(env,'setChatMenuButton',{menu_button:{type:'web_app',text:copy[locale].menu,web_app:{url:base}}});
 const info=await tgApi(env,'getWebhookInfo',{});
 return {ok:true,url,bot:`@${me.username||''}`,webhook:info};
}

export async function telegramBotHealth(env:Env){
 if(!env.BOT_TOKEN)return {ok:false,botConfigured:false,reason:'BOT_TOKEN missing'};
 try{
  const me=await tgApi(env,'getMe',{});
  const webhook=await tgApi(env,'getWebhookInfo',{});
  return {ok:true,botConfigured:true,bot:`@${me.username||''}`,webhook};
 }catch(error){return {ok:false,botConfigured:true,reason:error instanceof Error?error.message:String(error)}}
}
