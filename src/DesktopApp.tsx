import React,{useEffect,useMemo,useState} from 'react';
import {
 Home,ClipboardList,Search,Car,Users,CalendarDays,Wrench,CreditCard,Megaphone,
 BarChart3,FileText,BadgeCheck,Settings,History,LayoutDashboard,LogOut,RefreshCw,
 ChevronRight,Lock,Unlock,Save,Upload,Download,RotateCcw,Send,Pause,Play,Eye,
 Monitor,Tablet,Menu,X,Check,AlertTriangle
} from 'lucide-react';
import './desktop.css';

type Role='OWNER'|'ADMIN'|'MANAGER';
type Bootstrap={user:{id:number;telegramId:number;firstName:string;username?:string;role:Role};permissions:Record<string,boolean>;mode:string;workspace:{version:number;config:any};personal:any};
type Page='dashboard'|'orders'|'sales'|'cars'|'clients'|'calendar'|'services'|'payments'|'broadcasts'|'analytics'|'reports'|'staff'|'audit'|'workspace'|'settings';
const labels:Record<Page,string>={dashboard:'Dashboard',orders:'Замовлення',sales:'Sales',cars:'Автомобілі',clients:'Клієнти',calendar:'Календар',services:'Послуги',payments:'Оплати',broadcasts:'Розсилки',analytics:'Аналітика',reports:'Звіти',staff:'Персонал',audit:'Audit Log',workspace:'Layout Editor',settings:'Налаштування'};
const icons:Record<Page,any>={dashboard:Home,orders:ClipboardList,sales:Search,cars:Car,clients:Users,calendar:CalendarDays,services:Wrench,payments:CreditCard,broadcasts:Megaphone,analytics:BarChart3,reports:FileText,staff:BadgeCheck,audit:History,workspace:LayoutDashboard,settings:Settings};
const money=(v:any,c='PLN')=>new Intl.NumberFormat('uk-UA',{style:'currency',currency:c||'PLN',maximumFractionDigits:2}).format(Number(v||0));
const dt=(v:any)=>v?new Date(String(v).endsWith('Z')?v:String(v)+'Z').toLocaleString('uk-UA'):'—';
const isPhoneClient=()=>{
 const ua=String(navigator.userAgent||'');
 const uaData=(navigator as any).userAgentData;
 const phoneUa=/iPhone|iPod|Windows Phone|IEMobile|Opera Mini|BlackBerry|BB10|Android[^)]*Mobile/i.test(ua);
 const tablet=/iPad|Tablet|Android(?![^)]*Mobile)/i.test(ua);
 return !tablet&&(phoneUa||uaData?.mobile===true);
};

const api=async(path:string,init:RequestInit={})=>{
 const session=localStorage.getItem('chameleon.desktop.session')||'';
 const r=await fetch(path,{...init,headers:{'content-type':'application/json',...(session?{authorization:'Bearer '+session}:{}),...(init.headers||{})}});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(d.error||('HTTP '+r.status));
 return d;
};
const post=(path:string,data:any,method='POST')=>api(path,{method,body:JSON.stringify(data)});

