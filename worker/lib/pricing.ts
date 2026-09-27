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
async function optionVipRule(env:Env,optionId:number,tier:string){
 if(!env.DB||tier==='STANDARD')return null;
 try{return await env.DB.prepare(`SELECT * FROM service_option_vip_pricing_rules WHERE option_id=? AND tier=? AND enabled=1 LIMIT 1`).bind(optionId,tier).first<any>()}catch{return null}
}
async function activePromotion(env:Env,serviceId:number){
 if(!env.DB)return null;
 try{return await env.DB.prepare(`SELECT * FROM service_promotions WHERE service_id=? AND enabled=1 AND datetime(starts_at)<=datetime('now') AND datetime(ends_at)>datetime('now') ORDER BY percent_discount DESC,id DESC LIMIT 1`).bind(serviceId).first<any>()}catch{return null}
}
async function activePersonalDiscount(env:Env,userId:number){
 if(!env.DB||!userId)return null;
 try{return await env.DB.prepare(`SELECT * FROM personal_discounts WHERE user_id=? AND status='ACTIVATED' AND (expires_at IS NULL OR datetime(expires_at)>datetime('now')) ORDER BY activated_at DESC,id DESC LIMIT 1`).bind(userId).first<any>()}catch{return null}
}
async function activeReferralReward(env:Env,userId:number){
 if(!env.DB||!userId)return null;
 try{return await env.DB.prepare("SELECT rr.*,s.slug reward_service_slug FROM referral_rewards rr LEFT JOIN services s ON s.id=rr.reward_service_id WHERE rr.user_id=? AND rr.status='AVAILABLE' ORDER BY rr.id LIMIT 1").bind(userId).first<any>()}catch{return null}
}

export async function serviceDisplayPrice(env:Env,serviceId:number,basePrice:number,baseCurrency:string,tier='STANDARD'){
 const promo=await activePromotion(env,serviceId);if(promo){const pct=Math.max(0,Math.min(100,Number(promo.percent_discount||0)));return {price:basePrice*(1-pct/100),mode:'PROMOTION',promotion:{id:promo.id,percentDiscount:pct,label:promo.label||null,endsAt:promo.ends_at}}}
 const vip=await vipBasePrice(env,serviceId,basePrice,baseCurrency,tier);return {...vip,promotion:null};
}

export async function vipBasePrice(env:Env,serviceId:number,basePrice:number,baseCurrency:string,tier='STANDARD'){
 const rule=await vipRule(env,serviceId,tier);
 if(!rule)return {price:tier==='VIP_PLUS'?basePrice*.85:tier==='VIP'?basePrice*.9:basePrice,mode:tier==='STANDARD'?'STANDARD':'PERCENT_DEFAULT'};
 const mode=String(rule.mode||'PERCENT').toUpperCase();
 if(mode==='PRICE')return {price:convertCurrency(Number(rule.fixed_price||0),normalizeCurrency(rule.currency||baseCurrency),normalizeCurrency(baseCurrency)),mode};
 if(mode==='MULTIPLIER')return {price:basePrice*Math.max(0,Number(rule.multiplier||1)),mode};
 return {price:basePrice*(1-Math.max(0,Math.min(100,Number(rule.percent_discount||0)))/100),mode};
}

export async function optionDisplayPrice(env:Env,optionId:number,basePrice:number,baseCurrency:string,tier='STANDARD'){
 const rule=await optionVipRule(env,optionId,tier);
 if(!rule)return {price:tier==='VIP_PLUS'?basePrice*.85:tier==='VIP'?basePrice*.9:basePrice,mode:tier==='STANDARD'?'STANDARD':'PERCENT_DEFAULT'};
 const mode=String(rule.mode||'PERCENT').toUpperCase();
 if(mode==='PRICE')return {price:convertCurrency(Number(rule.fixed_price||0),normalizeCurrency(rule.currency||baseCurrency),normalizeCurrency(baseCurrency)),mode};
 if(mode==='MULTIPLIER')return {price:basePrice*Math.max(0,Number(rule.multiplier||1)),mode};
 return {price:basePrice*(1-Math.max(0,Math.min(100,Number(rule.percent_discount||0)))/100),mode};
}

