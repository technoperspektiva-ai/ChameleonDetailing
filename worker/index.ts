import type {Env} from './lib/types';
import {validateInitData,tgApi} from './lib/telegram';
import {ensureDb,event,getActiveBlock,getServices,getServiceOptions,getSetting,setSetting,upsertUser} from './lib/db';
import {quote,serviceDisplayPrice} from './lib/pricing';
import {scheduleState} from './lib/schedule';
import {handleBotUpdate,ensureTelegramWebhook,telegramBotHealth,telegramWebhookSecret,repairTelegramBot,notifyNewOrder} from './lib/bot';
import {runReactivationCampaigns} from './lib/campaigns';

const VERSION='1.1.33';
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const read=async(r:Request)=>{try{return await r.json() as any}catch{return {}}};
const escapeHtml=(value:string)=>value.replace(/[&<>"]/g,c=>c==='&'?'&amp;':c==='<'?'&lt;':c==='>'?'&gt;':'&quot;');
const html=(body:string,status=200)=>new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chameleon Detailing Bot Fix</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#071008;color:#f5fff1;margin:0;padding:24px}main{max-width:760px;margin:0 auto}h1{color:#98ff00}pre{white-space:pre-wrap;word-break:break-word;background:#0e1a10;border:1px solid #28452d;border-radius:16px;padding:16px}.ok{color:#98ff00}.bad{color:#ff9e9e}a{color:#98ff00}code{background:#132016;padding:2px 6px;border-radius:6px}</style></head><body><main>${body}</main></body></html>`,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
let webhookCheckedAt=0;

async function saveBotDebug(env:Env,payload:Record<string,unknown>){
 const snapshot={...payload,at:new Date().toISOString()};
 if(env.DB){
  try{await setSetting(env,'telegram.debug.last',JSON.stringify(snapshot))}catch(error){console.error('Failed to persist Telegram debug snapshot',error)}
 }
 return snapshot;
}
async function getBotDebug(env:Env){
 if(!env.DB)return {persisted:false,message:'D1 is not configured, so persistent bot diagnostics are unavailable.'};
 try{const raw=await getSetting(env,'telegram.debug.last','');return raw?{persisted:true,last:JSON.parse(raw)}:{persisted:true,last:null}}catch(error){return {persisted:false,error:error instanceof Error?error.message:String(error)}}
}
async function processTelegramUpdate(env:Env,origin:string,update:any){
 const base={updateId:update?.update_id??null,chatId:update?.message?.chat?.id??update?.callback_query?.message?.chat?.id??null,userId:update?.message?.from?.id??update?.callback_query?.from?.id??null,text:update?.message?.text??null};
 await saveBotDebug(env,{stage:'received',...base});
 try{
  await handleBotUpdate(env,origin,update);
  await saveBotDebug(env,{stage:'processed',ok:true,...base});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  console.error('Telegram update processing failed',error);
  await saveBotDebug(env,{stage:'failed',ok:false,error:message,...base});
 }
}

async function auth(env:Env,initData:string){
 if(!initData)return {id:0,telegram_user_id:0,first_name:'Guest',username:'preview',language:'en',preferred_currency:env.DEFAULT_CURRENCY,role:'CLIENT',client_tier:'STANDARD',demo:true};
 if(!env.BOT_TOKEN)throw new Error('BOT_TOKEN is not configured');
 const v=await validateInitData(initData,env.BOT_TOKEN);
 if(!v)throw new Error('Invalid or expired Telegram session');
 return {...await upsertUser(env,v.user,String(v.user.id)===String(env.OWNER_TELEGRAM_ID)),photo_url:v.user.photo_url||null,demo:false};
}

async function resolveSeasonalTheme(env:Env){
 const mode=String(await getSetting(env,'seasonal.mode','OFF')).toUpperCase();
 const manual=String(await getSetting(env,'seasonal.manual_theme','DEFAULT')).toUpperCase();
 if(mode==='OFF')return {mode:'OFF',active:'DEFAULT'};
 if(mode==='MANUAL')return {mode:'MANUAL',active:['HALLOWEEN','NEW_YEAR','EASTER'].includes(manual)?manual:'DEFAULT'};
 const now=Date.now();
 const defs:[string,string][]=[['HALLOWEEN','halloween'],['NEW_YEAR','new_year'],['EASTER','easter']];
 for(const [theme,key] of defs){
  const start=Date.parse(await getSetting(env,`seasonal.${key}.start`,''));
  const end=Date.parse(await getSetting(env,`seasonal.${key}.end`,''));
  if(Number.isFinite(start)&&Number.isFinite(end)&&now>=start&&now<=end)return {mode:'AUTO',active:theme};
 }
 return {mode:'AUTO',active:'DEFAULT'};
}

async function sessionState(env:Env,u:any){
 const maintenance=(await getSetting(env,'maintenance.enabled','0'))==='1';
 const blocked=u.demo?null:await getActiveBlock(env,u.id);
 const schedule=await scheduleState(env);
 const seasonal=await resolveSeasonalTheme(env);
 const theme={
  fontH1:await getSetting(env,'theme.font_h1','clamp(1.7rem,7vw,2.35rem)'),
  fontH2:await getSetting(env,'theme.font_h2','clamp(1.25rem,5.4vw,1.6rem)'),
  fontBody:await getSetting(env,'theme.font_body','clamp(.94rem,3.8vw,1rem)'),
  fontSmall:await getSetting(env,'theme.font_small','clamp(.78rem,3.2vw,.875rem)'),
  neonMode:(await getSetting(env,'theme.neon_mode','STATIC')).toUpperCase()==='RAINBOW'?'RAINBOW':'STATIC',
  neonColor:await getSetting(env,'theme.neon_color','#a4ff00'),
  seasonalMode:seasonal.mode,
  seasonalTheme:seasonal.active
 };
 return {maintenance,blocked:!!blocked,blockedReason:blocked?.public_reason||null,schedule,theme};
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
   if(url.pathname==='/telegram/health'&&request.method==='GET'){
    const health=await telegramBotHealth(env);
    const cls=health.ok?'ok':'bad';
    return html(`<h1>Telegram bot health</h1><p class="${cls}">${health.ok?'Bot API reachable':'Bot API problem'}</p><pre>${escapeHtml(JSON.stringify(health,null,2))}</pre><p>Fix URL: <code>/telegram/fix?key=YOUR_TELEGRAM_SETUP_KEY</code></p>`,health.ok?200:503);
   }
   if(url.pathname==='/telegram/fix'&&request.method==='GET'){
    const supplied=url.searchParams.get('key')||'';
    const expected=String(env.TELEGRAM_SETUP_KEY||'');
    if(!expected)return html('<h1>Setup key missing</h1><p>Add Cloudflare variable <code>TELEGRAM_SETUP_KEY</code>, redeploy, then open this link again.</p>',503);
    if(!supplied||supplied!==expected)return html('<h1>Unauthorized</h1><p>Open <code>/telegram/fix?key=YOUR_TELEGRAM_SETUP_KEY</code>.</p>',401);
    const result=await repairTelegramBot(env,url.origin);
    const cls=result.ok?'ok':'bad';
    return html(`<h1>Chameleon Detailing — Bot Fix</h1><p class="${cls}">${result.ok?'✅ Webhook repaired successfully':'❌ Webhook is still not correct'}</p><pre>${escapeHtml(JSON.stringify(result,null,2))}</pre><p><a href="${escapeHtml(result.testBotUrl)}">Open @ChameleonDetailing_bot and test /start</a></p><p>After it works, rotate or remove <code>TELEGRAM_SETUP_KEY</code>.</p>`,result.ok?200:500);
   }
   if(url.pathname==='/telegram/debug'&&request.method==='GET'){
    const supplied=url.searchParams.get('key')||'';
    const expected=String(env.TELEGRAM_SETUP_KEY||'');
    if(!expected)return html('<h1>Setup key missing</h1><p>Add <code>TELEGRAM_SETUP_KEY</code> in Cloudflare first.</p>',503);
    if(!supplied||supplied!==expected)return html('<h1>Unauthorized</h1><p>Open <code>/telegram/debug?key=YOUR_TELEGRAM_SETUP_KEY</code>.</p>',401);
    const health=await telegramBotHealth(env);
    const debug=await getBotDebug(env);
    const payload={health,debug,expectedWebhook:url.origin+'/api/telegram/webhook'};
    return html(`<h1>Telegram bot debug</h1><pre>${escapeHtml(JSON.stringify(payload,null,2))}</pre><p>Send <code>/start</code> to the bot, wait 2–3 seconds, then refresh this page.</p>`,200);
   }
   if(url.pathname==='/api/telegram/debug'&&request.method==='GET'){
    const supplied=url.searchParams.get('key')||'';
    const expected=String(env.TELEGRAM_SETUP_KEY||'');
    if(!expected||supplied!==expected)return json({error:'Unauthorized'},401);
    return json({health:await telegramBotHealth(env),debug:await getBotDebug(env),expectedWebhook:url.origin+'/api/telegram/webhook'});
   }
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
    if(expectedSecret&&request.headers.get('x-telegram-bot-api-secret-token')!==expectedSecret){
     await saveBotDebug(env,{stage:'rejected',ok:false,error:'Webhook secret mismatch'});
     return json({error:'Unauthorized'},401);
    }
    const update=await read(request);
    // Acknowledge Telegram immediately. D1 / Bot API failures are handled asynchronously,
    // so Telegram never marks the webhook as unhealthy because business logic was slow.
    ctx.waitUntil(processTelegramUpdate(env,url.origin,update));
    return json({ok:true,accepted:true,updateId:update?.update_id??null});
   }
   if(url.pathname==='/api/telegram/bootstrap'&&request.method==='POST'){
    const authz=request.headers.get('authorization')||'';
    if(!env.SESSION_SECRET||authz!==`Bearer ${env.SESSION_SECRET}`)return json({error:'Unauthorized'},401);
    const result=await ensureTelegramWebhook(env,url.origin);
    webhookCheckedAt=Date.now();
    return json(result);
   }
   if(url.pathname==='/api/profile/photo'&&request.method==='GET'){
    const u=await auth(env,url.searchParams.get('initData')||'');
    if(u.demo||!env.BOT_TOKEN)return new Response(null,{status:404});
    try{
     const photos=await tgApi(env,'getUserProfilePhotos',{user_id:u.telegram_user_id,limit:1});
     const variants=photos?.photos?.[0];
     if(!Array.isArray(variants)||!variants.length)return new Response(null,{status:404});
     const best=variants[variants.length-1];
     const file=await tgApi(env,'getFile',{file_id:best.file_id});
     if(!file?.file_path)return new Response(null,{status:404});
     const upstream=await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.file_path}`);
     if(!upstream.ok)return new Response(null,{status:404});
     return new Response(upstream.body,{status:200,headers:{'content-type':upstream.headers.get('content-type')||'image/jpeg','cache-control':'private, max-age=300'}});
    }catch{return new Response(null,{status:404})}
   }
   if(url.pathname==='/api/auth/telegram'&&request.method==='POST'){
    // A successful Mini App open is also a reliable opportunity to fix a missing/stale webhook.
    ctx.waitUntil(selfHealWebhook(env,url.origin));
    const b=await read(request);
    const hasTelegramInit=!!String(b.initData||'').trim();
    if(!hasTelegramInit&&(await getSetting(env,'web_direct_access_enabled','0'))!=='1'){
     return json({error:'DIRECT_WEB_DISABLED',botUsername:String(env.BOT_USERNAME||'ChameleonDetailing_bot').replace(/^@/,'')},403);
    }
    const u=await auth(env,b.initData||'');
    if(env.DB)await event(env,u.id,'miniapp_open');
    const state=await sessionState(env,u);
    return json({user:{telegramId:u.telegram_user_id,firstName:u.first_name,username:u.username,locale:u.language||'en',currency:u.preferred_currency,tier:u.client_tier,role:u.role,phoneShared:!!u.phone_number,photoUrl:u.photo_url||null},...state,demo:u.demo});
   }
   if(url.pathname==='/api/services'){
    const locale=url.searchParams.get('locale')||'en';const currency=url.searchParams.get('currency');const initData=url.searchParams.get('initData')||'';
    const list=await getServices(env,locale,currency);let tier='STANDARD';try{if(initData){const u=await auth(env,initData);tier=u.client_tier||'STANDARD'}}catch{}
    for(const item of list){const baseCurrency=String(item.currency||currency||'PLN');const eff=await serviceDisplayPrice(env,Number(item.id),Number(item.basePrice||0),baseCurrency,tier);if(eff.mode!=='STANDARD'){(item as any).standardBasePrice=item.basePrice;(item as any).basePrice=Math.round(eff.price*100)/100;(item as any).vipPricingMode=eff.mode;(item as any).clientTier=tier;(item as any).promotion=eff.promotion||null}}
    return json({services:list,tier});
   }
   if(url.pathname==='/api/options'&&request.method==='GET'){
    const locale=url.searchParams.get('locale')||'en',currency=url.searchParams.get('currency')||'PLN';
    const options=await getServiceOptions(env,locale,currency);
    return json({options});
   }
   if(url.pathname==='/api/content'&&request.method==='GET'){
    const locale=(url.searchParams.get('locale')||'en').toLowerCase().startsWith('uk')?'uk':(url.searchParams.get('locale')||'en').toLowerCase().startsWith('pl')?'pl':'en';
    const defaults:any={
     uk:{'referral.title':'Запроси друга в Chameleon','referral.subtitle':'Поділися сервісом, якому довіряєш. Друг отримає зручний доступ до Chameleon Detailing, а ми подбаємо про його авто так само уважно.','referral.share_text':'Рекомендую Chameleon Detailing 🦎 Тут зручно підібрати послугу, розрахувати вартість і залишити заявку прямо в Telegram.'},
     pl:{'referral.title':'Zaproś znajomego do Chameleon','referral.subtitle':'Poleć miejsce, któremu ufasz. Znajomy szybko otworzy Chameleon Detailing w Telegramie, a my zadbamy o jego auto z taką samą uwagą.','referral.share_text':'Polecam Chameleon Detailing 🦎 W Telegramie możesz wygodnie wybrać usługę, sprawdzić cenę i wysłać zgłoszenie.'},
     en:{'referral.title':'Invite a friend to Chameleon','referral.subtitle':'Share a service you trust. Your friend gets quick access to Chameleon Detailing in Telegram, and we will care for their car with the same attention.','referral.share_text':'I recommend Chameleon Detailing 🦎 Choose a service, check the estimate and send a request directly in Telegram.'}
    };
    const content={...defaults[locale]};
    if(env.DB){await ensureDb(env);const r=await env.DB.prepare("SELECT key,value FROM content_blocks WHERE locale=? AND value<>''").bind(locale).all<any>();for(const row of r.results||[])content[row.key]=row.value}
    return json({content});
   }
   if(url.pathname==='/api/preferences/currency'&&request.method==='POST'){
    const b=await read(request),u=await auth(env,b.initData||'');const currency=String(b.currency||'').toUpperCase();
    if(!['PLN','USD','UAH'].includes(currency))return json({error:'Unsupported currency'},400);
    if(env.DB&&!u.demo){await ensureDb(env);await env.DB.prepare('UPDATE users SET preferred_currency=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(currency,u.id).run();await event(env,u.id,'currency_changed',{currency})}
    return json({ok:true,currency});
   }
   if(url.pathname==='/api/referrals/create'&&request.method==='POST'){
    const b=await read(request),u=await auth(env,b.initData||'');
    if(u.demo)return json({ok:true,code:'DEMO',url:`https://t.me/${String(env.BOT_USERNAME||'ChameleonDetailing_bot').replace(/^@/,'')}?start=ref_DEMO`});
    if(!env.DB)return json({error:'Referral storage is not configured.'},503);
    await ensureDb(env);
    const enabled=(await getSetting(env,'referral_enabled','1'))==='1';
    if(!enabled)return json({error:'Referral program is currently disabled.'},409);
    const code='R'+crypto.randomUUID().replace(/-/g,'').slice(0,10).toUpperCase();
    await env.DB!.prepare('INSERT INTO referrals(referrer_user_id,code) VALUES(?,?)').bind(u.id,code).run();
    await event(env,u.id,'referral_link_created',{code});
    const bot=String(env.BOT_USERNAME||'ChameleonDetailing_bot').replace(/^@/,'');
    return json({ok:true,code,url:`https://t.me/${bot}?start=ref_${code}`});
   }
   if(url.pathname==='/api/calculator/quote'&&request.method==='POST'){
    const b=await read(request),u=await auth(env,b.initData||'');const state=await sessionState(env,u);
    if(state.blocked)return json({error:state.blockedReason||'Access limited'},403);
    if(state.maintenance&&u.role!=='OWNER')return json({error:'Service is under maintenance'},503);
    const q=await quote(env,b,u.client_tier,1,u.id);
    let emergencyPreview=null;
    if(!state.schedule.isOpen&&state.schedule.emergencyEnabled){
     const eq=await quote(env,b,u.client_tier,state.schedule.emergencyMultiplier,u.id);
     emergencyPreview={multiplier:state.schedule.emergencyMultiplier,surcharge:eq.emergencySurcharge,finalPrice:eq.finalPrice,currency:eq.currency};
    }
    if(env.DB&&!u.demo){const r=await env.DB.prepare(`INSERT INTO calculator_sessions(user_id,base_price_snapshot,vehicle_multiplier_snapshot,condition_multiplier_snapshot,options_total_snapshot,discount_snapshot,calculated_price,currency,fx_rate,fx_provider,fx_timestamp,promotion_id,personal_discount_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(u.id,q.basePrice,q.vehicleMultiplier,q.conditionMultiplier,q.optionsTotal,q.discount,q.finalPrice,q.currency,q.fxRate,q.fxProvider,q.fxTimestamp,q.promotion?.id||null,q.personalDiscount?.id||null).run();(q as any).calculationId=r.meta.last_row_id;await event(env,u.id,'calculator_completed',{service:b.service,currency:q.currency})}
    return json({...q,emergencyPreview});
   }
   if(url.pathname==='/api/orders/request'&&request.method==='POST'){
    const b=await read(request),u=await auth(env,b.initData||'');if(u.demo)return json({ok:true,id:'DEMO'});const state=await sessionState(env,u);
    if(state.blocked)return json({error:state.blockedReason||'Access limited'},403);
    if(state.maintenance&&u.role!=='OWNER')return json({error:'Service is under maintenance'},503);
    await ensureDb(env);const requestType=String(b.requestType||'STANDARD').toUpperCase();
    if(!state.schedule.isOpen&&requestType==='STANDARD')return json({error:'Standard requests are unavailable outside working hours.'},409);
    if(requestType==='EMERGENCY'&&!state.schedule.emergencyEnabled)return json({error:'Emergency mode is not available.'},409);
    if(!['STANDARD','DEFERRED','EMERGENCY'].includes(requestType))return json({error:'Invalid request type'},400);
    const cooldownEnabled=(await getSetting(env,'request_cooldown_enabled','1'))==='1';
    if(cooldownEnabled){
      const last=await env.DB!.prepare("SELECT created_at FROM service_requests WHERE user_id=? AND is_test=0 AND client_deleted_at IS NULL AND staff_deleted_at IS NULL AND COALESCE(status,'REQUESTED') NOT IN ('CANCELLED','REJECTED') ORDER BY id DESC LIMIT 1").bind(u.id).first<any>();
      if(last&&Date.now()-Date.parse(last.created_at)<3600000)return json({error:'Your previous request was already sent. A new request can be sent after 60 minutes.'},429);
    }
    const em=requestType==='EMERGENCY'?state.schedule.emergencyMultiplier:1;const q=await quote(env,b,u.client_tier,em,u.id);
    const res=await env.DB!.prepare(`INSERT INTO service_requests(user_id,service_slug,vehicle_slug,condition_slug,options_json,request_type,is_deferred,scheduled_for,base_price_snapshot,options_total_snapshot,discount_snapshot,calculated_price,currency,emergency_multiplier,emergency_surcharge,promotion_id,personal_discount_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(u.id,b.service,b.vehicle,b.condition,JSON.stringify(b.options||[]),requestType,requestType==='DEFERRED'?1:0,requestType==='DEFERRED'?state.schedule.nextWorkingAt:null,q.basePrice,q.optionsTotal,q.discount,q.finalPrice,q.currency,requestType==='EMERGENCY'?em:null,q.emergencySurcharge||0,q.promotion?.id||null,q.personalDiscount?.id||null).run();
    await event(env,u.id,'service_request_created',{id:res.meta.last_row_id,type:requestType,price:q.finalPrice,currency:q.currency});
    if(q.personalDiscount?.id){await env.DB!.prepare("UPDATE personal_discounts SET status='USED',used_at=CURRENT_TIMESTAMP,used_request_id=? WHERE id=? AND user_id=? AND status='ACTIVATED'").bind(res.meta.last_row_id,q.personalDiscount.id,u.id).run();}
    ctx.waitUntil(notifyNewOrder(env,Number(res.meta.last_row_id)).catch(error=>console.error('notifyNewOrder failed',error)));
    return json({ok:true,id:res.meta.last_row_id,quote:q});
   }
   if(url.pathname==='/api/orders'){
    const u=await auth(env,url.searchParams.get('initData')||'');if(u.demo)return json({orders:[]});await ensureDb(env);const r=await env.DB!.prepare('SELECT * FROM service_requests WHERE user_id=? AND client_deleted_at IS NULL AND staff_deleted_at IS NULL ORDER BY id DESC LIMIT 50').bind(u.id).all<any>();const orders=[] as any[];for(const row of r.results||[]){const ex=await env.DB!.prepare('SELECT title_snapshot title,price_snapshot price,currency FROM service_request_extras WHERE request_id=? ORDER BY id').bind(row.id).all<any>();orders.push({...row,extra_services:ex.results||[]})}return json({orders});
   }

   const deleteOrderMatch=url.pathname.match(/^\/api\/orders\/(\d+)$/);
   if(deleteOrderMatch&&request.method==='DELETE'){
    const b=await read(request),u=await auth(env,b.initData||'');if(u.demo)return json({ok:true});await ensureDb(env);const id=Number(deleteOrderMatch[1]);
    const row=await env.DB!.prepare('SELECT id,status FROM service_requests WHERE id=? AND user_id=? AND client_deleted_at IS NULL AND staff_deleted_at IS NULL').bind(id,u.id).first<any>();if(!row)return json({error:'Request not found'},404);
    const status=String(row.status||'REQUESTED').toUpperCase();const removable=['REQUESTED','PENDING_CONFIRMATION','REJECTED','CANCELLED','DEFERRED'];if(!removable.includes(status))return json({error:'This request can no longer be removed because it is already in work.'},409);
    const nextStatus=['REQUESTED','PENDING_CONFIRMATION','DEFERRED'].includes(status)?'CANCELLED':status;
    await env.DB!.prepare('UPDATE service_requests SET status=?,client_deleted_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?').bind(nextStatus,id,u.id).run();await event(env,u.id,'service_request_client_deleted',{id,previousStatus:status,status:nextStatus});return json({ok:true,id,status:nextStatus});
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
  await runReactivationCampaigns(env,false).catch(error=>console.error('reactivation campaign failed',error));
 }
};
