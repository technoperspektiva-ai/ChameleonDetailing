import {useMemo,useState} from 'react';
import {AlarmClock,Banknote,BookmarkPlus,CalendarDays,CarFront,CheckCircle2,Clock3,RefreshCw,Search,UserRound,Zap} from 'lucide-react';
import {useData,usePreference} from '../../hooks';
import {post} from '../../api/desktopApi';
import {notify,showError} from '../../components/Toast';
import {DataTable,EmptyState,Skeleton,StatusBadge,Tabs} from '../../components/primitives';
import {boardStatus,boardStatuses,statusLabel,statusMeta} from '../../config/statusMeta';
import {businessDate,dt,money} from '../../format';
import type {Order,Bootstrap} from '../../types/desktop';

const filterOptions:[string,string][]=[
 ['all','Усі замовлення'],['today','Сьогодні'],['tomorrow','Завтра'],['overdue','Прострочені'],
 ['unscheduled','Без часу'],['express','Прискорені'],['unpaid','Неоплачені'],['mine','Мої'],
 ['unassigned','Без відповідального'],['ready','Готові'],['work','У роботі']
];
const deadlineState=(o:Order)=>{const active=!['COMPLETED','CANCELLED','REJECTED'].includes(String(o.status||'').toUpperCase()),at=o.deadline_at?Date.parse(o.deadline_at):NaN;if(!active||!Number.isFinite(at))return 'none';const left=at-Date.now();return left<0?'overdue':left<=30*60_000?'soon':'ok'};
const durationText=(value?:number)=>{const m=Math.max(0,Number(value||0));return m>=60?`${Math.floor(m/60)}г${m%60?' '+m%60+'хв':''}`:`${m}хв`};
const vehicleImage=(body?:string|null)=>{const raw=String(body||'').toLowerCase().replace(/[_\s]+/g,'-');const type=raw.includes('large')&&raw.includes('suv')?'large-suv':raw.includes('велики')&&raw.includes('сув')?'large-suv':raw.includes('suv')||raw.includes('сув')?'suv':raw.includes('van')||raw.includes('bus')||raw.includes('бус')?'van':raw.includes('hatch')||raw.includes('хетч')||raw.includes('універс')?'hatchback':'sedan';return '/vehicle-types/'+type+'.webp'};


