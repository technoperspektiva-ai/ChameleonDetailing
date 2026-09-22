import type {Env} from './types';
import {ensureDb,getSetting} from './db';
import {sendMessage,sendPhoto} from './telegram';

const esc=(s:unknown)=>String(s??'').replace(/[&<>]/g,c=>c==='&'?'&amp;':c==='<'?'&lt;':'&gt;');
const appUrl=(env:Env)=>String(env.APP_URL||'').replace(/\/$/,'');
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const button=(env:Env)=>{const url=appUrl(env);return url?{inline_keyboard:[[{text:'🦎 Chameleon Detailing',web_app:{url}}]]}:undefined};

async function deliver(env:Env,chatId:number,text:string,photoFileId?:string|null){
 const safe=esc(text).replace(/\n/g,'\n');
 if(photoFileId)return sendPhoto(env,chatId,photoFileId,safe,button(env));
 return sendMessage(env,chatId,safe,button(env));
}

export async function sendBroadcastCampaign(env:Env,actorId:number,text:string,photoFileId?:string|null){
 if(!env.DB)throw new Error('D1 is not connected.');
 await ensureDb(env);
 const created=await env.DB.prepare("INSERT INTO broadcast_campaigns(type,text,photo_file_id,created_by,status) VALUES('IMPORTANT_UPDATE',?,?,?,'SENDING')").bind(text,photoFileId||null,actorId).run();
 const campaignId=Number(created.meta.last_row_id);
 const users=await env.DB.prepare("SELECT id,telegram_user_id FROM users WHERE role='CLIENT' AND status='ACTIVE' AND notifications_enabled=1 AND telegram_user_id IS NOT NULL").all<any>();
 let sent=0,failed=0;
 for(const u of users.results||[]){
  try{await deliver(env,Number(u.telegram_user_id),text,photoFileId);await env.DB.prepare("INSERT OR IGNORE INTO campaign_deliveries(campaign_id,user_id,kind,reference_key,status) VALUES(?,?,'IMPORTANT_UPDATE',?,'SENT')").bind(campaignId,u.id,String(campaignId)).run();sent++}
  catch(e:any){failed++;await env.DB.prepare("INSERT OR IGNORE INTO campaign_deliveries(campaign_id,user_id,kind,reference_key,status,error) VALUES(?,?,'IMPORTANT_UPDATE',?,'FAILED',?)").bind(campaignId,u.id,String(campaignId),String(e?.message||e)).run()}
  await delay(45);
 }
 await env.DB.prepare("UPDATE broadcast_campaigns SET status='SENT',recipient_count=?,sent_count=?,failed_count=?,sent_at=CURRENT_TIMESTAMP WHERE id=?").bind((users.results||[]).length,sent,failed,campaignId).run();
 return {campaignId,recipients:(users.results||[]).length,sent,failed};
}

function localHm(date:Date,timeZone:string){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const h=parts.find(x=>x.type==='hour')?.value||'00',m=parts.find(x=>x.type==='minute')?.value||'00';return `${h}:${m}`;
}

export async function runReactivationCampaigns(env:Env,force=false){
 if(!env.DB||!env.BOT_TOKEN)return {eligible:0,sent:0,failed:0,skipped:true};
 await ensureDb(env);
 const enabled=(await getSetting(env,'reactivation.enabled','0'))==='1';if(!enabled&&!force)return {eligible:0,sent:0,failed:0,skipped:true};
 const days=Math.max(1,Number(await getSetting(env,'reactivation.days','90'))||90);
 const sendTime=await getSetting(env,'reactivation.time','11:00');
 const tz=await getSetting(env,'business_timezone','Europe/Warsaw');
 if(!force&&localHm(new Date(),tz)<sendTime)return {eligible:0,sent:0,failed:0,skipped:true};
 const text=await getSetting(env,'reactivation.message','Ми давно не бачились 🦎 Якщо авто знову потребує уваги — Chameleon Detailing поруч.');
 const photo=await getSetting(env,'reactivation.photo_file_id','');
 const rows=await env.DB.prepare(`SELECT u.id,u.telegram_user_id,MAX(COALESCE(r.completed_at,r.updated_at,r.created_at)) last_completed
 FROM users u JOIN service_requests r ON r.user_id=u.id
 WHERE u.role='CLIENT' AND u.status='ACTIVE' AND u.notifications_enabled=1 AND r.status='COMPLETED' AND r.client_deleted_at IS NULL
 GROUP BY u.id,u.telegram_user_id`).all<any>();
 let eligible=0,sent=0,failed=0;const now=Date.now();
 for(const u of rows.results||[]){
  const completed=Date.parse(String(u.last_completed||''));if(!Number.isFinite(completed)||now-completed<days*86400000)continue;
  const ref=String(u.last_completed||'');
  const prior=await env.DB.prepare("SELECT 1 ok FROM campaign_deliveries WHERE user_id=? AND kind='REACTIVATION' AND reference_key=? LIMIT 1").bind(u.id,ref).first<any>();if(prior)continue;
  eligible++;
  try{await deliver(env,Number(u.telegram_user_id),text,photo||null);await env.DB.prepare("INSERT INTO campaign_deliveries(user_id,kind,reference_key,status) VALUES(?,'REACTIVATION',?,'SENT')").bind(u.id,ref).run();sent++}
  catch(e:any){failed++;await env.DB.prepare("INSERT OR IGNORE INTO campaign_deliveries(user_id,kind,reference_key,status,error) VALUES(?,'REACTIVATION',?,'FAILED',?)").bind(u.id,ref,String(e?.message||e)).run()}
  await delay(45);
 }
 return {eligible,sent,failed,skipped:false};
}
