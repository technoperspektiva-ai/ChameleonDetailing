import { tg } from './telegram';
export type Service={id:number;slug:string;title:string;description:string;basePrice:number;currency:string;durationMin:number;category:string;standardBasePrice?:number;vipPricingMode?:string;clientTier?:string;imageUrl?:string;iconKey?:string;isPopular?:number|boolean};
export type ServiceOption={id:number;slug:string;title:string;description?:string;price:number;currency:string};
export type ScheduleState={isOpen:boolean;isWorkingDay:boolean;nextWorkingAt?:string|null;emergencyEnabled:boolean;emergencyMultiplier:number;timezone:string;workingHours?:string;override?:'AUTO'|'OPEN'|'CLOSED'};
export type Session={user:{telegramId:number;firstName:string;username?:string;locale:string;currency:string;tier:string;role:string;phoneShared?:boolean;photoUrl?:string|null};maintenance?:boolean;blocked?:boolean;blockedReason?:string|null;schedule:ScheduleState;theme?:{fontH1?:string;fontH2?:string;fontBody?:string;fontSmall?:string;neonMode?:'STATIC'|'RAINBOW';neonColor?:string;seasonalMode?:'OFF'|'AUTO'|'MANUAL';seasonalTheme?:'DEFAULT'|'HALLOWEEN'|'NEW_YEAR'|'EASTER'};demo?:boolean};
const initData=()=>tg()?.initData||'';
const json=async<T>(path:string,init:RequestInit={}):Promise<T>=>{const r=await fetch(path,{...init,headers:{'content-type':'application/json',...(init.headers||{})}});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error((data as any).error||`HTTP ${r.status}`);return data as T};
export const api={
 session:()=>json<Session>('/api/auth/telegram',{method:'POST',body:JSON.stringify({initData:initData()})}),
 services:(locale='en',currency='PLN')=>json<{services:Service[];tier?:string}>(`/api/services?locale=${encodeURIComponent(locale)}&currency=${encodeURIComponent(currency)}&initData=${encodeURIComponent(initData())}`),
 options:(locale='en',currency='PLN')=>json<{options:ServiceOption[]}>(`/api/options?locale=${encodeURIComponent(locale)}&currency=${encodeURIComponent(currency)}`),
 content:(locale='en')=>json<{content:Record<string,string>}>(`/api/content?locale=${encodeURIComponent(locale)}`),
 setCurrency:(currency:string)=>json<{ok:boolean;currency:string}>('/api/preferences/currency',{method:'POST',body:JSON.stringify({initData:initData(),currency})}),
 quote:(body:any)=>json<any>('/api/calculator/quote',{method:'POST',body:JSON.stringify({...body,initData:initData()})}),
 request:(body:any)=>json<any>('/api/orders/request',{method:'POST',body:JSON.stringify({...body,initData:initData()})}),
 orders:()=>json<any>('/api/orders?initData='+encodeURIComponent(initData())),
 deleteOrder:(id:number)=>json<any>(`/api/orders/${id}`,{method:'DELETE',body:JSON.stringify({initData:initData()})}),
 socials:()=>json<any>('/api/socials'),
 specialists:()=>json<any>('/api/specialists'),
 status:()=>json<any>('/api/system/status'),
 profilePhotoUrl:()=>`/api/profile/photo?initData=${encodeURIComponent(initData())}`,
 referral:()=>json<{ok:boolean;code:string;url:string}>('/api/referrals/create',{method:'POST',body:JSON.stringify({initData:initData()})})
};
