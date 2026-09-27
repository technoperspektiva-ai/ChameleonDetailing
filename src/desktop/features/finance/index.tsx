import React,{useEffect,useMemo,useRef,useState} from 'react';
import {
 Home,ClipboardList,Search,Car,Users,CalendarDays,Wrench,CreditCard,Megaphone,
 BarChart3,FileText,BadgeCheck,Settings,History,LayoutDashboard,LogOut,RefreshCw,
 ChevronRight,Lock,Unlock,Save,Upload,Download,RotateCcw,Send,Pause,Play,Eye,EyeOff,
 Monitor,Tablet,X,Check,AlertTriangle,Sun,Moon,ChevronDown,Globe2,Plus,Trash2,Pencil,Image as ImageIcon,Link2
} from 'lucide-react';
import {desktopLocales,desktopLocaleLabels,desktopLocaleNames,desktopT,normalizeDesktopLocale,type DesktopLocale} from '../../../desktopLocales';
import {api,post} from '../../api/desktopApi';
import {money,dt} from '../../format';
import type {Role,Bootstrap,Page} from '../../types/desktop';
import {usePreference} from '../../hooks';
import {statusLabel} from '../../config/statusMeta';
import {showError} from '../../components/Toast';
import {Panel} from '../../components/Panel';
export function Payments(){
 const [currency,setCurrency]=usePreference('currency','PLN'),[data,setData]=useState<any>({rows:[],summary:{}}),[busy,setBusy]=useState(false);
 const load=async(next=currency)=>{setBusy(true);try{const d=await api('/api/desktop/payments?currency='+encodeURIComponent(next));setData(d)}finally{setBusy(false)}};
 useEffect(()=>{load(currency)},[currency]);
 const rows=data.rows||[],unpaid=rows.filter((x:any)=>x.payment_status!=='PAID');
 return <><div className="payments-head"><div><span className="desk-eyebrow">FINANCE VIEW</span><h2>Оплати</h2><p>Суми перераховуються у вибрану валюту для зручного перегляду. Оригінальна валюта замовлення не змінюється.</p></div><div className="payments-currency"><span>Показувати в</span><div className="currency-switch">{['PLN','USD','UAH'].map(x=><button key={x} className={currency===x?'active':''} onClick={()=>setCurrency(x)}>{x}</button>)}</div></div></div>
 <div className="desk-kpis payments-kpis"><div className="desk-kpi"><small>Оплачено</small><strong>{data.summary?.paid||0}</strong></div><div className="desk-kpi"><small>Не оплачено</small><strong>{data.summary?.unpaid||0}</strong></div><div className="desk-kpi"><small>Оплачено · {currency}</small><strong>{money(data.summary?.paidTotal||0,currency)}</strong></div><div className="desk-kpi"><small>Очікується · {currency}</small><strong>{money(data.summary?.unpaidTotal||0,currency)}</strong></div></div>
 <Panel title={'Очікують оплату · '+unpaid.length} action={<button className="panel-icon-btn" onClick={()=>load()}><RefreshCw className={busy?'spin':''}/></button>}><div className="desk-table-wrap"><table><thead><tr><th>Замовлення</th><th>Клієнт</th><th>Авто</th><th>Оригінал</th><th>Показано</th><th>Статус</th></tr></thead><tbody>{unpaid.map((x:any)=><tr key={x.id} tabIndex={0} onClick={()=>location.hash='orders/'+x.id} onKeyDown={e=>{if(e.key==='Enter')location.hash='orders/'+x.id}}><td><b>CHD-{x.id}</b><small>{dt(x.created_at)}</small></td><td>{x.first_name||x.username||'—'}</td><td>{[x.brand,x.model,x.plate].filter(Boolean).join(' · ')||'—'}</td><td>{money(x.original_amount,x.original_currency)}</td><td><b>{money(x.display_amount,currency)}</b></td><td><span className="desk-status">{statusLabel(x.payment_status)}</span></td></tr>)}</tbody></table></div></Panel></>
}

