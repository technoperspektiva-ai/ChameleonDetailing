import type {Env} from './types';
import {ensureDb,event,getSetting} from './db';
import {sendMessage} from './telegram';
import {convertCurrency,normalizeCurrency} from './currency';

type ReferralLocale='uk'|'pl'|'en'|'de'|'fr';
const l5=(locale:ReferralLocale,uk:string,pl:string,en:string,de:string,fr:string)=>locale==='uk'?uk:locale==='pl'?pl:locale==='de'?de:locale==='fr'?fr:en;

export async function grantReferralRewardsIfEligible(env:Env,requestId:number,eventType:'COMPLETED'|'PAID'){
 if(!env.DB)return 0;
 await ensureDb(env);
 const req=await env.DB.prepare('SELECT id,user_id FROM service_requests WHERE id=? AND staff_deleted_at IS NULL').bind(requestId).first<any>();
 if(!req?.user_id)return 0;
 const ref=await env.DB.prepare('SELECT id,referrer_user_id,referred_user_id,first_paid_job_at FROM referrals WHERE referred_user_id=? ORDER BY id LIMIT 1').bind(req.user_id).first<any>();
 if(!ref?.id||!ref.referrer_user_id)return 0;
 if(eventType==='PAID')await env.DB.prepare('UPDATE referrals SET first_paid_job_at=COALESCE(first_paid_job_at,CURRENT_TIMESTAMP) WHERE id=?').bind(ref.id).run().catch(()=>{});
 if((await getSetting(env,'referral_enabled','1'))!=='1')return 0;
 const expected=String(await getSetting(env,'referral_success_status','COMPLETED')).toUpperCase();
 if(expected!==eventType)return 0;

 const type=String(await getSetting(env,'referral_referrer_bonus_type','PERCENT')).toUpperCase();
 const value=Math.max(0,Number(await getSetting(env,'referral_referrer_bonus_value','10'))||0);
 const currency=String(await getSetting(env,'referral_referrer_bonus_currency','PLN')).toUpperCase();
 const friendServiceId=Math.max(0,Number(await getSetting(env,'referral_friend_service_id',''))||0);

 let granted=0;
 if(value>0&&['PERCENT','FIXED'].includes(type)){
  const exists=await env.DB.prepare("SELECT 1 ok FROM referral_rewards WHERE referral_id=? AND beneficiary='REFERRER' LIMIT 1").bind(ref.id).first<any>();
  if(!exists){await env.DB.prepare("INSERT INTO referral_rewards(referral_id,user_id,beneficiary,reward_type,reward_value,reward_currency,status) VALUES(?,?,?,?,?,?,'AVAILABLE')").bind(ref.id,ref.referrer_user_id,'REFERRER',type,value,currency).run();granted++}
 }
 if(friendServiceId>0){
  const exists=await env.DB.prepare("SELECT 1 ok FROM referral_rewards WHERE referral_id=? AND beneficiary='FRIEND' LIMIT 1").bind(ref.id).first<any>();
  if(!exists){await env.DB.prepare("INSERT INTO referral_rewards(referral_id,user_id,beneficiary,reward_type,reward_service_id,status) VALUES(?,?,?,'FREE_SERVICE',?,'AVAILABLE')").bind(ref.id,req.user_id,'FRIEND',friendServiceId).run();granted++}
 }
 if(!granted)return 0;

 const people=await env.DB.prepare('SELECT id,telegram_user_id,language,preferred_currency FROM users WHERE id IN (?,?)').bind(ref.referrer_user_id,req.user_id).all<any>();
 for(const person of people.results||[]){
  if(!person.telegram_user_id)continue;
  const raw=String(person.language||'en').toLowerCase(),loc=(['uk','pl','en','de','fr'].includes(raw)?raw:'en') as ReferralLocale,isReferrer=Number(person.id)===Number(ref.referrer_user_id);
  const preferred=normalizeCurrency(person.preferred_currency||'PLN');
  const visibleReward=isReferrer?(type==='PERCENT'?'-'+value+'%':type==='FIXED'?'-'+Number(convertCurrency(value,normalizeCurrency(currency),preferred).toFixed(2))+' '+preferred:''):friendServiceId>0?l5(loc,'безкоштовна послуга','bezpłatna usługa','free service','kostenlose Leistung','service gratuit'):'';
  const msg=isReferrer
   ?l5(loc,'🎁 <b>Реферальний бонус активовано!</b>\n\nВаш бонус: <b>'+visibleReward+'</b>. Він уже активний у калькуляторі та застосовується автоматично до наступного відповідного розрахунку.','🎁 <b>Bonus polecający aktywowany!</b>\n\nTwój bonus: <b>'+visibleReward+'</b>. Jest już aktywny w kalkulatorze i zastosuje się automatycznie do następnej odpowiedniej wyceny.','🎁 <b>Referral reward activated!</b>\n\nYour reward: <b>'+visibleReward+'</b>. It is already active in the calculator and will apply automatically to the next eligible quote.','🎁 <b>Empfehlungsbonus aktiviert!</b>\n\nIhr Bonus: <b>'+visibleReward+'</b>. Er ist bereits im Rechner aktiv und wird automatisch auf die nächste passende Kalkulation angewendet.','🎁 <b>Bonus de parrainage activé !</b>\n\nVotre bonus : <b>'+visibleReward+'</b>. Il est déjà actif dans le calculateur et s’appliquera automatiquement au prochain calcul éligible.')
   :l5(loc,'🎁 <b>Бонус за запрошення активовано!</b>\n\nВаш бонус: <b>'+visibleReward+'</b>. Він уже доступний у калькуляторі.','🎁 <b>Bonus za polecenie aktywowany!</b>\n\nTwój bonus: <b>'+visibleReward+'</b>. Jest już dostępny w kalkulatorze.','🎁 <b>Invitation reward activated!</b>\n\nYour reward: <b>'+visibleReward+'</b>. It is already available in the calculator.','🎁 <b>Einladungsbonus aktiviert!</b>\n\nIhr Bonus: <b>'+visibleReward+'</b>. Er ist bereits im Rechner verfügbar.','🎁 <b>Bonus d’invitation activé !</b>\n\nVotre bonus : <b>'+visibleReward+'</b>. Il est déjà disponible dans le calculateur.');
  const receivedLabel=l5(loc,'✅ Отримано','✅ Otrzymano','✅ Received','✅ Erhalten','✅ Reçu');
  const ackMarkup={inline_keyboard:[[{text:receivedLabel,callback_data:`msgctl:read:${loc}`}]]};
  await sendMessage(env,Number(person.telegram_user_id),msg,ackMarkup).catch(()=>{});
 }
 await event(env,req.user_id,'referral_rewards_granted',{referralId:ref.id,requestId,eventType,granted});
 return granted;
}

