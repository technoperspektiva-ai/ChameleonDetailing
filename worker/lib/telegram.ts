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
export const sendMessage=(env:Env,chatId:number,text:string,reply_markup?:unknown)=>tgApi(env,'sendMessage',{chat_id:chatId,text,parse_mode:'HTML',reply_markup,disable_web_page_preview:true});
export const sendPhoto=(env:Env,chatId:number,photo:string,caption:string,reply_markup?:unknown)=>tgApi(env,'sendPhoto',{chat_id:chatId,photo,caption,parse_mode:'HTML',reply_markup});
export const editMessage=(env:Env,chatId:number,messageId:number,text:string,reply_markup?:unknown)=>tgApi(env,'editMessageText',{chat_id:chatId,message_id:messageId,text,parse_mode:'HTML',reply_markup,disable_web_page_preview:true});
