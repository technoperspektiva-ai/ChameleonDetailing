import type {SheetsEnv,SheetsInterval} from './sheets';
import {checkGoogleSheetsHealth,getGoogleSheetsState,setGoogleSheetsInterval,syncGoogleSheets} from './sheets';
import {ensureDb} from './db';
import {editMessage,sendMessage,tgApi} from './telegram';

type Locale='uk'|'pl'|'en';
type TgFrom={id:number;first_name?:string;username?:string;language_code?:string};
type TgMessage={message_id:number;chat:{id:number;type:string};from?:TgFrom;text?:string};
type TgUpdate={message?:TgMessage;callback_query?:{id:string;from:TgFrom;message?:TgMessage;data?:string}};
const esc=(v:unknown)=>String(v??'').replace(/[&<>]/g,c=>c==='&'?'&amp;':c==='<'?'&lt;':'&gt;');
const l3=(locale:Locale,uk:string,pl:string,en:string)=>locale==='uk'?uk:locale==='pl'?pl:en;
const localeFrom=(value?:string):Locale=>{const v=String(value||'').toLowerCase();return v.startsWith('uk')||v.startsWith('ua')?'uk':v.startsWith('pl')?'pl':'en'};

async function staff(env:SheetsEnv,from:TgFrom){
 if(String(from.id)===String(env.OWNER_TELEGRAM_ID))return {role:'OWNER',locale:localeFrom(from.language_code)} as const;
 if(!env.DB)return null;
 await ensureDb(env);
 const row=await env.DB.prepare('SELECT role,management_language,language FROM users WHERE telegram_user_id=?').bind(from.id).first<any>();
 if(!row||!['OWNER','ADMIN'].includes(String(row.role||'')))return null;
 return {role:String(row.role) as 'OWNER'|'ADMIN',locale:localeFrom(row.management_language||row.language||from.language_code)};
}
const fmt=(v:string)=>v?String(v).slice(0,16).replace('T',' '):'—';
const intervalText=(locale:Locale,v:SheetsInterval)=>v==='OFF'?l3(locale,'Вимкнено','Wyłączone','Off'):v==='1h'?l3(locale,'Щогодини','Co godzinę','Every hour'):v==='6h'?l3(locale,'Кожні 6 годин','Co 6 godzin','Every 6 hours'):l3(locale,'Раз на добу','Raz dziennie','Every 24 hours');

async function render(env:SheetsEnv,msg:TgMessage,from:TgFrom,notice='',originMessageId=0){
 const access=await staff(env,from);if(!access)return;
 const locale=access.locale,state=await getGoogleSheetsState(env);
 const status=state.configured?(state.lastStatus==='ERROR'?'🔴 ERROR':'🟢 '+(state.lastStatus==='OK'?'OK':l3(locale,'Налаштовано','Skonfigurowano','Configured'))):'⚪️ '+l3(locale,'Не підключено','Nie podłączono','Not connected');
 const body=l3(locale,
  `📗 <b>Google Sheets — звіти</b>\n\nСтатус: <b>${status}</b>\nАвтосинхронізація: <b>${intervalText(locale,state.interval)}</b>\nОстання успішна синхронізація: <code>${fmt(state.lastSyncAt)}</code>\nОстання спроба: <code>${fmt(state.lastAttemptAt)}</code>${state.lastError?`\n\n⚠️ ${esc(state.lastError)}`:''}${notice?`\n\n${notice}`:''}\n\nD1 залишається основною базою. У таблицю відправляється пакетний знімок звітів — не кожна дія користувача окремо.`,
  `📗 <b>Google Sheets — raporty</b>\n\nStatus: <b>${status}</b>\nAutosynchronizacja: <b>${intervalText(locale,state.interval)}</b>\nOstatnia udana synchronizacja: <code>${fmt(state.lastSyncAt)}</code>\nOstatnia próba: <code>${fmt(state.lastAttemptAt)}</code>${state.lastError?`\n\n⚠️ ${esc(state.lastError)}`:''}${notice?`\n\n${notice}`:''}\n\nD1 pozostaje główną bazą. Do arkusza wysyłany jest zbiorczy snapshot raportów, a nie każde działanie osobno.`,
  `📗 <b>Google Sheets — reports</b>\n\nStatus: <b>${status}</b>\nAuto sync: <b>${intervalText(locale,state.interval)}</b>\nLast successful sync: <code>${fmt(state.lastSyncAt)}</code>\nLast attempt: <code>${fmt(state.lastAttemptAt)}</code>${state.lastError?`\n\n⚠️ ${esc(state.lastError)}`:''}${notice?`\n\n${notice}`:''}\n\nD1 remains the source of truth. The sheet receives a batched report snapshot, not every user action individually.`);
 const oid=Number(originMessageId||0);
 const suffix=oid?':'+oid:'';
 const rows:any[]=[
  [{text:l3(locale,'🔄 Синхронізувати зараз','🔄 Synchronizuj teraz','🔄 Sync now'),callback_data:'sheets:sync'+suffix},{text:l3(locale,'🩺 Перевірити','🩺 Sprawdź','🩺 Check'),callback_data:'sheets:health'+suffix}],
  [{text:`${state.interval==='OFF'?'✅ ':''}OFF`,callback_data:'sheets:interval:OFF'+suffix},{text:`${state.interval==='1h'?'✅ ':''}1h`,callback_data:'sheets:interval:1h'+suffix},{text:`${state.interval==='6h'?'✅ ':''}6h`,callback_data:'sheets:interval:6h'+suffix},{text:`${state.interval==='24h'?'✅ ':''}24h`,callback_data:'sheets:interval:24h'+suffix}],
 ];
 if(state.sheetUrl)rows.push([{text:l3(locale,'🔗 Відкрити таблицю','🔗 Otwórz arkusz','🔗 Open Sheet'),url:state.sheetUrl}]);
 rows.push([{text:l3(locale,'📥 Звичайні Excel-звіти','📥 Zwykłe raporty Excel','📥 Standard Excel reports'),callback_data:'panel:reports'}]);
 rows.push([{text:l3(locale,'✅ Дія завершена','✅ Zakończono','✅ Done'),callback_data:'sheets:done'+suffix}]);
 try{await editMessage(env,msg.chat.id,msg.message_id,body,{inline_keyboard:rows})}catch{await sendMessage(env,msg.chat.id,body,{inline_keyboard:rows})}
}