export function Analytics(){
 const [period,setPeriod]=useState<'today'|'7'|'30'>('7'),[data,setData]=useState<any>(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const load=async(p=period)=>{setBusy(true);try{setData(await api('/api/desktop/admin-hub/analytics?period='+p))}catch(e:any){setMsg(e.message)}finally{setBusy(false)}};useEffect(()=>{load(period)},[period]);
 return <><div className="desk-toolbar"><div className="desk-segment">{(['today','7','30'] as const).map(p=><button key={p} className={period===p?'active':''} onClick={()=>setPeriod(p)}>{p==='today'?'Сьогодні':p+' днів'}</button>)}</div><button onClick={()=>load()}><RefreshCw className={busy?'spin':''}/>Оновити</button></div>{msg&&<div className="desk-banner">{msg}</div>}<div className="desk-kpis analytics-kpis"><div className="desk-kpi"><small>Нові клієнти</small><strong>{data?.summary?.users||0}</strong></div><div className="desk-kpi"><small>Замовлення</small><strong>{data?.summary?.orders||0}</strong></div><div className="desk-kpi"><small>Дохід</small><strong>{money(data?.summary?.revenue||0,data?.summary?.currency||'PLN')}</strong></div><div className="desk-kpi"><small>Подій</small><strong>{(data?.events||[]).reduce((s:number,x:any)=>s+Number(x.n||0),0)}</strong></div></div><Panel title="Події продукту"><div className="analytics-event-grid">{(data?.events||[]).map((x:any)=><div key={x.event_type}><span>{String(x.event_type).replace(/_/g,' ')}</span><b>{x.n}</b></div>)}</div></Panel><details className="analytics-reset"><summary>Очистити лише аналітику</summary><p>Не видаляє клієнтів, замовлення чи оплати. Для підтвердження введіть <code>RESET ANALYTICS</code>.</p><AnalyticsReset onDone={()=>load()}/></details></>
}

export function AnalyticsReset({onDone}:{onDone:()=>void}){
 const [v,setV]=useState(''),[msg,setMsg]=useState('');
 return <div className="analytics-reset-row"><input value={v} onChange={e=>setV(e.target.value)} placeholder="RESET ANALYTICS"/><button disabled={v!=='RESET ANALYTICS'} onClick={async()=>{try{const d=await post('/api/desktop/admin-hub/analytics/reset',{confirm:v});setMsg('Видалено: '+d.removed);setV('');onDone()}catch(e:any){setMsg(e.message)}}}><Trash2/>Очистити</button>{msg&&<span>{msg}</span>}</div>
}


export function Reports(){
 const types=[['business','Бізнес-звіт'],['orders','Замовлення'],['payments','Оплати'],['revenue','Дохід'],['users','Користувачі'],['vip','VIP'],['referrals','Реферали'],['retention','Retention'],['staff','Персонал'],['blacklist','Blacklist'],['whitelist','Whitelist'],['reviews','Відгуки'],['suggestions','Пропозиції']];
 const [days,setDays]=useState(30),[busy,setBusy]=useState('');
 const download=async(type:string)=>{setBusy(type);try{const r=await fetch('/api/desktop/reports/'+type+'?days='+days+'&locale=uk',{headers:{authorization:'Bearer '+(localStorage.getItem('chameleon.desktop.session')||'')}});if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||'Report failed')}const blob=await r.blob(),cd=r.headers.get('content-disposition')||'',m=cd.match(/filename="?([^"]+)"?/),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=m?.[1]||type+'.xlsx';a.click();URL.revokeObjectURL(u)}finally{setBusy('')}};
 return <><div className="desk-toolbar"><span className="desk-muted">Період</span><select value={days} onChange={e=>setDays(Number(e.target.value))}><option value="7">7 днів</option><option value="30">30 днів</option><option value="90">90 днів</option><option value="365">365 днів</option><option value="0">Весь період</option></select></div><Panel title="Excel reports"><div className="desk-report-grid">{types.map(([type,label])=><button key={type} onClick={()=>download(type)} disabled={!!busy}><FileText/><div><b>{label}</b><span>.xlsx · єдині дані D1</span></div><Download className={busy===type?'spin':''}/></button>)}</div></Panel></>
}
