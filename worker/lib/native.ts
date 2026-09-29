import type {Env} from './types';
import {ensureDb} from './db';

const enc=new TextEncoder();
const dec=new TextDecoder();

const b64urlDecode=(input:string)=>{
 const normalized=input.replace(/-/g,'+').replace(/_/g,'/');
 const padded=normalized+'='.repeat((4-normalized.length%4)%4);
 const raw=atob(padded),out=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
 return out;
};
const b64urlEncode=(input:Uint8Array)=>{
 let raw='';for(const b of input)raw+=String.fromCharCode(b);
 return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
const sha256Hex=async(input:string)=>{
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(input)));
 return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
};
const randomToken=()=>{const b=new Uint8Array(32);crypto.getRandomValues(b);return b64urlEncode(b)};
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const read=async(r:Request)=>{try{return await r.json() as any}catch{return {}}};

async function ensureNativeDb(env:Env){
 if(!env.DB)throw new Error('DB is not configured');
 await ensureDb(env);
 await env.DB.exec(`
CREATE TABLE IF NOT EXISTS native_auth_identities(
 provider TEXT NOT NULL,
 subject TEXT NOT NULL,
 user_id INTEGER NOT NULL,
 email TEXT,
 display_name TEXT,
 photo_url TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(provider,subject)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_native_identity_user_provider ON native_auth_identities(user_id,provider);
CREATE TABLE IF NOT EXISTS native_sessions(
 token_hash TEXT PRIMARY KEY,
 user_id INTEGER NOT NULL,
 platform TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at TEXT NOT NULL,
 revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_native_sessions_user ON native_sessions(user_id,expires_at);
`);
}

async function verifyGoogleIdToken(env:Env,idToken:string){
 const clientId=String(env.GOOGLE_WEB_CLIENT_ID||'').trim();
 if(!clientId)throw new Error('GOOGLE_WEB_CLIENT_ID is not configured');
 const parts=String(idToken||'').split('.');
 if(parts.length!==3)throw new Error('Invalid Google ID token');
 let header:any,payload:any;
 try{
  header=JSON.parse(dec.decode(b64urlDecode(parts[0])));
  payload=JSON.parse(dec.decode(b64urlDecode(parts[1])));
 }catch{throw new Error('Invalid Google ID token')}
 if(header.alg!=='RS256'||!header.kid)throw new Error('Unsupported Google token');
 const certsRes=await fetch('https://www.googleapis.com/oauth2/v3/certs',{headers:{accept:'application/json'}});
 if(!certsRes.ok)throw new Error('Google identity keys unavailable');
 const certs:any=await certsRes.json();
 const jwk=(certs.keys||[]).find((x:any)=>x.kid===header.kid&&x.kty==='RSA');
 if(!jwk)throw new Error('Google signing key not found');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const signed=enc.encode(parts[0]+'.'+parts[1]);
 const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,b64urlDecode(parts[2]),signed);
 if(!valid)throw new Error('Google token signature is invalid');
 const now=Math.floor(Date.now()/1000);
 const aud=Array.isArray(payload.aud)?payload.aud:[payload.aud];
 if(!aud.includes(clientId))throw new Error('Google token audience mismatch');
 if(!['accounts.google.com','https://accounts.google.com'].includes(String(payload.iss||'')))throw new Error('Google token issuer mismatch');
 if(Number(payload.exp||0)<=now-30)throw new Error('Google token expired');
 if(Number(payload.iat||0)>now+120)throw new Error('Google token issued in the future');
 if(payload.email_verified!==true&&payload.email_verified!=='true')throw new Error('Google email is not verified');
 if(!payload.sub)throw new Error('Google subject is missing');
 return {
  subject:String(payload.sub),
  email:String(payload.email||''),
  name:String(payload.name||payload.given_name||payload.email||'Chameleon user'),
  picture:String(payload.picture||''),
  locale:String(payload.locale||'en')
 };
}

async function syntheticTelegramId(subject:string){
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode('google:'+subject)));
 let value=0;
 for(let i=0;i<6;i++)value=value*256+digest[i];
 return -Math.max(1,value);
}