export function isGoogleSheetsUpdate(update:TgUpdate){
 const text=String(update.message?.text||'');
 const data=String(update.callback_query?.data||'');
 return /^\/(sheets|gsheets)(?:@\w+)?(?:\s|$)/i.test(text)||data.startsWith('sheets:');
}

export async function handleGoogleSheetsTelegramUpdate(env:SheetsEnv,update:TgUpdate){
 const msg=update.callback_query?.message||update.message;const from=update.callback_query?.from||update.message?.from;
 if(!msg||!from)return false;
 if(update.callback_query)await tgApi(env,'answerCallbackQuery',{callback_query_id:update.callback_query.id}).catch(()=>{});
 if(msg.chat.type!=='private'){
  if(update.message)await sendMessage(env,msg.chat.id,l3(localeFrom(from.language_code),'🔒 Google Sheets керування доступне лише в особистому чаті з ботом.','🔒 Zarządzanie Google Sheets jest dostępne tylko w prywatnym czacie z botem.','🔒 Google Sheets management is available only in a private chat with the bot.')).catch(()=>{});
  return true;
 }
 const access=await staff(env,from);
 if(!access){await sendMessage(env,msg.chat.id,l3(localeFrom(from.language_code),'⛔ Доступ лише для Owner / Admin.','⛔ Dostęp tylko dla Owner / Admin.','⛔ Owner / Admin only.')).catch(()=>{});return true}
 const locale=access.locale,data=String(update.callback_query?.data||'');
 const parts=data.split(':');const originMessageId=Number(parts[parts.length-1])||0;
 if(!data){await render(env,msg,from,'',update.message?.message_id||0);return true}
 if(data.startsWith('sheets:done')){await tgApi(env,'deleteMessage',{chat_id:msg.chat.id,message_id:msg.message_id}).catch(()=>{});if(originMessageId&&originMessageId!==msg.message_id)await tgApi(env,'deleteMessage',{chat_id:msg.chat.id,message_id:originMessageId}).catch(()=>{});return true}
  if(data.startsWith('sheets:sync')){
  try{const result=await syncGoogleSheets(env,'manual');const total=Object.values(result.rowCounts||{}).reduce((a:any,b:any)=>Number(a)+Number(b),0);await render(env,msg,from,l3(locale,`✅ Синхронізовано. Рядків у звітах: <b>${total}</b>.`,`✅ Zsynchronizowano. Wierszy raportów: <b>${total}</b>.`,`✅ Synced. Report rows: <b>${total}</b>.`),originMessageId)}catch(e:any){await render(env,msg,from,`⚠️ ${esc(e?.message||e)}`,originMessageId)}return true;
 }
 if(data.startsWith('sheets:health')){
  try{const health=await checkGoogleSheetsHealth(env);await render(env,msg,from,l3(locale,`✅ Apps Script відповідає. Таблиця: <b>${esc(health.title||'OK')}</b>.`,`✅ Apps Script odpowiada. Arkusz: <b>${esc(health.title||'OK')}</b>.`,`✅ Apps Script is responding. Sheet: <b>${esc(health.title||'OK')}</b>.`),originMessageId)}catch(e:any){await render(env,msg,from,`⚠️ ${esc(e?.message||e)}`,originMessageId)}return true;
 }
 const interval=data.match(/^sheets:interval:(OFF|1h|6h|24h)(?::\d+)?$/);if(interval){await setGoogleSheetsInterval(env,interval[1] as SheetsInterval);await render(env,msg,from,l3(locale,'✅ Період синхронізації змінено.','✅ Zmieniono okres synchronizacji.','✅ Sync interval updated.'),originMessageId);return true}
 await render(env,msg,from,'',originMessageId);return true;
}
