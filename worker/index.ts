import type {Env} from './lib/types';
import {validateInitData} from './lib/telegram';
import {ensureDb,event,getActiveBlock,getServices,getSetting,upsertUser} from './lib/db';
import {quote} from './lib/pricing';
import {scheduleState} from './lib/schedule';
import {handleBotUpdate,ensureTelegramWebhook,telegramBotHealth,telegramWebhookSecret} from './lib/bot';

const VERSION='1.1.2';
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const read=async(r:Request)=>{try{return await r.json() as any}catch{return {}}};
let webhookCheckedAt=0;

async function auth(env:Env,initData:string){
 if(!initData)return {id:0,telegram_user_id:0,first_name:'Guest',username:'preview',language:'en',preferred_currency:env.DEFAULT_CURRENCY,role:'CLIENT',client_tier:'STANDARD',demo:true};
 if(!env.BOT_TOKEN)throw new Error('BOT_TOKEN is not configured');
 const v=await validateInitData(initData,env.BOT_TOKEN);
 if(!v)throw new Error('Invalid or expired Telegram session');
 return {...await upsertUser(env,v.user,String(v.user.id)===String(env.OWNER_TELEGRAM_ID)),demo:false};
}
async function sessionState(env:Env,u:any){
 const maintenance=(await getSetting(env,'maintenance.enabled','0'))==='1';
 const blocked=u.demo?null:await getActiveBlock(env,u.id);
 const schedule=await scheduleState(env);
 return {maintenance,blocked:!!blocked,blockedReason:blocked?.public_reason||null,schedule};
}
async function selfHealWebhook(env:Env,origin?:string,force=false){
 if(!env.BOT_TOKEN)return;
 const now=Date.now();
 if(!force&&now-webhookCheckedAt<5*60_000)return;
 webhookCheckedAt=now;
 try{await ensureTelegramWebhook(env,origin)}catch(error){console.error('Telegram webhook self-heal failed',error)}
}

