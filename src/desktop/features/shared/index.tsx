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
import {showError} from '../../components/Toast';
import {Panel} from '../../components/Panel';
export function SimpleTable({endpoint,keyName,title,type}:{endpoint:string;keyName:string;title:string;type:string}){
 const [rows,setRows]=useState<any[]>([]);useEffect(()=>{api(endpoint).then(d=>setRows(d[keyName]||[])).catch(showError)},[endpoint]);
 const heads=type==='cars'?['Авто','Власник','Телефон','Номер','Останній сервіс','Візити']:type==='clients'?['Клієнт','Телефон','Tier','Авто','Візит','LTV']:type==='services'?['Послуга','Slug','Ціна','Валюта','Тривалість','Статус']:type==='staff'?['Співробітник','Username','Role','Status','Last seen']:['Час','Actor','Role','Дія','Entity','ID'];
 return <Panel title={title+' · '+rows.length}><div className="desk-table-wrap"><table><thead><tr>{heads.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((x:any,i)=><tr key={x.id||i}>{type==='cars'?<><td><b>{[x.brand,x.model].filter(Boolean).join(' ')}</b><small>{x.name}</small></td><td>{x.first_name||x.username}</td><td>{x.phone_number||'—'}</td><td>{x.plate||'—'}</td><td>{dt(x.last_service)}</td><td>{x.visits||0}</td></>:type==='clients'?<><td><b>{x.first_name||x.username}</b><small>{x.username?'@'+x.username:''}</small></td><td>{x.phone_number||'—'}</td><td>{x.client_tier||'STANDARD'}</td><td>{x.cars||0}</td><td>{dt(x.last_visit)}</td><td>{money(x.lifetime_value||0,'PLN')}</td></>:type==='services'?<><td><b>{x.title}</b></td><td>{x.slug}</td><td>{x.base_price}</td><td>{x.base_currency}</td><td>{x.duration_min} min</td><td>{x.enabled?'Enabled':'Disabled'}</td></>:type==='staff'?<><td><b>{x.first_name}</b></td><td>{x.username?'@'+x.username:'—'}</td><td>{x.role}</td><td>{x.status}</td><td>{dt(x.last_seen_at)}</td></>:<><td>{dt(x.created_at)}</td><td>{x.first_name||x.username||'System'}</td><td>{x.role||'—'}</td><td><b>{x.action}</b></td><td>{x.entity_type||'—'}</td><td>{x.entity_id||'—'}</td></>}</tr>)}</tbody></table></div></Panel>
}
