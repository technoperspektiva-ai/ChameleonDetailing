import type { Env,TelegramUser } from './types';
const enc=new TextEncoder();
const hex=(buf:ArrayBuffer)=>[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
async function hmac(key:CryptoKey,data:string){return crypto.subtle.sign('HMAC',key,enc.encode(data))}
export async function validateInitData(initData:string,token:string):Promise<{user:TelegramUser;authDate:number}|null>{
 if(!initData||!token)return null;
 const source=new URLSearchParams(initData),provided=source.get('hash'); if(!provided)return null;
 const authDate=Number(source.get('auth_date')||0); if(!authDate||Math.abs(Date.now()/1000-authDate)>86400)return null;
 const buildCheck=(dropSignature:boolean)=>{const p=new URLSearchParams(initData);p.delete('hash');if(dropSignature)p.delete('signature');const pairs:Array<[string,string]>=[];p.forEach((v,k)=>pairs.push([k,v]));return pairs.sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n')};
 const webKey=await crypto.subtle.importKey('raw',enc.encode('WebAppData'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const secret=await hmac(webKey,token);
 const dataKey=await crypto.subtle.importKey('raw',secret,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const matches=async(check:string)=>{const actual=hex(await hmac(dataKey,check));const expected=provided.toLowerCase();if(actual.length!==expected.length)return false;let diff=0;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^expected.charCodeAt(i);return diff===0};
 // Telegram clients/libraries differ around the newer `signature` field. Validate the token-HMAC form both ways;
 // all identity/business fields remain covered, while `signature` itself is never trusted by this application.
 if(!(await matches(buildCheck(false)))&&!(await matches(buildCheck(true))))return null;
 try{const user=JSON.parse(source.get('user')||'{}') as TelegramUser; if(!user.id)return null; return {user,authDate}}catch{return null}
}
export async function tgApi(env:Env,method:string,body:Record<string,unknown>){
 if(!env.BOT_TOKEN)throw new Error('BOT_TOKEN is not configured');
 const r=await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const j:any=await r.json(); if(!j.ok)throw new Error(j.description||`Telegram ${method} failed`); return j.result;
}
async function trackBotDelivery(env:Env,chatId:number,ok:boolean,error?:unknown){
 if(!env.DB||!Number.isFinite(Number(chatId)))return;
 try{
  const user=await env.DB.prepare('SELECT id,bot_status FROM users WHERE telegram_user_id=? LIMIT 1').bind(Number(chatId)).first<any>();
  if(!user)return;
  const previous=String(user.bot_status||'ACTIVE').toUpperCase();
  if(ok){
   if(previous!=='ACTIVE'){
    await env.DB.prepare("UPDATE users SET bot_status='ACTIVE',bot_unavailable_at=NULL,bot_last_error=NULL,bot_status_updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(user.id).run();
    await env.DB.prepare("INSERT INTO analytics_events(user_id,event_type,metadata_json) VALUES(?,'bot_recovered',?)").bind(user.id,JSON.stringify({previous})).run().catch(()=>{});
   }
   return;
  }
  const message=String(error instanceof Error?error.message:error||'Telegram delivery failed').slice(0,500);
  const blocked=/bot was blocked|forbidden|kicked|blocked by the user/i.test(message);
  const unavailable=blocked||/chat not found|user is deactivated|deactivated|user not found|peer_id_invalid/i.test(message);
  if(!unavailable)return;
  const status=blocked?'BLOCKED':'UNAVAILABLE';
  await env.DB.prepare("UPDATE users SET bot_status=?,bot_unavailable_at=CASE WHEN COALESCE(bot_status,'ACTIVE')=? THEN bot_unavailable_at ELSE CURRENT_TIMESTAMP END,bot_last_error=?,bot_status_updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status,status,message,user.id).run();
  if(previous!==status)await env.DB.prepare("INSERT INTO analytics_events(user_id,event_type,metadata_json) VALUES(?,'bot_unavailable',?)").bind(user.id,JSON.stringify({status,reason:message})).run().catch(()=>{});
 }catch{}
}
export async function sendMessage(env:Env,chatId:number,text:string,reply_markup?:unknown){
 try{const result=await tgApi(env,'sendMessage',{chat_id:chatId,text,parse_mode:'HTML',reply_markup,disable_web_page_preview:true});await trackBotDelivery(env,chatId,true);return result}
 catch(e){await trackBotDelivery(env,chatId,false,e);throw e}
}
export async function sendPhoto(env:Env,chatId:number,photo:string,caption:string,reply_markup?:unknown){
 try{const result=await tgApi(env,'sendPhoto',{chat_id:chatId,photo,caption,parse_mode:'HTML',reply_markup});await trackBotDelivery(env,chatId,true);return result}
 catch(e){await trackBotDelivery(env,chatId,false,e);throw e}
}
export const editMessage=(env:Env,chatId:number,messageId:number,text:string,reply_markup?:unknown)=>tgApi(env,'editMessageText',{chat_id:chatId,message_id:messageId,text,parse_mode:'HTML',reply_markup,disable_web_page_preview:true});

export async function uploadPhoto(env:Env,chatId:number,bytes:ArrayBuffer,mime='image/jpeg',fileName='broadcast.jpg'){
 if(!env.BOT_TOKEN)throw new Error('BOT_TOKEN is not configured');
 const form=new FormData();
 form.append('chat_id',String(chatId));
 form.append('photo',new Blob([bytes],{type:mime}),fileName);
 const r=await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`,{method:'POST',body:form});
 const j:any=await r.json();
 if(!j.ok)throw new Error(j.description||'Telegram photo upload failed');
 return j.result;
}
