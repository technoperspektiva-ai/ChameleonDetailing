import {useEffect,useState} from 'react';
import {ArrowUpRight,Banknote,BarChart3,CalendarDays,CarFront,CheckCircle2,ChevronLeft,ChevronRight,Clock3,MessageCircle,MoreHorizontal,Package,Phone,Plus,Users,UsersRound,Wrench} from 'lucide-react';
import {useData,usePreference} from '../../hooks';
import {api} from '../../api/desktopApi';
import type {Order,Bootstrap} from '../../types/desktop';
import {Skeleton,EmptyState,StatusBadge} from '../../components/primitives';
import {businessDate,businessTime} from '../../format';

const closed=new Set(['CANCELLED','REJECTED','COMPLETED']);
const working=new Set(['CAR_ACCEPTED','IN_PROGRESS','INSPECTION']);

function money(value:number,currency='PLN'){
 return new Intl.NumberFormat('uk-UA',{style:'currency',currency,maximumFractionDigits:0}).format(value||0);
}

function initials(value:string){
 return value.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'CH';
}

function vehicleImage(body?:string|null){const raw=String(body||'').toLowerCase().replace(/[_\s]+/g,'-');const type=raw.includes('large')&&raw.includes('suv')?'large-suv':raw.includes('suv')?'suv':raw.includes('van')||raw.includes('bus')?'van':raw.includes('hatch')?'hatchback':'sedan';return '/vehicle-types/'+type+'.webp'}

function monthGrid(date:Date,orders:Order[]){
 const first=new Date(date.getFullYear(),date.getMonth(),1);
 const last=new Date(date.getFullYear(),date.getMonth()+1,0);
 const monday=(first.getDay()+6)%7;
 const start=new Date(first);
 start.setDate(first.getDate()-monday);
 const counts=new Map<string,number>();
 for(const order of orders){
  if(!order.scheduled_for)continue;
  const key=businessDate(order.scheduled_for);
  counts.set(key,(counts.get(key)||0)+1);
 }
 return Array.from({length:42},(_,i)=>{
  const d=new Date(start);
  d.setDate(start.getDate()+i);
  const key=businessDate(d);
  return {date:d,key,count:counts.get(key)||0,current:d.getMonth()===date.getMonth(),today:key===businessDate(date),past:d<new Date(date.getFullYear(),date.getMonth(),date.getDate())};
 }).filter((_,i)=>i<35||last.getDay()===0||last.getDate()+monday>35);
}

