const token=process.env.BOT_TOKEN;
const app=(process.env.APP_URL||'').replace(/\/$/,'');
if(!token||!app){console.error('Set BOT_TOKEN and APP_URL environment variables first.');process.exit(1)}
const webhook=`${app}/api/telegram/webhook`;
const r=await fetch(`https://api.telegram.org/bot${token}/setWebhook`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:webhook,allowed_updates:['message','callback_query']})});
console.log(await r.json());
