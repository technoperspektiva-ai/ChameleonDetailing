import { tg } from './telegram';
export type Service={id:number;slug:string;title:string;description:string;basePrice:number;currency:string;durationMin:number;category:string};
export type ScheduleState={isOpen:boolean;isWorkingDay:boolean;nextWorkingAt?:string|null;emergencyEnabled:boolean;emergencyMultiplier:number;timezone:string};
export type Session={user:{telegramId:number;firstName:string;username?:string;locale:string;currency:string;tier:string;role:string;phoneShared?:boolean};maintenance?:boolean;blocked?:boolean;blockedReason?:string|null;schedule:ScheduleState;demo?:boolean};
const initData=()=>tg()?.initData||'';
const json=async<T>(path:string,init:RequestInit={}):Promise<T>=>{const r=await fetch(path,{...init,headers:{'content-type':'application/json',...(init.headers||{})}});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error((data as any).error||`HTTP ${r.status}`);return data as T};
export const api={
 session:()=>json<Session>('/api/auth/telegram',{method:'POST',body:JSON.stringify({initData:initData()})}),
 services:(locale='en')=>json<{services:Service[]}>(`/api/services?locale=${encodeURIComponent(locale)}`),
 quote:(body:any)=>json<any>('/api/calculator/quote',{method:'POST',body:JSON.stringify({...body,initData:initData()})}),
 request:(body:any)=>json<any>('/api/orders/request',{method:'POST',body:JSON.stringify({...body,initData:initData()})}),
 orders:()=>json<any>('/api/orders?initData='+encodeURIComponent(initData())),
 socials:()=>json<any>('/api/socials'),
 status:()=>json<any>('/api/system/status'),
 referral:()=>json<{ok:boolean;code:string;url:string}>('/api/referrals/create',{method:'POST',body:JSON.stringify({initData:initData()})})
};