async function dynamicMultiplier(env:Env,table:'vehicle_types'|'condition_levels',slug:string,fallback:number){
 if(!env.DB)return fallback;
 try{const row=await env.DB.prepare(`SELECT multiplier FROM ${table} WHERE slug=? AND enabled=1 LIMIT 1`).bind(slug).first<any>();return row?Number(row.multiplier||fallback):fallback}catch{return fallback}
}
async function serviceRequirements(env:Env,serviceId:number,slug:string){
 if(!env.DB)return {requireCondition:slug!=='exterior-detailing',requireVehicle:true,allowOptions:true,allowMultipleOptions:true};
 try{const r=await env.DB.prepare('SELECT require_condition,require_vehicle,allow_options,allow_multiple_options FROM service_requirements WHERE service_id=?').bind(serviceId).first<any>();return r?{requireCondition:Number(r.require_condition)!==0,requireVehicle:Number(r.require_vehicle)!==0,allowOptions:Number(r.allow_options)!==0,allowMultipleOptions:Number(r.allow_multiple_options)!==0}:{requireCondition:slug!=='exterior-detailing',requireVehicle:true,allowOptions:true,allowMultipleOptions:true}}catch{return {requireCondition:slug!=='exterior-detailing',requireVehicle:true,allowOptions:true,allowMultipleOptions:true}}
}