async function ensureNativeUser(env:Env,profile:{subject:string;email:string;name:string;picture:string;locale:string}){
 await ensureNativeDb(env);
 const existing=await env.DB!.prepare(`
  SELECT u.*,COALESCE(p.client_tier,'STANDARD') client_tier,p.phone_number,
         i.provider native_provider,i.email native_email
  FROM native_auth_identities i
  JOIN users u ON u.id=i.user_id
  LEFT JOIN client_profiles p ON p.user_id=u.id
  WHERE i.provider='google' AND i.subject=?
 `).bind(profile.subject).first<any>();
 if(existing){
  await env.DB!.prepare("UPDATE native_auth_identities SET email=?,display_name=?,photo_url=?,updated_at=CURRENT_TIMESTAMP WHERE provider='google' AND subject=?")
   .bind(profile.email||null,profile.name||null,profile.picture||null,profile.subject).run();
  await env.DB!.prepare("UPDATE users SET first_name=?,photo_url=COALESCE(?,photo_url),last_seen_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?")
   .bind(profile.name,profile.picture||null,existing.id).run();
  return {...existing,first_name:profile.name,photo_url:profile.picture||existing.photo_url,native_provider:'google',demo:false};
 }
 const synthetic=await syntheticTelegramId(profile.subject);
 const lang=profile.locale.toLowerCase().startsWith('uk')?'uk':profile.locale.toLowerCase().startsWith('pl')?'pl':profile.locale.toLowerCase().startsWith('de')?'de':profile.locale.toLowerCase().startsWith('fr')?'fr':'en';
 const username=profile.email?profile.email.split('@')[0].slice(0,64):null;
 const ins=await env.DB!.prepare(`
  INSERT INTO users(telegram_user_id,username,first_name,language,preferred_currency,role,photo_url,bot_status,bot_status_updated_at)
  VALUES(?,?,?,?,?,'CLIENT',?,'UNAVAILABLE',CURRENT_TIMESTAMP)
 `).bind(synthetic,username,profile.name,lang,env.DEFAULT_CURRENCY,profile.picture||null).run();
 const userId=Number(ins.meta.last_row_id);
 await env.DB!.prepare('INSERT OR IGNORE INTO client_profiles(user_id) VALUES(?)').bind(userId).run();
 await env.DB!.prepare("INSERT INTO native_auth_identities(provider,subject,user_id,email,display_name,photo_url) VALUES('google',?,?,?,?,?)")
  .bind(profile.subject,userId,profile.email||null,profile.name||null,profile.picture||null).run();
 return env.DB!.prepare(`
  SELECT u.*,COALESCE(p.client_tier,'STANDARD') client_tier,p.phone_number,'google' native_provider,? native_email
  FROM users u LEFT JOIN client_profiles p ON p.user_id=u.id WHERE u.id=?
 `).bind(profile.email||null,userId).first<any>();
}

export async function resolveNativeSession(env:Env,rawToken:string){
 if(!env.DB||!rawToken)return null;
 await ensureNativeDb(env);
 const hash=await sha256Hex(rawToken);
 const row=await env.DB.prepare(`
  SELECT u.*,COALESCE(p.client_tier,'STANDARD') client_tier,p.phone_number,
         i.provider native_provider,i.email native_email
  FROM native_sessions s
  JOIN users u ON u.id=s.user_id
  LEFT JOIN client_profiles p ON p.user_id=u.id
  LEFT JOIN native_auth_identities i ON i.user_id=u.id
  WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP
  LIMIT 1
 `).bind(hash).first<any>();
 if(!row)return null;
 await env.DB.prepare('UPDATE native_sessions SET last_seen_at=CURRENT_TIMESTAMP WHERE token_hash=?').bind(hash).run().catch(()=>{});
 return {...row,demo:false};
}

export async function handleNativeApi(request:Request,env:Env,url:URL):Promise<Response|null>{
 if(!url.pathname.startsWith('/api/native/'))return null;
 if(request.method==='OPTIONS')return new Response(null,{status:204});
 try{
  if(url.pathname==='/api/native/auth/google'&&request.method==='POST'){
   const body=await read(request);
   const profile=await verifyGoogleIdToken(env,String(body.idToken||''));
   const user=await ensureNativeUser(env,profile);
   const token=randomToken();
   const hash=await sha256Hex(token);
   const platform=String(body.platform||'android').slice(0,24);
   const days=90;
   await env.DB!.prepare(`
    INSERT INTO native_sessions(token_hash,user_id,platform,expires_at)
    VALUES(?,?,?,datetime('now',?))
   `).bind(hash,user.id,platform,`+${days} days`).run();
   return json({ok:true,sessionToken:token,expiresInDays:days,user:{id:user.id,name:user.first_name,email:profile.email,photoUrl:user.photo_url||null}});
  }
  const authz=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  const user=await resolveNativeSession(env,authz);
  if(!user)return json({error:'NATIVE_SESSION_INVALID'},401);
  if(url.pathname==='/api/native/session'&&request.method==='GET')return json({ok:true,user:{id:user.id,name:user.first_name,email:user.native_email||null,photoUrl:user.photo_url||null}});
  if(url.pathname==='/api/native/logout'&&request.method==='POST'){
   const hash=await sha256Hex(authz);
   await env.DB!.prepare('UPDATE native_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=?').bind(hash).run();
   return json({ok:true});
  }
  return json({error:'Not found'},404);
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  return json({error:message},message.includes('configured')?503:401);
 }
}
