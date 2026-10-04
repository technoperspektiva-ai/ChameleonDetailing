import originalApp from './index';
import type {SheetsEnv} from './lib/sheets';
import {getGoogleSheetsState,runGoogleSheetsAutoSync,syncGoogleSheets} from './lib/sheets';
import {handleGoogleSheetsTelegramUpdate,isGoogleSheetsUpdate} from './lib/sheets-bot';
import {telegramWebhookSecret} from './lib/bot';

const VERSION='1.3.0';
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const isStaging=(env:SheetsEnv)=>String(env.ENVIRONMENT||'production').toLowerCase()==='staging';
const safePreviewEnv=(env:SheetsEnv):SheetsEnv=>isStaging(env)?{
 ...env,
 BOT_TOKEN:undefined,
 TELEGRAM_WEBHOOK_SECRET:undefined,
 TELEGRAM_SETUP_KEY:undefined,
 GOOGLE_SHEETS_WEBHOOK_URL:undefined,
 GOOGLE_SHEETS_WEBHOOK_SECRET:undefined,
}:env;

async function ensureStagingCars(env:SheetsEnv){
 if(!env.DB)throw new Error('Staging D1 is not configured');
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS staging_qa_cars(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  modification TEXT,
  body_type TEXT,
  plate TEXT,
  has_ceramic INTEGER NOT NULL DEFAULT 0,
  owner_phone TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
 )`).run();
 const row=await env.DB.prepare('SELECT COUNT(*) n FROM staging_qa_cars').first<any>();
 if(Number(row?.n||0)===0){
  await env.DB.prepare(`INSERT INTO staging_qa_cars(name,brand,model,modification,body_type,plate,has_ceramic,owner_phone) VALUES(?,?,?,?,?,?,?,?)`)
   .bind('Audi A3','Audi','A3','','sedan','HA 7535 NA',0,'').run();
 }
}
const stagingCar=(x:any)=>({id:Number(x.id),name:x.name,brand:x.brand||'',model:x.model||'',modification:x.modification||'',bodyType:x.body_type||'',plate:x.plate||'',hasCeramic:Number(x.has_ceramic||0)===1,ownerPhone:x.owner_phone||'',package:null,lastServiceAt:null,visits:0});
async function stagingCarsApi(request:Request,env:SheetsEnv,url:URL):Promise<Response|null>{
 if(!env.DB)return json({error:'Staging D1 is not configured'},503);
 const carMatch=url.pathname.match(/^\/api\/cars\/(\d+)$/);
 const packageMatch=url.pathname.match(/^\/api\/cars\/(\d+)\/package$/);
 const historyMatch=url.pathname.match(/^\/api\/cars\/(\d+)\/history$/);
 const relevant=url.pathname==='/api/cars'||carMatch||packageMatch||historyMatch;
 if(!relevant)return null;
 await ensureStagingCars(env);
 if(url.pathname==='/api/cars'&&request.method==='GET'){
  const r=await env.DB.prepare('SELECT * FROM staging_qa_cars ORDER BY updated_at DESC,id DESC').all<any>();
  return json({cars:(r.results||[]).map(stagingCar),staging:true});
 }
 if(url.pathname==='/api/cars'&&request.method==='POST'){
  const b=await request.json<any>().catch(()=>({}));
  const name=String(b.name||'').trim().slice(0,80);if(!name)return json({error:'Car name is required'},400);
  const r=await env.DB.prepare(`INSERT INTO staging_qa_cars(name,brand,model,modification,body_type,plate,has_ceramic,owner_phone) VALUES(?,?,?,?,?,?,?,?)`)
   .bind(name,String(b.brand||'').trim().slice(0,60)||null,String(b.model||'').trim().slice(0,60)||null,String(b.modification||'').trim().slice(0,80)||null,String(b.bodyType||'').trim().slice(0,60)||null,String(b.plate||'').trim().slice(0,32)||null,b.hasCeramic?1:0,String(b.ownerPhone||'').trim().slice(0,40)||null).run();
  return json({ok:true,id:r.meta.last_row_id,staging:true});
 }
 if(carMatch&&request.method==='PUT'){
  const id=Number(carMatch[1]);const old=await env.DB.prepare('SELECT * FROM staging_qa_cars WHERE id=?').bind(id).first<any>();if(!old)return json({error:'Car not found'},404);
  const b=await request.json<any>().catch(()=>({}));const name=String(b.name??old.name).trim().slice(0,80);if(!name)return json({error:'Car name is required'},400);
  await env.DB.prepare(`UPDATE staging_qa_cars SET name=?,brand=?,model=?,modification=?,body_type=?,plate=?,has_ceramic=?,owner_phone=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
   .bind(name,String(b.brand??old.brand??'').trim().slice(0,60)||null,String(b.model??old.model??'').trim().slice(0,60)||null,String(b.modification??old.modification??'').trim().slice(0,80)||null,String(b.bodyType??old.body_type??'').trim().slice(0,60)||null,String(b.plate??old.plate??'').trim().slice(0,32)||null,b.hasCeramic===undefined?Number(old.has_ceramic||0):(b.hasCeramic?1:0),String(b.ownerPhone??old.owner_phone??'').trim().slice(0,40)||null,id).run();
  return json({ok:true,id,staging:true});
 }
 if(carMatch&&request.method==='DELETE'){
  const id=Number(carMatch[1]);await env.DB.prepare('DELETE FROM staging_qa_cars WHERE id=?').bind(id).run();return json({ok:true,id,staging:true});
 }
 if(packageMatch&&request.method==='PUT')return json({ok:true,id:Number(packageMatch[1]),staging:true});
 if(historyMatch&&request.method==='GET')return json({orders:[],staging:true});
 return json({error:'Method not allowed'},405);
}

