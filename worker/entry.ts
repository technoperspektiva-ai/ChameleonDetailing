import originalApp from './index';
import type {SheetsEnv} from './lib/sheets';
import {getGoogleSheetsState,runGoogleSheetsAutoSync,syncGoogleSheets} from './lib/sheets';
import {handleGoogleSheetsTelegramUpdate,isGoogleSheetsUpdate} from './lib/sheets-bot';
import {telegramWebhookSecret} from './lib/bot';

const VERSION='1.2.2';
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

export default {
 async fetch(request:Request,env:SheetsEnv,ctx:ExecutionContext):Promise<Response>{
  const url=new URL(request.url);
  if(url.pathname==='/__version')return json({app:'ChameleonDetailing',version:VERSION,database:'chameleondetailing',worker:true,googleSheetsAppsScript:true});
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
  if(typeof (originalApp as any).scheduled==='function')await (originalApp as any).scheduled(controller,env,ctx);
  await runGoogleSheetsAutoSync(env).catch(error=>console.error('Google Sheets auto sync failed',error));
 }
};
