export const statusMeta:Record<string,{label:string;next?:string;tone:string}>={
 REQUESTED:{label:'Нові',next:'CONFIRMED',tone:'neutral'},
 PENDING_CONFIRMATION:{label:'Очікує підтвердження',next:'CONFIRMED',tone:'warning'},
 DEFERRED:{label:'На наступний робочий день',next:'CONFIRMED',tone:'warning'},
 CONFIRMED:{label:'Підтверджені',next:'IN_PROGRESS',tone:'neutral'},
 CAR_ACCEPTED:{label:'Авто прийнято',next:'IN_PROGRESS',tone:'neutral'},
 IN_PROGRESS:{label:'У роботі',next:'READY',tone:'accent'},
 INSPECTION:{label:'Перевірка',next:'READY',tone:'accent'},
 READY:{label:'Готові',next:'COMPLETED',tone:'success'},
 COMPLETED:{label:'Завершені',tone:'success'},
 CANCELLED:{label:'Скасовано',tone:'muted'},
 REJECTED:{label:'Відхилено',tone:'muted'},
 PAID:{label:'Оплачено',tone:'success'},
 UNPAID:{label:'Не оплачено',tone:'warning'},
 PENDING:{label:'Очікує оплати',tone:'warning'},
 REFUNDED:{label:'Повернено',tone:'muted'}
};
export const statusLabel=(value:string)=>statusMeta[String(value||'').toUpperCase()]?.label||value||'Нові';
export const boardStatuses=['REQUESTED','CONFIRMED','IN_PROGRESS','READY','COMPLETED'];
export const boardStatus=(raw:string)=>{
 const s=String(raw||'REQUESTED').trim().toUpperCase();
 if(['CANCELLED','REJECTED'].includes(s))return s;
 if(['REQUESTED','PENDING_CONFIRMATION','DEFERRED','NEW','PENDING'].includes(s))return 'REQUESTED';
 if(['CONFIRMED','ACCEPTED','APPROVED'].includes(s))return 'CONFIRMED';
 if(['CAR_ACCEPTED','IN_PROGRESS','INSPECTION','WORKING','STARTED'].includes(s))return 'IN_PROGRESS';
 if(['READY','DONE_READY'].includes(s))return 'READY';
 if(['COMPLETED','DONE','FINISHED'].includes(s))return 'COMPLETED';
 // Legacy/unknown active statuses must never disappear from the board.
 return 'REQUESTED';
};
