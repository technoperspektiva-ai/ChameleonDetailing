import {Home,ClipboardList,Users,CalendarDays,Wrench,CreditCard,Megaphone,BadgeCheck,Settings} from 'lucide-react';
import type {Bootstrap} from '../types/desktop';
export const navigation=[{id:'dashboard',label:'Сьогодні',icon:Home},{id:'orders',label:'Замовлення',icon:ClipboardList},{id:'clients',label:'Клієнти',icon:Users},{id:'calendar',label:'Календар',icon:CalendarDays},{id:'services',label:'Послуги',icon:Wrench},{id:'finance',label:'Фінанси',icon:CreditCard},{id:'marketing',label:'Маркетинг',icon:Megaphone,secondary:true},{id:'team',label:'Команда',icon:BadgeCheck,secondary:true},{id:'system',label:'Система',icon:Settings,secondary:true}];
export const allowed=(boot:Bootstrap,id:string)=>{
 if(['team','system','staff','settings','audit','control','workspace','analytics'].includes(id)&&boot.user.role==='MANAGER')return false;
 const permissions:Record<string,string>={clients:'clients_access',cars:'clients_access',sales:'sales_access',finance:'financial_access',payments:'financial_access',reports:'reports_access',marketing:'broadcast_access',broadcasts:'broadcast_access',workspace:'workspace_editor'};
 return !permissions[id]||!!boot.permissions[permissions[id]];
};
export const canonical=(id:string)=>({payments:'finance',analytics:'finance',reports:'finance',broadcasts:'marketing',staff:'team',settings:'system',workspace:'system',audit:'system',control:'system',cars:'clients',sales:'orders'}[id]||id);
