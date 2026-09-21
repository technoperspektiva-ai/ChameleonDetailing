import type {AppRole} from './types';

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
 MANAGER:new Set([
  'user.read','user.create','user.update','vip.assign','vip.remove','whitelist.manage','blacklist.manage','orders.read','orders.manage','analytics.basic','reports.operational.export'
 ]),
 CLIENT:new Set()
};
export const can=(role:string,permission:Permission)=>map[(role as AppRole)||'CLIENT']?.has(permission)||false;