export function Today({boot,goto,create}:{boot:Bootstrap;goto:(p:string)=>void;create?:()=>void}){
 const {rows,loading,updated}=useData<Order>('/api/desktop/orders','orders');
 const [currency]=usePreference('currency',boot.personal?.currency||'PLN');
 const [dashboard,setDashboard]=useState<any>(null);
 const [focusIndex,setFocusIndex]=useState(0);
 useEffect(()=>{let live=true;api('/api/desktop/dashboard?currency='+encodeURIComponent(currency)).then(d=>{if(live)setDashboard(d)}).catch(()=>{});return()=>{live=false}},[currency,rows.length]);
 const availableFocusCount=rows.filter(x=>!closed.has(x.status)).length||rows.length;
 useEffect(()=>{setFocusIndex(i=>Math.max(0,Math.min(i,Math.max(0,availableFocusCount-1))))},[availableFocusCount]);
 if(loading)return <Skeleton/>;

 const now=new Date();
 const today=businessDate(now);
 const scheduled=rows.filter(x=>x.scheduled_for&&businessDate(x.scheduled_for)===today).sort((a,b)=>String(a.scheduled_for).localeCompare(String(b.scheduled_for)));
 const active=rows.filter(x=>!closed.has(x.status));
 const attention=rows.filter(x=>x.status==='READY'||(x.status==='COMPLETED'&&x.payment_status!=='PAID')||(!x.responsible_staff_id&&active.includes(x))).slice(0,6);
 const focusPool=(active.length?active:rows).slice().sort((a,b)=>{const rank=(x:Order)=>working.has(x.status)?0:(x.scheduled_for&&businessDate(x.scheduled_for)===today?1:2);return rank(a)-rank(b)||String(a.scheduled_for||a.created_at).localeCompare(String(b.scheduled_for||b.created_at))});
 const focus=focusPool[focusIndex]||focusPool[0]||rows[0];
 const stepFocus=(delta:number)=>{if(!focusPool.length)return;setFocusIndex(i=>(i+delta+focusPool.length)%focusPool.length)};

 const monthlyRevenue=Number(dashboard?.kpi?.revenue||0);

 const clientCount=new Map<number,number>();
 rows.forEach(x=>clientCount.set(x.user_id,(clientCount.get(x.user_id)||0)+1));
 const returning=[...clientCount.values()].filter(x=>x>1).length;

 const recentClients=[...rows].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).filter((x,i,a)=>a.findIndex(y=>y.user_id===x.user_id)===i).slice(0,4);
 const calendar=monthGrid(now,rows);
 const monthLabel=new Intl.DateTimeFormat('uk-UA',{month:'long',year:'numeric'}).format(now);
 const longDate=new Intl.DateTimeFormat('uk-UA',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/Warsaw'}).format(now);
 const inWork=active.filter(x=>working.has(x.status)).length;

 const quick=[
  {title:'Послуги',subtitle:'Каталог, ціни та додаткові опції',icon:Wrench,route:'services',show:true},
  {title:'Фінанси',subtitle:'Дохід, оплати та звіти',icon:Banknote,route:'finance',show:!!boot.permissions.financial_access},
  {title:'Команда',subtitle:'Співробітники, права й навантаження',icon:UsersRound,route:'team',show:boot.user.role!=='MANAGER'},
  {title:'Аналітика',subtitle:'Динаміка роботи та ключові показники',icon:BarChart3,route:'analytics',show:boot.user.role!=='MANAGER'},
 ].filter(x=>x.show);

 return <div className="premium-dashboard">
  <section className="premium-hero">
   <div className="premium-hero-copy">
    <span className="premium-eyebrow">{longDate}</span>
    <h1>Більше, ніж <em>детейлінг</em> —<br/>це стиль життя.</h1>
    <p>Усе, що потрібно для сьогоднішньої зміни: записи, клієнти, автомобілі та контроль роботи.</p>
   </div>
   <div className="premium-hero-mark" aria-hidden="true"><img src="/brand/chameleon-logo.webp" alt=""/></div>
   <div className="premium-hero-meta">
    <span>Оновлено {updated?.toLocaleTimeString('uk-UA',{hour:'2-digit',minute:'2-digit'})}</span>
    {boot.mode==='ONLINE'&&create&&<button className="premium-new-order" onClick={()=>create?.()}><Plus/>Новий запис</button>}
   </div>
  </section>

  <section className="premium-kpis" aria-label="Ключові показники">
   <button onClick={()=>goto('calendar')}><span className="premium-kpi-icon"><CalendarDays/></span><div><small>Записів сьогодні</small><strong>{scheduled.length}</strong></div><span className="premium-kpi-trend">сьогодні</span></button>
   <button onClick={()=>goto('finance')}><span className="premium-kpi-icon"><Banknote/></span><div><small>Дохід за місяць</small><strong>{money(monthlyRevenue,currency)}</strong></div><span className="premium-kpi-trend">поточний місяць</span></button>
   <button onClick={()=>goto('clients')}><span className="premium-kpi-icon"><Users/></span><div><small>Постійних клієнтів</small><strong>{returning}</strong></div><span className="premium-kpi-trend">2+ замовлення</span></button>
   <button onClick={()=>goto('orders?filter=work')}><span className="premium-kpi-icon"><CarFront/></span><div><small>Авто в роботі</small><strong>{inWork}</strong></div><span className="premium-kpi-progress"><i style={{width:`${Math.min(100,Math.max(8,inWork*18))}%`}}/></span></button>
  </section>

  <div className="premium-dashboard-grid">
   <div className="premium-dashboard-main">
    <section className="premium-schedule-card premium-surface">
     <header className="premium-section-head"><div><h2>Записи на сьогодні</h2><span>{scheduled.length} заплановано</span></div>{create&&<button className="premium-inline-action" onClick={()=>create?.()}><Plus/>Новий запис</button>}</header>
     <div className="premium-timeline">
      {scheduled.map((x,index)=><button key={x.id} className="premium-timeline-row" onClick={()=>goto('orders/'+x.id)}>
       <div className="premium-time"><span>{businessTime(x.scheduled_for!)}</span><i className={working.has(x.status)?'is-live':''}/>{index<scheduled.length-1&&<b/>}</div>
       <div className="premium-car-thumb"><img src={vehicleImage(x.body_type)} alt="" aria-hidden="true"/></div>
       <div className="premium-job-main"><strong>{[x.brand,x.model].filter(Boolean).join(' ')||'CHD-'+x.id}</strong><span>{x.service_title||x.service_slug||'Детейлінг'}{x.plate?' · '+x.plate:''}</span></div>
       <StatusBadge status={x.status}/>
       <div className="premium-assignee">{x.responsible_name?<><span>{initials(x.responsible_name)}</span><small>{x.responsible_name}</small></>:<small>Без майстра</small>}</div>
       <MoreHorizontal className="premium-more"/>
      </button>)}
      {!scheduled.length&&<EmptyState>На сьогодні записів немає. Можна створити новий запис прямо звідси.</EmptyState>}
     </div>
    </section>

    <section className="premium-focus-card premium-surface">
     {focus?<><div className="premium-focus-visual"><div className="premium-focus-glow"/><img className="premium-focus-car-image" src={vehicleImage(focus.body_type)} alt={[focus.brand,focus.model].filter(Boolean).join(' ')||'Автомобіль'}/><span>{focus.plate||'CHAMELEON'}</span></div>
      <div className="premium-focus-content">
       {focusPool.length>1&&<div className="premium-focus-switcher" aria-label="Швидкий перехід між замовленнями"><button aria-label="Попереднє замовлення" onClick={()=>stepFocus(-1)}><ChevronLeft/></button><div>{focusPool.map((x,i)=><button key={x.id} className={i===focusIndex?'active':''} onClick={()=>setFocusIndex(i)}>CHD-{x.id}</button>)}</div><button aria-label="Наступне замовлення" onClick={()=>stepFocus(1)}><ChevronRight/></button></div>}
       <header><div><span className="premium-eyebrow">Активне замовлення</span><h2>{[focus.brand,focus.model].filter(Boolean).join(' ')||'Замовлення CHD-'+focus.id}</h2></div><div className="premium-focus-status-stack"><StatusBadge status={focus.status}/><span className="premium-master-pill"><UsersRound/>{focus.responsible_name||'Майстер не призначений'}</span></div></header>
       <div className="premium-focus-tabs" aria-label="Розділи замовлення"><button className="active" onClick={()=>goto('orders/'+focus.id+'/overview')}>Деталі</button><button onClick={()=>goto('orders/'+focus.id+'/services')}>Послуги</button><button onClick={()=>goto('orders/'+focus.id+'/checklist')}>Чек-лист</button><button onClick={()=>goto('orders/'+focus.id+'/photos')}>Фото</button></div>
       <dl className="premium-focus-details">
        <div><dt><Users/>Клієнт</dt><dd>{focus.first_name}</dd></div>
        <div><dt><Phone/>Телефон</dt><dd>{focus.phone_number||'Не вказано'}</dd></div>
        <div><dt><Wrench/>Послуга</dt><dd>{focus.service_title||focus.service_slug||'Комплексний детейлінг'}</dd></div>
        <div><dt><Clock3/>Початок</dt><dd>{focus.confirmed_at?businessTime(focus.confirmed_at):focus.status==='CONFIRMED'?'Щойно підтверджено':focus.scheduled_for?'План '+businessTime(focus.scheduled_for):'Після підтвердження'}</dd></div>
        <div><dt><CarFront/>Номер</dt><dd>{focus.plate||'—'}</dd></div>
        <div><dt><UsersRound/>Майстер</dt><dd>{focus.responsible_name||'Не призначено'}</dd></div>
       </dl>
       <div className="premium-contact-actions"><button disabled={!focus.phone_number} title="Подзвонити клієнту" onClick={()=>{if(focus.phone_number)location.href='tel:'+focus.phone_number}}><Phone/></button><button disabled={!focus.username} title="Написати в Telegram" onClick={()=>{if(focus.username)window.open('https://t.me/'+String(focus.username).replace(/^@/,''),'_blank','noopener,noreferrer')}}><MessageCircle/></button></div><div className="premium-focus-actions"><button className="premium-complete" onClick={()=>goto('orders/'+focus.id)}><CheckCircle2/>Відкрити замовлення</button><button aria-label="Оплата та додаткові дії" onClick={()=>goto('orders/'+focus.id+'/payment')}><MoreHorizontal/></button></div>
      </div></>:<EmptyState>Активних замовлень поки немає.</EmptyState>}
    </section>

    <section className="premium-quick-grid">
     {quick.map(({title,subtitle,icon:Icon,route})=><button key={title} onClick={()=>goto(route)} className="premium-quick-card">
      <span className="premium-quick-icon"><Icon/></span><div><strong>{title}</strong><small>{subtitle}</small></div><ArrowUpRight/>
     </button>)}
    </section>
   </div>

   <aside className="premium-dashboard-rail">
    <section className="premium-calendar premium-surface">
     <header><h3>{monthLabel}</h3><button aria-label="Відкрити календар" onClick={()=>goto('calendar')}><ArrowUpRight/></button></header>
     <div className="premium-weekdays">{['Пн','Вт','Ср','Чт','Пт','Сб','Нд'].map(x=><span key={x}>{x}</span>)}</div>
     <div className="premium-month-grid">{calendar.map(({date,key,count,current,today,past})=><button key={key} onClick={()=>goto('calendar')} className={(current?'':'outside ')+(today?'today ':'')+(past?'past ':'')+(count?'busy':'')}><span>{date.getDate()}</span>{count>0&&<i>{count>3?'3+':count}</i>}</button>)}</div>
    </section>

    <section className="premium-rail-card premium-surface">
     <header><div><h3>Задачі</h3><span>{attention.length}</span></div><button onClick={()=>goto('orders')}>Всі <ArrowUpRight/></button></header>
     <div className="premium-task-list">
      {attention.slice(0,4).map(x=><button key={x.id} onClick={()=>goto('orders/'+x.id)}><span className="premium-task-check"/><div><strong>{[x.brand,x.model].filter(Boolean).join(' ')||'CHD-'+x.id}</strong><small>{x.status==='READY'?'Підготувати до видачі':x.status==='COMPLETED'?'Підтвердити оплату':'Призначити відповідального'}</small></div><time>{x.scheduled_for?businessTime(x.scheduled_for):'сьогодні'}</time></button>)}
      {!attention.length&&<p className="premium-rail-empty">Термінових задач немає.</p>}
     </div>
    </section>

    <section className="premium-rail-card premium-surface">
     <header><div><h3>Останні клієнти</h3></div><button onClick={()=>goto('clients')}>Всі <ArrowUpRight/></button></header>
     <div className="premium-client-list">
      {recentClients.map(x=><button key={x.user_id} onClick={()=>goto('clients/'+x.user_id)}><span className="premium-client-avatar">{initials(x.first_name)}</span><div><strong>{x.first_name}</strong><small>{[x.brand,x.model].filter(Boolean).join(' ')||'Автомобіль не вказано'}</small></div><MoreHorizontal/></button>)}
      {!recentClients.length&&<p className="premium-rail-empty">Клієнтів поки немає.</p>}
     </div>
    </section>

    <section className="premium-storage-note premium-surface" onClick={()=>goto('services')} role="button" tabIndex={0}>
     <span><Package/></span><div><strong>Швидкий доступ</strong><small>Послуги, ціни та додаткові опції</small></div><ArrowUpRight/>
    </section>
   </aside>
  </div>
 </div>;
}
