import React,{useEffect,useMemo,useRef,useState} from 'react';
import {
 Home,ClipboardList,Search,Car,Users,CalendarDays,Wrench,CreditCard,Megaphone,
 BarChart3,FileText,BadgeCheck,Settings,History,LayoutDashboard,LogOut,RefreshCw,
 ChevronRight,Lock,Unlock,Save,Upload,Download,RotateCcw,Send,Pause,Play,Eye,EyeOff,
 Monitor,Tablet,X,Check,AlertTriangle,Sun,Moon,ChevronDown,Globe2,Plus,Trash2,Pencil,Image as ImageIcon,Link2
} from 'lucide-react';
import './desktop.css';
import {desktopLocales,desktopLocaleLabels,desktopLocaleNames,desktopT,normalizeDesktopLocale,type DesktopLocale} from './desktopLocales';

type Role='OWNER'|'ADMIN'|'MANAGER';
type Bootstrap={user:{id:number;telegramId:number;firstName:string;username?:string;role:Role};permissions:Record<string,boolean>;mode:string;workspace:{version:number;config:any};personal:any;kanbanLabels?:Record<string,string>};
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
 const [boot,setBoot]=useState<Bootstrap|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[page,setPage]=useState<Page>('orders');
 const [theme,setTheme]=useState<'dark'|'light'>(()=>localStorage.getItem('chameleon.desktop.theme')==='dark'?'dark':'light');
 const [locale,setLocale]=useState<DesktopLocale>(()=>normalizeDesktopLocale(localStorage.getItem('chameleon.desktop.locale')||navigator.language));
 const [langOpen,setLangOpen]=useState(false);
 const langRef=useRef<HTMLDivElement|null>(null);
 const t=(key:string)=>desktopT(locale,key);
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
   const storedTheme=b.personal?.theme==='dark'?'dark':b.personal?.theme==='light'?'light':localStorage.getItem('chameleon.desktop.theme')==='dark'?'dark':'light';setTheme(storedTheme);
   const storedLocale=normalizeDesktopLocale(b.personal?.locale||localStorage.getItem('chameleon.desktop.locale')||navigator.language);setLocale(storedLocale);
   const hash=location.hash.replace(/^#/,'') as Page;if(hash&&labels[hash])setPage(hash);else setPage('orders');
  }catch(e:any){setError(String(e?.message||e));setBoot(null)}
  finally{setLoading(false)}
 };
 useEffect(()=>{if(!phoneBlocked)load();else setLoading(false)},[phoneBlocked]);
 useEffect(()=>{location.hash=page==='dashboard'?'':page},[page]);
 useEffect(()=>{document.documentElement.dataset.desktopTheme=theme;localStorage.setItem('chameleon.desktop.theme',theme)},[theme]);
 useEffect(()=>{document.documentElement.lang=locale;localStorage.setItem('chameleon.desktop.locale',locale)},[locale]);
 useEffect(()=>{const onPointer=(e:PointerEvent)=>{if(langRef.current&&!langRef.current.contains(e.target as Node))setLangOpen(false)};document.addEventListener('pointerdown',onPointer);return()=>document.removeEventListener('pointerdown',onPointer)},[]);
 if(phoneBlocked)return <div className="desk-state"><AlertTriangle/><h1>{t('blocked.title')}</h1><p>{t('blocked.phone')}</p><p className="desk-muted">{t('blocked.device')}</p></div>;
 if(loading)return <div className="desk-state"><div className="desk-spinner"/><h1>Chameleon Control Center</h1><p>{t('loading')}</p></div>;
 if(!boot)return <div className="desk-state"><AlertTriangle/><h1>{t('blocked.title')}</h1><p>{error||t('session.error')}</p><p className="desk-muted">{t('session.hint')}</p></div>;
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
 const sidebar=(boot.workspace?.config?.sidebar||[]).filter((x:any)=>x&&!x.hidden&&labels[x.id as Page]&&allowed(x.id)&&(!x.roles||x.roles.includes(boot.user.role)));
 const savePersonal=async(next:any)=>{const personal={...(boot.personal||{}),...next};setBoot({...boot,personal});try{await post('/api/desktop/personal-workspace',personal,'PUT')}catch{}};
 const toggleTheme=async()=>{const next=theme==='dark'?'light':'dark';setTheme(next);await savePersonal({theme:next,locale})};
 const changeLocale=async(next:DesktopLocale)=>{setLocale(next);setLangOpen(false);await savePersonal({locale:next,theme})};
 const localeFlags:Record<DesktopLocale,string>={uk:'🇺🇦',pl:'🇵🇱',en:'🇬🇧',de:'🇩🇪',fr:'🇫🇷'};
 return <div className={'desktop-shell theme-'+theme} data-theme={theme}>
  <main className="desktop-main">
   <header className="desk-topbar"><div className="desk-top-brand"><img src="/brand/chameleon-logo.webp" alt=""/><div><small>CHAMELEON DETAILING</small><h1>{t('page.'+page)}</h1></div></div><div className="desk-top-actions"><div className={'desk-language-picker '+(langOpen?'open':'')} ref={langRef}><button className="desk-language-trigger" type="button" onClick={()=>setLangOpen(v=>!v)} title={t('common.language')} aria-haspopup="listbox" aria-expanded={langOpen}><Globe2/><span className="desk-language-flag">{localeFlags[locale]}</span><span className="desk-language-current"><b>{desktopLocaleLabels[locale]}</b><small>{desktopLocaleNames[locale]}</small></span><ChevronDown className="desk-language-chevron"/></button>{langOpen&&<div className="desk-language-menu" role="listbox" aria-label={t('common.language')}>{desktopLocales.map(l=><button type="button" role="option" aria-selected={l===locale} className={l===locale?'active':''} key={l} onClick={()=>changeLocale(l)}><span className="desk-language-flag">{localeFlags[l]}</span><span><b>{desktopLocaleNames[l]}</b><small>{desktopLocaleLabels[l]}</small></span>{l===locale&&<Check/>}</button>)}</div>}</div><button className="desk-theme-toggle" onClick={toggleTheme} title={theme==='dark'?t('theme.light'):t('theme.dark')}>{theme==='dark'?<Sun/>:<Moon/>}<span>{theme==='dark'?t('theme.light'):t('theme.dark')}</span></button><div className="desk-mode"><i className={'mode-'+boot.mode.toLowerCase().replace('_','-')}/><span>{boot.mode.replace('_',' ')}</span></div><div className="desk-user-top"><div className="desk-avatar">{(boot.user.firstName||'C')[0]}</div><div><b>{boot.user.firstName}</b><span>{boot.user.role}</span></div><button onClick={logout} title={t('logout')}><LogOut/></button></div></div></header>
   {boot.mode==='READ_ONLY'&&<div className="desk-banner warning">{t('readonly')}</div>}
   <div className="desktop-content">
    {page==='dashboard'&&<Dashboard boot={boot} goto={setPage} locale={locale}/>}
    {page==='orders'&&<Orders locale={locale} role={boot.user.role} kanbanLabels={boot.kanbanLabels||{}} reloadBoot={load}/>}
    {page==='sales'&&<Sales/>}
    {page==='cars'&&<SimpleTable endpoint="/api/desktop/cars" keyName="cars" title={t('page.cars')+' CRM'} type="cars"/>}
    {page==='clients'&&<SimpleTable endpoint="/api/desktop/clients" keyName="clients" title={t('page.clients')+' CRM'} type="clients"/>}
    {page==='calendar'&&<CalendarView/>}
    {page==='services'&&<ServicesCatalog locale={locale} role={boot.user.role}/>}
    {page==='payments'&&<Payments/>}
    {page==='broadcasts'&&<Broadcasts/>}
    {page==='analytics'&&<Analytics/>}
    {page==='reports'&&<Reports/>}
    {page==='staff'&&<SimpleTable endpoint="/api/desktop/staff" keyName="staff" title={t('page.staff')} type="staff"/>}
    {page==='audit'&&<SimpleTable endpoint="/api/desktop/audit" keyName="events" title={t('page.audit')} type="audit"/>}
    {page==='workspace'&&<WorkspaceEditor boot={boot} onPublished={load}/>}
    {page==='settings'&&<DesktopSettings boot={boot} reload={load}/>}
   </div>
   <nav className="desktop-bottom-nav" aria-label="Desktop navigation"><div className="desktop-bottom-scroll">{sidebar.map((x:any)=>{const id=x.id as Page,I=icons[id]||ChevronRight;return <button key={id} className={page===id?'active':''} onClick={()=>setPage(id)} title={(x.group||'')+' · '+(x.label||labels[id])}><I/><span>{t('page.'+id)}</span><small>{x.group||''}</small></button>})}</div></nav>
  </main>
 </div>
}

