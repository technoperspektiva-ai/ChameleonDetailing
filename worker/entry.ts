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
