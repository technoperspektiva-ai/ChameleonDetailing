import type {Env,TelegramUser} from './types';
import {event,upsertUser} from './db';
import {sendMessage,tgApi} from './telegram';

type TgFrom={id:number;first_name?:string;last_name?:string;username?:string;language_code?:string};
type TgMessage={message_id:number;chat:{id:number;type:string};from?:TgFrom;text?:string;contact?:{phone_number:string;user_id?:number;first_name?:string;last_name?:string}};
type TgCallback={id:string;from:TgFrom;message?:TgMessage;data?:string};
type TgUpdate={update_id:number;message?:TgMessage;callback_query?:TgCallback};

const asUser=(u:TgFrom):TelegramUser=>({id:u.id,first_name:u.first_name||'Telegram user',last_name:u.last_name,username:u.username,language_code:u.language_code});
const esc=(s:string)=>s.replace(/[&<>]/g,c=>c==='&'?'&amp;':c==='<'?'&lt;':'&gt;');

function appUrl(env:Env,origin:string){return String(env.APP_URL||origin).replace(/\/$/,'')}
function mainKeyboard(env:Env,origin:string){return {inline_keyboard:[
  [{text:'🦎 Open Chameleon Detailing',web_app:{url:appUrl(env,origin)}}],
  [{text:'🧮 Calculator',web_app:{url:appUrl(env,origin)+'/?startapp=calculator'}},{text:'📋 My orders',web_app:{url:appUrl(env,origin)+'/?startapp=orders'}}],
  [{text:'💬 Help',callback_data:'help'}]
]}}

async function registerUser(env:Env,from:TgFrom){
 const owner=String(from.id)===String(env.OWNER_TELEGRAM_ID);
 const u=await upsertUser(env,asUser(from),owner);
 await event(env,u.id,'bot_start');
 return u;
}

async function welcome(env:Env,origin:string,msg:TgMessage){
 if(!msg.from)return;
 const u=await registerUser(env,msg.from);
 const name=esc(msg.from.first_name||'friend');
 const role=u.role==='OWNER'?'\n\n👑 Owner access is active.':'';
 await sendMessage(env,msg.chat.id,`🦎 <b>Chameleon Detailing</b>\n\nHi, <b>${name}</b>! Premium car care, booking and estimates — directly in Telegram.${role}\n\nTap the button below to open the Mini App.`,mainKeyboard(env,origin));
}

async function help(env:Env,origin:string,msg:TgMessage){
 await sendMessage(env,msg.chat.id,'<b>Chameleon Detailing — Help</b>\n\n/start — main menu\n/help — help\n\nUse the Mini App for services, calculator, requests and your profile.',mainKeyboard(env,origin));
}

async function saveContact(env:Env,msg:TgMessage){
 const from=msg.from,contact=msg.contact;if(!from||!contact)return;
 if(contact.user_id&&contact.user_id!==from.id){await sendMessage(env,msg.chat.id,'Please share your own Telegram contact.');return}
 const u=await registerUser(env,from);
 if(env.DB&&u.id){
  await env.DB.prepare(`INSERT INTO client_profiles(user_id,phone_number,phone_verified_via_telegram,phone_shared_at) VALUES(?,?,1,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET phone_number=excluded.phone_number,phone_verified_via_telegram=1,phone_shared_at=CURRENT_TIMESTAMP`).bind(u.id,contact.phone_number).run();
  await event(env,u.id,'phone_shared_via_telegram');
 }
 await sendMessage(env,msg.chat.id,'✅ Phone number saved. Thank you.',mainKeyboard(env,new URL(env.APP_URL||'https://t.me').origin));
}

export async function handleBotUpdate(env:Env,origin:string,update:TgUpdate){
 const msg=update.message;
 if(msg){
  if(msg.contact){await saveContact(env,msg);return}
  const text=(msg.text||'').trim();
  if(/^\/start(?:@\w+)?(?:\s|$)/i.test(text)){await welcome(env,origin,msg);return}
  if(/^\/help(?:@\w+)?(?:\s|$)/i.test(text)){await help(env,origin,msg);return}
  if(text){await sendMessage(env,msg.chat.id,'Choose an action below 👇',mainKeyboard(env,origin));return}
 }
 const cb=update.callback_query;
 if(cb){
  await tgApi(env,'answerCallbackQuery',{callback_query_id:cb.id});
  if(cb.message){
   if(cb.data==='help')await help(env,origin,cb.message);
   else await sendMessage(env,cb.message.chat.id,'Choose an action below 👇',mainKeyboard(env,origin));
  }
 }
}

export async function ensureTelegramWebhook(env:Env,origin:string){
 if(!env.BOT_TOKEN)return {ok:false,reason:'BOT_TOKEN missing'};
 const url=appUrl(env,origin)+'/api/telegram/webhook';
 const body:any={url,allowed_updates:['message','callback_query'],drop_pending_updates:false};
 if(env.TELEGRAM_WEBHOOK_SECRET)body.secret_token=env.TELEGRAM_WEBHOOK_SECRET;
 await tgApi(env,'setWebhook',body);
 await tgApi(env,'setChatMenuButton',{menu_button:{type:'web_app',text:'Open app',web_app:{url:appUrl(env,origin)}}});
 return {ok:true,url};
}
