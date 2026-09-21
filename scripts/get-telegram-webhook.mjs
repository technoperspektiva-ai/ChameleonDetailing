const token=process.env.BOT_TOKEN;if(!token)throw new Error('BOT_TOKEN is required');
const r=await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);const j=await r.json();if(!j.ok)throw new Error(j.description||'getWebhookInfo failed');console.log(JSON.stringify(j.result,null,2));
