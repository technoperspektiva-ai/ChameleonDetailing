import type {Env} from './types';
import {getServices} from './db';
import {convertCurrency,fx,normalizeCurrency} from './currency';

const vehicle:Record<string,number>={sedan:1,hatchback:1,suv:1.15,'large-suv':1.25,van:1.35};
const condition:Record<string,number>={light:.9,normal:1,dirty:1.2,'very-dirty':1.4};
const extras:Record<string,number>={'pet-hair':30,'ceramic-spray':40,odor:25};
const round=(n:number)=>Math.round(n*100)/100;

async function vipRule(env:Env,serviceId:number,tier:string){
 if(!env.DB||tier==='STANDARD')return null;
 try{return await env.DB.prepare(`SELECT * FROM vip_pricing_rules WHERE service_id=? AND tier=? AND enabled=1 LIMIT 1`).bind(serviceId,tier).first<any>()}catch{return null}
}


export async function vipBasePrice(env:Env,serviceId:number,basePrice:number,baseCurrency:string,tier='STANDARD'){
 const rule=await vipRule(env,serviceId,tier);if(!rule)return {price:tier==='VIP_PLUS'?basePrice*.85:tier==='VIP'?basePrice*.9:basePrice,mode:rule?String(rule.mode):tier==='STANDARD'?'STANDARD':'PERCENT_DEFAULT'};
 const mode=String(rule.mode||'PERCENT').toUpperCase();if(mode==='PRICE')return {price:convertCurrency(Number(rule.fixed_price||0),normalizeCurrency(rule.currency||baseCurrency),normalizeCurrency(baseCurrency)),mode};if(mode==='MULTIPLIER')return {price:basePrice*Math.max(0,Number(rule.multiplier||1)),mode};return {price:basePrice*(1-Math.max(0,Math.min(100,Number(rule.percent_discount||0)))/100),mode};
}

export async function quote(env:Env,input:any,tier='STANDARD',emergencyMultiplier=1){
 const services=await getServices(env,'en'),s=services.find(x=>x.slug===input.service);if(!s)throw new Error('Unknown service');
 const vm=vehicle[input.vehicle]||1,cm=condition[input.condition]||1;const opts=(input.options||[]).filter((x:string)=>x in extras);const optionsBase=opts.reduce((n:number,x:string)=>n+extras[x],0);
 const standardBase=Number(s.basePrice||0);const standardSubtotal=standardBase*vm*cm+optionsBase;let subtotal=standardSubtotal;let pricingMode='STANDARD';let appliedRule:any=null;
 const rule=await vipRule(env,Number((s as any).id||0),tier);
 if(rule){pricingMode=String(rule.mode||'PERCENT').toUpperCase();appliedRule=rule;
  if(pricingMode==='PRICE'&&Number(rule.fixed_price)>=0){const rp=convertCurrency(Number(rule.fixed_price),normalizeCurrency(rule.currency||s.currency),normalizeCurrency(s.currency));subtotal=rp*vm*cm+optionsBase}
  else if(pricingMode==='MULTIPLIER'){subtotal=standardSubtotal*Math.max(0,Number(rule.multiplier||1))}
  else {const pct=Math.max(0,Math.min(100,Number(rule.percent_discount||0)));subtotal=standardSubtotal*(1-pct/100)}
 }else if(tier==='VIP'||tier==='VIP_PLUS'){
  const pct=tier==='VIP_PLUS'?15:10;pricingMode='PERCENT_DEFAULT';subtotal=standardSubtotal*(1-pct/100)
 }
 const discount=Math.max(0,standardSubtotal-subtotal);const target=normalizeCurrency(input.currency||s.currency);const rate=fx[normalizeCurrency(s.currency)]?.[target]||1;const emergencySurcharge=Math.max(0,subtotal*(emergencyMultiplier-1));
 return {service:s.slug,standardBasePrice:round(standardBase*rate),basePrice:round((subtotal-optionsBase)*rate/(vm*cm||1)),standardTotal:round(standardSubtotal*rate),discountedSubtotal:round(subtotal*rate),vehicleMultiplier:vm,conditionMultiplier:cm,optionsTotal:round(optionsBase*rate),discount:round(discount*rate),vipPricing:{tier,mode:pricingMode,rule:appliedRule?{percentDiscount:appliedRule.percent_discount,multiplier:appliedRule.multiplier,fixedPrice:appliedRule.fixed_price,currency:appliedRule.currency}:null},emergencyMultiplier,emergencySurcharge:round(emergencySurcharge*rate),finalPrice:round((subtotal+emergencySurcharge)*rate),currency:target,fxRate:rate,fxProvider:'FALLBACK_STATIC',fxTimestamp:new Date().toISOString(),options:opts};
}
