import type {Env} from './types';
import {getSetting} from './db';

const parts=(d:Date,tz:string)=>{
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:tz,weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false,year:'numeric',month:'2-digit',day:'2-digit'});
 const o=Object.fromEntries(fmt.formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return {weekday:o.weekday,hour:Number(o.hour),minute:Number(o.minute),date:`${o.year}-${o.month}-${o.day}`};
};
const weekdayNumber=(name:string)=>Number(({Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7} as any)[name]||1);
const parseHours=(openTime:string,closeTime:string)=>{const [fh,fm]=openTime.split(':').map(Number),[th,tm]=closeTime.split(':').map(Number);return {from:fh*60+fm,to:th*60+tm}};
async function weeklyRows(env:Env){if(!env.DB)return [] as any[];try{const r=await env.DB.prepare('SELECT day_of_week,enabled,open_time,close_time FROM business_weekly_schedule ORDER BY day_of_week').all<any>();return r.results||[]}catch{return []}}

// Convert a wall-clock date/time in an arbitrary IANA timezone to a UTC Date.
// Intl gives us the local representation; two short correction passes handle DST.
function zonedDateTime(date:string,time:string,tz:string){
 const [y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number);
 const desired=Date.UTC(y,m-1,d,h||0,min||0,0,0);
 let guess=desired;
 for(let i=0;i<3;i++){
  const p=parts(new Date(guess),tz),[py,pm,pd]=p.date.split('-').map(Number);
  const actual=Date.UTC(py,pm-1,pd,p.hour,p.minute,0,0);
  const diff=desired-actual;if(Math.abs(diff)<30_000)break;guess+=diff;
 }
 return new Date(guess);
}

async function dayConfig(env:Env,date:string,wd:number,fallbackDays:number[],fallbackHours:string,rows:any[]){
 let enabled=fallbackDays.includes(wd);let [openTime,closeTime]=fallbackHours.split('-');
 const row=rows.find((r:any)=>Number(r.day_of_week)===wd);
 if(row){enabled=Number(row.enabled)===1;openTime=String(row.open_time||openTime);closeTime=String(row.close_time||closeTime)}
 if(env.DB){
  const ex=await env.DB.prepare('SELECT is_closed,open_time,close_time FROM schedule_exceptions WHERE date=? LIMIT 1').bind(date).first<any>().catch(()=>null);
  if(ex){if(Number(ex.is_closed)===1)enabled=false;else if(ex.open_time&&ex.close_time){enabled=true;openTime=String(ex.open_time);closeTime=String(ex.close_time)}}
 }
 return {enabled,openTime:openTime||'09:00',closeTime:closeTime||'18:00'};
}

async function nextWorking(env:Env,now:Date,tz:string,fallbackDays:number[],fallbackHours:string){
 const rows=await weeklyRows(env);
 for(let i=0;i<14;i++){
  const probe=new Date(now.getTime()+i*86400000),p=parts(probe,tz),wd=weekdayNumber(p.weekday);
  const cfg=await dayConfig(env,p.date,wd,fallbackDays,fallbackHours,rows);if(!cfg.enabled)continue;
  const candidate=zonedDateTime(p.date,cfg.openTime,tz);
  if(i===0){if(now.getTime()<candidate.getTime())return candidate.toISOString();continue}
  return candidate.toISOString();
 }
 return null;
}

export async function scheduleState(env:Env,now=new Date()){
 const timezone=await getSetting(env,'business_timezone',env.BUSINESS_TIMEZONE||'Europe/Warsaw');
 const fallbackDays=(await getSetting(env,'working_days','1,2,3,4,5')).split(',').map((x:string)=>Number(x.trim())).filter((x:number)=>x>=1&&x<=7);
 const fallbackHours=await getSetting(env,'working_hours','09:00-18:00');
 const rows=await weeklyRows(env),p=parts(now,timezone),wd=weekdayNumber(p.weekday),minutes=p.hour*60+p.minute;
 const cfg=await dayConfig(env,p.date,wd,fallbackDays,fallbackHours,rows);let isWorkingDay=cfg.enabled;
 const range=parseHours(cfg.openTime,cfg.closeTime);let isOpen=isWorkingDay&&minutes>=range.from&&minutes<range.to;
 const override=String(await getSetting(env,'business_status_override','AUTO')).toUpperCase();
 if(override==='OPEN'){isWorkingDay=true;isOpen=true}
 if(override==='CLOSED'){isOpen=false}
 const emergencyEnabled=(await getSetting(env,'emergency_enabled','0'))==='1';const multiplier=Math.min(3,Math.max(1.05,Number(await getSetting(env,'emergency_multiplier','1.5'))||1.5));
 return {isOpen,isWorkingDay,nextWorkingAt:isOpen?null:await nextWorking(env,now,timezone,fallbackDays,fallbackHours),emergencyEnabled,emergencyMultiplier:multiplier,timezone,workingHours:`${cfg.openTime}-${cfg.closeTime}`,override};
}
