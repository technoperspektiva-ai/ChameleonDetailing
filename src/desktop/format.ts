export const money=(v:any,c='PLN')=>new Intl.NumberFormat('uk-UA',{style:'currency',currency:c||'PLN',maximumFractionDigits:2}).format(Number(v||0));
export const parseDate=(v:string|Date)=>v instanceof Date?v:new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(v)?v:v.replace(' ','T')+'Z');
export const dt=(v:any)=>v?parseDate(v).toLocaleString('uk-UA',{timeZone:'Europe/Warsaw'}):'—';
export const businessDate=(v:string|Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'}).format(parseDate(v));
export const businessTime=(v:string|Date)=>new Intl.DateTimeFormat('uk-UA',{timeZone:'Europe/Warsaw',hour:'2-digit',minute:'2-digit'}).format(parseDate(v));
export function fromBusinessLocal(value:string){const naive=new Date(value+'Z');let result=naive;for(let i=0;i<3;i++){const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(result).replace(' ','T');result=new Date(result.getTime()+naive.getTime()-new Date(parts+'Z').getTime())}return result.toISOString()}