export async function quote(env:Env,input:any,tier='STANDARD',emergencyMultiplier=1,userId=0){
 const requested=Array.isArray(input.services)?input.services:(input.service?[input.service]:[]);
 const serviceSlugs=[...new Set(requested.map((x:any)=>String(x)).filter(Boolean))] as string[];
 if(!serviceSlugs.length)throw new Error('Choose at least one service');
 const target=normalizeCurrency(input.currency||'PLN');
 const services=await getServices(env,'en',target);
 const selected=serviceSlugs.map(slug=>services.find(x=>x.slug===slug)).filter(Boolean) as any[];
 if(selected.length!==serviceSlugs.length)throw new Error('Unknown service');
 const vm=await dynamicMultiplier(env,'vehicle_types',String(input.vehicle||''),vehicle[String(input.vehicle||'')]||1);
 const cm=await dynamicMultiplier(env,'condition_levels',String(input.condition||''),condition[String(input.condition||'')]||1);
 const optionCatalog=await getServiceOptions(env,'en',target);
 const selectedOptionSlugs=[...new Set((Array.isArray(input.options)?input.options:[]).map((x:any)=>String(x)).filter(Boolean))] as string[];
 const selectedOptions=selectedOptionSlugs.map(slug=>optionCatalog.find((x:any)=>x.slug===slug)).filter(Boolean) as any[];
 const reqs=new Map<number,any>();
 for(const svc of selected)reqs.set(Number(svc.id),await serviceRequirements(env,Number(svc.id),String(svc.slug)));
 const requiresCondition=selected.some(svc=>reqs.get(Number(svc.id))?.requireCondition);
 const requiresVehicle=selected.some(svc=>reqs.get(Number(svc.id))?.requireVehicle);
 const [personal,referralReward]=await Promise.all([activePersonalDiscount(env,userId),activeReferralReward(env,userId)]);
 const breakdown:any[]=[];
 let standardTotal=0,discountedTotal=0,totalOptions=0,totalEffectiveOptions=0,totalBaseAfter=0,totalStandardBase=0,totalDiscount=0;
 for(const svc of selected){
  const req=reqs.get(Number(svc.id));
  const factor=(req?.requireVehicle?vm:1)*(req?.requireCondition?cm:1);
  const linked=selectedOptions.filter(opt=>{const links=Array.isArray(opt.serviceSlugs)?opt.serviceSlugs:[];return links.length?links.includes(String(svc.slug)):selected[0]?.slug===svc.slug});
  // An option linked to multiple chosen services is charged only once, on the first selected matching service.
  const owned=linked.filter(opt=>{const matching=selected.filter(other=>{const links=Array.isArray(opt.serviceSlugs)?opt.serviceSlugs:[];return !links.length||links.includes(String(other.slug))});return matching[0]?.slug===svc.slug});
  const optionsTotal=owned.reduce((n:number,x:any)=>n+Number(x.price||0),0);
  const standardBase=Number(svc.basePrice||0),standardBaseComponent=standardBase*factor,standardSubtotal=standardBaseComponent+optionsTotal;
  let subtotal=standardSubtotal,effectiveBase=standardBaseComponent,effectiveOptions=optionsTotal,source='NONE',pricingMode='STANDARD',promo:any=null;
  let optionBreakdown=owned.map((x:any)=>({id:Number(x.id),slug:String(x.slug),standardPrice:round(Number(x.price||0)),price:round(Number(x.price||0)),pricingMode:'STANDARD'}));

  if(!personal){
   promo=await activePromotion(env,Number(svc.id));
   if(promo){
    const pct=Math.max(0,Math.min(100,Number(promo.percent_discount||0)));
    effectiveBase=standardBaseComponent*(1-pct/100);
    effectiveOptions=optionsTotal*(1-pct/100);
    subtotal=effectiveBase+effectiveOptions;
    source='PROMOTION';pricingMode='PROMOTION';
    optionBreakdown=optionBreakdown.map((x:any)=>({...x,price:round(x.standardPrice*(1-pct/100)),pricingMode:'PROMOTION'}));
   }else if(tier==='VIP'||tier==='VIP_PLUS'){
    const [serviceVip,...optionVip]=await Promise.all([
     vipBasePrice(env,Number(svc.id),standardBase,target,tier),
     ...owned.map((x:any)=>optionDisplayPrice(env,Number(x.id),Number(x.price||0),target,tier))
    ]);
    effectiveBase=Number(serviceVip.price||0)*factor;
    effectiveOptions=optionVip.reduce((n:number,x:any)=>n+Number(x.price||0),0);
    subtotal=effectiveBase+effectiveOptions;
    source='VIP';pricingMode=String(serviceVip.mode||'PERCENT_DEFAULT');
    optionBreakdown=owned.map((x:any,i:number)=>({id:Number(x.id),slug:String(x.slug),standardPrice:round(Number(x.price||0)),price:round(Number(optionVip[i]?.price??x.price??0)),pricingMode:String(optionVip[i]?.mode||'STANDARD')}));
   }
  }

  standardTotal+=standardSubtotal;
  discountedTotal+=subtotal;
  totalOptions+=optionsTotal;
  totalEffectiveOptions+=effectiveOptions;
  totalStandardBase+=standardBaseComponent;
  totalBaseAfter+=effectiveBase;
  totalDiscount+=Math.max(0,standardSubtotal-subtotal);
  breakdown.push({
   service:String(svc.slug),serviceId:Number(svc.id),basePrice:round(standardBase),
   vehicleMultiplier:req?.requireVehicle?vm:1,conditionMultiplier:req?.requireCondition?cm:1,
   requiresCondition:!!req?.requireCondition,requiresVehicle:!!req?.requireVehicle,
   options:owned.map(x=>x.slug),optionBreakdown,optionsTotal:round(optionsTotal),effectiveOptionsTotal:round(effectiveOptions),
   standardTotal:round(standardSubtotal),subtotal:round(subtotal),discount:round(Math.max(0,standardSubtotal-subtotal)),
   discountSource:source,pricingMode,
   promotion:promo?{id:promo.id,percentDiscount:Number(promo.percent_discount||0),label:promo.label||null,endsAt:promo.ends_at}:null
  });
 }
 if(personal){
  const pct=Math.max(0,Math.min(100,Number(personal.percent_discount||0)));
  discountedTotal=standardTotal*(1-pct/100);
  totalDiscount=Math.max(0,standardTotal-discountedTotal);
  const ratio=standardTotal>0?discountedTotal/standardTotal:1;
  totalBaseAfter=totalStandardBase*ratio;
  totalEffectiveOptions=totalOptions*ratio;
  for(const b of breakdown){
   b.discountSource='PERSONAL';b.pricingMode='PERSONAL';b.subtotal=round(b.standardTotal*ratio);b.discount=round(b.standardTotal-b.subtotal);b.effectiveOptionsTotal=round(Number(b.optionsTotal||0)*ratio);
   b.optionBreakdown=(b.optionBreakdown||[]).map((x:any)=>({...x,price:round(Number(x.standardPrice||0)*ratio),pricingMode:'PERSONAL'}));
  }
 }
 let referralDiscount=0;
 if(!personal&&referralReward){
  const type=String(referralReward.reward_type||'').toUpperCase();
  if(type==='PERCENT'){const pct=Math.max(0,Math.min(100,Number(referralReward.reward_value||0)));referralDiscount=discountedTotal*pct/100;discountedTotal=Math.max(0,discountedTotal-referralDiscount)}
  else if(type==='FIXED'){const fixed=convertCurrency(Number(referralReward.reward_value||0),normalizeCurrency(referralReward.reward_currency||target),target);referralDiscount=Math.min(discountedTotal,Math.max(0,fixed));discountedTotal=Math.max(0,discountedTotal-referralDiscount)}
  else if(type==='FREE_SERVICE'&&referralReward.reward_service_slug){
   const item=breakdown.find(x=>x.service===String(referralReward.reward_service_slug));
   if(item){const free=Math.max(0,Number(item.subtotal||0)-Number(item.effectiveOptionsTotal||0));referralDiscount=Math.min(discountedTotal,free);discountedTotal=Math.max(0,discountedTotal-referralDiscount);item.discountSource='REFERRAL';item.discount=round(Number(item.discount||0)+referralDiscount);item.subtotal=round(Number(item.subtotal||0)-referralDiscount)}
  }
  totalDiscount+=referralDiscount;
 }
 const emergencySurcharge=Math.max(0,discountedTotal*(emergencyMultiplier-1));
 const sources=[...new Set(breakdown.map(b=>b.discountSource).filter((x:string)=>x!=='NONE'))];
 const source=personal?'PERSONAL':referralDiscount>0?'REFERRAL':sources.length===0?'NONE':sources.length===1?sources[0]:'MIXED';
 return {
  service:serviceSlugs[0],services:serviceSlugs,serviceBreakdown:breakdown,
  standardBasePrice:round(totalStandardBase),basePrice:round(totalBaseAfter),standardTotal:round(standardTotal),discountedSubtotal:round(discountedTotal),
  vehicleMultiplier:requiresVehicle?vm:1,conditionMultiplier:requiresCondition?cm:1,
  optionsTotal:round(totalOptions),effectiveOptionsTotal:round(totalEffectiveOptions),
  discount:round(totalDiscount),discountSource:source,
  promotion:breakdown.length===1?breakdown[0].promotion:null,
  personalDiscount:personal?{id:personal.id,percentDiscount:Number(personal.percent_discount||0),greeting:personal.greeting||null,expiresAt:personal.expires_at}:null,
  referralReward:referralReward&&referralDiscount>0?{id:referralReward.id,type:referralReward.reward_type,value:referralReward.reward_value,currency:referralReward.reward_currency,service:referralReward.reward_service_slug,discount:round(referralDiscount)}:null,
  vipPricing:{tier,mode:source==='VIP'&&breakdown.length===1?breakdown[0].pricingMode:(source==='NONE'?'STANDARD':source),rule:null},
  requiresCondition,requiresVehicle,emergencyMultiplier,emergencySurcharge:round(emergencySurcharge),finalPrice:round(discountedTotal+emergencySurcharge),currency:target,
  fxRate:1,fxProvider:'INTERNAL_RATE',fxTimestamp:new Date().toISOString(),options:selectedOptions.map(x=>x.slug)
 };
}
