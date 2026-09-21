import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Home,Sparkles,Calculator,Crown,UserRound,ChevronRight,Car,ShieldCheck,Droplets,Gem,Gift,Globe2,Check,ArrowLeft,Loader2,Phone,Clock3,X,TriangleAlert} from 'lucide-react';
import {api,Service,Session} from './lib/api';
import {haptic,initTelegram,notify,openBot,telegramLanguage} from './lib/telegram';
import {dict,Locale,normalizeLocale,splashSlogan} from './locales';
import {motion} from './config/motion';

type Tab='home'|'services'|'calculator'|'vip'|'profile';
const vehicles=[['sedan','Sedan'],['hatchback','Hatchback'],['suv','SUV'],['large-suv','Large SUV'],['van','Van']];
const conditions=[['light','Light'],['normal','Normal'],['dirty','Dirty'],['very-dirty','Very Dirty']];
const options=[['pet-hair','Pet hair',30],['ceramic-spray','Ceramic spray',40],['odor','Odor removal',25]];
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));

export function App(){
 const [session,setSession]=useState<Session|null>(null),[services,setServices]=useState<Service[]>([]),[tab,setTab]=useState<Tab>('home');
 const initialLocale=useMemo(()=>normalizeLocale(telegramLanguage()),[]); const [locale,setLocale]=useState<Locale>(initialLocale),[currency,setCurrency]=useState('PLN');
 const [startup,setStartup]=useState({stage:'INIT',progress:15,error:''}),[splash,setSplash]=useState(true);
 useEffect(()=>{initTelegram();(async()=>{const started=Date.now();try{
   setStartup({stage:'AUTH',progress:35,error:''}); const s=await api.session();
   setStartup({stage:'PROFILE',progress:55,error:''}); const resolved=normalizeLocale(s.user.locale||telegramLanguage()); setLocale(resolved); setCurrency(s.user.currency||'PLN'); setSession(s);
   setStartup({stage:'CONFIG',progress:80,error:''}); const sv=await api.services(resolved); setServices(sv.services);
   setStartup({stage:'READY',progress:100,error:''}); const elapsed=Date.now()-started;if(elapsed<motion.splashMin)await wait(motion.splashMin-elapsed);await wait(160);setSplash(false);
  }catch(e:any){setStartup(x=>({...x,error:e?.message||'Startup failed'}));}})()},[]);
 const t=dict[locale]; const goto=(x:Tab)=>{haptic();setTab(x);scrollTo({top:0,behavior:'smooth'})};
 if(splash)return <StartupSplash locale={locale} startup={startup} onRetry={()=>location.reload()}/>;
 if(!session)return <StateScreen title="Chameleon Detailing" text={startup.error||'Unable to start'} action={()=>location.reload()} actionLabel="Retry"/>;
 if(session.blocked)return <StateScreen title={t.blockedTitle} text={session.blockedReason||t.blockedText} action={()=>openBot('support')} actionLabel="Support"/>;
 if(session.maintenance&&session.user.role!=='OWNER')return <StateScreen title={t.maintenanceTitle} text={t.maintenanceText} action={()=>location.reload()} actionLabel={t.retry}/>;
 return <div className="app">
  <header><div className="brand"><img className="logo" src="/brand/chameleon-logo.webp"/><div><b>Chameleon Detailing</b><span>mini app</span></div></div><button className="pill" onClick={()=>setLocale(locale==='uk'?'pl':locale==='pl'?'en':'uk')}><Globe2 size={16}/>{locale.toUpperCase()}</button></header>
  <main>
   {!session.schedule.isOpen&&<HolidayBanner t={t} schedule={session.schedule}/>} 
   {tab==='home'&&<HomePage t={t} services={services} goto={goto} currency={currency}/>} 
   {tab==='services'&&<ServicesPage t={t} services={services} goto={goto} currency={currency}/>} 
   {tab==='calculator'&&<CalculatorPage t={t} services={services} currency={currency} schedule={session.schedule}/>} 
   {tab==='vip'&&<VipPage t={t} tier={session.user.tier}/>} 
   {tab==='profile'&&<ProfilePage t={t} session={session} locale={locale} setLocale={setLocale} currency={currency} setCurrency={setCurrency}/>} 
  </main>
  <nav>{([['home',Home,t.home],['services',Sparkles,t.services],['calculator',Calculator,t.calculator],['vip',Crown,t.vip],['profile',UserRound,t.profile]] as any).map(([id,I,label]:any)=><button className={tab===id?'active':''} onClick={()=>goto(id)} key={id}><I/><span>{label}</span></button>)}</nav>
 </div>
}
function StartupSplash({locale,startup,onRetry}:any){return <div className={`startup-splash ${startup.stage==='READY'?'ready':''}`}><div className="splash-glow"/><img src="/brand/chameleon-logo.webp" className="splash-logo"/><h1>Chameleon Detailing</h1><div className="startup-progress"><i style={{width:`${startup.progress}%`}}/></div><b className="startup-stage">{startup.stage}</b><p>{splashSlogan[locale]||splashSlogan.en}</p>{startup.error&&<div className="startup-error"><TriangleAlert/><span>{startup.error}</span><button onClick={onRetry}>Retry</button></div>}</div>}
function StateScreen({title,text,action,actionLabel}:any){return <div className="state-screen"><img src="/brand/chameleon-logo.webp" className="logo xl"/><h1>{title}</h1><p>{text}</p>{action&&<button className="primary" onClick={action}>{actionLabel}</button>}</div>}
function HolidayBanner({t,schedule}:any){return <div className="holiday-banner"><Clock3/><div><b>{t.holidayTitle}</b><span>{t.holidayText}{schedule.nextWorkingAt?` · ${new Date(schedule.nextWorkingAt).toLocaleString()}`:''}</span></div></div>}
function HomePage({t,services,goto,currency}:any){return <><section className="hero"><div className="eyebrow">PREMIUM CAR CARE</div><h1>{t.hero}</h1><p>{t.sub}</p><button className="primary" onClick={()=>goto('calculator')}><Calculator/> {t.calculate}<ChevronRight/></button><div className="hero-badges"><span><ShieldCheck/>Deep clean</span><span><Droplets/>Protection</span><span><Gem/>Premium results</span></div></section><section><div className="section-title"><h2>{t.popular}</h2><button onClick={()=>goto('services')}>{t.services}<ChevronRight/></button></div><div className="service-grid">{services.slice(0,4).map((s:any)=><article className="service-card" key={s.slug}><div className="service-art"><Car/></div><div><h3>{s.title}</h3><p>{s.description}</p><b>{t.from} {money(s.basePrice,s.currency||currency)}</b></div></article>)}</div></section><section className="ref-card"><Gift/><div><h3>{t.referral}</h3><p>Cleaner cars. Better days.</p></div><ChevronRight/></section></>}
function ServicesPage({t,services,goto,currency}:any){return <section><div className="page-head"><span>02</span><div><h1>{t.services}</h1><p>Browse our care menu</p></div></div><div className="stack">{services.map((s:any)=><article className="list-card" key={s.slug}><div className="service-art small"><Sparkles/></div><div className="grow"><h3>{s.title}</h3><p>{s.description}</p><b>{t.from} {money(s.basePrice,s.currency||currency)} · {s.durationMin} min</b></div><button className="icon-btn" onClick={()=>goto('calculator')}><ChevronRight/></button></article>)}</div></section>}
function CalculatorPage({t,services,currency,schedule}:any){
 const [step,setStep]=useState(1),[service,setService]=useState(services[0]?.slug||''),[vehicle,setVehicle]=useState('sedan'),[condition,setCondition]=useState('normal'),[extra,setExtra]=useState<string[]>([]),[quote,setQuote]=useState<any>(null),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[processing,setProcessing]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''); const timers=useRef<any[]>([]);
 useEffect(()=>{if(!service&&services[0])setService(services[0].slug)},[services,service]); useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
 const calculate=async()=>{setBusy(true);setError('');setProcessing(true);setStatus(t.processing1);const started=Date.now();timers.current=[setTimeout(()=>setStatus(t.processing2),260),setTimeout(()=>setStatus(t.processing3),520)];try{const q=await api.quote({service,vehicle,condition,options:extra,currency});const left=motion.calculatorOverlayMin-(Date.now()-started);if(left>0)await wait(left);setStatus(t.ready);await wait(160);setQuote(q);setProcessing(false);notify('success')}catch(e:any){setError(e.message);setProcessing(false);notify('error')}finally{setBusy(false)}};
 const next=()=>step<4?setStep(step+1):calculate();
 const send=async(requestType='STANDARD')=>{setBusy(true);setError('');try{await api.request({service,vehicle,condition,options:extra,currency,requestType});setSent(true);notify('success')}catch(e:any){setError(e.message);notify('error')}finally{setBusy(false)}};
 const title=step===1?t.need:step===2?t.vehicle:step===3?t.condition:t.extras;
 return <section><div className="calc-top"><div className="steps">{[1,2,3,4].map(n=><i className={n<=step?'on':''} key={n}>{n<step?<Check/>:n}</i>)}</div><h1>{title}</h1></div>
 {step===1&&<div className="choice-list">{services.map((s:any)=><Choice key={s.slug} on={()=>setService(s.slug)} active={service===s.slug} title={s.title} sub={s.description}/>)}</div>}
 {step===2&&<div className="choice-grid">{vehicles.map(([id,name])=><Choice key={id} on={()=>setVehicle(id)} active={vehicle===id} title={name} icon={<Car/>}/>)}</div>}
 {step===3&&<div className="choice-list">{conditions.map(([id,name])=><Choice key={id} on={()=>setCondition(id)} active={condition===id} title={name}/>)}</div>}
 {step===4&&<div className="choice-list">{options.map(([id,name,price]:any)=><Choice key={id} on={()=>setExtra(extra.includes(id)?extra.filter(x=>x!==id):[...extra,id])} active={extra.includes(id)} title={name} sub={`+ ${price} PLN`}/>)}</div>}
 <div className="calc-actions">{step>1&&<button className="secondary" onClick={()=>setStep(step-1)}><ArrowLeft/></button>}<button className="primary grow" onClick={next} disabled={busy}>{busy?<Loader2 className="spin"/>:step===4?t.calculate:'Continue'}<ChevronRight/></button></div>
 {processing&&<ProcessingOverlay t={t} status={status}/>} {quote&&<ResultModal t={t} q={quote} sent={sent} busy={busy} error={error} schedule={schedule} onClose={()=>setQuote(null)} onEdit={()=>{setQuote(null);setStep(1)}} onSend={send}/>} {error&&!quote&&!processing&&<div className="inline-error"><TriangleAlert/>{error}</div>}
 </section>}