function Panel({title,children,action}:{title:string;children:any;action?:any}){return <section className="desk-panel"><div className="desk-panel-head"><h2>{title}</h2>{action}</div>{children}</section>}
function Dashboard({boot,goto,locale}:{boot:Bootstrap;goto:(p:Page)=>void;locale:DesktopLocale}){
 const t=(key:string)=>desktopT(locale,key);
 const [data,setData]=useState<any>(null);useEffect(()=>{api('/api/desktop/dashboard').then(setData).catch(()=>{})},[]);
 const k=data?.kpi||{};const cards=[[t('dashboard.new'),k.newOrders||0],[t('dashboard.confirmed'),k.confirmed||0],[t('dashboard.work'),k.inWork||0],[t('dashboard.ready'),k.ready||0],[t('dashboard.unpaid'),k.unpaid||0],[t('dashboard.revenue'),money(k.revenue||0,data?.currency||'PLN')]];
 return <><div className="desk-kpis">{cards.map(([a,b])=><div className="desk-kpi" key={String(a)}><small>{a}</small><strong>{b}</strong></div>)}</div>
 <div className="desk-grid-2"><Panel title={t('dashboard.quick')}><div className="desk-quick">{[['orders',t('quick.order')],['sales',t('quick.search')],['cars',t('quick.cars')],['calendar',t('quick.schedule')],['broadcasts',t('quick.broadcasts')],['reports',t('quick.reports')]].filter(([id])=>id!=='sales'||boot.permissions.sales_access).filter(([id])=>id!=='broadcasts'||boot.permissions.broadcast_access).filter(([id])=>id!=='reports'||boot.permissions.reports_access).map(([id,label])=><button key={id} onClick={()=>goto(id as Page)}>{label}<ChevronRight/></button>)}</div></Panel>
 <Panel title={t('dashboard.system')}><div className="desk-system"><p><span>Desktop</span><b>{boot.mode}</b></p><p><span>{t('system.role')}</span><b>{boot.user.role}</b></p><p><span>Workspace</span><b>v{boot.workspace.version}</b></p></div></Panel></div></>
}