export function DesktopApp(){
 const phoneBlocked=useMemo(()=>isPhoneClient(),[]);
 const [boot,setBoot]=useState<Bootstrap|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[page,setPage]=useState<Page>('dashboard'),[mobile,setMobile]=useState(false);
 const load=async()=>{
  setLoading(true);setError('');
  try{
   const p=new URLSearchParams(location.search),token=p.get('token');
   if(token){
    const r=await fetch('/api/desktop/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token,device:navigator.platform||'Desktop'})});
    const d=await r.json();if(!r.ok)throw new Error(d.error||'Login failed');
    localStorage.setItem('chameleon.desktop.session',d.session);
    history.replaceState({},'',location.pathname);
   }
   const b=await api('/api/desktop/bootstrap') as Bootstrap;setBoot(b);
   const hash=location.hash.replace(/^#/,'') as Page;if(hash&&labels[hash])setPage(hash);else setPage((b.workspace?.config?.defaultPage||'dashboard') as Page);
  }catch(e:any){setError(String(e?.message||e));setBoot(null)}
  finally{setLoading(false)}
 };
 useEffect(()=>{if(!phoneBlocked)load();else setLoading(false)},[phoneBlocked]);
 useEffect(()=>{location.hash=page==='dashboard'?'':page},[page]);
 if(phoneBlocked)return <div className="desk-state"><AlertTriangle/><h1>Desktop Control Center</h1><p>Вхід з телефону заблокований.</p><p className="desk-muted">Відкрийте панель на PC, Mac, ноутбуці або iPad / планшеті.</p></div>;
 if(loading)return <div className="desk-state"><div className="desk-spinner"/><h1>Chameleon Control Center</h1><p>Завантаження робочого простору…</p></div>;
 if(!boot)return <div className="desk-state"><AlertTriangle/><h1>Desktop Control Center</h1><p>{error||'Сесія недоступна.'}</p><p className="desk-muted">Відкрийте Telegram Bot та надішліть команду <b>/desktop</b>, щоб отримати нове одноразове посилання.</p></div>;
 const logout=async()=>{try{await post('/api/desktop/logout',{})}catch{}localStorage.removeItem('chameleon.desktop.session');setBoot(null)};
 const allowed=(id:string)=>{
  if(id==='workspace')return !!boot.permissions.workspace_editor;
  if(id==='sales')return !!boot.permissions.sales_access;
  if(id==='broadcasts')return !!boot.permissions.broadcast_access;
  if(id==='payments')return !!boot.permissions.financial_access;
  if(id==='reports')return !!boot.permissions.reports_access;
  if(id==='clients'||id==='cars')return !!boot.permissions.clients_access;
  if((id==='staff'||id==='audit'||id==='settings')&&boot.user.role==='MANAGER')return false;
  return true;
 };
 const sidebar=(boot.workspace?.config?.sidebar||[]).filter((x:any)=>x&&labels[x.id as Page]&&allowed(x.id)&&(!x.roles||x.roles.includes(boot.user.role)));
 const groups=Array.from(new Set(sidebar.map((x:any)=>x.group||'Workspace')));
 return <div className={'desktop-shell '+(mobile?'sidebar-open':'')}>
  <aside className="desktop-sidebar">
   <div className="desk-brand"><img src="/brand/chameleon-logo.webp" alt=""/><div><b>Chameleon</b><span>Control Center</span></div><button className="desk-close-mobile" onClick={()=>setMobile(false)}><X/></button></div>
   <nav>{groups.map((g:any)=><div className="desk-nav-group" key={g}><small>{g}</small>{sidebar.filter((x:any)=>(x.group||'Workspace')===g).map((x:any)=>{const id=x.id as Page,I=icons[id]||ChevronRight;return <button className={page===id?'active':''} onClick={()=>{setPage(id);setMobile(false)}} key={id}><I/><span>{x.label||labels[id]}</span></button>})}</div>)}</nav>
   <div className="desk-user"><div className="desk-avatar">{(boot.user.firstName||'C')[0]}</div><div><b>{boot.user.firstName}</b><span>{boot.user.role}{boot.user.username?' · @'+boot.user.username:''}</span></div><button onClick={logout} title="Вийти"><LogOut/></button></div>
  </aside>
  <main className="desktop-main">
   <header className="desk-topbar"><button className="desk-menu" onClick={()=>setMobile(true)}><Menu/></button><div><small>CHAMELEON DETAILING</small><h1>{labels[page]}</h1></div><div className="desk-mode"><i className={'mode-'+boot.mode.toLowerCase().replace('_','-')}/><span>{boot.mode.replace('_',' ')}</span></div></header>
   {boot.mode==='READ_ONLY'&&<div className="desk-banner warning">Read Only: перегляд доступний, зміни заблоковані backend.</div>}
   <div className="desktop-content">
    {page==='dashboard'&&<Dashboard boot={boot} goto={setPage}/>}
    {page==='orders'&&<Orders/>}
    {page==='sales'&&<Sales/>}
    {page==='cars'&&<SimpleTable endpoint="/api/desktop/cars" keyName="cars" title="Cars CRM" type="cars"/>}
    {page==='clients'&&<SimpleTable endpoint="/api/desktop/clients" keyName="clients" title="Clients CRM" type="clients"/>}
    {page==='calendar'&&<CalendarView/>}
    {page==='services'&&<SimpleTable endpoint="/api/desktop/services" keyName="services" title="Services" type="services"/>}
    {page==='payments'&&<Payments/>}
    {page==='broadcasts'&&<Broadcasts/>}
    {page==='analytics'&&<Analytics/>}
    {page==='reports'&&<Reports/>}
    {page==='staff'&&<SimpleTable endpoint="/api/desktop/staff" keyName="staff" title="Staff" type="staff"/>}
    {page==='audit'&&<SimpleTable endpoint="/api/desktop/audit" keyName="events" title="Audit Log" type="audit"/>}
    {page==='workspace'&&<WorkspaceEditor boot={boot} onPublished={load}/>}
    {page==='settings'&&<DesktopSettings boot={boot} reload={load}/>}
   </div>
  </main>
 </div>
}

function Panel({title,children,action}:{title:string;children:any;action?:any}){return <section className="desk-panel"><div className="desk-panel-head"><h2>{title}</h2>{action}</div>{children}</section>}
function Dashboard({boot,goto}:{boot:Bootstrap;goto:(p:Page)=>void}){
 const [data,setData]=useState<any>(null);useEffect(()=>{api('/api/desktop/dashboard').then(setData).catch(()=>{})},[]);
 const k=data?.kpi||{};const cards=[['Нові заявки',k.newOrders||0],['Підтверджені',k.confirmed||0],['Авто в роботі',k.inWork||0],['Готові',k.ready||0],['Очікують оплату',k.unpaid||0],['Виручка сьогодні',money(k.revenue||0,data?.currency||'PLN')]];
 return <><div className="desk-kpis">{cards.map(([a,b])=><div className="desk-kpi" key={String(a)}><small>{a}</small><strong>{b}</strong></div>)}</div>
 <div className="desk-grid-2"><Panel title="Швидкі дії"><div className="desk-quick">{[['orders','Нова / активна заявка'],['sales','Знайти замовлення'],['cars','Автомобілі'],['calendar','Розклад'],['broadcasts','Розсилки'],['reports','Звіти']].filter(([id])=>id!=='sales'||boot.permissions.sales_access).filter(([id])=>id!=='broadcasts'||boot.permissions.broadcast_access).filter(([id])=>id!=='reports'||boot.permissions.reports_access).map(([id,label])=><button key={id} onClick={()=>goto(id as Page)}>{label}<ChevronRight/></button>)}</div></Panel>
 <Panel title="Система"><div className="desk-system"><p><span>Desktop</span><b>{boot.mode}</b></p><p><span>Роль</span><b>{boot.user.role}</b></p><p><span>Workspace</span><b>v{boot.workspace.version}</b></p></div></Panel></div></>
}

function Orders(){
 const [orders,setOrders]=useState<any[]>([]),[q,setQ]=useState(''),[status,setStatus]=useState(''),[view,setView]=useState<'table'|'kanban'>('table'),[selected,setSelected]=useState<any>(null),[busy,setBusy]=useState(false);
 const load=async()=>{setBusy(true);try{const d=await api('/api/desktop/orders?q='+encodeURIComponent(q)+'&status='+encodeURIComponent(status));setOrders(d.orders||[])}finally{setBusy(false)}};
 useEffect(()=>{load()},[]);
 const statuses=['','REQUESTED','CONFIRMED','IN_PROGRESS','READY','COMPLETED','CANCELLED'];
 return <><div className="desk-toolbar"><div className="desk-search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} placeholder="Телефон, CHD-номер, @username, номер авто…"/></div><select value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(s=><option value={s} key={s}>{s||'Всі статуси'}</option>)}</select><button onClick={load}><RefreshCw className={busy?'spin':''}/>Оновити</button><div className="desk-segment"><button className={view==='table'?'active':''} onClick={()=>setView('table')}>Table</button><button className={view==='kanban'?'active':''} onClick={()=>setView('kanban')}>Kanban</button></div></div>
 {view==='table'?<Panel title={'Замовлення · '+orders.length}><div className="desk-table-wrap"><table><thead><tr><th>№</th><th>Клієнт</th><th>Телефон</th><th>Авто</th><th>Дата</th><th>Статус</th><th>Ціна</th><th>Оплата</th></tr></thead><tbody>{orders.map(o=><tr key={o.id} onClick={()=>setSelected(o)}><td><b>CHD-{o.id}</b></td><td>{o.first_name||o.username||'—'}</td><td>{o.phone_number||'—'}</td><td>{[o.brand,o.model,o.plate].filter(Boolean).join(' · ')||'—'}</td><td>{dt(o.scheduled_for||o.created_at)}</td><td><span className="desk-status">{o.status}</span></td><td>{money(o.final_job_price??o.calculated_price,o.currency)}</td><td>{o.payment_status}</td></tr>)}</tbody></table></div></Panel>:<Kanban orders={orders} select={setSelected} changed={load}/>}
 {selected&&<OrderDrawer id={selected.id} close={()=>setSelected(null)} changed={load}/>}</>
}
function Kanban({orders,select,changed}:{orders:any[];select:(o:any)=>void;changed:()=>void}){
 const cols=[['REQUESTED','Нова'],['PENDING_CONFIRMATION','Очікує підтвердження'],['CONFIRMED','Підтверджена'],['IN_PROGRESS','У роботі'],['READY','Готово'],['COMPLETED','Завершено']];
 const [drag,setDrag]=useState<number|null>(null),[over,setOver]=useState('');
 const move=async(status:string)=>{if(!drag)return;try{await post('/api/desktop/orders/'+drag,{status},'PATCH');changed()}finally{setDrag(null);setOver('')}};
 return <div className="desk-kanban">{cols.map(([s,l])=><div className={'desk-kanban-col '+(over===s?'drop-active':'')} key={s} onDragOver={e=>{e.preventDefault();setOver(s)}} onDragLeave={()=>setOver(x=>x===s?'':x)} onDrop={e=>{e.preventDefault();move(s)}}><h3>{l}<span>{orders.filter(o=>o.status===s).length}</span></h3>{orders.filter(o=>o.status===s).map(o=><button draggable className={'desk-kanban-card '+(drag===o.id?'dragging':'')} key={o.id} onDragStart={()=>setDrag(o.id)} onDragEnd={()=>{setDrag(null);setOver('')}} onClick={()=>select(o)}><b>CHD-{o.id}</b><span>{o.first_name||o.username||'Client'}</span><small>{[o.brand,o.model].filter(Boolean).join(' ')}</small><strong>{money(o.final_job_price??o.calculated_price,o.currency)}</strong></button>)}</div>)}</div>
}
function OrderDrawer({id,close,changed}:{id:number;close:()=>void;changed:()=>void}){
 const [o,setO]=useState<any>(null),[saving,setSaving]=useState(false),[form,setForm]=useState<any>({});
 const load=()=>api('/api/desktop/orders/'+id).then(d=>{setO(d.order);setForm({status:d.order?.status,paymentStatus:d.order?.payment_status,scheduledFor:d.order?.scheduled_for||'',finalPrice:d.order?.final_job_price??d.order?.calculated_price,staffNote:d.order?.staff_note||'',accelerated:!!d.order?.accelerated,acceleratedSurcharge:d.order?.accelerated_surcharge||0})});
 useEffect(()=>{load()},[id]);
 const save=async()=>{setSaving(true);try{await post('/api/desktop/orders/'+id,form,'PATCH');await load();changed()}finally{setSaving(false)}};
 return <div className="desk-drawer-backdrop" onMouseDown={e=>e.target===e.currentTarget&&close()}><aside className="desk-drawer"><button className="desk-drawer-close" onClick={close}><X/></button>{!o?<div className="desk-spinner"/>:<><span className="desk-eyebrow">ORDER · CHD-{o.id}</span><h2>{o.first_name||o.username||'Client'}</h2><p className="desk-muted">{o.phone_number||'—'} · @{o.username||'—'}</p>
 <div className="desk-order-car"><Car/><div><b>{[o.brand,o.model,o.modification].filter(Boolean).join(' ')||o.car_name||'Авто'}</b><span>{o.plate||'—'} · {o.body_type||'—'}{o.has_ceramic?' · Ceramic':''}</span></div></div>
 <div className="desk-form-grid"><label>Статус<select value={form.status||''} onChange={e=>setForm({...form,status:e.target.value})}>{['REQUESTED','PENDING_CONFIRMATION','CONFIRMED','CAR_ACCEPTED','IN_PROGRESS','INSPECTION','READY','COMPLETED','CANCELLED'].map(x=><option key={x}>{x}</option>)}</select></label><label>Оплата<select value={form.paymentStatus||''} onChange={e=>setForm({...form,paymentStatus:e.target.value})}>{['PENDING','UNPAID','PAID','REFUNDED'].map(x=><option key={x}>{x}</option>)}</select></label><label>Дата/час<input type="datetime-local" value={String(form.scheduledFor||'').slice(0,16)} onChange={e=>setForm({...form,scheduledFor:e.target.value})}/></label><label>Кінцева сума<input type="number" value={form.finalPrice||0} onChange={e=>setForm({...form,finalPrice:Number(e.target.value)})}/></label></div>
 <label className="desk-field">Внутрішня примітка<textarea value={form.staffNote||''} onChange={e=>setForm({...form,staffNote:e.target.value})}/></label>
 <div className="desk-accelerated"><label><input type="checkbox" checked={!!form.accelerated} onChange={e=>setForm({...form,accelerated:e.target.checked})}/><span>⚡ Прискорена робота</span></label><input type="number" value={form.acceleratedSurcharge||0} onChange={e=>setForm({...form,acceleratedSurcharge:Number(e.target.value)})} placeholder="+ PLN"/></div>
 <Panel title="Послуги"><div className="desk-tags">{String(o.services_json||'[]').replace(/[\[\]"]/g,'').split(',').filter(Boolean).map((x:string)=><span key={x}>{x}</span>)}{(o.extras||[]).map((x:any)=><span key={x.id}>+ {x.title_snapshot} · {money(x.price_snapshot,x.currency)}</span>)}</div></Panel>
 <div className="desk-money"><p><span>Розрахунок</span><b>{money(o.calculated_price,o.currency)}</b></p><p><span>Кінцева</span><strong>{money(form.finalPrice,o.currency)}</strong></p></div>
 <button className="desk-primary wide" onClick={save} disabled={saving}><Save/>{saving?'Збереження…':'Зберегти зміни'}</button></>}</aside></div>
}
function Sales(){
 const [q,setQ]=useState(''),[r,setR]=useState<any[]>([]),[busy,setBusy]=useState(false),[open,setOpen]=useState<number|null>(null);
 const search=async()=>{setBusy(true);try{const d=await api('/api/desktop/search?q='+encodeURIComponent(q));setR(d.results||[])}finally{setBusy(false)}};
 return <><Panel title="Sales Search"><div className="desk-sales-search"><Search/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="+380…, CHD-10482, @username, номер авто"/><button onClick={search}>{busy?'Пошук…':'Знайти'}</button></div></Panel><div className="desk-search-results">{r.map(x=><button key={x.id} onClick={()=>setOpen(x.id)}><div><b>CHD-{x.id}</b><span>{x.first_name||x.username||'Client'} · {x.phone_number||'—'}</span><small>{[x.brand,x.model,x.plate].filter(Boolean).join(' · ')}</small></div><div><strong>{money(x.final_job_price??x.calculated_price,x.currency)}</strong><span className="desk-status">{x.status}</span></div></button>)}</div>{open&&<OrderDrawer id={open} close={()=>setOpen(null)} changed={search}/>}</>
}
function SimpleTable({endpoint,keyName,title,type}:{endpoint:string;keyName:string;title:string;type:string}){
 const [rows,setRows]=useState<any[]>([]);useEffect(()=>{api(endpoint).then(d=>setRows(d[keyName]||[])).catch(()=>{})},[endpoint]);
 const heads=type==='cars'?['Авто','Власник','Телефон','Номер','Останній сервіс','Візити']:type==='clients'?['Клієнт','Телефон','Tier','Авто','Візит','LTV']:type==='services'?['Послуга','Slug','Ціна','Валюта','Тривалість','Статус']:type==='staff'?['Співробітник','Username','Role','Status','Last seen']:['Час','Actor','Role','Дія','Entity','ID'];
 return <Panel title={title+' · '+rows.length}><div className="desk-table-wrap"><table><thead><tr>{heads.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((x:any,i)=><tr key={x.id||i}>{type==='cars'?<><td><b>{[x.brand,x.model].filter(Boolean).join(' ')}</b><small>{x.name}</small></td><td>{x.first_name||x.username}</td><td>{x.phone_number||'—'}</td><td>{x.plate||'—'}</td><td>{dt(x.last_service)}</td><td>{x.visits||0}</td></>:type==='clients'?<><td><b>{x.first_name||x.username}</b><small>{x.username?'@'+x.username:''}</small></td><td>{x.phone_number||'—'}</td><td>{x.client_tier||'STANDARD'}</td><td>{x.cars||0}</td><td>{dt(x.last_visit)}</td><td>{money(x.lifetime_value||0,'PLN')}</td></>:type==='services'?<><td><b>{x.title}</b></td><td>{x.slug}</td><td>{x.base_price}</td><td>{x.base_currency}</td><td>{x.duration_min} min</td><td>{x.enabled?'Enabled':'Disabled'}</td></>:type==='staff'?<><td><b>{x.first_name}</b></td><td>{x.username?'@'+x.username:'—'}</td><td>{x.role}</td><td>{x.status}</td><td>{dt(x.last_seen_at)}</td></>:<><td>{dt(x.created_at)}</td><td>{x.first_name||x.username||'System'}</td><td>{x.role||'—'}</td><td><b>{x.action}</b></td><td>{x.entity_type||'—'}</td><td>{x.entity_id||'—'}</td></>}</tr>)}</tbody></table></div></Panel>
}
function CalendarView(){
 const [orders,setOrders]=useState<any[]>([]),[view,setView]=useState('week');useEffect(()=>{api('/api/desktop/orders').then(d=>setOrders((d.orders||[]).filter((x:any)=>x.scheduled_for)))},[]);
 return <><div className="desk-toolbar"><div className="desk-segment">{['day','week','month'].map(v=><button key={v} className={view===v?'active':''} onClick={()=>setView(v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div></div><div className={'desk-calendar '+view}>{orders.map(o=><article key={o.id}><time>{dt(o.scheduled_for)}</time><b>CHD-{o.id} · {o.first_name||o.username}</b><span>{[o.brand,o.model].filter(Boolean).join(' ')}</span><small>{o.status}</small></article>)}</div></>
}
function Payments(){const [orders,setOrders]=useState<any[]>([]);useEffect(()=>{api('/api/desktop/orders').then(d=>setOrders(d.orders||[]))},[]);const unpaid=orders.filter(x=>x.payment_status!=='PAID');const paid=orders.filter(x=>x.payment_status==='PAID');return <><div className="desk-kpis"><div className="desk-kpi"><small>Paid</small><strong>{paid.length}</strong></div><div className="desk-kpi"><small>Unpaid</small><strong>{unpaid.length}</strong></div><div className="desk-kpi"><small>Paid total</small><strong>{money(paid.reduce((s,x)=>s+Number((x.final_job_price??x.calculated_price)||0),0),'PLN')}</strong></div></div><Panel title="Очікують оплату"><div className="desk-list">{unpaid.map(x=><div key={x.id}><b>CHD-{x.id}</b><span>{x.first_name||x.username}</span><strong>{money(x.final_job_price??x.calculated_price,x.currency)}</strong></div>)}</div></Panel></>}
function Broadcasts(){
 const [campaigns,setCampaigns]=useState<any[]>([]),[form,setForm]=useState<any>({type:'STANDARD',text:'',audience:{type:'all'},repeatType:'ONCE',repeatInterval:1,sendNow:true}),[msg,setMsg]=useState('');
 const load=()=>api('/api/desktop/campaigns').then(d=>setCampaigns(d.campaigns||[]));useEffect(()=>{load()},[]);
 const create=async()=>{setMsg('');try{const d=await post('/api/desktop/campaigns',form);setMsg('Створено. Одержувачів: '+d.recipients);setForm({...form,text:''});load()}catch(e:any){setMsg(e.message)}};
 const action=async(id:number,a:string)=>{await post('/api/desktop/campaigns/'+id,{action:a},'PATCH');load()};
 return <div className="desk-grid-2"><Panel title="Нова розсилка"><div className="desk-form"><label>Тип<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>STANDARD</option><option>IMPORTANT</option></select></label><label>Аудиторія<select value={form.audience.type} onChange={e=>setForm({...form,audience:{type:e.target.value}})}><option value="all">Усі клієнти</option><option value="new">Нові</option><option value="returning">Постійні</option><option value="vip">VIP</option><option value="active_order">Активне замовлення</option><option value="completed">Завершені замовлення</option></select></label><label className="full">Повідомлення<textarea value={form.text} onChange={e=>setForm({...form,text:e.target.value})}/></label><label>Повтор<select value={form.repeatType} onChange={e=>setForm({...form,repeatType:e.target.value})}><option>ONCE</option><option>DAILY</option><option>WEEKLY</option><option>MONTHLY</option><option>CUSTOM</option></select></label><label>Інтервал<input type="number" min="1" value={form.repeatInterval} onChange={e=>setForm({...form,repeatInterval:Number(e.target.value)})}/></label><label><input type="checkbox" checked={form.sendNow} onChange={e=>setForm({...form,sendNow:e.target.checked})}/> Відправити зараз</label>{!form.sendNow&&<label>Дата/час<input type="datetime-local" onChange={e=>setForm({...form,scheduleAt:e.target.value})}/></label>}<button className="desk-primary full" onClick={create}><Send/>Створити</button>{msg&&<p className="full desk-muted">{msg}</p>}</div></Panel><Panel title="Заплановані"><div className="desk-campaign-list">{campaigns.map(c=><article key={c.id}><div><b>#{c.id} · {c.type}</b><span>{c.status} · {c.recipient_count} recipients</span><small>{c.text}</small></div><div className="desk-inline-actions"><button onClick={()=>action(c.id,'pause')}><Pause/></button><button onClick={()=>action(c.id,'resume')}><Play/></button><button onClick={()=>action(c.id,'send_now')}><Send/></button></div></article>)}</div></Panel></div>
}
function Analytics(){const [d,setD]=useState<any>(null);useEffect(()=>{api('/api/desktop/dashboard').then(setD)},[]);return <><div className="desk-kpis">{Object.entries(d?.kpi||{}).map(([k,v])=><div className="desk-kpi" key={k}><small>{k}</small><strong>{String(v)}</strong></div>)}</div><Panel title="Операційна аналітика"><p className="desk-muted">Єдине джерело даних: D1 / Orders / Clients / Payments. Значення синхронні з Bot Panel та звітами.</p></Panel></>}
function Reports(){
 const types=[['business','Бізнес-звіт'],['orders','Замовлення'],['payments','Оплати'],['revenue','Дохід'],['users','Користувачі'],['vip','VIP'],['retention','Retention'],['staff','Персонал'],['reviews','Відгуки'],['suggestions','Пропозиції']];
 const [days,setDays]=useState(30),[busy,setBusy]=useState('');
 const download=async(type:string)=>{setBusy(type);try{const r=await fetch('/api/desktop/reports/'+type+'?days='+days+'&locale=uk',{headers:{authorization:'Bearer '+(localStorage.getItem('chameleon.desktop.session')||'')}});if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||'Report failed')}const blob=await r.blob(),cd=r.headers.get('content-disposition')||'',m=cd.match(/filename="?([^"]+)"?/),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=m?.[1]||type+'.xlsx';a.click();URL.revokeObjectURL(u)}finally{setBusy('')}};
 return <><div className="desk-toolbar"><span className="desk-muted">Період</span><select value={days} onChange={e=>setDays(Number(e.target.value))}><option value="7">7 днів</option><option value="30">30 днів</option><option value="90">90 днів</option><option value="365">365 днів</option><option value="0">Весь період</option></select></div><Panel title="Excel reports"><div className="desk-report-grid">{types.map(([type,label])=><button key={type} onClick={()=>download(type)} disabled={!!busy}><FileText/><div><b>{label}</b><span>.xlsx · єдині дані D1</span></div><Download className={busy===type?'spin':''}/></button>)}</div></Panel></>
}
function WorkspaceEditor({boot,onPublished}:{boot:Bootstrap;onPublished:()=>void}){
 const [data,setData]=useState<any>(null),[cfg,setCfg]=useState<any>(null),[preview,setPreview]=useState<Role>('OWNER'),[device,setDevice]=useState('desktop'),[msg,setMsg]=useState('');
 const load=()=>api('/api/desktop/workspace').then(d=>{setData(d);setCfg(JSON.parse(JSON.stringify(d.draft.config)))});useEffect(()=>{load()},[]);
 if(!cfg||!data)return <div className="desk-spinner"/>;
 const move=(idx:number,dir:number)=>{const a=[...cfg.sidebar],j=idx+dir;if(j<0||j>=a.length)return;[a[idx],a[j]]=[a[j],a[idx]];setCfg({...cfg,sidebar:a})};
 const save=async()=>{try{await post('/api/desktop/workspace/draft',{config:cfg,locked:false,unlock:true},'PUT');setMsg('Draft saved');load()}catch(e:any){setMsg(e.message)}};
 const publish=async()=>{try{const d=await post('/api/desktop/workspace/publish',{comment:'Published from Desktop Layout Editor'});setMsg('Published v'+d.version);await load();onPublished()}catch(e:any){setMsg(e.message)}};
 const lock=async(v:boolean)=>{await post('/api/desktop/workspace/lock',{locked:v});load()};
 const download=async()=>{const r=await fetch('/api/desktop/workspace/export',{headers:{authorization:'Bearer '+(localStorage.getItem('chameleon.desktop.session')||'')}});const blob=await r.blob(),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='chameleon-desktop-template.json';a.click();URL.revokeObjectURL(u)};
 const importFile=async(file?:File)=>{if(!file)return;try{const x=JSON.parse(await file.text());await post('/api/desktop/workspace/import',x);setMsg('Template imported to Draft');load()}catch(e:any){setMsg(e.message)}};
 return <><div className="desk-toolbar"><button onClick={()=>lock(!data.draft.locked)}>{data.draft.locked?<><Lock/>Unlock</>:<><Unlock/>Lock</>}</button><button onClick={save}><Save/>Save Draft</button><button className="desk-primary" onClick={publish}><Upload/>Publish</button><button onClick={download}><Download/>Export</button><label className="desk-upload"><Upload/>Import<input type="file" accept=".json,application/json" onChange={e=>importFile(e.target.files?.[0])}/></label></div>{msg&&<div className="desk-banner">{msg}</div>}
 <div className="workspace-grid"><Panel title="Sidebar Builder"><div className="workspace-list">{cfg.sidebar.map((x:any,i:number)=><div key={x.id}><span>{x.label}</span><small>{x.group}</small><div><button onClick={()=>move(i,-1)}>↑</button><button onClick={()=>move(i,1)}>↓</button></div></div>)}</div></Panel><Panel title="Preview As"><div className="desk-segment">{(['OWNER','ADMIN','MANAGER'] as Role[]).map(r=><button key={r} className={preview===r?'active':''} onClick={()=>setPreview(r)}>{r}</button>)}</div><div className="desk-segment preview-devices"><button className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')}><Monitor/>Desktop</button><button className={device==='laptop'?'active':''} onClick={()=>setDevice('laptop')}><Monitor/>Laptop</button><button className={device==='tablet'?'active':''} onClick={()=>setDevice('tablet')}><Tablet/>iPad</button></div><div className={'workspace-preview '+device}><aside>{cfg.sidebar.filter((x:any)=>!x.roles||x.roles.includes(preview)).map((x:any)=><span key={x.id}>{x.label}</span>)}</aside><main><div className="workspace-widget-grid">{cfg.widgets.filter((w:any)=>!w.roles||w.roles.includes(preview)).map((w:any)=><div style={{gridColumn:'span '+Math.min(12,Math.max(1,w.width||3)),minHeight:40*(w.height||1)}} key={w.id}>{w.title}</div>)}</div></main></div></Panel></div>
 <Panel title="Versions"><div className="desk-version-list">{(data.versions||[]).map((v:any)=><div key={v.id}><b>v{v.version_number}{v.is_active?' · ACTIVE':''}</b><span>{dt(v.created_at)} · {v.comment||''}</span>{!v.is_active&&<button onClick={async()=>{await post('/api/desktop/workspace/revert',{version:v.version_number});load();onPublished()}}><RotateCcw/>Revert</button>}</div>)}</div></Panel></>
}
function DesktopSettings({boot,reload}:{boot:Bootstrap;reload:()=>void}){
 const [sessions,setSessions]=useState<any[]>([]),[permissions,setPermissions]=useState<any[]>([]),[msg,setMsg]=useState('');
 const load=()=>Promise.all([api('/api/desktop/sessions').then(d=>setSessions(d.sessions||[])),boot.user.role==='OWNER'?api('/api/desktop/permissions').then(d=>setPermissions(d.permissions||[])):Promise.resolve()]).catch(()=>{});
 useEffect(()=>{load()},[]);
 const setMode=async(mode:string)=>{try{await post('/api/desktop/system/mode',{mode},'PATCH');setMsg('Mode: '+mode);reload()}catch(e:any){setMsg(e.message)}};
 const toggle=async(x:any)=>{await post('/api/desktop/permissions',{role:x.role,key:x.permission_key,enabled:!x.enabled},'PUT');load()};
 return <div className="desk-grid-2"><Panel title="Desktop Control Center"><div className="desk-mode-buttons">{['ONLINE','READ_ONLY','MAINTENANCE','DISABLED'].map(x=><button className={boot.mode===x?'active':''} onClick={()=>setMode(x)} key={x}>{x}</button>)}</div>{msg&&<p className="desk-muted">{msg}</p>}<p className="desk-muted">Bot Panel і Client Mini App продовжують працювати незалежно від цього режиму.</p></Panel><Panel title="Active Sessions"><div className="desk-session-list">{sessions.map(s=><div key={s.id}><div><b>{s.first_name} · {s.role}</b><span>{s.device_label} · {dt(s.last_seen_at)}</span></div><button onClick={async()=>{await api('/api/desktop/sessions/'+s.id,{method:'DELETE'});load()}}>Revoke</button></div>)}</div></Panel>{boot.user.role==='OWNER'&&<Panel title="Role Permissions"><div className="desk-permission-list">{permissions.map(p=><button key={p.role+p.permission_key} onClick={()=>toggle(p)}><span>{p.role} · {p.permission_key}</span><b>{Number(p.enabled)===1?'✅':'❌'}</b></button>)}</div></Panel>}</div>
}