function ProcessingOverlay({t,status}:any){return <div className="overlay-backdrop"><div className="processing-card"><img src="/brand/chameleon-logo.webp"/><h3>{t.processing}</h3><div className="loader-bar"><i/></div><p>{status}</p></div></div>}
function ResultModal({t,q,sent,busy,error,schedule,onClose,onEdit,onSend}:any){return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="result-modal"><button className="modal-close" onClick={onClose}><X/></button><span className="eyebrow">✨ {t.result}</span><strong>{money(q.finalPrice,q.currency)}</strong><div className="breakdown"><p><span>Base</span><b>{money(q.basePrice,q.currency)}</b></p><p><span>Vehicle</span><b>× {q.vehicleMultiplier}</b></p><p><span>Condition</span><b>× {q.conditionMultiplier}</b></p><p><span>Options</span><b>{money(q.optionsTotal,q.currency)}</b></p>{q.discount>0&&<p className="lime"><span>VIP</span><b>-{money(q.discount,q.currency)}</b></p>}</div>{q.fxTimestamp&&<small>FX: {q.fxProvider} · {new Date(q.fxTimestamp).toLocaleString()}</small>}{sent?<div className="success"><Check/>{t.sent}</div>:<div className="modal-actions">{schedule.isOpen?<button className="primary" onClick={()=>onSend('STANDARD')} disabled={busy}>{t.send}</button>:<><button className="primary" onClick={()=>onSend('DEFERRED')} disabled={busy}>{t.deferred}</button>{schedule.emergencyEnabled&&<button className="warning-btn" onClick={()=>onSend('EMERGENCY')} disabled={busy}>{t.emergency} ×{schedule.emergencyMultiplier}</button>}</>}<button className="secondary wide" onClick={onEdit}>{t.edit}</button></div>}{error&&<div className="inline-error"><TriangleAlert/>{error}</div>}</div></div>}
function Choice({active,on,title,sub,icon}:any){return <button className={`choice ${active?'selected':''}`} onClick={()=>{haptic();on()}}>{icon&&<span className="choice-icon">{icon}</span>}<span className="grow"><b>{title}</b>{sub&&<small>{sub}</small>}</span><i>{active?<Check/>:<ChevronRight/>}</i></button>}
function VipPage({t,tier}:any){return <section><div className="vip-card"><Crown/><div><span>{tier||'STANDARD'}</span><h1>{t.vipTitle}</h1><p>{t.vipText}</p></div></div></section>}
function ProfilePage({t,session,locale,setLocale,currency,setCurrency}:any){return <section><div className="profile-card"><div className="avatar">{(session.user.firstName||'C')[0]}</div><div><h2>{session.user.firstName}</h2><p>{session.user.username?'@'+session.user.username:'Telegram user'} · {session.user.role}</p></div></div><div className="settings-card"><label><Globe2/>{t.language}<select value={locale} onChange={e=>setLocale(e.target.value)}><option value="uk">Українська</option><option value="pl">Polski</option><option value="en">English</option></select></label><label><Gem/>{t.currency}<select value={currency} onChange={e=>setCurrency(e.target.value)}><option>PLN</option><option>USD</option><option>UAH</option></select></label><button className="profile-action" onClick={()=>openBot('phone')}><Phone/><span><b>{t.sharePhone}</b><small>{session.user.phoneShared?'✓ Telegram contact saved':t.phoneHint}</small></span><ChevronRight/></button></div></section>}
const money=(v:number,c:string)=>new Intl.NumberFormat(undefined,{style:'currency',currency:c||'PLN',maximumFractionDigits:2}).format(Number(v||0));
