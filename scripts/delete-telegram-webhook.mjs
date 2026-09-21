const token=process.env.BOT_TOKEN;
if(!token){console.error('Set BOT_TOKEN before running this command.');process.exit(1)}
const url=`https://api.telegram.org/bot${token}/deleteWebhook`;
const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({drop_pending_updates:false})});
const data=await response.json();
if(!response.ok||!data.ok){console.error(data);process.exit(1)}
console.log('Telegram webhook deleted. Bot is now in no-webhook mode.');