export default {
 async fetch(request:Request,env:SheetsEnv,ctx:ExecutionContext):Promise<Response>{
  const url=new URL(request.url);
  const staging=isStaging(env);
  if(url.pathname==='/__version')return json({app:'ChameleonDetailing',version:VERSION,database:staging?'chameleondetailing-staging':'chameleondetailing',environment:staging?'staging':'production',worker:true,googleSheetsAppsScript:true,externalEffectsEnabled:!staging});

  if(staging){
   if(url.pathname==='/api/telegram/webhook'&&request.method==='POST')return json({ok:true,accepted:false,staging:true,reason:'Telegram webhook processing is disabled in staging'});
   if(url.pathname==='/api/telegram/bootstrap'&&request.method==='POST')return json({error:'Disabled in staging'},403);
   if(url.pathname==='/telegram/fix')return json({error:'Disabled in staging'},403);
   if(url.pathname==='/api/google-sheets/status')return json({configured:false,staging:true,reason:'Google Sheets integration is disabled in staging'});
   const carsResponse=await stagingCarsApi(request,env,url);if(carsResponse)return carsResponse;
   return (originalApp as any).fetch(request,safePreviewEnv(env),ctx);
  }

  if(url.pathname==='/api/google-sheets/status'&&request.method==='GET'){
   const supplied=url.searchParams.get('key')||'';
   const expected=String(env.TELEGRAM_SETUP_KEY||'');
   if(!expected||supplied!==expected)return json({error:'Unauthorized'},401);
   return json(await getGoogleSheetsState(env));
  }
  if(url.pathname==='/api/telegram/webhook'&&request.method==='POST'){
   let update:any=null;
   try{update=await request.clone().json()}catch{}
   if(update&&isGoogleSheetsUpdate(update)){
    const expected=telegramWebhookSecret(env);
    if(expected&&request.headers.get('x-telegram-bot-api-secret-token')!==expected)return json({error:'Unauthorized'},401);
    ctx.waitUntil(handleGoogleSheetsTelegramUpdate(env,update).catch(error=>console.error('Google Sheets bot panel failed',error)));
    return json({ok:true,accepted:true,googleSheets:true,updateId:update?.update_id??null});
   }
   const isProjectReset=String(update?.callback_query?.data||'')==='projectreset:execute';
   if(isProjectReset){
    const waits:Promise<unknown>[]=[];
    const wrappedCtx:any={
     waitUntil(promise:Promise<unknown>){const p=Promise.resolve(promise);waits.push(p);ctx.waitUntil(p)},
     passThroughOnException(){try{(ctx as any).passThroughOnException?.()}catch{}},
     props:(ctx as any).props,
    };
    const response=await (originalApp as any).fetch(request,env,wrappedCtx);
    ctx.waitUntil(Promise.allSettled(waits).then(()=>syncGoogleSheets(env,'project-reset')).catch(error=>console.error('Google Sheets post-reset sync failed',error)));
    return response;
   }
  }
  return (originalApp as any).fetch(request,env,ctx);
 },
 async scheduled(controller:ScheduledController,env:SheetsEnv,ctx:ExecutionContext):Promise<void>{
  if(isStaging(env)){
   console.log('Staging scheduled event skipped: external jobs are disabled.');
   return;
  }
  if(typeof (originalApp as any).scheduled==='function')await (originalApp as any).scheduled(controller,env,ctx);
  await runGoogleSheetsAutoSync(env).catch(error=>console.error('Google Sheets auto sync failed',error));
 }
};