export default {
 async fetch(request:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
  const url=new URL(request.url);
  try{
   // Opening the Mini App automatically reconciles Telegram's webhook with the currently
   // deployed Worker URL. This removes the previous manual setup trap after a deployment.
   if(request.method==='GET'&&!url.pathname.startsWith('/api/')&&(request.headers.get('accept')||'').includes('text/html')){
    ctx.waitUntil(selfHealWebhook(env,url.origin));
   }
   if(url.pathname==='/__version')return json({app:'ChameleonDetailing',version:VERSION,database:'chameleondetailing',worker:true});
   if(url.pathname==='/api/system/status'){
    ctx.waitUntil(selfHealWebhook(env,url.origin));
    const maintenance=(await getSetting(env,'maintenance.enabled','0'))==='1';
    return json({maintenance,app:env.APP_NAME,version:VERSION,dbConfigured:!!env.DB,botConfigured:!!env.BOT_TOKEN,webhookEnabled:true,webhookEndpoint:'/api/telegram/webhook',appUrlConfigured:!!env.APP_URL,databaseName:'chameleondetailing'});
   }
   if(url.pathname==='/api/telegram/health'){
    const health=await telegramBotHealth(env);
    return json(health,health.ok?200:503);
   }
   if(url.pathname==='/api/telegram/webhook'&&request.method==='POST'){
    const expectedSecret=telegramWebhookSecret(env);
    if(expectedSecret&&request.headers.get('x-telegram-bot-api-secret-token')!==expectedSecret)return json({error:'Unauthorized'},401);
    const update=await read(request);
    await handleBotUpdate(env,url.origin,update);
    return json({ok:true});
   }
   if(url.pathname==='/api/telegram/bootstrap'&&request.method==='POST'){
    const authz=request.headers.get('authorization')||'';
    if(!env.SESSION_SECRET||authz!==`Bearer ${env.SESSION_SECRET}`)return json({error:'Unauthorized'},401);
    const result=await ensureTelegramWebhook(env,url.origin);
    webhookCheckedAt=Date.now();
    return json(result);
   }
   if(url.pathname==='/api/auth/telegram'&&request.method==='POST'){
    // A successful Mini App open is also a reliable opportunity to fix a missing/stale webhook.
    ctx.waitUntil(selfHealWebhook(env,url.origin));
    const b=await read(request),u=await auth(env,b.initData||'');
    if(env.DB)await event(env,u.id,'miniapp_open');
    const state=await sessionState(env,u);
    return json({user:{telegramId:u.telegram_user_id,firstName:u.first_name,username:u.username,locale:u.language||'en',currency:u.preferred_currency,tier:u.client_tier,role:u.role,phoneShared:!!u.phone_number},...state,demo:u.demo});
   }
   if(url.pathname==='/api/services'){
    const locale=url.searchParams.get('locale')||'en';
    return json({services:await getServices(env,locale)});
   }
   if(url.pathname==='/api/calculator/quote'&&request.method==='POST'){
    const b=await read(request),u=await auth(env,b.initData||'');const state=await sessionState(env,u);
    if(state.blocked)return json({error:state.blockedReason||'Access limited'},403);
    if(state.maintenance&&u.role!=='OWNER')return json({error:'Service is under maintenance'},503);
    const q=await quote(env,b,u.client_tier);
    if(env.DB&&!u.demo){const r=await env.DB.prepare(`INSERT INTO calculator_sessions(user_id,base_price_snapshot,vehicle_multiplier_snapshot,condition_multiplier_snapshot,options_total_snapshot,discount_snapshot,calculated_price,currency,fx_rate,fx_provider,fx_timestamp) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(u.id,q.basePrice,q.vehicleMultiplier,q.conditionMultiplier,q.optionsTotal,q.discount,q.finalPrice,q.currency,q.fxRate,q.fxProvider,q.fxTimestamp).run();(q as any).calculationId=r.meta.last_row_id;await event(env,u.id,'calculator_completed',{service:b.service,currency:q.currency})}
    return json(q);
   }
   if(url.pathname==='/api/orders/request'&&request.method==='POST'){
    const b=await read(request),u=await auth(env,b.initData||'');if(u.demo)return json({ok:true,id:'DEMO'});const state=await sessionState(env,u);
    if(state.blocked)return json({error:state.blockedReason||'Access limited'},403);
    if(state.maintenance&&u.role!=='OWNER')return json({error:'Service is under maintenance'},503);
    await ensureDb(env);const requestType=String(b.requestType||'STANDARD').toUpperCase();
    if(!state.schedule.isOpen&&requestType==='STANDARD')return json({error:'Standard requests are unavailable outside working hours.'},409);
    if(requestType==='EMERGENCY'&&!state.schedule.emergencyEnabled)return json({error:'Emergency mode is not available.'},409);
    if(!['STANDARD','DEFERRED','EMERGENCY'].includes(requestType))return json({error:'Invalid request type'},400);
    const last=await env.DB!.prepare("SELECT created_at FROM service_requests WHERE user_id=? AND is_test=0 ORDER BY id DESC LIMIT 1").bind(u.id).first<any>();
    if(last&&Date.now()-Date.parse(last.created_at)<3600000)return json({error:'Your previous request was already sent. A new request can be sent after 60 minutes.'},429);
    const em=requestType==='EMERGENCY'?state.schedule.emergencyMultiplier:1;const q=await quote(env,b,u.client_tier,em);
    const res=await env.DB!.prepare(`INSERT INTO service_requests(user_id,service_slug,vehicle_slug,condition_slug,options_json,request_type,is_deferred,scheduled_for,base_price_snapshot,options_total_snapshot,discount_snapshot,calculated_price,currency,emergency_multiplier,emergency_surcharge) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(u.id,b.service,b.vehicle,b.condition,JSON.stringify(b.options||[]),requestType,requestType==='DEFERRED'?1:0,requestType==='DEFERRED'?state.schedule.nextWorkingAt:null,q.basePrice,q.optionsTotal,q.discount,q.finalPrice,q.currency,requestType==='EMERGENCY'?em:null,q.emergencySurcharge||0).run();
    await event(env,u.id,'service_request_created',{id:res.meta.last_row_id,type:requestType,price:q.finalPrice,currency:q.currency});
    return json({ok:true,id:res.meta.last_row_id,quote:q});
   }
   if(url.pathname==='/api/orders'){
    const u=await auth(env,url.searchParams.get('initData')||'');if(u.demo)return json({orders:[]});await ensureDb(env);const r=await env.DB!.prepare('SELECT * FROM service_requests WHERE user_id=? ORDER BY id DESC LIMIT 50').bind(u.id).all<any>();return json({orders:r.results});
   }
   if(url.pathname==='/api/socials'){
    if(!env.DB)return json({socials:[]});await ensureDb(env);const r=await env.DB.prepare('SELECT type,url FROM social_links WHERE enabled=1 ORDER BY sort_order,id').all<any>();return json({socials:r.results});
   }
   if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
   return env.ASSETS.fetch(request);
  }catch(e:any){console.error(e);return json({error:e?.message||'Unexpected error'},500)}
 },
 async scheduled(_controller:ScheduledController,env:Env,_ctx:ExecutionContext):Promise<void>{
  await selfHealWebhook(env,undefined,true);
 }
};
