export type TgWebApp = {
 initData?: string;
 initDataUnsafe?: { user?: { id:number; first_name?:string; last_name?:string; username?:string; language_code?:string } };
 ready?:()=>void; expand?:()=>void; close?:()=>void;
 openTelegramLink?:(url:string)=>void; openLink?:(url:string)=>void;
 HapticFeedback?: { impactOccurred?:(style:string)=>void; notificationOccurred?:(type:string)=>void };
};
declare global { interface Window { Telegram?: { WebApp?: TgWebApp } } }
export const tg=()=>window.Telegram?.WebApp;
export const initTelegram=()=>{const w=tg();w?.ready?.();w?.expand?.();return w};
export const haptic=(style='light')=>tg()?.HapticFeedback?.impactOccurred?.(style);
export const notify=(type='success')=>tg()?.HapticFeedback?.notificationOccurred?.(type);
export const telegramLanguage=()=>tg()?.initDataUnsafe?.user?.language_code||'';
export const openBot=(start?:string)=>{const username='ChameleonDetailing_bot';const url=`https://t.me/${username}${start?`?start=${encodeURIComponent(start)}`:''}`;tg()?.openTelegramLink?.(url)??window.open(url,'_blank')};