export function Orders({boot,goto,initialFilter=''}:{boot:Bootstrap;goto:(p:string)=>void;initialFilter?:string}){
 const {rows,setRows,loading,reload}=useData<Order>('/api/desktop/orders','orders');
 const [q,setQ]=useState(''),[filter,setFilter]=usePreference('order-filter',initialFilter||'all'),[view,setView]=usePreference('order-view','kanban'),[saved,setSaved]=usePreference<{name:string;q:string;filter:string}[]>('saved-views',[]),[busy,setBusy]=useState<number[]>([]);
 const selectedFilter=initialFilter||filter,today=businessDate(new Date()),tomorrow=businessDate(new Date(Date.now()+86400000));

 const filtered=useMemo(()=>rows
  .filter(x=>[x.id,x.brand,x.model,x.plate,x.first_name,x.username,x.phone_number].join(' ').toLowerCase().includes(q.toLowerCase().replace(/^chd-/i,'')))
  .filter(x=>selectedFilter==='all'||selectedFilter==='today'&&!!x.scheduled_for&&businessDate(x.scheduled_for)===today||selectedFilter==='tomorrow'&&!!x.scheduled_for&&businessDate(x.scheduled_for)===tomorrow||selectedFilter==='unpaid'&&x.payment_status!=='PAID'&&!['CANCELLED','REJECTED'].includes(x.status)||selectedFilter==='mine'&&x.responsible_staff_id===boot.user.id||selectedFilter==='unassigned'&&!x.responsible_staff_id||selectedFilter==='unscheduled'&&!x.scheduled_for||selectedFilter==='express'&&!!x.accelerated||selectedFilter==='ready'&&boardStatus(x.status)==='READY'||selectedFilter==='work'&&boardStatus(x.status)==='IN_PROGRESS'||selectedFilter==='overdue'&&deadlineState(x)==='overdue'),
 [rows,q,selectedFilter,today,tomorrow,boot.user.id]);

 const hiddenFromBoard=useMemo(()=>filtered.filter(o=>['CANCELLED','REJECTED'].includes(String(o.status||'').toUpperCase())),[filtered]);
 const metrics=useMemo(()=>({
  all:rows.filter(x=>!['CANCELLED','REJECTED'].includes(String(x.status||'').toUpperCase())).length,
  today:rows.filter(x=>x.scheduled_for&&businessDate(x.scheduled_for)===today).length,
  work:rows.filter(x=>boardStatus(x.status)==='IN_PROGRESS').length,
  ready:rows.filter(x=>boardStatus(x.status)==='READY').length,
  unpaid:rows.filter(x=>x.payment_status!=='PAID'&&!['CANCELLED','REJECTED'].includes(String(x.status||'').toUpperCase())).length,late:rows.filter(x=>deadlineState(x)==='overdue').length
 }),[rows,today]);

 const board=useMemo(()=>boardStatuses.map(status=>({status,rows:filtered.filter(o=>boardStatus(o.status)===status)})),[filtered]);
 const resetFilters=()=>{setQ('');setFilter('all');if(initialFilter)goto('orders')};
 const selectFilter=(value:string)=>{setFilter(value);if(initialFilter)goto('orders')};

 const move=async(o:Order,status:string)=>{
  if(busy.includes(o.id)||o.status===status)return;
  setBusy(b=>[...b,o.id]);
  try{
   const d=await post('/api/desktop/orders/'+o.id,{status},'PATCH');
   setRows(r=>r.map(x=>x.id===o.id?{...x,...d.order}:x));
   notify(`CHD-${o.id} → ${statusLabel(status)}`,async()=>{await post('/api/desktop/orders/'+o.id,{status:o.status},'PATCH');reload()});
  }catch(e){showError(e)}finally{setBusy(b=>b.filter(id=>id!==o.id))}
 };

 return <div className="orders-workspace">
  <section className="orders-hero">
   <div className="orders-hero-copy">
    <span className="desk-eyebrow">ORDER FLOW</span>
    <h2>Замовлення</h2>
    <p>Весь робочий потік студії в одному місці: від нової заявки до готового автомобіля та оплати.</p>
   </div>
   <div className="orders-kpis">
    <button onClick={()=>selectFilter('all')}><span><CarFront/></span><small>Активні</small><strong>{metrics.all}</strong></button>
    <button onClick={()=>selectFilter('today')}><span><CalendarDays/></span><small>Сьогодні</small><strong>{metrics.today}</strong></button>
    <button onClick={()=>selectFilter('work')}><span><Clock3/></span><small>У роботі</small><strong>{metrics.work}</strong></button>
    <button onClick={()=>selectFilter('ready')}><span><CheckCircle2/></span><small>Готові</small><strong>{metrics.ready}</strong></button>
    <button onClick={()=>selectFilter('unpaid')}><span><Banknote/></span><small>Неоплачені</small><strong>{metrics.unpaid}</strong></button>
    <button className={metrics.late?'deadline-alert':''} onClick={()=>selectFilter('overdue')}><span><AlarmClock/></span><small>Дедлайн минув</small><strong>{metrics.late}</strong></button>
   </div>
  </section>

  <section className="orders-toolbar">
   <label className="orders-search"><Search/><input placeholder="Клієнт, авто, номер, телефон або CHD…" value={q} onChange={e=>setQ(e.target.value)}/><span>{filtered.length}/{rows.length}</span></label>
   <select className="orders-filter" aria-label="Фільтр замовлень" value={selectedFilter} onChange={e=>selectFilter(e.target.value)}>{filterOptions.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select>
   <Tabs items={[["kanban","Дошка"],["table","Таблиця"]]} value={view} onChange={setView}/>
   <button className="orders-save-view" onClick={()=>{const name=prompt('Назва збереженого вигляду');if(name?.trim())setSaved([...saved,{name:name.trim(),q,filter:selectedFilter}])}}><BookmarkPlus/>Зберегти</button>
   <button className="orders-refresh" onClick={()=>reload()} title="Оновити"><RefreshCw/></button>
  </section>

  {saved.length>0&&<div className="saved-views orders-saved-views">{saved.map((s,i)=><span key={i}><button onClick={()=>{setQ(s.q);setFilter(s.filter);if(initialFilter)goto('orders')}}>{s.name}</button><button aria-label={'Видалити '+s.name} onClick={()=>setSaved(saved.filter((_,n)=>n!==i))}>×</button></span>)}</div>}

  {!loading&&rows.length>0&&filtered.length===0&&<div className="kanban-filter-notice"><div><b>Замовлення є, але поточний фільтр їх приховав.</b><span>Усього в системі: {rows.length}. Очистіть пошук або покажіть усі замовлення.</span></div><button onClick={resetFilters}>Показати всі</button></div>}

  {loading?<Skeleton/>:view==='table'?
   <section className="orders-table-card">
    <div className="orders-section-head"><div><span className="desk-eyebrow">LIST VIEW</span><h3>Список замовлень</h3></div><span>{filtered.length} записів</span></div>
    <DataTable rows={filtered} onRow={x=>goto('orders/'+x.id)} columns={[
     {key:'id',label:'Замовлення',render:x=><b>CHD-{x.id}</b>,sort:x=>x.id},
     {key:'car',label:'Автомобіль',render:x=><>{[x.brand,x.model].filter(Boolean).join(' ')||'Авто не вказано'}<small>{x.plate||'Без номера'}</small></>,sort:x=>x.brand||''},
     {key:'client',label:'Клієнт',render:x=><>{x.first_name}<small>{x.phone_number||x.username||'—'}</small></>,sort:x=>x.first_name},
     {key:'date',label:'Початок',render:x=>x.scheduled_for?dt(x.scheduled_for):'Без часу',sort:x=>x.scheduled_for||''},
     {key:'deadline',label:'Дедлайн',render:x=><span className={'orders-table-deadline '+deadlineState(x)}>{x.deadline_at?dt(x.deadline_at):'—'}<small>{x.estimated_duration_min?durationText(x.estimated_duration_min):''}</small></span>,sort:x=>x.deadline_at||''},
     {key:'status',label:'Статус',render:x=><StatusBadge status={x.status}/>},
     {key:'amount',label:'Сума',render:x=>money(x.final_job_price??x.calculated_price,x.currency),sort:x=>x.final_job_price??x.calculated_price},
     {key:'payment',label:'Оплата',render:x=><StatusBadge status={x.payment_status}/>}
    ]}/>
   </section>
  :
   <section className="orders-board-shell">
    <div className="orders-section-head"><div><span className="desk-eyebrow">KANBAN</span><h3>Робочий потік</h3></div><span>Перетягніть картку, щоб змінити етап</span></div>
    <div className="desk-kanban orders-kanban">
     {board.map(({status:s,rows:cards})=><section className={'desk-kanban-col orders-kanban-col status-'+s.toLowerCase()} key={s} onDragOver={e=>{if(boot.mode==='ONLINE')e.preventDefault()}} onDrop={e=>{e.preventDefault();const o=rows.find(x=>x.id===Number(e.dataTransfer.getData('text/plain')));if(o)void move(o,s)}}>
      <header className="orders-column-head"><div><i/><span>{boot.kanbanLabels?.[s]||statusLabel(s)}</span></div><b>{cards.length}</b></header>
      <div className="orders-column-body">
       {cards.map(o=><article className="desk-kanban-card orders-kanban-card" key={o.id} draggable={boot.mode==='ONLINE'&&!busy.includes(o.id)} onDragStart={e=>e.dataTransfer.setData('text/plain',String(o.id))}>
        <button className="card-main orders-card-main" onClick={()=>goto('orders/'+o.id)}>
         <div className="orders-card-top"><span>CHD-{o.id}</span><time>{o.scheduled_for?dt(o.scheduled_for):'Без часу'}</time></div>
         <div className="orders-card-car"><span className="orders-car-thumb"><img src={vehicleImage(o.body_type)} alt="" aria-hidden="true"/></span><div><b>{[o.brand,o.model].filter(Boolean).join(' ')||'Автомобіль'}</b><small>{o.plate||'Номер не вказано'}</small></div></div>
         <div className="orders-card-client"><UserRound/><span><b>{o.first_name||o.username||'Клієнт'}</b><small>{o.phone_number||'Контакт не вказано'}</small></span></div>
         <div className="orders-card-service">{o.service_title||o.service_slug||'Послуги в замовленні'}</div>
         <div className={'orders-card-deadline '+deadlineState(o)}><AlarmClock/><span><small>Дедлайн · {durationText(o.estimated_duration_min)}</small><b>{o.deadline_at?dt(o.deadline_at):'Не визначено'}</b></span></div>
         <div className="card-badges">{o.accelerated>0&&<span className="express"><Zap/>Прискорене</span>}{o.payment_status!=='PAID'&&<span>Не оплачено</span>}{o.client_tier&&o.client_tier!=='STANDARD'&&<span className="vip">VIP</span>}</div>
         <div className="orders-card-footer"><strong>{money(o.final_job_price??o.calculated_price,o.currency)}</strong><span>{o.responsible_name||'Без відповідального'}</span></div>
        </button>
        <div className="card-actions orders-card-actions">
         {!o.responsible_staff_id?<button disabled={boot.mode!=='ONLINE'} onClick={async()=>{try{await post('/api/desktop/orders/'+o.id,{responsibleStaffId:boot.user.id},'PATCH');reload();notify('Замовлення закріплено за вами')}catch(e){showError(e)}}}>Взяти</button>:<span className="orders-assignee-lock" title="Після призначення відповідального змінити його може лише адміністратор або власник">🔒 {o.responsible_name||'Закріплено'}</span>}
         {statusMeta[String(o.status||'').toUpperCase()]?.next&&<button className="orders-next-action" disabled={busy.includes(o.id)||boot.mode!=='ONLINE'} onClick={()=>move(o,statusMeta[String(o.status||'').toUpperCase()].next!)}>{statusLabel(statusMeta[String(o.status||'').toUpperCase()].next!)} →</button>}
        </div>
       </article>)}
       {!cards.length&&<EmptyState>На цьому етапі замовлень немає</EmptyState>}
      </div>
     </section>)}
    </div>
   </section>
  }

  {view==='kanban'&&hiddenFromBoard.length>0&&<p className="desk-muted kanban-hidden-note">Скасовані та відхилені: {hiddenFromBoard.length}. Вони доступні у таблиці.</p>}
 </div>
}
