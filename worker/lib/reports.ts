import type {Env} from './types';
import {ensureDb} from './db';

export type ReportType='users'|'vip'|'orders'|'payments'|'revenue'|'referrals'|'retention'|'blacklist'|'whitelist'|'staff'|'reviews'|'suggestions'|'business';
type Col={header:string;key:string};
type Sheet={name:string;columns:Col[];rows:any[]};
type ReportLocale='uk'|'pl'|'en';

const reportText:Record<string,[string,string,string]>={
 'Report':['Звіт','Raport','Report'],
 'Info':['Інформація','Informacja','Info'],
 'No data':['Немає даних','Brak danych','No data'],
 'Dashboard':['Зведення','Podsumowanie','Dashboard'],
 'Users':['Користувачі','Użytkownicy','Users'],
 'New Users':['Нові користувачі','Nowi użytkownicy','New Users'],
 'Active VIP':['Активні VIP','Aktywni VIP','Active VIP'],
 'Recent VIP':['Нові VIP','Nowi VIP','Recent VIP'],
 'Long-time VIP':['Давні VIP','Długoterminowi VIP','Long-time VIP'],
 'VIP History':['Історія VIP','Historia VIP','VIP History'],
 'Orders':['Замовлення','Zlecenia','Orders'],
 'Payments':['Платежі','Płatności','Payments'],
 'Revenue Summary':['Підсумок доходу','Podsumowanie przychodu','Revenue Summary'],
 'Revenue by Service':['Дохід за послугами','Przychód wg usług','Revenue by Service'],
 'Revenue by Manager':['Дохід за менеджерами','Przychód wg menedżerów','Revenue by Manager'],
 'Revenue by Method':['Дохід за способом оплати','Przychód wg metody płatności','Revenue by Method'],
 'VIP vs Standard':['VIP проти Standard','VIP vs Standard','VIP vs Standard'],
 'Unpaid Completed Jobs':['Завершені без оплати','Zakończone bez płatności','Unpaid Completed Jobs'],
 'Referrals':['Реферали','Polecenia','Referrals'],
 'Blacklist':['Чорний список','Czarna lista','Blacklist'],
 'Whitelist':['Білий список','Biała lista','Whitelist'],
 'Staff Activity':['Активність персоналу','Aktywność personelu','Staff Activity'],
 'Retention':['Утримання клієнтів','Retencja klientów','Retention'],
 'Internal ID':['Внутрішній ID','ID wewnętrzne','Internal ID'],
 'Telegram ID':['Telegram ID','Telegram ID','Telegram ID'],
 'Username':['Username','Nazwa użytkownika','Username'],
 'First name':['Ім’я','Imię','First name'],
 'Last name':['Прізвище','Nazwisko','Last name'],
 'Locale':['Мова','Język','Locale'],
 'Role':['Роль','Rola','Role'],
 'Status':['Статус','Status','Status'],
 'Registered':['Реєстрація','Rejestracja','Registered'],
 'Last seen':['Остання активність','Ostatnia aktywność','Last seen'],
 'Referral source':['Джерело реферала','Źródło polecenia','Referral source'],
 'VIP tier':['Рівень VIP','Poziom VIP','VIP tier'],
 'VIP since':['VIP з','VIP od','VIP since'],
 'Paid jobs':['Оплачені роботи','Opłacone zlecenia','Paid jobs'],
 'Last paid job':['Остання оплачена робота','Ostatnie opłacone zlecenie','Last paid job'],
 'Lifetime value':['Сумарна цінність','Wartość klienta','Lifetime value'],
 'User ID':['ID користувача','ID użytkownika','User ID'],
 'User':['Користувач','Użytkownik','User'],
 'Name':['Ім’я','Imię','Name'],
 'Tier':['Рівень','Poziom','Tier'],
 'Assigned at':['Призначено','Przydzielono','Assigned at'],
 'Assigned by':['Призначив','Przydzielił','Assigned by'],
 'Expiry':['Діє до','Wygasa','Expiry'],
 'Last visit':['Останній візит','Ostatnia wizyta','Last visit'],
 'ID':['ID','ID','ID'],
 'Removed at':['Знято','Usunięto','Removed at'],
 'Removed by':['Зняв','Usunął','Removed by'],
 'Removal reason':['Причина зняття','Powód usunięcia','Removal reason'],
 'Order ID':['ID замовлення','ID zlecenia','Order ID'],
 'Service':['Послуга','Usługa','Service'],
 'Vehicle':['Авто','Pojazd','Vehicle'],
 'Condition':['Стан','Stan','Condition'],
 'Options':['Опції','Opcje','Options'],
 'Type':['Тип','Typ','Type'],
 'Calculated price':['Розрахована сума','Cena wyliczona','Calculated price'],
 'Final price':['Фінальна сума','Cena końcowa','Final price'],
 'Currency':['Валюта','Waluta','Currency'],
 'Created':['Створено','Utworzono','Created'],
 'Scheduled for':['Заплановано на','Zaplanowano na','Scheduled for'],
 'Confirmed':['Підтверджено','Potwierdzono','Confirmed'],
 'Completed':['Завершено','Zakończono','Completed'],
 'Payment status':['Статус оплати','Status płatności','Payment status'],
 'Payment method':['Спосіб оплати','Metoda płatności','Payment method'],
 'Assigned manager':['Відповідальний менеджер','Przypisany menedżer','Assigned manager'],
 'Client type':['Тип клієнта','Typ klienta','Client type'],
 'Emergency multiplier':['Екстрений множник','Mnożnik awaryjny','Emergency multiplier'],
 'Emergency surcharge':['Екстрена доплата','Dopłata awaryjna','Emergency surcharge'],
 'Payment ID':['ID платежу','ID płatności','Payment ID'],
 'Amount':['Сума','Kwota','Amount'],
 'Reporting amount':['Сума звітності','Kwota raportowa','Reporting amount'],
 'Reporting currency':['Валюта звітності','Waluta raportowa','Reporting currency'],
 'Method':['Спосіб','Metoda','Method'],
 'Provider':['Провайдер','Dostawca','Provider'],
 'Paid at':['Оплачено','Opłacono','Paid at'],
 'Gross revenue':['Валовий дохід','Przychód brutto','Gross revenue'],
 'Average order value':['Середній чек','Średnia wartość zlecenia','Average order value'],
 'Jobs':['Роботи','Zlecenia','Jobs'],
 'Revenue':['Дохід','Przychód','Revenue'],
 'Manager':['Менеджер','Menedżer','Manager'],
 'Referrer':['Реферер','Polecający','Referrer'],
 'Referred user':['Запрошений користувач','Polecony użytkownik','Referred user'],
 'Referral code':['Реферальний код','Kod polecający','Referral code'],
 'Start date':['Дата старту','Data rozpoczęcia','Start date'],
 'Mini App opened':['Mini App відкрито','Mini App otwarto','Mini App opened'],
 'Calculator used':['Калькулятор використано','Kalkulator użyty','Calculator used'],
 'Request created':['Заявку створено','Zlecenie utworzono','Request created'],
 'First paid job':['Перша оплачена робота','Pierwsze opłacone zlecenie','First paid job'],
 'Became VIP':['Став VIP','Uzyskał VIP','Became VIP'],
 'Public reason':['Публічна причина','Powód publiczny','Public reason'],
 'Internal note':['Внутрішня нотатка','Notatka wewnętrzna','Internal note'],
 'Blocked at':['Заблоковано','Zablokowano','Blocked at'],
 'Expires':['Діє до','Wygasa','Expires'],
 'Active':['Активний','Aktywny','Active'],
 'Created at':['Створено','Utworzono','Created at'],
 'Created by':['Створив','Utworzył','Created by'],
 'Staff':['Співробітник','Pracownik','Staff'],
 'Action':['Дія','Działanie','Action'],
 'Entity type':['Тип сутності','Typ encji','Entity type'],
 'Entity ID':['ID сутності','ID encji','Entity ID'],
 'Metric':['Показник','Metryka','Metric'],
 'Value':['Значення','Wartość','Value'],
 'Total users':['Усього користувачів','Łącznie użytkowników','Total users'],
 'Paid amount (mixed currencies)':['Оплачена сума (змішані валюти)','Opłacona kwota (różne waluty)','Paid amount (mixed currencies)'],
 'All period':['За весь період','Cały okres','All period'],
 'days':['днів','dni','days'],
 'Business report':['Бізнес-звіт','Raport biznesowy','Business report'],
 'Revenue report':['Звіт по доходу','Raport przychodów','Revenue report'],
 'Users report':['Звіт по користувачах','Raport użytkowników','Users report'],
 'VIP report':['VIP-звіт','Raport VIP','VIP report'],
 'Orders report':['Звіт по замовленнях','Raport zleceń','Orders report'],
 'Payments report':['Звіт по платежах','Raport płatności','Payments report'],
 'Referrals report':['Звіт по рефералах','Raport poleceń','Referrals report'],
 'Retention report':['Звіт з утримання','Raport retencji','Retention report'],
 'Blacklist report':['Звіт чорного списку','Raport czarnej listy','Blacklist report'],
 'Whitelist report':['Звіт білого списку','Raport białej listy','Whitelist report'],
 'Staff report':['Звіт активності персоналу','Raport aktywności personelu','Staff report'],
 'Cash':['Готівка','Gotówka','Cash'],
 'Card':['Картка','Karta','Card'],
 'Reviews':['Відгуки','Opinie','Reviews'],
 'Suggestions':['Пропозиції','Sugestie','Suggestions'],
 'Reviews report':['Звіт відгуків','Raport opinii','Reviews report'],
 'Suggestions report':['Звіт пропозицій','Raport sugestii','Suggestions report'],
 'Feedback ID':['ID відгуку','ID opinii','Feedback ID'],
 'Feedback text':['Текст','Treść','Feedback text'],
 'Photo attached':['Фото додано','Zdjęcie dodane','Photo attached'],
 'Telegram photo file ID':['Telegram photo file ID','Telegram photo file ID','Telegram photo file ID'],
 'Language':['Мова','Język','Language']
};
const reportLabel=(locale:ReportLocale,key:string)=>{const v=reportText[key];return v?(locale==='uk'?v[0]:locale==='pl'?v[1]:v[2]):key};
const reportLocaleFrom=(v:unknown,fallback:unknown='en'):ReportLocale=>{const a=String(v||'').toLowerCase(),b=String(fallback||'').toLowerCase();return a==='uk'||a==='pl'||a==='en'?a as ReportLocale:b==='uk'||b==='pl'||b==='en'?b as ReportLocale:'en'};
const reportTypeLabel=(locale:ReportLocale,type:ReportType)=>reportLabel(locale,({
 users:'Users report',vip:'VIP report',orders:'Orders report',payments:'Payments report',revenue:'Revenue report',referrals:'Referrals report',retention:'Retention report',blacklist:'Blacklist report',whitelist:'Whitelist report',staff:'Staff report',reviews:'Reviews report',suggestions:'Suggestions report',business:'Business report'
} as Record<ReportType,string>)[type]);
const reportRangeLabel=(locale:ReportLocale,days:number)=>days>0?String(days)+' '+reportLabel(locale,'days'):reportLabel(locale,'All period');
const reportMessageControls=(locale:ReportLocale)=>({inline_keyboard:[[
 {text:locale==='uk'?'📌 Закріпити':locale==='pl'?'📌 Przypnij':'📌 Pin',callback_data:'msgctl:pin:'+locale},
 {text:locale==='uk'?'✅ Прочитано':locale==='pl'?'✅ Przeczytano':'✅ Read',callback_data:'msgctl:read:'+locale}
]]});
const localizeReportValue=(locale:ReportLocale,key:string,value:unknown)=>{
 if(value===null||value===undefined)return value;
 const raw=String(value),upper=raw.toUpperCase();
 if(key==='method'||key==='payment_method'){
  if(upper==='CASH')return reportLabel(locale,'Cash');
  if(upper==='CARD')return reportLabel(locale,'Card');
 }
 if(key==='payment_status'||key==='status'){
  const m:Record<string,[string,string,string]>={
   PAID:['ОПЛАЧЕНО','OPŁACONO','PAID'],PENDING:['ОЧІКУЄ ОПЛАТИ','OCZEKUJE NA PŁATNOŚĆ','PENDING'],
   REQUESTED:['НОВА','NOWE','REQUESTED'],CONFIRMED:['ПІДТВЕРДЖЕНО','POTWIERDZONE','CONFIRMED'],
   IN_PROGRESS:['В РОБОТІ','W REALIZACJI','IN PROGRESS'],COMPLETED:['ЗАВЕРШЕНО','ZAKOŃCZONE','COMPLETED'],CANCELLED:['СКАСОВАНО','ANULOWANE','CANCELLED']
  };
  const v=m[upper];if(v)return locale==='uk'?v[0]:locale==='pl'?v[1]:v[2];
 }
 if(key==='client_type'){
  if(upper==='FIRST')return locale==='uk'?'ПЕРШИЙ':locale==='pl'?'PIERWSZY':'FIRST';
  if(upper==='REPEAT')return locale==='uk'?'ПОВТОРНИЙ':locale==='pl'?'POWTÓRNY':'REPEAT';
 }
 if(key==='whitelist'||key==='blacklist'){
  if(upper==='YES')return locale==='uk'?'ТАК':locale==='pl'?'TAK':'YES';
  if(upper==='NO')return locale==='uk'?'НІ':locale==='pl'?'NIE':'NO';
 }
 if(key==='is_active'){
  if(raw==='1')return locale==='uk'?'ТАК':locale==='pl'?'TAK':'YES';
  if(raw==='0')return locale==='uk'?'НІ':locale==='pl'?'NIE':'NO';
 }
 if(key==='info'&&raw==='No data')return reportLabel(locale,'No data');
 return value;
};

