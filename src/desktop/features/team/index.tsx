import {useEffect,useMemo,useState} from 'react';
import {BadgeCheck,Clock3,Globe2,Plus,RefreshCw,Search,ShieldCheck,Users} from 'lucide-react';
import {api,post} from '../../api/desktopApi';
import type {Role} from '../../types/desktop';

const roleLabel=(role:string)=>role==='OWNER'?'Власник':role==='ADMIN'?'Адміністратор':role==='MANAGER'?'Менеджер':role;
const langLabel=(lang:string)=>lang==='uk'?'Українська':lang==='pl'?'Polski':'English';
const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'CH';
const seenLabel=(value?:string|null)=>{
 if(!value)return 'Не входив';
 const ms=Date.now()-Date.parse(value);
 if(!Number.isFinite(ms))return '—';
 if(ms<5*60_000)return 'Щойно';
 if(ms<60*60_000)return Math.max(1,Math.floor(ms/60_000))+' хв тому';
 if(ms<24*60*60_000)return Math.floor(ms/3_600_000)+' год тому';
 return new Intl.DateTimeFormat('uk-UA',{day:'2-digit',month:'short'}).format(new Date(value));
};

export function StaffManagement({role}:{role:Role}){
 const [rows,setRows]=useState<any[]>([]),[username,setUsername]=useState(''),[newRole,setNewRole]=useState<'ADMIN'|'MANAGER'>('MANAGER'),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[q,setQ]=useState(''),[roleFilter,setRoleFilter]=useState('ALL');
 const load=async()=>{setLoading(true);try{const d=await api('/api/desktop/staff');setRows(d.staff||[])}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 const add=async()=>{setBusy(true);setMsg('');try{const d=await post('/api/desktop/admin-hub/staff-role',{username,role:newRole});setMsg(d.known?'✅ Роль призначено':'🕓 Створено запрошення: '+d.inviteUrl);setUsername('');await load()}catch(e:any){setMsg('⚠️ '+String(e?.message||e))}finally{setBusy(false)}};
 const change=async(id:number,next:string,managementLanguage?:string)=>{
  if(next==='CLIENT'&&!confirm('Прибрати цього користувача з команди? Він втратить Staff-доступ.'))return;
  try{await post('/api/desktop/admin-hub/staff-role/'+id,{role:next,managementLanguage},'PATCH');setMsg(next==='CLIENT'?'✅ Користувача прибрано з команди':'✅ Дані співробітника оновлено');await load()}catch(e:any){setMsg('⚠️ '+String(e?.message||e))}
 };
 const counts=useMemo(()=>({all:rows.length,admins:rows.filter(x=>x.role==='ADMIN').length,managers:rows.filter(x=>x.role==='MANAGER').length,online:rows.filter(x=>x.last_seen_at&&Date.now()-Date.parse(x.last_seen_at)<30*60_000).length}),[rows]);
 const filtered=useMemo(()=>rows.filter(x=>roleFilter==='ALL'||x.role===roleFilter).filter(x=>[x.first_name,x.username,x.telegram_user_id,x.role].join(' ').toLowerCase().includes(q.trim().toLowerCase())),[rows,q,roleFilter]);

 return <div className="team-workspace">
  <section className="team-hero">
   <div className="team-hero-copy">
    <span className="desk-eyebrow">TEAM & ACCESS</span>
    <h2>Команда</h2>
    <p>Співробітники, ролі, мова керування та доступ до робочого простору — без перевантажених таблиць.</p>
   </div>
   <div className="team-kpis">
    <div><span><Users/></span><small>У команді</small><strong>{counts.all}</strong></div>
    <div><span><ShieldCheck/></span><small>Адміністратори</small><strong>{counts.admins}</strong></div>
    <div><span><BadgeCheck/></span><small>Менеджери</small><strong>{counts.managers}</strong></div>
    <div><span><Clock3/></span><small>Активні зараз</small><strong>{counts.online}</strong></div>
   </div>
  </section>

  {msg&&<div className="desk-banner team-feedback">{msg}</div>}

  <div className="team-top-grid">
   <section className="team-card team-invite-card">
    <header><div className="team-card-icon"><Plus/></div><div><span className="desk-eyebrow">ADD STAFF</span><h3>Додати співробітника</h3><p>Якщо @username ще не відомий системі, буде створено безпечне invite-посилання.</p></div></header>
    <div className="team-invite-form">
     <label><span>Telegram username</span><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="@username" onKeyDown={e=>{if(e.key==='Enter'&&username.trim()&&!busy)void add()}}/></label>
     <label><span>Роль</span><select value={newRole} onChange={e=>setNewRole(e.target.value as 'ADMIN'|'MANAGER')}><option value="MANAGER">Менеджер</option>{role==='OWNER'&&<option value="ADMIN">Адміністратор</option>}</select></label>
     <button className="desk-primary" disabled={!username.trim()||busy} onClick={add}><Plus/>{busy?'Додаю…':'Додати до команди'}</button>
    </div>
   </section>

   <section className="team-card team-rules-card">
    <header><div className="team-card-icon"><ShieldCheck/></div><div><span className="desk-eyebrow">ROLE MODEL</span><h3>Як працюють ролі</h3><p>Права залишаються синхронними з Telegram Bot Panel.</p></div></header>
    <div className="team-role-guide">
     <div className="owner"><span>Owner</span><p>Повний контроль. Роль незмінна.</p></div>
     <div className="admin"><span>Admin</span><p>Керує командою та операційними розділами.</p></div>
     <div className="manager"><span>Manager</span><p>Працює лише в межах дозволених прав.</p></div>
    </div>
   </section>
  </div>

  <section className="team-card team-list-card">
   <header className="team-list-head">
    <div><span className="desk-eyebrow">STAFF DIRECTORY</span><h3>Співробітники</h3><p>{filtered.length} із {rows.length} показано</p></div>
    <button className="team-refresh" onClick={()=>void load()} disabled={loading} title="Оновити"><RefreshCw className={loading?'spin':''}/></button>
   </header>
   <div className="team-toolbar">
    <label className="team-search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Ім’я, @username або Telegram ID"/></label>
    <div className="team-role-filter">{[['ALL','Усі'],['OWNER','Owner'],['ADMIN','Admin'],['MANAGER','Manager']].map(([v,l])=><button key={v} className={roleFilter===v?'active':''} onClick={()=>setRoleFilter(v)}>{l}</button>)}</div>
   </div>

   <div className="team-member-list">
    {filtered.map(x=><article className="team-member" key={x.id}>
     <div className={'team-avatar role-'+String(x.role).toLowerCase()}>{initials(x.first_name||x.username||String(x.id))}</div>
     <div className="team-member-main">
      <div className="team-member-name"><strong>{x.first_name||x.username||'Staff #'+x.id}</strong><span className={'team-role-badge '+String(x.role).toLowerCase()}>{roleLabel(x.role)}</span></div>
      <div className="team-member-meta"><span>{x.username?'@'+x.username:'Без username'}</span><i/> <span>ID {x.telegram_user_id}</span><i/> <span className={x.status==='ACTIVE'?'is-active':''}>{x.status==='ACTIVE'?'Активний':x.status}</span></div>
     </div>
     <div className="team-last-seen"><Clock3/><span><small>Остання активність</small><b>{seenLabel(x.last_seen_at)}</b></span></div>
     <label className="team-language"><Globe2/><select aria-label="Мова керування" value={x.management_language||'en'} onChange={e=>change(x.id,x.role,e.target.value)}><option value="uk">UA · {langLabel('uk')}</option><option value="pl">PL · {langLabel('pl')}</option><option value="en">EN · {langLabel('en')}</option></select></label>
     <div className="team-member-actions">
      {x.role==='OWNER'?<span className="team-owner-lock"><ShieldCheck/>Незмінна роль</span>:<select aria-label="Роль співробітника" value={x.role} onChange={e=>change(x.id,e.target.value,x.management_language||'en')}><option value="MANAGER">Менеджер</option>{role==='OWNER'&&<option value="ADMIN">Адміністратор</option>}<option value="CLIENT">Прибрати з команди</option></select>}
     </div>
    </article>)}
    {!loading&&!filtered.length&&<div className="team-empty"><Users/><strong>Нічого не знайдено</strong><span>Змініть пошук або фільтр ролі.</span></div>}
    {loading&&!rows.length&&<div className="team-empty"><RefreshCw className="spin"/><strong>Завантажую команду…</strong></div>}
   </div>
  </section>
 </div>
}
