import { tg,waitForTelegramInitData } from './telegram';
export type Service={id:number;slug:string;title:string;description:string;basePrice:number;currency:string;durationMin:number;category:string;standardBasePrice?:number;vipPricingMode?:string;clientTier?:string;imageUrl?:string;iconKey?:string;isPopular?:number|boolean;requirements?:{requireCondition:boolean;requireVehicle:boolean;allowOptions:boolean;allowMultipleOptions:boolean}};
export type ServiceOption={id:number;slug:string;title:string;description?:string;price:number;currency:string;standardPrice?:number;vipPricingMode?:string;clientTier?:string;iconKey?:string;serviceSlugs?:string[]};
export type ClientCar={id:number;name:string;brand?:string;model?:string;modification?:string;bodyType?:string;plate?:string;hasCeramic?:boolean;ownerPhone?:string;package?:{mainServices:string[];options:string[];vehicle?:string;condition?:string}|null;lastServiceAt?:string|null;visits?:number};
export type ScheduleState={isOpen:boolean;isWorkingDay:boolean;nextWorkingAt?:string|null;emergencyEnabled:boolean;emergencyMultiplier:number;timezone:string;workingHours?:string;override?:'AUTO'|'OPEN'|'CLOSED'};
export type Session={user:{telegramId:number;firstName:string;username?:string;locale:string;currency:string;tier:string;role:string;phoneShared?:boolean;photoUrl?:string|null};maintenance?:boolean;blocked?:boolean;blockedReason?:string|null;schedule:ScheduleState;theme?:{fontH1?:string;fontH2?:string;fontBody?:string;fontSmall?:string;neonMode?:'STATIC'|'RAINBOW';neonColor?:string;seasonalMode?:'OFF'|'AUTO'|'MANUAL';seasonalTheme?:'DEFAULT'|'HALLOWEEN'|'NEW_YEAR'|'EASTER'};referralReward?:{id:number;type:string;value:number;currency?:string|null;service?:string|null}|null;demo?:boolean};
declare global{interface Window{ChameleonNative?:{getSessionToken?:()=>string;getPlatform?:()=>string;getAppVersion?:()=>string}}}
const nativeToken=()=>{try{return String(window.ChameleonNative?.getSessionToken?.()||'').trim()}catch{return ''}};
const initData=()=>{const token=nativeToken();return token?`native:${token}`:(tg()?.initData||'')};
const json=async<T>(path:string,init:RequestInit={}):Promise<T>=>{const r=await fetch(path,{...init,headers:{'content-type':'application/json',...(init.headers||{})}});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error((data as any).error||`HTTP ${r.status}`);return data as T};
export const api={
 session:async()=>{
  const native=nativeToken();
  const liveInitData=native?`native:${native}`:await waitForTelegramInitData();
  let last:unknown=null;
  for(let attempt=0;attempt<3;attempt++){
   try{return await json<Session>('/api/auth/telegram',{method:'POST',body:JSON.stringify({initData:liveInitData||initData()})})}
   catch(e){last=e;const msg=e instanceof Error?e.message:String(e||'');if(/DIRECT_WEB_DISABLED|SERVICE_TEMPORARILY_UNAVAILABLE_404|Invalid or expired Telegram session|BOT_TOKEN/i.test(msg))throw e;if(attempt<2)await new Promise(r=>setTimeout(r,350*(attempt+1)))}
  }
  throw last instanceof Error?last:new Error(String(last||'Session request failed'));
 },
 services:(locale='en',currency='PLN')=>json<{services:Service[];tier?:string}>(`/api/services?locale=${encodeURIComponent(locale)}&currency=${encodeURIComponent(currency)}&initData=${encodeURIComponent(initData())}`),
 options:(locale='en',currency='PLN')=>json<{options:ServiceOption[];tier?:string}>(`/api/options?locale=${encodeURIComponent(locale)}&currency=${encodeURIComponent(currency)}&initData=${encodeURIComponent(initData())}`),
 content:(locale='en')=>json<{content:Record<string,string>}>(`/api/content?locale=${encodeURIComponent(locale)}`),
 setCurrency:(currency:string)=>json<{ok:boolean;currency:string}>('/api/preferences/currency',{method:'POST',body:JSON.stringify({initData:initData(),currency})}),
 quote:(body:any)=>json<any>('/api/calculator/quote',{method:'POST',body:JSON.stringify({...body,initData:initData()})}),
 request:(body:any)=>json<any>('/api/orders/request',{method:'POST',body:JSON.stringify({...body,initData:initData()})}),
 orders:()=>json<any>('/api/orders?initData='+encodeURIComponent(initData())),
 order:(id:number)=>json<any>(`/api/orders/${id}?initData=${encodeURIComponent(initData())}`),
 deleteOrder:(id:number)=>json<any>(`/api/orders/${id}`,{method:'DELETE',body:JSON.stringify({initData:initData()})}),
 socials:()=>json<any>('/api/socials'),
 specialists:()=>json<any>('/api/specialists'),
 cars:()=>json<{cars:ClientCar[]}>('/api/cars?initData='+encodeURIComponent(initData())),
 saveCar:(body:any)=>json<any>('/api/cars',{method:'POST',body:JSON.stringify({...body,initData:initData()})}),
 updateCar:(id:number,body:any)=>json<any>(`/api/cars/${id}`,{method:'PUT',body:JSON.stringify({...body,initData:initData()})}),
 deleteCar:(id:number)=>json<any>(`/api/cars/${id}`,{method:'DELETE',body:JSON.stringify({initData:initData()})}),
 saveCarPackage:(id:number,body:any)=>json<any>(`/api/cars/${id}/package`,{method:'PUT',body:JSON.stringify({...body,initData:initData()})}),
 carHistory:(id:number)=>json<any>(`/api/cars/${id}/history?initData=${encodeURIComponent(initData())}`),
 status:()=>json<any>('/api/system/status'),
 profilePhotoUrl:()=>`/api/profile/photo?initData=${encodeURIComponent(initData())}`,
 referral:()=>json<{ok:boolean;code:string;url:string}>('/api/referrals/create',{method:'POST',body:JSON.stringify({initData:initData()})}),
 referralStatus:(currency='PLN')=>json<{reward:Session['referralReward']}>(`/api/referrals/status?currency=${encodeURIComponent(currency)}&initData=${encodeURIComponent(initData())}`)
};