export async function grantReferralRewardsForCurrentState(env:Env,requestId:number){
 if(!env.DB)return 0;
 await ensureDb(env);
 const expected=String(await getSetting(env,'referral_success_status','COMPLETED')).toUpperCase()==='PAID'?'PAID':'COMPLETED';
 const row=await env.DB.prepare('SELECT status,payment_status FROM service_requests WHERE id=? AND staff_deleted_at IS NULL').bind(requestId).first<any>();
 if(!row)return 0;
 if(expected==='PAID'&&String(row.payment_status||'').toUpperCase()!=='PAID')return 0;
 if(expected==='COMPLETED'&&String(row.status||'').toUpperCase()!=='COMPLETED')return 0;
 return grantReferralRewardsIfEligible(env,requestId,expected);
}


export async function reconcileReferralRewards(env:Env){
 if(!env.DB)return {eligible:0,granted:0,expected:'COMPLETED'};
 await ensureDb(env);
 if((await getSetting(env,'referral_enabled','1'))!=='1')return {eligible:0,granted:0,expected:String(await getSetting(env,'referral_success_status','COMPLETED')).toUpperCase()};
 const expected=String(await getSetting(env,'referral_success_status','COMPLETED')).toUpperCase()==='PAID'?'PAID':'COMPLETED';
 const condition=expected==='PAID'?"sr.payment_status='PAID'":"sr.status='COMPLETED'";
 const rows=await env.DB.prepare("SELECT r.id referral_id,(SELECT sr.id FROM service_requests sr WHERE sr.user_id=r.referred_user_id AND sr.staff_deleted_at IS NULL AND "+condition+" ORDER BY COALESCE(sr.completed_at,sr.confirmed_at,sr.created_at),sr.id LIMIT 1) request_id FROM referrals r WHERE r.referred_user_id IS NOT NULL ORDER BY r.id").all<any>();
 let eligible=0,granted=0;
 for(const row of rows.results||[]){const requestId=Number(row.request_id||0);if(!requestId)continue;eligible++;granted+=await grantReferralRewardsIfEligible(env,requestId,expected)}
 return {eligible,granted,expected};
}
