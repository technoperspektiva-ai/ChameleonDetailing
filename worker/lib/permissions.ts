import type {AppRole,Env} from './types';

export type Permission=
 'user.read'|'user.create'|'user.update'|
 'vip.assign'|'vip.remove'|
 'whitelist.manage'|'blacklist.manage'|
 'manager.create'|'manager.remove'|
 'admin.create'|'admin.remove'|
 'service.edit'|'pricing.edit'|'calculator.edit'|
 'content.edit'|'localization.edit'|
 'orders.read'|'orders.manage'|
 'analytics.full'|'analytics.basic'|
 'audit.read'|'settings.edit'|'reports.export'|'reports.operational.export';

const map:Record<AppRole,Set<Permission>>={
 OWNER:new Set([
  'user.read','user.create','user.update','vip.assign','vip.remove','whitelist.manage','blacklist.manage',
  'manager.create','manager.remove','admin.create','admin.remove','service.edit','pricing.edit','calculator.edit','content.edit','localization.edit',
  'orders.read','orders.manage','analytics.full','analytics.basic','audit.read','settings.edit','reports.export','reports.operational.export'
 ]),
 ADMIN:new Set([
  'user.read','user.create','user.update','vip.assign','vip.remove','whitelist.manage','blacklist.manage','manager.create','manager.remove',
  'service.edit','pricing.edit','calculator.edit','content.edit','localization.edit','orders.read','orders.manage',
  'analytics.full','analytics.basic','audit.read','settings.edit','reports.export','reports.operational.export'
 ]),
 // Manager uses the same capability primitives, but every admin-like block is
 // additionally gated by manager_permissions in D1 through canStaff().
 MANAGER:new Set([
  'user.read','user.create','user.update','vip.assign','vip.remove','whitelist.manage','blacklist.manage',
  'service.edit','pricing.edit','calculator.edit','content.edit','localization.edit','orders.read','orders.manage',
  'analytics.full','analytics.basic','audit.read','settings.edit','reports.export','reports.operational.export'
 ]),
 CLIENT:new Set()
};
export const can=(role:string,permission:Permission)=>map[(role as AppRole)||'CLIENT']?.has(permission)||false;

const permissionBlock:Partial<Record<Permission,string>>={
 'user.read':'users','user.create':'users','user.update':'users',
 'vip.assign':'vip','vip.remove':'vip','whitelist.manage':'whitelist','blacklist.manage':'blacklist',
 'service.edit':'services','pricing.edit':'pricing','calculator.edit':'calculator','content.edit':'content','localization.edit':'languages',
 'orders.read':'orders','orders.manage':'orders','analytics.full':'analytics','analytics.basic':'analytics','audit.read':'audit','settings.edit':'settings',
 'reports.export':'reports','reports.operational.export':'reports'
};

export async function managerBlockEnabled(env:Env,key:string){
 if(!env.DB)return false;
 try{const r=await env.DB.prepare('SELECT enabled FROM manager_permissions WHERE permission_key=?').bind(key).first<any>();return Number(r?.enabled||0)===1}catch{return false}
}

export async function canStaff(env:Env,role:string,permission:Permission){
 if(!can(role,permission))return false;
 if(role!=='MANAGER')return true;
 const block=permissionBlock[permission];
 return block?managerBlockEnabled(env,block):false;
}
