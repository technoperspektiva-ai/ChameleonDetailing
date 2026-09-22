export interface Env {
 ASSETS: Fetcher;
 DB?: D1Database;
 APP_NAME: string;
 BOT_USERNAME: string;
 OWNER_TELEGRAM_ID: string;
 DEFAULT_LOCALE: string;
 DEFAULT_CURRENCY: string;
 BUSINESS_TIMEZONE: string;
 BOT_TOKEN?: string;
 TELEGRAM_WEBHOOK_SECRET?: string;
 TELEGRAM_SETUP_KEY?: string;
 SESSION_SECRET?: string;
 APP_URL?: string;
 PAYMENT_PROVIDER?: string;
}
export type TelegramUser={id:number;first_name:string;last_name?:string;username?:string;language_code?:string;photo_url?:string};
export type AppRole='OWNER'|'ADMIN'|'MANAGER'|'CLIENT';