const dateStamp=()=>new Date().toISOString().slice(0,10);
const monthStamp=()=>new Date().toISOString().slice(0,7);
const daysClause=(days:number,alias='')=>days>0?`${alias}created_at >= datetime('now','-${Math.max(1,Math.min(3650,days))} days')`:'1=1';
const xml=(v:unknown)=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const colName=(n:number)=>{let s='';while(n>0){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s};
const utf8=(s:string)=>new TextEncoder().encode(s);

function crc32(data:Uint8Array){let c=0xffffffff;for(const b of data){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
function le16(n:number){return new Uint8Array([n&255,(n>>>8)&255])}
function le32(n:number){return new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255])}
function cat(parts:Uint8Array[]){const len=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(len);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
function zipStore(files:{name:string;data:Uint8Array}[]){const locals:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0;for(const f of files){const name=utf8(f.name),size=f.data.length,crc=crc32(f.data);const local=cat([le32(0x04034b50),le16(20),le16(0x0800),le16(0),le16(0),le16(0),le32(crc),le32(size),le32(size),le16(name.length),le16(0),name,f.data]);locals.push(local);const cen=cat([le32(0x02014b50),le16(20),le16(20),le16(0x0800),le16(0),le16(0),le16(0),le32(crc),le32(size),le32(size),le16(name.length),le16(0),le16(0),le16(0),le16(0),le32(0),le32(offset),name]);central.push(cen);offset+=local.length}const centralBlob=cat(central),localBlob=cat(locals),eocd=cat([le32(0x06054b50),le16(0),le16(0),le16(files.length),le16(files.length),le32(centralBlob.length),le32(localBlob.length),le16(0)]);return cat([localBlob,centralBlob,eocd])}

function sheetXml(sheet:Sheet,locale:ReportLocale){
 const headers=sheet.columns.map(c=>reportLabel(locale,c.header)),all=[headers,...sheet.rows.map(r=>sheet.columns.map(c=>localizeReportValue(locale,c.key,r?.[c.key])))];
 const rowXml=all.map((vals,ri)=>`<row r="${ri+1}">${vals.map((v,ci)=>{const ref=`${colName(ci+1)}${ri+1}`,style=ri===0?' s="1"':'';if(typeof v==='number'&&Number.isFinite(v))return `<c r="${ref}"${style}><v>${v}</v></c>`;return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(v)}</t></is></c>`}).join('')}</row>`).join('');
 const lastCol=colName(Math.max(1,sheet.columns.length)),lastRow=Math.max(1,all.length),cols=sheet.columns.map((_,i)=>`<col min="${i+1}" max="${i+1}" width="18" customWidth="1"/>`).join('');
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${rowXml}</sheetData><autoFilter ref="A1:${lastCol}${lastRow}"/></worksheet>`
}
function buildXlsx(sheets:Sheet[],locale:ReportLocale='en'){
 const safeSheets=sheets.length?sheets:[{name:'Report',columns:[{header:'Info',key:'info'}],rows:[{info:'No data'}]}];
 const contentTypes=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${safeSheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
 const rootRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
 const workbook=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${safeSheets.map((s,i)=>`<sheet name="${xml(reportLabel(locale,s.name).slice(0,31))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`;
 const workbookRels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${safeSheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${safeSheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
 const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FF0A0F08"/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFA4FF00"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;
 const files=[{name:'[Content_Types].xml',data:utf8(contentTypes)},{name:'_rels/.rels',data:utf8(rootRels)},{name:'xl/workbook.xml',data:utf8(workbook)},{name:'xl/_rels/workbook.xml.rels',data:utf8(workbookRels)},{name:'xl/styles.xml',data:utf8(styles)},...safeSheets.map((s,i)=>({name:`xl/worksheets/sheet${i+1}.xml`,data:utf8(sheetXml(s,locale))}))];return zipStore(files)
}
function addSheet(wb:Sheet[],name:string,columns:Col[],rows:any[]){wb.push({name:name.slice(0,31),columns,rows});}
async function rows(env:Env,sql:string,...bind:any[]){const r=await env.DB!.prepare(sql).bind(...bind).all<any>();return r.results||[]}

async function usersData(env:Env){return rows(env,`SELECT u.id,u.telegram_user_id,u.username,u.first_name,u.last_name,u.language,u.created_at,u.last_seen_at,u.role,u.status,COALESCE(p.client_tier,'STANDARD') client_tier,p.vip_since,p.paid_jobs_count,p.last_paid_job_at,p.lifetime_value,CASE WHEN w.user_id IS NULL THEN 'NO' ELSE 'YES' END whitelist,CASE WHEN b.user_id IS NULL THEN 'NO' ELSE 'YES' END blacklist,rr.code referral_source FROM users u LEFT JOIN client_profiles p ON p.user_id=u.id LEFT JOIN whitelist w ON w.user_id=u.id LEFT JOIN (SELECT DISTINCT user_id FROM blacklist WHERE is_active=1) b ON b.user_id=u.id LEFT JOIN referrals rr ON rr.referred_user_id=u.id ORDER BY u.id DESC`)}
async function vipData(env:Env){return rows(env,`SELECT u.id,u.username,u.first_name,u.telegram_user_id,p.client_tier,p.vip_since,p.paid_jobs_count,p.lifetime_value,p.last_paid_job_at,vh.assigned_at,vh.expires_at,vh.removed_at,au.username assigned_by FROM client_profiles p JOIN users u ON u.id=p.user_id LEFT JOIN vip_history vh ON vh.id=(SELECT id FROM vip_history x WHERE x.user_id=u.id ORDER BY x.id DESC LIMIT 1) LEFT JOIN users au ON au.id=vh.assigned_by WHERE p.client_tier<>'STANDARD' ORDER BY p.vip_since DESC`)}
async function ordersData(env:Env,days:number){return rows(env,`SELECT r.id,u.first_name,u.username,r.service_slug,r.vehicle_slug,r.condition_slug,r.options_json,r.request_type,r.calculated_price,r.final_job_price,r.currency,r.status,r.created_at,r.confirmed_at,r.completed_at,r.payment_status,r.is_test,r.scheduled_for,r.emergency_multiplier,r.emergency_surcharge,m.username assigned_manager,CASE WHEN COALESCE(cp.paid_jobs_count,0)>1 THEN 'REPEAT' ELSE 'FIRST' END client_type,ref.code referral_source,(SELECT method FROM payments px WHERE px.service_request_id=r.id ORDER BY px.id DESC LIMIT 1) payment_method FROM service_requests r LEFT JOIN users u ON u.id=r.user_id LEFT JOIN users m ON m.id=r.assigned_manager_id LEFT JOIN client_profiles cp ON cp.user_id=r.user_id LEFT JOIN referrals ref ON ref.referred_user_id=r.user_id WHERE r.is_test=0 AND r.staff_deleted_at IS NULL AND ${daysClause(days,'r.')} ORDER BY r.id DESC`)}
async function paymentsData(env:Env,days:number){return rows(env,`SELECT p.id,p.service_request_id,u.username,p.amount,p.currency,p.reporting_amount,p.reporting_currency,p.method,p.provider,p.status,p.created_at,p.paid_at FROM payments p LEFT JOIN users u ON u.id=p.user_id WHERE ${daysClause(days,'p.')} ORDER BY p.id DESC`)}
async function referralsData(env:Env,days:number){return rows(env,`SELECT r.id,r.code,r.created_at,r.miniapp_opened_at,r.calculator_used_at,r.request_created_at,r.first_paid_job_at,r.became_vip_at,a.username referrer,b.username referred FROM referrals r LEFT JOIN users a ON a.id=r.referrer_user_id LEFT JOIN users b ON b.id=r.referred_user_id WHERE ${daysClause(days,'r.')} ORDER BY r.id DESC`)}

export async function buildReport(env:Env,type:ReportType,days=30,locale:ReportLocale='en'){
 if(!env.DB)throw new Error('D1 is not connected');await ensureDb(env);const wb:Sheet[]=[];let filename=`${type}_${dateStamp()}.xlsx`;
 if(type==='business'){const [users,vip,orders,paid,refs]=await Promise.all([env.DB.prepare('SELECT COUNT(*) n FROM users').first<any>(),env.DB.prepare("SELECT COUNT(*) n FROM client_profiles WHERE client_tier<>'STANDARD'").first<any>(),env.DB.prepare(`SELECT COUNT(*) n FROM service_requests WHERE is_test=0 AND staff_deleted_at IS NULL AND ${daysClause(days)}`).first<any>(),env.DB.prepare(`SELECT COUNT(*) n,COALESCE(SUM(amount),0) total FROM payments WHERE status='PAID' AND ${daysClause(days)}`).first<any>(),env.DB.prepare(`SELECT COUNT(*) n FROM referrals WHERE ${daysClause(days)}`).first<any>()]);addSheet(wb,'Dashboard',[{header:'Metric',key:'metric'},{header:'Value',key:'value'}],[{metric:reportLabel(locale,'Total users'),value:users?.n||0},{metric:reportLabel(locale,'Active VIP'),value:vip?.n||0},{metric:reportLabel(locale,'Orders')+' ('+reportRangeLabel(locale,days)+')',value:orders?.n||0},{metric:reportLabel(locale,'Paid jobs'),value:paid?.n||0},{metric:reportLabel(locale,'Paid amount (mixed currencies)'),value:paid?.total||0},{metric:reportLabel(locale,'Referrals'),value:refs?.n||0}])}
 if(type==='users'||type==='business'){const data=await usersData(env);const cols=[{header:'Internal ID',key:'id'},{header:'Telegram ID',key:'telegram_user_id'},{header:'Username',key:'username'},{header:'First name',key:'first_name'},{header:'Last name',key:'last_name'},{header:'Locale',key:'language'},{header:'Role',key:'role'},{header:'Status',key:'status'},{header:'Registered',key:'created_at'},{header:'Last seen',key:'last_seen_at'},{header:'Referral source',key:'referral_source'},{header:'VIP tier',key:'client_tier'},{header:'VIP since',key:'vip_since'},{header:'Blacklist',key:'blacklist'},{header:'Whitelist',key:'whitelist'},{header:'Paid jobs',key:'paid_jobs_count'},{header:'Last paid job',key:'last_paid_job_at'},{header:'Lifetime value',key:'lifetime_value'}];addSheet(wb,'Users',cols,data);if(type==='business')addSheet(wb,'New Users',cols,data.filter((x:any)=>days<=0||Date.parse(x.created_at)>=Date.now()-days*86400000))}
 if(type==='vip'||type==='business'){const data=await vipData(env),cols=[{header:'User ID',key:'id'},{header:'Telegram ID',key:'telegram_user_id'},{header:'Username',key:'username'},{header:'Name',key:'first_name'},{header:'Tier',key:'client_tier'},{header:'VIP since',key:'vip_since'},{header:'Assigned at',key:'assigned_at'},{header:'Assigned by',key:'assigned_by'},{header:'Expiry',key:'expires_at'},{header:'Paid jobs',key:'paid_jobs_count'},{header:'Lifetime value',key:'lifetime_value'},{header:'Last visit',key:'last_paid_job_at'}];addSheet(wb,'Active VIP',cols,data);addSheet(wb,'Recent VIP',cols,data.filter((x:any)=>x.vip_since&&Date.parse(x.vip_since)>=Date.now()-30*86400000));addSheet(wb,'Long-time VIP',cols,data.filter((x:any)=>x.vip_since&&Date.parse(x.vip_since)<Date.now()-180*86400000));const hist=await rows(env,`SELECT vh.*,u.username user,au.username assigned_by,ru.username removed_by FROM vip_history vh LEFT JOIN users u ON u.id=vh.user_id LEFT JOIN users au ON au.id=vh.assigned_by LEFT JOIN users ru ON ru.id=vh.removed_by ORDER BY vh.id DESC`);addSheet(wb,'VIP History',[{header:'ID',key:'id'},{header:'User',key:'user'},{header:'Tier',key:'tier'},{header:'Assigned at',key:'assigned_at'},{header:'Assigned by',key:'assigned_by'},{header:'Expiry',key:'expires_at'},{header:'Removed at',key:'removed_at'},{header:'Removed by',key:'removed_by'},{header:'Removal reason',key:'removal_reason'}],hist)}
 if(type==='orders'||type==='business'){const data=await ordersData(env,days);addSheet(wb,'Orders',[{header:'Order ID',key:'id'},{header:'User',key:'first_name'},{header:'Username',key:'username'},{header:'Service',key:'service_slug'},{header:'Vehicle',key:'vehicle_slug'},{header:'Condition',key:'condition_slug'},{header:'Options',key:'options_json'},{header:'Type',key:'request_type'},{header:'Calculated price',key:'calculated_price'},{header:'Final price',key:'final_job_price'},{header:'Currency',key:'currency'},{header:'Status',key:'status'},{header:'Created',key:'created_at'},{header:'Scheduled for',key:'scheduled_for'},{header:'Confirmed',key:'confirmed_at'},{header:'Completed',key:'completed_at'},{header:'Payment status',key:'payment_status'},{header:'Payment method',key:'payment_method'},{header:'Assigned manager',key:'assigned_manager'},{header:'Client type',key:'client_type'},{header:'Referral source',key:'referral_source'},{header:'Emergency multiplier',key:'emergency_multiplier'},{header:'Emergency surcharge',key:'emergency_surcharge'}],data)}
 if(type==='payments'||type==='revenue'||type==='business'){const data=await paymentsData(env,days);addSheet(wb,'Payments',[{header:'Payment ID',key:'id'},{header:'Order ID',key:'service_request_id'},{header:'User',key:'username'},{header:'Amount',key:'amount'},{header:'Currency',key:'currency'},{header:'Reporting amount',key:'reporting_amount'},{header:'Reporting currency',key:'reporting_currency'},{header:'Method',key:'method'},{header:'Provider',key:'provider'},{header:'Status',key:'status'},{header:'Created',key:'created_at'},{header:'Paid at',key:'paid_at'}],data);if(type==='revenue'||type==='business'){const summary=await rows(env,`SELECT currency,COUNT(*) paid_jobs,SUM(amount) gross_revenue,AVG(amount) average_order_value FROM payments WHERE status='PAID' AND ${daysClause(days)} GROUP BY currency`);addSheet(wb,'Revenue Summary',[{header:'Currency',key:'currency'},{header:'Paid jobs',key:'paid_jobs'},{header:'Gross revenue',key:'gross_revenue'},{header:'Average order value',key:'average_order_value'}],summary);const byService=await rows(env,`SELECT r.service_slug service,p.currency,COUNT(*) jobs,SUM(p.amount) revenue FROM payments p JOIN service_requests r ON r.id=p.service_request_id WHERE p.status='PAID' AND ${daysClause(days,'p.')} GROUP BY r.service_slug,p.currency ORDER BY revenue DESC`);addSheet(wb,'Revenue by Service',[{header:'Service',key:'service'},{header:'Currency',key:'currency'},{header:'Jobs',key:'jobs'},{header:'Revenue',key:'revenue'}],byService);const byManager=await rows(env,`SELECT COALESCE(m.username,'Unassigned') manager,p.currency,COUNT(*) jobs,SUM(p.amount) revenue FROM payments p JOIN service_requests r ON r.id=p.service_request_id LEFT JOIN users m ON m.id=r.assigned_manager_id WHERE p.status='PAID' AND ${daysClause(days,'p.')} GROUP BY manager,p.currency ORDER BY revenue DESC`);addSheet(wb,'Revenue by Manager',[{header:'Manager',key:'manager'},{header:'Currency',key:'currency'},{header:'Jobs',key:'jobs'},{header:'Revenue',key:'revenue'}],byManager);const byMethod=await rows(env,`SELECT method,p.currency,COUNT(*) jobs,SUM(amount) revenue FROM payments p WHERE status='PAID' AND ${daysClause(days,'p.')} GROUP BY method,p.currency ORDER BY revenue DESC`);addSheet(wb,'Revenue by Method',[{header:'Method',key:'method'},{header:'Currency',key:'currency'},{header:'Jobs',key:'jobs'},{header:'Revenue',key:'revenue'}],byMethod);const vipVs=await rows(env,`SELECT COALESCE(cp.client_tier,'STANDARD') tier,p.currency,COUNT(*) jobs,SUM(p.amount) revenue FROM payments p LEFT JOIN client_profiles cp ON cp.user_id=p.user_id WHERE p.status='PAID' AND ${daysClause(days,'p.')} GROUP BY tier,p.currency`);addSheet(wb,'VIP vs Standard',[{header:'Tier',key:'tier'},{header:'Currency',key:'currency'},{header:'Jobs',key:'jobs'},{header:'Revenue',key:'revenue'}],vipVs);const unpaid=await rows(env,`SELECT r.id,u.username,r.service_slug,r.final_job_price,r.calculated_price,r.currency,r.completed_at,r.payment_status FROM service_requests r LEFT JOIN users u ON u.id=r.user_id WHERE r.status='COMPLETED' AND r.staff_deleted_at IS NULL AND r.payment_status<>'PAID' AND ${daysClause(days,'r.')} ORDER BY r.completed_at DESC`);addSheet(wb,'Unpaid Completed Jobs',[{header:'Order ID',key:'id'},{header:'Username',key:'username'},{header:'Service',key:'service_slug'},{header:'Final price',key:'final_job_price'},{header:'Calculated price',key:'calculated_price'},{header:'Currency',key:'currency'},{header:'Completed',key:'completed_at'},{header:'Payment status',key:'payment_status'}],unpaid);filename=`revenue_${monthStamp()}.xlsx`}}
 if(type==='referrals'||type==='business')addSheet(wb,'Referrals',[{header:'ID',key:'id'},{header:'Referrer',key:'referrer'},{header:'Referred user',key:'referred'},{header:'Referral code',key:'code'},{header:'Start date',key:'created_at'},{header:'Mini App opened',key:'miniapp_opened_at'},{header:'Calculator used',key:'calculator_used_at'},{header:'Request created',key:'request_created_at'},{header:'First paid job',key:'first_paid_job_at'},{header:'Became VIP',key:'became_vip_at'}],await referralsData(env,days));
 if(type==='blacklist'||type==='business')addSheet(wb,'Blacklist',[{header:'ID',key:'id'},{header:'User',key:'first_name'},{header:'Username',key:'username'},{header:'Public reason',key:'public_reason'},{header:'Internal note',key:'internal_note'},{header:'Blocked at',key:'blocked_at'},{header:'Expires',key:'expires_at'},{header:'Active',key:'is_active'}],await rows(env,`SELECT b.id,u.username,u.first_name,b.public_reason,b.internal_note,b.blocked_at,b.expires_at,b.is_active FROM blacklist b LEFT JOIN users u ON u.id=b.user_id ORDER BY b.id DESC`));
 if(type==='whitelist'||type==='business')addSheet(wb,'Whitelist',[{header:'User ID',key:'user_id'},{header:'User',key:'first_name'},{header:'Username',key:'username'},{header:'Created at',key:'created_at'},{header:'Created by',key:'created_by'}],await rows(env,`SELECT w.user_id,u.username,u.first_name,w.created_at,w.created_by FROM whitelist w LEFT JOIN users u ON u.id=w.user_id ORDER BY w.created_at DESC`));
 if(type==='staff'||type==='business')addSheet(wb,'Staff Activity',[{header:'ID',key:'id'},{header:'Staff',key:'first_name'},{header:'Username',key:'username'},{header:'Action',key:'action'},{header:'Entity type',key:'entity_type'},{header:'Entity ID',key:'entity_id'},{header:'Created',key:'created_at'}],await rows(env,`SELECT a.id,a.action,a.entity_type,a.entity_id,a.created_at,u.username,u.first_name FROM audit_log a LEFT JOIN users u ON u.id=a.actor_user_id WHERE u.role IN ('OWNER','ADMIN','MANAGER') AND ${daysClause(days,'a.')} ORDER BY a.id DESC`));
 if(type==='retention'||type==='business')addSheet(wb,'Retention',[{header:'User ID',key:'id'},{header:'User',key:'first_name'},{header:'Username',key:'username'},{header:'Paid jobs',key:'paid_jobs_count'},{header:'First paid job',key:'first_paid_job_at'},{header:'Last paid job',key:'last_paid_job_at'},{header:'Lifetime value',key:'lifetime_value'}],await rows(env,`SELECT u.id,u.username,u.first_name,p.paid_jobs_count,p.first_paid_job_at,p.last_paid_job_at,p.lifetime_value FROM users u LEFT JOIN client_profiles p ON p.user_id=u.id ORDER BY COALESCE(p.paid_jobs_count,0) DESC`));
 if(type==='reviews'||type==='business')addSheet(wb,'Reviews',[{header:'Feedback ID',key:'id'},{header:'User ID',key:'user_id'},{header:'User',key:'first_name'},{header:'Username',key:'username'},{header:'Feedback text',key:'text'},{header:'Photo attached',key:'photo_attached'},{header:'Telegram photo file ID',key:'photo_file_id'},{header:'Language',key:'language'},{header:'Status',key:'status'},{header:'Created at',key:'created_at'}],await rows(env,`SELECT f.id,f.user_id,u.first_name,u.username,f.text,CASE WHEN COALESCE(f.photo_file_id,'')<>'' THEN 'YES' ELSE 'NO' END photo_attached,COALESCE(f.photo_file_id,'') photo_file_id,f.language,f.status,f.created_at FROM client_feedback f LEFT JOIN users u ON u.id=f.user_id WHERE f.kind='REVIEW' AND ${daysClause(days,'f.')} ORDER BY f.id DESC`));
 if(type==='suggestions'||type==='business')addSheet(wb,'Suggestions',[{header:'Feedback ID',key:'id'},{header:'User ID',key:'user_id'},{header:'User',key:'first_name'},{header:'Username',key:'username'},{header:'Feedback text',key:'text'},{header:'Photo attached',key:'photo_attached'},{header:'Telegram photo file ID',key:'photo_file_id'},{header:'Language',key:'language'},{header:'Status',key:'status'},{header:'Created at',key:'created_at'}],await rows(env,`SELECT f.id,f.user_id,u.first_name,u.username,f.text,CASE WHEN COALESCE(f.photo_file_id,'')<>'' THEN 'YES' ELSE 'NO' END photo_attached,COALESCE(f.photo_file_id,'') photo_file_id,f.language,f.status,f.created_at FROM client_feedback f LEFT JOIN users u ON u.id=f.user_id WHERE f.kind='SUGGESTION' AND ${daysClause(days,'f.')} ORDER BY f.id DESC`));
 if(type==='business')filename=`business_report_${monthStamp()}.xlsx`;return {filename,buffer:buildXlsx(wb,locale)}
}

export async function sendReportDocument(env:Env,chatId:number,actorUserId:number,type:ReportType,days=30){
 if(!env.BOT_TOKEN)throw new Error('BOT_TOKEN missing');
 if(!env.DB)throw new Error('D1 is not connected');
 await ensureDb(env);
 const lang=await env.DB.prepare('SELECT management_language,language FROM users WHERE id=?').bind(actorUserId).first<any>().catch(()=>null);
 const locale=reportLocaleFrom(lang?.management_language,lang?.language);
 const {filename,buffer}=await buildReport(env,type,days,locale);
 const form=new FormData();
 form.set('chat_id',String(chatId));
 form.set('caption','📊 Chameleon Detailing — '+reportTypeLabel(locale,type));
 form.set('reply_markup',JSON.stringify(reportMessageControls(locale)));
 form.set('document',new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),filename);
 const res=await fetch('https://api.telegram.org/bot'+env.BOT_TOKEN+'/sendDocument',{method:'POST',body:form});
 const data:any=await res.json();
 if(!res.ok||!data.ok)throw new Error(data?.description||'Telegram sendDocument failed');
 await env.DB.prepare('INSERT INTO audit_log(actor_user_id,action,entity_type,entity_id,new_data_json) VALUES(?,?,?,?,?)').bind(actorUserId,'report.export','report',type,JSON.stringify({type,days,filename,locale})).run();
 return {ok:true,filename,locale}
}
