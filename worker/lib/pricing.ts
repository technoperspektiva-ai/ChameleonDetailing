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
 const personal=await activePersonalDiscount(env,userId);
 const breakdown:any[]=[];
 let standardTotal=0,discountedTotal=0,totalOptions=0,totalBaseAfter=0,totalStandardBase=0,totalDiscount=0;
 for(const svc of selected){
  const req=reqs.get(Number(svc.id));
  const factor=(req?.requireVehicle?vm:1)*(req?.requireCondition?cm:1);
  const linked=selectedOptions.filter(opt=>{const links=Array.isArray(opt.serviceSlugs)?opt.serviceSlugs:[];return links.length?links.includes(String(svc.slug)):selected[0]?.slug===svc.slug});
  // An option linked to multiple chosen services is charged only once, on the first selected matching service.
  const owned=linked.filter(opt=>{const matching=selected.filter(other=>{const links=Array.isArray(opt.serviceSlugs)?opt.serviceSlugs:[];return !links.length||links.includes(String(other.slug))});return matching[0]?.slug===svc.slug});
  const optionsTotal=owned.reduce((n:number,x:any)=>n+Number(x.price||0),0);
  const standardBase=Number(svc.basePrice||0),standardSubtotal=standardBase*factor+optionsTotal;
  let subtotal=standardSubtotal,source='NONE',pricingMode='STANDARD',appliedRule:any=null,promo:any=null;
  if(!personal){
   promo=await activePromotion(env,Number(svc.id));
   if(promo){const pct=Math.max(0,Math.min(100,Number(promo.percent_discount||0)));subtotal=standardSubtotal*(1-pct/100);source='PROMOTION';pricingMode='PROMOTION';appliedRule=promo}
   else{
    const rule=await vipRule(env,Number(svc.id),tier);
    if(rule){pricingMode=String(rule.mode||'PERCENT').toUpperCase();source='VIP';appliedRule=rule;
     if(pricingMode==='PRICE'&&Number(rule.fixed_price)>=0){const fixed=convertCurrency(Number(rule.fixed_price||0),normalizeCurrency(rule.currency||target),target);subtotal=fixed*factor+optionsTotal}
     else if(pricingMode==='MULTIPLIER')subtotal=standardSubtotal*Math.max(0,Number(rule.multiplier||1));
     else {const pct=Math.max(0,Math.min(100,Number(rule.percent_discount||0)));subtotal=standardSubtotal*(1-pct/100)}
    }else if(tier==='VIP'||tier==='VIP_PLUS'){const pct=tier==='VIP_PLUS'?15:10;pricingMode='PERCENT_DEFAULT';source='VIP';subtotal=standardSubtotal*(1-pct/100)}
   }
  }
  standardTotal+=standardSubtotal;discountedTotal+=subtotal;totalOptions+=optionsTotal;totalStandardBase+=standardBase*factor;totalBaseAfter+=Math.max(0,subtotal-optionsTotal);totalDiscount+=Math.max(0,standardSubtotal-subtotal);
  breakdown.push({service:String(svc.slug),serviceId:Number(svc.id),basePrice:round(standardBase),vehicleMultiplier:req?.requireVehicle?vm:1,conditionMultiplier:req?.requireCondition?cm:1,requiresCondition:!!req?.requireCondition,requiresVehicle:!!req?.requireVehicle,options:owned.map(x=>x.slug),optionsTotal:round(optionsTotal),standardTotal:round(standardSubtotal),subtotal:round(subtotal),discount:round(Math.max(0,standardSubtotal-subtotal)),discountSource:source,pricingMode,promotion:promo?{id:promo.id,percentDiscount:Number(promo.percent_discount||0),label:promo.label||null,endsAt:promo.ends_at}:null});
 }
 if(personal){const pct=Math.max(0,Math.min(100,Number(personal.percent_discount||0)));const before=discountedTotal;discountedTotal=standardTotal*(1-pct/100);totalDiscount=Math.max(0,standardTotal-discountedTotal);const ratio=standardTotal>0?discountedTotal/standardTotal:1;totalBaseAfter=totalStandardBase*ratio;for(const b of breakdown){b.discountSource='PERSONAL';b.pricingMode='PERSONAL';b.subtotal=round(b.standardTotal*ratio);b.discount=round(b.standardTotal-b.subtotal)}void before}
 const emergencySurcharge=Math.max(0,discountedTotal*(emergencyMultiplier-1));
 const sources=[...new Set(breakdown.map(b=>b.discountSource).filter((x:string)=>x!=='NONE'))];
 const source=personal?'PERSONAL':sources.length===0?'NONE':sources.length===1?sources[0]:'MIXED';
 return {
  service:serviceSlugs[0],services:serviceSlugs,serviceBreakdown:breakdown,
  standardBasePrice:round(totalStandardBase),basePrice:round(totalBaseAfter),standardTotal:round(standardTotal),discountedSubtotal:round(discountedTotal),
  vehicleMultiplier:requiresVehicle?vm:1,conditionMultiplier:requiresCondition?cm:1,optionsTotal:round(totalOptions),discount:round(totalDiscount),discountSource:source,
  promotion:breakdown.length===1?breakdown[0].promotion:null,
  personalDiscount:personal?{id:personal.id,percentDiscount:Number(personal.percent_discount||0),greeting:personal.greeting||null,expiresAt:personal.expires_at}:null,
  vipPricing:{tier,mode:source==='VIP'&&breakdown.length===1?breakdown[0].pricingMode:(source==='NONE'?'STANDARD':source),rule:null},
  requiresCondition,requiresVehicle,emergencyMultiplier,emergencySurcharge:round(emergencySurcharge),finalPrice:round(discountedTotal+emergencySurcharge),currency:target,
  fxRate:1,fxProvider:'INTERNAL_RATE',fxTimestamp:new Date().toISOString(),options:selectedOptions.map(x=>x.slug)
 };
}
