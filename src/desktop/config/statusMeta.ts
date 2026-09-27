export const statusMeta:Record<string,{label:string;next?:string;tone:string}>={
 REQUESTED:{label:'Нові',next:'CONFIRMED',tone:'neutral'},PENDING_CONFIRMATION:{label:'Очікує підтвердження',next:'CONFIRMED',tone:'warning'},CONFIRMED:{label:'Підтверджені',next:'IN_PROGRESS',tone:'neutral'},CAR_ACCEPTED:{label:'Авто прийнято',next:'IN_PROGRESS',tone:'neutral'},IN_PROGRESS:{label:'У роботі',next:'READY',tone:'accent'},INSPECTION:{label:'Перевірка',next:'READY',tone:'accent'},READY:{label:'Готові',next:'COMPLETED',tone:'success'},COMPLETED:{label:'Завершені',tone:'success'},CANCELLED:{label:'Скасовано',tone:'muted'},REJECTED:{label:'Відхилено',tone:'muted'},PAID:{label:'Оплачено',tone:'success'},UNPAID:{label:'Не оплачено',tone:'warning'},PENDING:{label:'Очікує оплати',tone:'warning'},REFUNDED:{label:'Повернено',tone:'muted'}
};
export const statusLabel=(value:string)=>statusMeta[value]?.label||value;
export const boardStatuses=['REQUESTED','CONFIRMED','IN_PROGRESS','READY','COMPLETED'];
export const boardStatus=(s:string)=>s==='PENDING_CONFIRMATION'?'REQUESTED':['CAR_ACCEPTED','INSPECTION'].includes(s)?'IN_PROGRESS':s;
