import type {Env} from './types';
import {getServices,getServiceOptions} from './db';
import {convertCurrency,normalizeCurrency} from './currency';

const fx:Record<string,Record<string,number>>={PLN:{PLN:1,USD:.26,UAH:11.1},USD:{USD:1,PLN:3.85,UAH:42.7},UAH:{UAH:1,PLN:.09,USD:.0234}};
const vehicle:Record<string,number>={sedan:1,hatchback:1,suv:1.15,'large-suv':1.25,van:1.35};
const condition:Record<string,number>={light:.9,normal:1,dirty:1.2,'very-dirty':1.4};
const round=(n:number)=>Math.round(n*100)/100;

async function vipRule(env:Env,serviceId:number,tier:string){
 if(!env.DB||tier==='STANDARD')return null;
 try{return await env.DB.prepare(`SELECT * FROM vip_pricing_rules WHERE service_id=? AND tier=? AND enabled=1 LIMIT 1`).bind(serviceId,tier).first<any>()}catch{return null}
}
async function activePromotion(env:Env,serviceId:number){
 if(!env.DB)return null;
 try{return await env.DB.prepare(`SELECT * FROM service_promotions WHERE service_id=? AND enabled=1 AND datetime(starts_at)<=datetime('now') AND datetime(ends_at)>datetime('now') ORDER BY percent_discount DESC,id DESC LIMIT 1`).bind(serviceId).first<any>()}catch{return null}
}
async function activePersonalDiscount(env:Env,userId:number){
 if(!env.DB||!userId)return null;
 try{return await env.DB.prepare(`SELECT * FROM personal_discounts WHERE user_id=? AND status='ACTIVATED' AND (expires_at IS NULL OR datetime(expires_at)>datetime('now')) ORDER BY activated_at DESC,id DESC LIMIT 1`).bind(userId).first<any>()}catch{return null}
}

export async function serviceDisplayPrice(env:Env,serviceId:number,basePrice:number,baseCurrency:string,tier='STANDARD'){
 const promo=await activePromotion(env,serviceId);if(promo){const pct=Math.max(0,Math.min(100,Number(promo.percent_discount||0)));return {price:basePrice*(1-pct/100),mode:'PROMOTION',promotion:{id:promo.id,percentDiscount:pct,label:promo.label||null,endsAt:promo.ends_at}}}
 const vip=await vipBasePrice(env,serviceId,basePrice,baseCurrency,tier);return {...vip,promotion:null};
}

export async function vipBasePrice(env:Env,serviceId:number,basePrice:number,baseCurrency:string,tier='STANDARD'){
 const rule=await vipRule(env,serviceId,tier);if(!rule)return {price:tier==='VIP_PLUS'?basePrice*.85:tier==='VIP'?basePrice*.9:basePrice,mode:rule?String(rule.mode):tier==='STANDARD'?'STANDARD':'PERCENT_DEFAULT'};
 const mode=String(rule.mode||'PERCENT').toUpperCase();if(mode==='PRICE')return {price:convertCurrency(Number(rule.fixed_price||0),normalizeCurrency(rule.currency||baseCurrency),normalizeCurrency(baseCurrency)),mode};if(mode==='MULTIPLIER')return {price:basePrice*Math.max(0,Number(rule.multiplier||1)),mode};return {price:basePrice*(1-Math.max(0,Math.min(100,Number(rule.percent_discount||0)))/100),mode};
}

export async function quote(env:Env,input:any,tier='STANDARD',emergencyMultiplier=1,userId=0){
 const services=await getServices(env,'en'),s=services.find(x=>x.slug===input.service);if(!s)throw new Error('Unknown service');
 const serviceId=Number((s as any).id||0),vm=vehicle[input.vehicle]||1,cm=condition[input.condition]||1;const optionCatalog=await getServiceOptions(env,'en',String(s.currency||'PLN'));const optionMap=new Map(optionCatalog.map((x:any)=>[String(x.slug),Number(x.price||0)]));const opts=(input.options||[]).filter((x:string)=>optionMap.has(String(x)));const optionsBase=opts.reduce((n:number,x:string)=>n+Number(optionMap.get(String(x))||0),0);
 const standardBase=Number(s.basePrice||0),standardSubtotal=standardBase*vm*cm+optionsBase;let subtotal=standardSubtotal,pricingMode='STANDARD',appliedRule:any=null,discountSource='NONE';
 const [personal,promo]=await Promise.all([activePersonalDiscount(env,userId),activePromotion(env,serviceId)]);
 if(personal){
  const pct=Math.max(0,Math.min(100,Number(personal.percent_discount||0)));subtotal=standardSubtotal*(1-pct/100);pricingMode='PERSONAL';discountSource='PERSONAL';appliedRule=personal;
 }else if(promo){
  const pct=Math.max(0,Math.min(100,Number(promo.percent_discount||0)));subtotal=standardSubtotal*(1-pct/100);pricingMode='PROMOTION';discountSource='PROMOTION';appliedRule=promo;
 }else{
  const rule=await vipRule(env,serviceId,tier);
  if(rule){pricingMode=String(rule.mode||'PERCENT').toUpperCase();discountSource='VIP';appliedRule=rule;
   if(pricingMode==='PRICE'&&Number(rule.fixed_price)>=0){const rp=convertCurrency(Number(rule.fixed_price),normalizeCurrency(rule.currency||s.currency),normalizeCurrency(s.currency));subtotal=rp*vm*cm+optionsBase}
   else if(pricingMode==='MULTIPLIER'){subtotal=standardSubtotal*Math.max(0,Number(rule.multiplier||1))}
   else {const pct=Math.max(0,Math.min(100,Number(rule.percent_discount||0)));subtotal=standardSubtotal*(1-pct/100)}
  }else if(tier==='VIP'||tier==='VIP_PLUS'){
   const pct=tier==='VIP_PLUS'?15:10;pricingMode='PERCENT_DEFAULT';discountSource='VIP';subtotal=standardSubtotal*(1-pct/100)
  }
 }
 const discount=Math.max(0,standardSubtotal-subtotal),target=normalizeCurrency(input.currency||s.currency),rate=fx[normalizeCurrency(s.currency)]?.[target]||1,emergencySurcharge=Math.max(0,subtotal*(emergencyMultiplier-1));
 return {service:s.slug,standardBasePrice:round(standardBase*rate),basePrice:round((subtotal-optionsBase)*rate/(vm*cm||1)),standardTotal:round(standardSubtotal*rate),discountedSubtotal:round(subtotal*rate),vehicleMultiplier:vm,conditionMultiplier:cm,optionsTotal:round(optionsBase*rate),discount:round(discount*rate),discountSource,promotion:promo?{id:promo.id,percentDiscount:Number(promo.percent_discount||0),label:promo.label||null,endsAt:promo.ends_at}:null,personalDiscount:personal?{id:personal.id,percentDiscount:Number(personal.percent_discount||0),greeting:personal.greeting||null,expiresAt:personal.expires_at}:null,vipPricing:{tier,mode:discountSource==='VIP'?pricingMode:(discountSource==='NONE'?'STANDARD':'SUPPRESSED'),rule:discountSource==='VIP'&&appliedRule?{percentDiscount:appliedRule.percent_discount,multiplier:appliedRule.multiplier,fixedPrice:appliedRule.fixed_price,currency:appliedRule.currency}:null},emergencyMultiplier,emergencySurcharge:round(emergencySurcharge*rate),finalPrice:round((subtotal+emergencySurcharge)*rate),currency:target,fxRate:rate,fxProvider:'INTERNAL_RATE',fxTimestamp:new Date().toISOString(),options:opts};
}
