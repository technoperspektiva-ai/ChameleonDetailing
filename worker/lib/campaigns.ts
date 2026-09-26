import type {Env} from './types';
import {ensureDb,getSetting} from './db';
import {sendMessage,sendPhoto} from './telegram';

const esc=(s:unknown)=>String(s??'').replace(/[&<>]/g,c=>c==='&'?'&amp;':c==='<'?'&lt;':'&gt;');
const appUrl=(env:Env)=>String(env.APP_URL||'').replace(/\/$/,'');
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const button=(env:Env,url?:string,text='🦎 Chameleon Detailing')=>{const target=url||appUrl(env);return target?{inline_keyboard:[[{text,web_app:{url:target}}]]}:undefined};

async function deliver(env:Env,chatId:number,text:string,photoFileId?:string|null,markup?:any){
 const safe=esc(text).replace(/\n/g,'\n');
 if(photoFileId)return sendPhoto(env,chatId,photoFileId,safe,markup||button(env));
 return sendMessage(env,chatId,safe,markup||button(env));
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
 const enabled=(await getSetting(env,'reactivation.enabled','1'))==='1';if(!enabled&&!force)return {eligible:0,sent:0,failed:0,skipped:true};
 const days=Math.max(1,Number(await getSetting(env,'reactivation.days','14'))||14);
 const sendTime=await getSetting(env,'reactivation.time','11:00');
 const tz=await getSetting(env,'business_timezone','Europe/Warsaw');
 if(!force&&localHm(new Date(),tz)<sendTime)return {eligible:0,sent:0,failed:0,skipped:true};
 const customText=String(await getSetting(env,'reactivation.message','')).trim();
 const photo=await getSetting(env,'reactivation.photo_file_id','');
 const rows=await env.DB.prepare(`SELECT u.id,u.telegram_user_id,COALESCE(u.language,'en') language,r.id order_id,r.car_id,COALESCE(r.car_name,'') car_name,r.service_slug,r.services_json,r.completed_at last_completed
 FROM users u JOIN service_requests r ON r.id=(SELECT rr.id FROM service_requests rr WHERE rr.user_id=u.id AND rr.status IN ('COMPLETED','PAID','COMPLETED_UNPAID') AND rr.client_deleted_at IS NULL AND rr.staff_deleted_at IS NULL ORDER BY COALESCE(rr.completed_at,rr.updated_at,rr.created_at) DESC,rr.id DESC LIMIT 1)
 WHERE u.role='CLIENT' AND u.status='ACTIVE' AND u.notifications_enabled=1 AND u.telegram_user_id IS NOT NULL`).all<any>();
 let eligible=0,sent=0,failed=0;const now=Date.now(),base=appUrl(env);
 for(const u of rows.results||[]){
  const completed=Date.parse(String(u.last_completed||''));if(!Number.isFinite(completed)||now-completed<days*86400000)continue;
  const ref=`order:${u.order_id}:${u.last_completed||''}`;
  const prior=await env.DB.prepare("SELECT 1 ok FROM campaign_deliveries WHERE user_id=? AND kind='REACTIVATION' AND reference_key=? LIMIT 1").bind(u.id,ref).first<any>();if(prior)continue;
  eligible++;
  const lang=String(u.language||'en').toLowerCase();
  const car=String(u.car_name||'').trim();
  const text=customText||(
   lang.startsWith('uk')||lang.startsWith('ua')?
    `Давно не бачились${car?`, ${car}`:''} 🙂 Минуло вже ${days} днів після останнього догляду. Якщо бажаєте, можемо повторити попередню процедуру або підібрати новий догляд.`:
   lang.startsWith('pl')?
    `Dawno się nie widzieliśmy${car?`, ${car}`:''} 🙂 Minęło już ${days} dni od ostatniej usługi. Możesz powtórzyć poprzedni zabieg albo wybrać nowy zakres pielęgnacji.`:
    `It has been a while${car?`, ${car}`:''} 🙂 It has been ${days} days since the last service. You can repeat the previous treatment or choose a new care package.`
  );
  const buttonText=lang.startsWith('uk')||lang.startsWith('ua')?'Повторити процедуру':lang.startsWith('pl')?'Powtórz usługę':'Repeat service';
  const repeatUrl=base?`${base}?startapp=calculator&repeat=${u.order_id}`:'';
  const markup=repeatUrl?button(env,repeatUrl,buttonText):button(env);
  try{await deliver(env,Number(u.telegram_user_id),text,photo||null,markup);await env.DB.prepare("INSERT INTO campaign_deliveries(user_id,kind,reference_key,status) VALUES(?,'REACTIVATION',?,'SENT')").bind(u.id,ref).run();sent++}
  catch(e:any){failed++;await env.DB.prepare("INSERT OR IGNORE INTO campaign_deliveries(user_id,kind,reference_key,status,error) VALUES(?,'REACTIVATION',?,'FAILED',?)").bind(u.id,ref,String(e?.message||e)).run()}
  await delay(45);
 }
 return {eligible,sent,failed,skipped:false};
}
