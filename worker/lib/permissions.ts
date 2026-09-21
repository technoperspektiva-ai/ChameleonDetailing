import type {AppRole} from './types';

export type Permission=
 'user.read'|'user.create'|'user.update'|
 'vip.assign'|'vip.remove'|
 'whitelist.manage'|'blacklist.manage'|
 'manager.create'|'manager.remove'|
 'admin.create'|'admin.remove'|
 'service.edit'|'pricing.edit'|'calculator.edit'|
 'content.edit'|'localization.edit'|
 'analytics.full'|'analytics.basic'|
 'audit.read'|'settings.edit'|'reports.export';

const map:Record<AppRole,Set<Permission>>={
 OWNER:new Set([
  'user.read','user.create','user.update',
  'vip.assign','vip.remove','whitelist.manage','blacklist.manage',
  'manager.create','manager.remove','admin.create','admin.remove',
  'service.edit','pricing.edit','calculator.edit','content.edit','localization.edit',
  'analytics.full','analytics.basic','audit.read','settings.edit','reports.export'
 ]),
 ADMIN:new Set([
  'user.read','user.create','user.update',
  'vip.assign','vip.remove','whitelist.manage','blacklist.manage',
  'manager.create','manager.remove',
  'service.edit','pricing.edit','calculator.edit','content.edit','localization.edit',
  'analytics.full','analytics.basic','audit.read','settings.edit','reports.export'
 ]),
 MANAGER:new Set([
  'user.read','user.create','user.update',
  'vip.assign','vip.remove','whitelist.manage','blacklist.manage',
  'analytics.basic'
 ]),
 CLIENT:new Set()
};

export const can=(role:string,permission:Permission)=>map[(role as AppRole)||'CLIENT']?.has(permission)||false;
