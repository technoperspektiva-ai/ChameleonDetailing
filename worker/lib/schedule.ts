import type {Env} from './types';
import {getSetting} from './db';
const parts=(d:Date,tz:string)=>{const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:tz,weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false,year:'numeric',month:'2-digit',day:'2-digit'});const o=Object.fromEntries(fmt.formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return {weekday:o.weekday,hour:Number(o.hour),minute:Number(o.minute),date:`${o.year}-${o.month}-${o.day}`}};
const weekdayNumber=(name:string)=>({Mon:'1',Tue:'2',Wed:'3',Thu:'4',Fri:'5',Sat:'6',Sun:'7'} as any)[name]||'1';
export async function scheduleState(env:Env,now=new Date()){
 const timezone=await getSetting(env,'business_timezone',env.BUSINESS_TIMEZONE||'Europe/Warsaw');
 const workingDays=(await getSetting(env,'working_days','1,2,3,4,5')).split(',').map((x:string)=>x.trim()).filter((x:string)=>x.length>0);
 const hours=await getSetting(env,'working_hours','09:00-18:00');const [from,to]=hours.split('-');const [fh,fm]=from.split(':').map(Number),[th,tm]=to.split(':').map(Number);
 const p=parts(now,timezone);const wd=weekdayNumber(p.weekday);const minutes=p.hour*60+p.minute;let isWorkingDay=workingDays.includes(wd);let isOpen=isWorkingDay&&minutes>=fh*60+fm&&minutes<th*60+tm;
 if(env.DB){const ex=await env.DB.prepare('SELECT is_closed,open_time,close_time FROM schedule_exceptions WHERE date=? LIMIT 1').bind(p.date).first<any>().catch(()=>null);if(ex){if(Number(ex.is_closed)===1){isWorkingDay=false;isOpen=false}else if(ex.open_time&&ex.close_time){isWorkingDay=true;const [eh,em]=String(ex.open_time).split(':').map(Number),[ch,cm]=String(ex.close_time).split(':').map(Number);isOpen=minutes>=eh*60+em&&minutes<ch*60+cm}}}
 const emergencyEnabled=(await getSetting(env,'emergency_enabled','0'))==='1';const multiplier=Math.min(2,Math.max(1.5,Number(await getSetting(env,'emergency_multiplier','1.5'))||1.5));
 return {isOpen,isWorkingDay,nextWorkingAt:isOpen?null:nextWorkingApprox(now,workingDays,from,timezone),emergencyEnabled,emergencyMultiplier:multiplier,timezone,workingHours:hours};
}
function nextWorkingApprox(now:Date,days:string[],from:string,tz:string){for(let i=0;i<8;i++){const d=new Date(now.getTime()+i*86400000);const p=parts(d,tz);if(days.includes(weekdayNumber(p.weekday))){const [h,m]=from.split(':').map(Number);const candidate=new Date(d);candidate.setUTCHours(h,m,0,0);if(candidate>now)return candidate.toISOString()}}return null}
