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
import {Panel} from '../../components/Panel';
export function StaffManagement({role}:{role:Role}){
 const [rows,setRows]=useState<any[]>([]),[username,setUsername]=useState(''),[newRole,setNewRole]=useState<'ADMIN'|'MANAGER'>('MANAGER'),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 const load=()=>api('/api/desktop/staff').then(d=>setRows(d.staff||[]));useEffect(()=>{load()},[]);
 const add=async()=>{setBusy(true);setMsg('');try{const d=await post('/api/desktop/admin-hub/staff-role',{username,role:newRole});setMsg(d.known?'✅ Роль призначено':'🕓 Invite: '+d.inviteUrl);setUsername('');load()}catch(e:any){setMsg('⚠️ '+e.message)}finally{setBusy(false)}};
 const change=async(id:number,next:string,managementLanguage?:string)=>{await post('/api/desktop/admin-hub/staff-role/'+id,{role:next,managementLanguage},'PATCH');load()};
 return <><div className="staff-head"><div><span className="desk-eyebrow">TEAM ACCESS</span><h2>Персонал</h2><p>Та сама логіка ролей, що в Telegram Bot Panel. Невідомому @username генерується перевірене invite-посилання.</p></div></div><Panel title="Додати Staff"><div className="staff-add-form"><input value={username} onChange={e=>setUsername(e.target.value)} placeholder="@username"/><select value={newRole} onChange={e=>setNewRole(e.target.value as any)}><option value="MANAGER">Manager</option>{role==='OWNER'&&<option value="ADMIN">Admin</option>}</select><button className="desk-primary" disabled={!username.trim()||busy} onClick={add}><Plus/>{busy?'…':'Додати'}</button></div>{msg&&<p className="staff-invite-msg">{msg}</p>}</Panel><Panel title={'Команда · '+rows.length}><div className="staff-manage-list">{rows.map(x=><div key={x.id}><span><b>{x.first_name||x.username||x.id}</b><small>{x.username?'@'+x.username:''} · {x.telegram_user_id}</small></span><strong>{x.role}</strong><div className="staff-row-controls">{x.role!=='OWNER'&&<select value={x.role} onChange={e=>change(x.id,e.target.value,x.management_language||'en')}><option value="MANAGER">MANAGER</option>{role==='OWNER'&&<option value="ADMIN">ADMIN</option>}<option value="CLIENT">REMOVE STAFF</option></select>}<select value={x.management_language||'en'} onChange={e=>change(x.id,x.role,e.target.value)}><option value="uk">UA</option><option value="pl">PL</option><option value="en">EN</option></select></div></div>)}</div></Panel></>
}

