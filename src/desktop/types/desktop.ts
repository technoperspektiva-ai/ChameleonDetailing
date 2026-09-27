export type Role='OWNER'|'ADMIN'|'MANAGER';
export type Bootstrap={user:{id:number;telegramId:number;firstName:string;username?:string;role:Role};permissions:Record<string,boolean>;mode:string;workspace:{version:number;config:any};personal:any;kanbanLabels?:Record<string,string>;emergency?:{enabled:boolean;multiplier:number}};
export type Page='dashboard'|'orders'|'sales'|'cars'|'clients'|'calendar'|'services'|'payments'|'broadcasts'|'analytics'|'reports'|'staff'|'audit'|'workspace'|'control'|'settings';
export interface Order {id:number;user_id:number;car_id:number;status:string;payment_status:string;scheduled_for:string|null;confirmed_at?:string|null;created_at:string;completed_at?:string;final_job_price:number|null;calculated_price:number;currency:string;brand?:string;model?:string;body_type?:string;plate?:string;first_name:string;username?:string;phone_number?:string;service_slug?:string;service_title?:string;responsible_staff_id?:number;responsible_name?:string;accelerated:number;client_tier?:string;staff_note?:string;estimated_duration_min?:number;deadline_at?:string|null;duration_overridden?:number}
export interface Client {id:number;telegram_user_id?:number;first_name:string;username?:string;phone_number?:string;client_tier:string;role?:'CLIENT'|'OWNER'|'ADMIN'|'MANAGER';cars:number;last_visit?:string;paid_jobs_count:number;lifetime_value:number;notes?:string}
export interface Vehicle {id:number;user_id:number;brand:string;model:string;modification?:string;plate:string;has_ceramic:number;last_service?:string;name?:string;owner_phone?:string}
export type DesktopUser=Bootstrap['user'];
export type Permission=keyof typeof import('../config/permissionMeta').permissionMeta;
export interface Service {id:number;slug:string;title:string;base_price:number;base_currency:string;duration_min:number;enabled:number}
export interface Payment {id:number;payment_status:string;original_amount:number;original_currency:string;display_amount:number;display_currency:string}
export interface WorkspaceConfig {sidebar:{id:string;label:string;hidden?:boolean;roles?:Role[]}[];widgets:{id:string;title:string;width:number;height:number;hidden?:boolean;roles?:Role[]}[]}
export interface BroadcastCampaign {id:number;status:string;text:string;scheduled_at?:string;sent_count:number;failed_count:number;skipped_count:number}