function Orders({locale,role,kanbanLabels,reloadBoot}:{locale:DesktopLocale;role:Role;kanbanLabels:Record<string,string>;reloadBoot:()=>void}){
 const t=(key:string)=>desktopT(locale,key);
 const [orders,setOrders]=useState<any[]>([]),[q,setQ]=useState(''),[status,setStatus]=useState(''),[view,setView]=useState<'table'|'kanban'>('kanban'),[selected,setSelected]=useState<any>(null),[busy,setBusy]=useState(false);
 const [labels,setLabels]=useState<Record<string,string>>(kanbanLabels||{});
 useEffect(()=>setLabels(kanbanLabels||{}),[JSON.stringify(kanbanLabels)]);
 const load=async()=>{setBusy(true);try{const d=await api('/api/desktop/orders?q='+encodeURIComponent(q)+'&status='+encodeURIComponent(status));setOrders(d.orders||[])}finally{setBusy(false)}};
 useEffect(()=>{load()},[]);
 const statuses=['','REQUESTED','CONFIRMED','IN_PROGRESS','READY','COMPLETED','CANCELLED'];
 const saveLabels=async(next:Record<string,string>)=>{setLabels(next);await post('/api/desktop/kanban-labels',{labels:next},'PATCH');reloadBoot()};
 return <><div className="desk-toolbar"><div className="desk-search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} placeholder={t('orders.search')}/></div><select value={status} onChange={e=>setStatus(e.target.value)}>{statuses.map(s=><option value={s} key={s}>{s||t('common.all')}</option>)}</select><button onClick={load}><RefreshCw className={busy?'spin':''}/>{t('common.refresh')}</button><div className="desk-segment"><button className={view==='table'?'active':''} onClick={()=>setView('table')}>Table</button><button className={view==='kanban'?'active':''} onClick={()=>setView('kanban')}>Kanban</button></div></div>
 {view==='table'?<Panel title={t('orders.title')+' · '+orders.length}><div className="desk-table-wrap"><table><thead><tr><th>№</th><th>{t('orders.client')}</th><th>{t('orders.phone')}</th><th>{t('orders.car')}</th><th>{t('orders.date')}</th><th>{t('orders.status')}</th><th>{t('orders.price')}</th><th>{t('orders.payment')}</th></tr></thead><tbody>{orders.map(o=><tr key={o.id} onClick={()=>setSelected(o)}><td><b>CHD-{o.id}</b></td><td>{o.first_name||o.username||'—'}</td><td>{o.phone_number||'—'}</td><td>{[o.brand,o.model,o.plate].filter(Boolean).join(' · ')||'—'}</td><td>{dt(o.scheduled_for||o.created_at)}</td><td><span className="desk-status">{o.status}</span></td><td>{money(o.final_job_price??o.calculated_price,o.currency)}</td><td>{o.payment_status}</td></tr>)}</tbody></table></div></Panel>:<Kanban orders={orders} select={setSelected} changed={load} labels={labels} canRename={role==='OWNER'||role==='ADMIN'} saveLabels={saveLabels}/>}
 {selected&&<OrderDrawer id={selected.id} close={()=>setSelected(null)} changed={load}/>}</>
}
function Kanban({orders,select,changed,labels,canRename,saveLabels}:{orders:any[];select:(o:any)=>void;changed:()=>void;labels:Record<string,string>;canRename:boolean;saveLabels:(x:Record<string,string>)=>Promise<void>}){
 const defaults:Record<string,string>={REQUESTED:'Нова',PENDING_CONFIRMATION:'Очікує підтвердження',CONFIRMED:'Підтверджена',IN_PROGRESS:'У роботі',READY:'Готово',COMPLETED:'Завершено'};
 const cols=Object.keys(defaults),[drag,setDrag]=useState<number|null>(null),[over,setOver]=useState(''),[editing,setEditing]=useState(''),[draft,setDraft]=useState('');
 const move=async(status:string)=>{if(!drag)return;try{await post('/api/desktop/orders/'+drag,{status},'PATCH');changed()}finally{setDrag(null);setOver('')}};
 const commitLabel=async(status:string)=>{const value=draft.trim();const next={...labels};if(value&&value!==defaults[status])next[status]=value;else delete next[status];setEditing('');await saveLabels(next)};
 return <div className="desk-kanban">{cols.map(s=><div className={'desk-kanban-col '+(over===s?'drop-active':'')} key={s} onDragOver={e=>{e.preventDefault();setOver(s)}} onDragLeave={()=>setOver(x=>x===s?'':x)} onDrop={e=>{e.preventDefault();move(s)}}><h3>{editing===s?<span className="kanban-title-edit"><input autoFocus value={draft} maxLength={40} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')commitLabel(s);if(e.key==='Escape')setEditing('')}}/><button onClick={()=>commitLabel(s)}><Check/></button></span>:<span className="kanban-title-text">{labels[s]||defaults[s]}{canRename&&<button title="Перейменувати колонку" onClick={()=>{setEditing(s);setDraft(labels[s]||defaults[s])}}><Pencil/></button>}</span>}<span>{orders.filter(o=>o.status===s).length}</span></h3>{orders.filter(o=>o.status===s).map(o=><button draggable className={'desk-kanban-card '+(drag===o.id?'dragging':'')} key={o.id} onDragStart={()=>setDrag(o.id)} onDragEnd={()=>{setDrag(null);setOver('')}} onClick={()=>select(o)}><b>CHD-{o.id}</b><span>{o.first_name||o.username||'Client'}</span><small>{[o.brand,o.model].filter(Boolean).join(' ')}</small><strong>{money(o.final_job_price??o.calculated_price,o.currency)}</strong></button>)}</div>)}</div>
}
function OrderDrawer({id,close,changed}:{id:number;close:()=>void;changed:()=>void}){
 const [o,setO]=useState<any>(null),[saving,setSaving]=useState(false),[form,setForm]=useState<any>({}),[catalog,setCatalog]=useState<any>({services:[],options:[],extras:[]}),[pickType,setPickType]=useState<'service'|'option'>('service'),[pickId,setPickId]=useState(''),[serviceBusy,setServiceBusy]=useState(false);
 const parseList=(v:any)=>{try{const x=typeof v==='string'?JSON.parse(v):v;return Array.isArray(x)?x.map(String):[]}catch{return []}};
 const load=async()=>{const [d,cat]=await Promise.all([api('/api/desktop/orders/'+id),api('/api/desktop/orders/'+id+'/catalog')]);setO(d.order);setCatalog(cat);setForm({status:d.order?.status,paymentStatus:d.order?.payment_status,scheduledFor:d.order?.scheduled_for||'',finalPrice:d.order?.final_job_price??d.order?.calculated_price,staffNote:d.order?.staff_note||'',accelerated:!!d.order?.accelerated,acceleratedSurcharge:d.order?.accelerated_surcharge||0,services:parseList(d.order?.services_json),options:parseList(d.order?.options_json)})};
 useEffect(()=>{load()},[id]);
 const save=async()=>{setSaving(true);try{await Promise.all([post('/api/desktop/orders/'+id,form,'PATCH'),post('/api/desktop/orders/'+id+'/catalog-selection',{services:form.services||[],options:form.options||[]},'PATCH')]);await load();changed()}finally{setSaving(false)}};
 const addCatalog=async()=>{if(!pickId)return;setServiceBusy(true);try{await post('/api/desktop/orders/'+id+'/services',{catalogType:pickType,serviceId:Number(pickId)});setPickId('');await load();changed()}finally{setServiceBusy(false)}};
 const removeExtra=async(eid:number)=>{setServiceBusy(true);try{await api('/api/desktop/orders/'+id+'/services/'+eid,{method:'DELETE'});await load();changed()}finally{setServiceBusy(false)}};
 const toggleBase=(kind:'services'|'options',slug:string)=>{const list=[...(form[kind]||[])];setForm({...form,[kind]:list.includes(slug)?list.filter((x:string)=>x!==slug):[...list,slug]})};
 return <div className="desk-drawer-backdrop" onMouseDown={e=>e.target===e.currentTarget&&close()}><aside className="desk-drawer order-edit-drawer"><button className="desk-drawer-close" onClick={close}><X/></button>{!o?<div className="desk-spinner"/>:<><span className="desk-eyebrow">ORDER · CHD-{o.id}</span><h2>{o.first_name||o.username||'Client'}</h2><p className="desk-muted">{o.phone_number||'—'} · @{o.username||'—'}</p>
 <div className="desk-order-car"><Car/><div><b>{[o.brand,o.model,o.modification].filter(Boolean).join(' ')||o.car_name||'Авто'}</b><span>{o.plate||'—'} · {o.body_type||'—'}{o.has_ceramic?' · Ceramic':''}</span></div></div>
 <div className="desk-form-grid"><label>Статус<select value={form.status||''} onChange={e=>setForm({...form,status:e.target.value})}>{['REQUESTED','PENDING_CONFIRMATION','CONFIRMED','CAR_ACCEPTED','IN_PROGRESS','INSPECTION','READY','COMPLETED','CANCELLED'].map(x=><option key={x}>{x}</option>)}</select></label><label>Оплата<select value={form.paymentStatus||''} onChange={e=>setForm({...form,paymentStatus:e.target.value})}>{['PENDING','UNPAID','PAID','REFUNDED'].map(x=><option key={x}>{x}</option>)}</select></label><label>Дата/час<input type="datetime-local" value={String(form.scheduledFor||'').slice(0,16)} onChange={e=>setForm({...form,scheduledFor:e.target.value})}/></label><label>Кінцева сума<input type="number" value={form.finalPrice||0} onChange={e=>setForm({...form,finalPrice:Number(e.target.value)})}/></label></div>
 <label className="desk-field">Внутрішня примітка<textarea value={form.staffNote||''} onChange={e=>setForm({...form,staffNote:e.target.value})}/></label>
 <div className="desk-accelerated"><label><input type="checkbox" checked={!!form.accelerated} onChange={e=>setForm({...form,accelerated:e.target.checked})}/><span>⚡ Прискорена робота</span></label><input type="number" value={form.acceleratedSurcharge||0} onChange={e=>setForm({...form,acceleratedSurcharge:Number(e.target.value)})} placeholder="+ PLN"/></div>
 <Panel title="Послуги замовлення" action={<span className="order-service-count">{(form.services||[]).length+(form.options||[]).length+(o.extras||[]).length}</span>}><div className="order-service-editor"><div className="order-service-columns"><div><b>Основні</b>{(catalog.services||[]).map((x:any)=><label key={x.id} className={(form.services||[]).includes(x.slug)?'selected':''}><input type="checkbox" checked={(form.services||[]).includes(x.slug)} onChange={()=>toggleBase('services',x.slug)}/><span>{x.title}</span><small>{money(x.price,x.currency)}</small></label>)}</div><div><b>Опції</b>{(catalog.options||[]).map((x:any)=><label key={x.id} className={(form.options||[]).includes(x.slug)?'selected':''}><input type="checkbox" checked={(form.options||[]).includes(x.slug)} onChange={()=>toggleBase('options',x.slug)}/><span>{x.title}</span><small>{money(x.price,x.currency)}</small></label>)}</div></div>
 <div className="order-add-service"><select value={pickType} onChange={e=>{setPickType(e.target.value as any);setPickId('')}}><option value="service">Послуга</option><option value="option">Додаткова опція</option></select><select value={pickId} onChange={e=>setPickId(e.target.value)}><option value="">Оберіть…</option>{(pickType==='service'?catalog.services:catalog.options).map((x:any)=><option key={x.id} value={x.id}>{x.title} · {money(x.price,x.currency)}</option>)}</select><button onClick={addCatalog} disabled={!pickId||serviceBusy}><Plus/>Додати до чеку</button></div>
 {(o.extras||[]).length>0&&<div className="order-extra-list"><b>Додані вручну</b>{(o.extras||[]).map((x:any)=><div key={x.id}><span>+ {x.title_snapshot||x.service_slug}</span><strong>{money(x.price_snapshot,x.currency)}</strong><button onClick={()=>removeExtra(x.id)} disabled={serviceBusy}><Trash2/></button></div>)}</div>}</div></Panel>
 <p className="order-service-note">Клієнту показується лише оновлений склад/статус замовлення. Канал, з якого Staff зробив зміну, у клієнтських повідомленнях не вказується.</p>
 <div className="desk-money"><p><span>Розрахунок</span><b>{money(o.calculated_price,o.currency)}</b></p><p><span>Кінцева</span><strong>{money(form.finalPrice,o.currency)}</strong></p></div>
 <button className="desk-primary wide" onClick={save} disabled={saving}><Save/>{saving?'Збереження…':'Зберегти зміни'}</button></>}</aside></div>
}

function Sales(){
 const [q,setQ]=useState(''),[r,setR]=useState<any[]>([]),[busy,setBusy]=useState(false),[open,setOpen]=useState<number|null>(null);
 const search=async()=>{setBusy(true);try{const d=await api('/api/desktop/search?q='+encodeURIComponent(q));setR(d.results||[])}finally{setBusy(false)}};
 return <><Panel title="Sales Search"><div className="desk-sales-search"><Search/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="+380…, CHD-10482, @username, номер авто"/><button onClick={search}>{busy?'Пошук…':'Знайти'}</button></div></Panel><div className="desk-search-results">{r.map(x=><button key={x.id} onClick={()=>setOpen(x.id)}><div><b>CHD-{x.id}</b><span>{x.first_name||x.username||'Client'} · {x.phone_number||'—'}</span><small>{[x.brand,x.model,x.plate].filter(Boolean).join(' · ')}</small></div><div><strong>{money(x.final_job_price??x.calculated_price,x.currency)}</strong><span className="desk-status">{x.status}</span></div></button>)}</div>{open&&<OrderDrawer id={open} close={()=>setOpen(null)} changed={search}/>}</>
}
function ServicesCatalog({locale,role}:{locale:DesktopLocale;role:Role}){
 const t=(key:string)=>desktopT(locale,key);
 const canEdit=role==='OWNER'||role==='ADMIN';
 const [data,setData]=useState<{services:any[];options:any[];total:number}>({services:[],options:[],total:0}),[q,setQ]=useState(''),[edit,setEdit]=useState<any>(null),[saving,setSaving]=useState(false),[msg,setMsg]=useState('');
 const load=()=>api('/api/desktop/services').then(d=>setData({services:d.services||[],options:d.options||[],total:Number(d.total||0)})).catch(()=>{});
 useEffect(()=>{load()},[]);
 const term=q.trim().toLowerCase(),main=data.services.filter(x=>!term||String(x.title+' '+x.slug+' '+x.category).toLowerCase().includes(term)),extras=data.options.filter(x=>!term||String(x.title+' '+x.slug+' '+x.service_slugs).toLowerCase().includes(term));
 const openService=(x:any)=>canEdit&&setEdit({kind:'service',id:x.id,title:x.title,slug:x.slug,price:Number(x.base_price||0),currency:x.base_currency||'PLN',enabled:!!x.enabled,durationMin:Number(x.duration_min||0)});
 const openOption=(x:any)=>canEdit&&setEdit({kind:'option',id:x.id,title:x.title,slug:x.slug,price:Number(x.price||0),currency:x.base_currency||'PLN',enabled:!!x.enabled});
 const save=async()=>{if(!edit)return;setSaving(true);setMsg('');try{const path=edit.kind==='service'?'/api/desktop/services/'+edit.id:'/api/desktop/service-options/'+edit.id;await post(path,{price:Number(edit.price||0),currency:edit.currency,enabled:!!edit.enabled,...(edit.kind==='service'?{durationMin:Number(edit.durationMin||0)}:{})},'PATCH');setMsg('Збережено');setEdit(null);await load()}catch(e:any){setMsg(String(e?.message||e))}finally{setSaving(false)}};
 return <><div className="desk-toolbar"><div className="desk-search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('services.search')}/></div><button onClick={load}><RefreshCw/>{t('common.refresh')}</button><span className="desk-catalog-count">{t('services.total')}: <b>{data.total}</b></span></div>
 <div className="service-catalog-summary"><div><Wrench/><span>{t('services.main')}</span><b>{data.services.length}</b></div><div><Check/><span>{t('services.options')}</span><b>{data.options.length}</b></div><p>{canEdit?'Owner/Admin: натисніть на рядок, щоб змінити ціну, валюту, статус і тривалість.':t('services.sync')}</p></div>
 {msg&&<div className="desk-banner">{msg}</div>}
 <Panel title={t('services.main')+' · '+main.length}><div className="desk-table-wrap"><table><thead><tr><th>{t('page.services')}</th><th>{t('services.category')}</th><th>{t('orders.price')}</th><th>{t('services.currency')}</th><th>{t('services.duration')}</th><th>{t('services.state')}</th></tr></thead><tbody>{main.map(x=><tr key={x.id} className={canEdit?'editable-row':''} onClick={()=>openService(x)}><td><b>{x.title}</b><small>{x.slug}</small></td><td>{x.category||'—'}</td><td><b>{Number(x.base_price||0).toFixed(2)}</b></td><td>{x.base_currency||'PLN'}</td><td>{x.duration_min||0} min</td><td><span className="desk-status">{x.archived?'ARCHIVED':x.enabled?'ENABLED':'DISABLED'}</span></td></tr>)}</tbody></table></div></Panel>
 <Panel title={t('services.options')+' · '+extras.length}><div className="desk-table-wrap"><table><thead><tr><th>{t('services.options')}</th><th>{t('services.for')}</th><th>{t('orders.price')}</th><th>{t('services.currency')}</th><th>{t('services.pricing')}</th><th>{t('services.state')}</th></tr></thead><tbody>{extras.map(x=><tr key={x.id} className={canEdit?'editable-row':''} onClick={()=>openOption(x)}><td><b>{x.title}</b><small>{x.slug}</small></td><td>{String(x.service_slugs||'').split(',').filter(Boolean).join(', ')||t('services.unbound')}</td><td><b>{Number(x.price||0).toFixed(2)}</b></td><td>{x.base_currency||'PLN'}</td><td>{x.pricing_type||'FIXED'}</td><td><span className="desk-status">{x.enabled?'ENABLED':'DISABLED'}</span></td></tr>)}</tbody></table></div></Panel>
 {edit&&<div className="desk-drawer-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setEdit(null)}><aside className="desk-drawer service-edit-drawer"><button className="desk-drawer-close" onClick={()=>setEdit(null)}><X/></button><span className="desk-eyebrow">{edit.kind==='service'?'SERVICE':'ADD-ON'} · {edit.slug}</span><h2>{edit.title}</h2><div className="desk-form-grid"><label>Ціна<input type="number" min="0" step="0.01" value={edit.price} onChange={e=>setEdit({...edit,price:e.target.value})}/></label><label>Валюта<select value={edit.currency} onChange={e=>setEdit({...edit,currency:e.target.value})}><option>PLN</option><option>UAH</option><option>USD</option></select></label>{edit.kind==='service'&&<label>Тривалість, хв<input type="number" min="0" value={edit.durationMin} onChange={e=>setEdit({...edit,durationMin:e.target.value})}/></label>}<label className="service-enabled-toggle"><span>Активна</span><input type="checkbox" checked={!!edit.enabled} onChange={e=>setEdit({...edit,enabled:e.target.checked})}/></label></div><button className="desk-primary wide" disabled={saving} onClick={save}><Save/>{saving?'Збереження…':'Зберегти зміни'}</button></aside></div>}</>
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
function Payments(){
 const [currency,setCurrency]=useState('PLN'),[data,setData]=useState<any>({rows:[],summary:{}}),[busy,setBusy]=useState(false);
 const load=async(next=currency)=>{setBusy(true);try{const d=await api('/api/desktop/payments?currency='+encodeURIComponent(next));setData(d)}finally{setBusy(false)}};
 useEffect(()=>{load(currency)},[currency]);
 const rows=data.rows||[],unpaid=rows.filter((x:any)=>x.payment_status!=='PAID');
 return <><div className="payments-head"><div><span className="desk-eyebrow">FINANCE VIEW</span><h2>Оплати</h2><p>Суми перераховуються у вибрану валюту для зручного перегляду. Оригінальна валюта замовлення не змінюється.</p></div><div className="payments-currency"><span>Показувати в</span><div className="currency-switch">{['PLN','USD','UAH'].map(x=><button key={x} className={currency===x?'active':''} onClick={()=>setCurrency(x)}>{x}</button>)}</div></div></div>
 <div className="desk-kpis payments-kpis"><div className="desk-kpi"><small>Оплачено</small><strong>{data.summary?.paid||0}</strong></div><div className="desk-kpi"><small>Не оплачено</small><strong>{data.summary?.unpaid||0}</strong></div><div className="desk-kpi"><small>Оплачено · {currency}</small><strong>{money(data.summary?.paidTotal||0,currency)}</strong></div><div className="desk-kpi"><small>Очікується · {currency}</small><strong>{money(data.summary?.unpaidTotal||0,currency)}</strong></div></div>
 <Panel title={'Очікують оплату · '+unpaid.length} action={<button className="panel-icon-btn" onClick={()=>load()}><RefreshCw className={busy?'spin':''}/></button>}><div className="desk-table-wrap"><table><thead><tr><th>Замовлення</th><th>Клієнт</th><th>Авто</th><th>Оригінал</th><th>Показано</th><th>Статус</th></tr></thead><tbody>{unpaid.map((x:any)=><tr key={x.id}><td><b>CHD-{x.id}</b><small>{dt(x.created_at)}</small></td><td>{x.first_name||x.username||'—'}</td><td>{[x.brand,x.model,x.plate].filter(Boolean).join(' · ')||'—'}</td><td>{money(x.original_amount,x.original_currency)}</td><td><b>{money(x.display_amount,currency)}</b></td><td><span className="desk-status">{x.payment_status}</span></td></tr>)}</tbody></table></div></Panel></>
}
function Broadcasts(){
 const [campaigns,setCampaigns]=useState<any[]>([]),[form,setForm]=useState<any>({type:'STANDARD',text:'',audience:{type:'all'},repeatType:'ONCE',repeatInterval:1,sendNow:true}),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 const load=()=>api('/api/desktop/campaigns').then(d=>setCampaigns(d.campaigns||[]));useEffect(()=>{load()},[]);
 const create=async()=>{setMsg('');setBusy(true);try{const d=await post('/api/desktop/campaigns',form);setMsg('Кампанію створено · '+d.recipients+' одержувачів');setForm({...form,text:''});await load()}catch(e:any){setMsg(e.message)}finally{setBusy(false)}};
 const action=async(id:number,a:string)=>{await post('/api/desktop/campaigns/'+id,{action:a},'PATCH');load()};
 const totalSent=campaigns.reduce((s,c)=>s+Number(c.sent_count||0),0),totalFailed=campaigns.reduce((s,c)=>s+Number(c.failed_count||0),0),active=campaigns.filter(c=>['ACTIVE','SCHEDULED'].includes(c.status)).length;
 return <><div className="broadcast-hero"><div><span className="desk-eyebrow">CLIENT COMMUNICATIONS</span><h2>Розсилки</h2><p>Єдина черга для Bot Panel і Desktop. Відправлення йдуть порціями та продовжуються через cron без зависання Worker.</p></div><div className="broadcast-stats"><div><b>{active}</b><span>активні</span></div><div><b>{totalSent}</b><span>надіслано</span></div><div><b>{totalFailed}</b><span>помилки</span></div></div></div>
 <div className="broadcast-layout"><section className="broadcast-composer"><div className="broadcast-card-head"><div><Megaphone/><span><b>Нова кампанія</b><small>Створити повідомлення клієнтам</small></span></div><span className={'broadcast-type '+String(form.type).toLowerCase()}>{form.type}</span></div>
 <div className="broadcast-form-grid"><label><span>Тип кампанії</span><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="STANDARD">Standard</option><option value="IMPORTANT">Important</option></select></label><label><span>Аудиторія</span><select value={form.audience.type} onChange={e=>setForm({...form,audience:{type:e.target.value}})}><option value="all">Усі клієнти</option><option value="new">Нові клієнти</option><option value="returning">Постійні клієнти</option><option value="vip">VIP</option><option value="active_order">Активне замовлення</option><option value="completed">Завершені замовлення</option></select></label></div>
 <label className="broadcast-message"><span>Повідомлення</span><textarea value={form.text} maxLength={3900} onChange={e=>setForm({...form,text:e.target.value})} placeholder="Напишіть повідомлення для клієнтів…"/><small>{form.text.length} / 3900</small></label>
 <div className="broadcast-schedule"><div className="broadcast-send-mode"><button className={form.sendNow?'active':''} onClick={()=>setForm({...form,sendNow:true})}><Send/>Зараз</button><button className={!form.sendNow?'active':''} onClick={()=>setForm({...form,sendNow:false})}><CalendarDays/>Запланувати</button></div>{!form.sendNow&&<input type="datetime-local" value={form.scheduleAt||''} onChange={e=>setForm({...form,scheduleAt:e.target.value})}/>}</div>
 <details className="broadcast-repeat"><summary>Повторення кампанії</summary><div><label><span>Період</span><select value={form.repeatType} onChange={e=>setForm({...form,repeatType:e.target.value})}><option>ONCE</option><option>DAILY</option><option>WEEKLY</option><option>MONTHLY</option><option>CUSTOM</option></select></label><label><span>Інтервал</span><input type="number" min="1" value={form.repeatInterval} onChange={e=>setForm({...form,repeatInterval:Number(e.target.value)})}/></label></div></details>
 <button className="broadcast-submit" onClick={create} disabled={busy||!form.text.trim()}><Send/>{busy?'Запускаю…':form.sendNow?'Запустити розсилку':'Запланувати кампанію'}</button>{msg&&<div className="broadcast-feedback">{msg}</div>}</section>
 <section className="broadcast-history"><div className="broadcast-history-head"><div><b>Історія кампаній</b><span>{campaigns.length} записів</span></div><button className="panel-icon-btn" onClick={load}><RefreshCw/></button></div><div className="broadcast-timeline">{campaigns.length===0?<div className="broadcast-empty"><Megaphone/><b>Ще немає кампаній</b><span>Створіть першу розсилку зліва.</span></div>:campaigns.map(c=><article key={c.id}><div className="broadcast-dot"/><div className="broadcast-item-main"><div className="broadcast-item-title"><b>#{c.id} · {c.type}</b><span className={'campaign-status '+String(c.status).toLowerCase()}>{c.status}</span></div><p>{c.text}</p><div className="broadcast-metrics"><span>👥 {c.recipient_count||0}</span><span>✓ {c.sent_count||0}</span><span>⚠ {c.failed_count||0}</span><span>{dt(c.created_at)}</span></div></div><div className="desk-inline-actions"><button title="Пауза" onClick={()=>action(c.id,'pause')}><Pause/></button><button title="Продовжити" onClick={()=>action(c.id,'resume')}><Play/></button><button title="Надіслати зараз" onClick={()=>action(c.id,'send_now')}><Send/></button></div></article>)}</div></section></div></>
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
 <div className="workspace-grid"><Panel title="Sidebar Builder"><div className="workspace-list">{cfg.sidebar.map((x:any,i:number)=><div key={x.id} className={x.hidden?'hidden-item':''}><span>{x.label}</span><small>{x.group}</small><div><button title={x.hidden?'Показати':'Сховати'} onClick={()=>{const a=[...cfg.sidebar];a[i]={...a[i],hidden:!a[i].hidden};setCfg({...cfg,sidebar:a})}}>{x.hidden?<EyeOff/>:<Eye/>}</button><button onClick={()=>move(i,-1)}>↑</button><button onClick={()=>move(i,1)}>↓</button></div></div>)}</div></Panel><Panel title="Preview As"><div className="desk-segment">{(['OWNER','ADMIN','MANAGER'] as Role[]).map(r=><button key={r} className={preview===r?'active':''} onClick={()=>setPreview(r)}>{r}</button>)}</div><div className="desk-segment preview-devices"><button className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')}><Monitor/>Desktop</button><button className={device==='laptop'?'active':''} onClick={()=>setDevice('laptop')}><Monitor/>Laptop</button><button className={device==='tablet'?'active':''} onClick={()=>setDevice('tablet')}><Tablet/>iPad</button></div><div className={'workspace-preview '+device}><aside>{cfg.sidebar.filter((x:any)=>!x.hidden&&(!x.roles||x.roles.includes(preview))).map((x:any)=><span key={x.id}>{x.label}</span>)}</aside><main><div className="workspace-widget-grid">{cfg.widgets.filter((w:any)=>!w.roles||w.roles.includes(preview)).map((w:any)=><div style={{gridColumn:'span '+Math.min(12,Math.max(1,w.width||3)),minHeight:40*(w.height||1)}} key={w.id}>{w.title}</div>)}</div></main></div></Panel></div>
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
