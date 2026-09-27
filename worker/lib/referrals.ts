import type {Env} from './types';
import {ensureDb,event,getSetting} from './db';
import {sendMessage} from './telegram';

type ReferralLocale='uk'|'pl'|'en'|'de'|'fr';
const l5=(locale:ReferralLocale,uk:string,pl:string,en:string,de:string,fr:string)=>locale==='uk'?uk:locale==='pl'?pl:locale==='de'?de:locale==='fr'?fr:en;

export async function grantReferralRewardsIfEligible(env:Env,requestId:number,eventType:'COMPLETED'|'PAID'){
 if(!env.DB)return;
 await ensureDb(env);
 if((await getSetting(env,'referral_enabled','1'))!=='1')return;
 const expected=String(await getSetting(env,'referral_success_status','COMPLETED')).toUpperCase();
 if(expected!==eventType)return;
 const req=await env.DB.prepare('SELECT id,user_id FROM service_requests WHERE id=? AND staff_deleted_at IS NULL').bind(requestId).first<any>();
 if(!req?.user_id)return;
 const ref=await env.DB.prepare('SELECT id,referrer_user_id,referred_user_id,first_paid_job_at FROM referrals WHERE referred_user_id=? ORDER BY id LIMIT 1').bind(req.user_id).first<any>();
 if(!ref?.id||!ref.referrer_user_id)return;

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
 if(eventType==='PAID')await env.DB.prepare('UPDATE referrals SET first_paid_job_at=COALESCE(first_paid_job_at,CURRENT_TIMESTAMP) WHERE id=?').bind(ref.id).run().catch(()=>{});
 if(!granted)return;

 const people=await env.DB.prepare('SELECT id,telegram_user_id,language FROM users WHERE id IN (?,?)').bind(ref.referrer_user_id,req.user_id).all<any>();
 for(const person of people.results||[]){
  if(!person.telegram_user_id)continue;
  const raw=String(person.language||'en').toLowerCase(),loc=(['uk','pl','en','de','fr'].includes(raw)?raw:'en') as ReferralLocale,isReferrer=Number(person.id)===Number(ref.referrer_user_id);
  const msg=isReferrer
   ?l5(loc,'🎁 <b>Реферальний бонус активовано!</b>\n\nДруг успішно скористався Chameleon Detailing. Бонус уже доступний і застосовується до наступного відповідного розрахунку.','🎁 <b>Bonus polecający aktywowany!</b>\n\nZnajomy skorzystał z Chameleon Detailing. Bonus jest już dostępny przy kolejnym odpowiednim rozliczeniu.','🎁 <b>Referral reward activated!</b>\n\nYour friend successfully used Chameleon Detailing. Your reward is ready for the next eligible quote.','🎁 <b>Empfehlungsbonus aktiviert!</b>\n\nIhr Freund hat Chameleon Detailing genutzt. Ihr Bonus ist für die nächste passende Kalkulation verfügbar.','🎁 <b>Bonus de parrainage activé !</b>\n\nVotre ami a utilisé Chameleon Detailing. Votre bonus est disponible pour le prochain calcul éligible.')
   :l5(loc,'🎁 <b>Бонус за запрошення активовано!</b>\n\nВаш бонус доступний для відповідної послуги в калькуляторі.','🎁 <b>Bonus za polecenie aktywowany!</b>\n\nTwój bonus jest dostępny dla odpowiedniej usługi w kalkulatorze.','🎁 <b>Invitation reward activated!</b>\n\nYour reward is available for the eligible service in the calculator.','🎁 <b>Einladungsbonus aktiviert!</b>\n\nIhr Bonus ist für die passende Leistung im Rechner verfügbar.','🎁 <b>Bonus d’invitation activé !</b>\n\nVotre bonus est disponible pour le service éligible dans le calculateur.');
  await sendMessage(env,Number(person.telegram_user_id),msg).catch(()=>{});
 }
 await event(env,req.user_id,'referral_rewards_granted',{referralId:ref.id,requestId,eventType,granted});
}
