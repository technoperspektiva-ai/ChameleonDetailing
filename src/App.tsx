import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Home,Sparkles,Calculator,Crown,UserRound,ChevronRight,Car,ShieldCheck,Droplets,Gem,Gift,Globe2,Check,ArrowLeft,Loader2,MessageCircle,Clock3,X,TriangleAlert,ClipboardList,RefreshCw,Trash2,Pencil,History,Wrench} from 'lucide-react';
import {api,Service,ServiceOption,Session,ClientCar} from './lib/api';
import {haptic,initTelegram,notify,openBot,openExternal,shareTelegramLink,telegramLanguage} from './lib/telegram';
import {createTranslator,Locale,localeLabels,localeNames,normalizeLocale,splashSlogan,supportedLocales,TranslationKey} from './locales';
import {motion} from './config/motion';
import {carBrands,modelsForBrand} from './config/carCatalog';
import {carBrandSpriteStyle,carBrandStandaloneIconSrc} from './config/carBrandAssets';
import {hasApprovedIcon} from './config/serviceIconAssets';
import {ApprovedServiceIcon} from './components/ApprovedServiceIcon';
import {PremiumMainServiceIcon} from './components/PremiumMainServiceIcon';

type Tab='home'|'services'|'calculator'|'vip'|'profile'|'orders'|'cars';
type SocialLink={type:string;url:string};
type Specialist={id:number;name:string;roleTitle?:string;portfolioUrl?:string;contactUrl?:string;contactLabel?:string;photoUrl?:string};
const vehicles=[['sedan','vehicle.sedan','/miniapp-vehicle-icons/sedan.webp'],['hatchback','vehicle.hatchback','/miniapp-vehicle-icons/hatchback.webp'],['suv','vehicle.suv','/miniapp-vehicle-icons/suv.webp'],['large-suv','vehicle.largeSuv','/miniapp-vehicle-icons/large-suv.webp'],['van','vehicle.van','/miniapp-vehicle-icons/van.webp']] as const;
const conditions=[['light','condition.light'],['normal','condition.normal'],['dirty','condition.dirty'],['very-dirty','condition.veryDirty']] as const;
const canonicalBodyTypes=['sedan','hatchback','suv','large-suv','van'] as const;
const mainServiceSlugs=new Set(['exterior-detailing','interior-detailing','full-detailing','ceramic-coating']);
const bodyTypeLabel=(locale:Locale,type:string)=>({sedan:ui3(locale,'Седан','Sedan','Sedan'),hatchback:ui3(locale,'Хетчбек / універсал','Hatchback / kombi','Hatchback / wagon'),suv:'SUV','large-suv':ui3(locale,'Великий SUV','Duży SUV','Large SUV'),van:ui3(locale,'Вен / бус','Van / bus','Van / bus')} as Record<string,string>)[type]||type;
const carVehicleType=(bodyType?:string)=>{const v=String(bodyType||'').trim().toLowerCase();if(['sedan','saloon','coupe','coupé','convertible','roadster','купе','кабріолет','кабриолет'].includes(v))return 'sedan';if(['hatchback','wagon','estate','touring','kombi','універсал','универсал','shooting-brake'].includes(v))return 'hatchback';if(['suv','crossover','кросовер','кроссовер'].includes(v))return 'suv';if(['large-suv','large suv','full-size suv'].includes(v))return 'large-suv';if(['van','minivan','bus','вен','бус'].includes(v))return 'van';return ''};
function BrandBadge({brand}:{brand?:string}){
 const src=carBrandStandaloneIconSrc(brand);
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[src]);
 if(src&&!failed)return <span className="brand-badge approved-brand-icon standalone-brand-icon" aria-label={brand||'Car'}><img src={src} alt="" aria-hidden="true" onError={()=>setFailed(true)}/></span>;
 return <span className="brand-badge approved-brand-icon" aria-label={brand||'Car'} style={carBrandSpriteStyle(brand)}/>;
}
function CarIdentityIcon({brand}:{brand?:string;model?:string}){return <BrandBadge brand={brand}/>} 

const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const friendlyError=(e:unknown,t:(key:TranslationKey)=>string)=>{const m=e instanceof Error?e.message:String(e||'');if(/BOT_TOKEN/i.test(m))return t('errors.botToken');if(/Invalid or expired Telegram session/i.test(m))return t('errors.telegramSession');if(/maintenance/i.test(m))return t('errors.maintenance');if(/Access limited/i.test(m))return t('errors.accessLimited');if(/outside working hours/i.test(m))return t('errors.outsideHours');if(/Emergency mode/i.test(m))return t('errors.emergencyUnavailable');if(/60 minutes/i.test(m))return t('errors.rateLimit');return t('errors.generic')};
type SeasonalTheme='DEFAULT'|'HALLOWEEN'|'NEW_YEAR'|'EASTER'|undefined;
const seasonalDecorPlacements=[
 {left:'4%',top:'14%',size:22,dur:17,delay:-2,alpha:.18},{left:'82%',top:'16%',size:24,dur:18,delay:-6,alpha:.16},
 {left:'12%',top:'26%',size:28,dur:22,delay:-8,alpha:.18},{left:'70%',top:'28%',size:20,dur:16,delay:-4,alpha:.15},
 {left:'88%',top:'33%',size:30,dur:19,delay:-10,alpha:.17},{left:'7%',top:'42%',size:24,dur:18,delay:-1,alpha:.14},
 {left:'58%',top:'41%',size:22,dur:20,delay:-12,alpha:.15},{left:'25%',top:'50%',size:34,dur:24,delay:-9,alpha:.16},
 {left:'78%',top:'54%',size:26,dur:18,delay:-3,alpha:.14},{left:'9%',top:'62%',size:24,dur:21,delay:-11,alpha:.13},
 {left:'50%',top:'62%',size:20,dur:16,delay:-5,alpha:.12},{left:'86%',top:'68%',size:28,dur:22,delay:-14,alpha:.16},
 {left:'18%',top:'74%',size:30,dur:20,delay:-13,alpha:.14},{left:'64%',top:'77%',size:22,dur:17,delay:-7,alpha:.13},
 {left:'40%',top:'84%',size:26,dur:23,delay:-15,alpha:.12},{left:'90%',top:'86%',size:24,dur:19,delay:-9,alpha:.14}
] as const;
const seasonalDecorIcons:Record<Exclude<SeasonalTheme,undefined>,string[]>={
 DEFAULT:[],
 HALLOWEEN:['🎃','💀','🕯️','⚰️','🪦','🦇','🍬','🕸️'],
 NEW_YEAR:['❄️','🎄','✨','🎁','🌟','☃️','🧣','🔔'],
 EASTER:['🥚','🐣','🐇','🌸','🪻','🧺','✨','🌼']
};
const applyTheme=(theme?:Session['theme'])=>{
 const root=document.documentElement;
 root.style.setProperty('--h1',theme?.fontH1||'clamp(1.7rem,7vw,2.35rem)');
 root.style.setProperty('--h2',theme?.fontH2||'clamp(1.25rem,5.4vw,1.6rem)');
 root.style.setProperty('--body',theme?.fontBody||'clamp(.94rem,3.8vw,1rem)');
 root.style.setProperty('--small',theme?.fontSmall||'clamp(.78rem,3.2vw,.875rem)');
 const seasonal=(theme?.seasonalTheme||'DEFAULT').toUpperCase();
 const seasonalColors:Record<string,string>={HALLOWEEN:'#ff8a00',NEW_YEAR:'#4de8ff',EASTER:'#ff86d8'};
 const base=/^#[0-9a-f]{6}$/i.test(theme?.neonColor||'')?(theme?.neonColor as string):'#a4ff00';
 root.style.setProperty('--neon-color',seasonalColors[seasonal]||base);
 for(const cls of ['theme-halloween','theme-new-year','theme-easter'])root.classList.remove(cls);
 if(seasonal==='HALLOWEEN')root.classList.add('theme-halloween');
 if(seasonal==='NEW_YEAR')root.classList.add('theme-new-year');
 if(seasonal==='EASTER')root.classList.add('theme-easter');
 const rainbow=seasonal==='DEFAULT'&&theme?.neonMode==='RAINBOW';
 root.classList.toggle('theme-rainbow',rainbow);
 root.classList.toggle('theme-static',!rainbow);
};

export function App(){
 const initialTab=useMemo<Tab>(()=>{const v=new URLSearchParams(location.search).get('startapp');return v==='calculator'||v==='orders'||v==='cars'?v:'home'},[]);
 const [session,setSession]=useState<Session|null>(null),[services,setServices]=useState<Service[]>([]),[serviceOptions,setServiceOptions]=useState<ServiceOption[]>([]),[content,setContent]=useState<Record<string,string>>({}),[socials,setSocials]=useState<SocialLink[]>([]),[specialists,setSpecialists]=useState<Specialist[]>([]),[cars,setCars]=useState<ClientCar[]>([]),[tab,setTab]=useState<Tab>(initialTab);
 const initialLocale=useMemo(()=>normalizeLocale(localStorage.getItem('chameleon.locale')||telegramLanguage()||navigator.language),[]);
 const [locale,setLocaleState]=useState<Locale>(initialLocale),[currency,setCurrency]=useState('PLN');
 const [startup,setStartup]=useState({stage:'INIT',progress:15,error:''}),[splash,setSplash]=useState(true),[directWebBlocked,setDirectWebBlocked]=useState(false),[serviceUnavailable,setServiceUnavailable]=useState(false);
 const t=useMemo(()=>createTranslator(locale),[locale]);
 const setLocale=(next:Locale)=>{localStorage.setItem('chameleon.locale',next);setLocaleState(next)};
 const cycleLocale=()=>{const i=supportedLocales.indexOf(locale);setLocale(supportedLocales[(i+1)%supportedLocales.length]||'en')};

 useEffect(()=>{document.documentElement.lang=locale},[locale]);
 useEffect(()=>{applyTheme(session?.theme)},[session?.theme?.fontH1,session?.theme?.fontH2,session?.theme?.fontBody,session?.theme?.fontSmall,session?.theme?.neonMode,session?.theme?.neonColor,session?.theme?.seasonalMode,session?.theme?.seasonalTheme]);
 useEffect(()=>{initTelegram();(async()=>{const started=Date.now();try{
   setStartup({stage:'AUTH',progress:35,error:''});
   const s=await api.session();
   setStartup({stage:'PROFILE',progress:55,error:''});
   const saved=localStorage.getItem('chameleon.locale');
   const resolved=normalizeLocale(saved||s.user.locale||telegramLanguage());
   const resolvedCurrency=(s.user.currency||'PLN').toUpperCase();
   setLocale(resolved);setCurrency(resolvedCurrency);setSession(s);
   setStartup({stage:'CONFIG',progress:80,error:''});
   const [sv,opt,ct,sc,sp,cr]=await Promise.all([api.services(resolved,resolvedCurrency),api.options(resolved,resolvedCurrency),api.content(resolved),api.socials(),api.specialists(),api.cars()]);
   setServices(sv.services);setServiceOptions(opt.options||[]);setContent(ct.content||{});setSocials(Array.isArray(sc.socials)?sc.socials:[]);setSpecialists(Array.isArray(sp.specialists)?sp.specialists:[]);setCars(Array.isArray(cr.cars)?cr.cars:[]);
   setStartup({stage:'READY',progress:100,error:''});
   const elapsed=Date.now()-started;if(elapsed<motion.splashMin)await wait(motion.splashMin-elapsed);await wait(160);setSplash(false);
  }catch(e:unknown){const raw=e instanceof Error?e.message:String(e||'');if(raw==='DIRECT_WEB_DISABLED'){setDirectWebBlocked(true);setSplash(false);return}if(raw==='SERVICE_TEMPORARILY_UNAVAILABLE_404'){setServiceUnavailable(true);setSplash(false);return}setStartup(x=>({...x,error:friendlyError(e,t)}));}})()},[]);
 useEffect(()=>{if(!session)return;Promise.all([api.services(locale,currency),api.options(locale,currency),api.content(locale)]).then(([x,opt,ct])=>{setServices(x.services);setServiceOptions(opt.options||[]);setContent(ct.content||{})}).catch(()=>{})},[locale,currency,session]);
 useEffect(()=>{if(!session)return;let stopped=false;const refresh=()=>Promise.all([api.socials(),api.specialists()]).then(([sc,sp])=>{if(stopped)return;setSocials(Array.isArray(sc.socials)?sc.socials:[]);setSpecialists(Array.isArray(sp.specialists)?sp.specialists:[])}).catch(()=>{});const timer=setInterval(refresh,30000);const onVisibility=()=>{if(document.visibilityState==='visible')refresh()};document.addEventListener('visibilitychange',onVisibility);return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility)}},[!!session]);
 // Staff can change opening hours from Telegram while the Mini App is already open.
 // Refresh runtime business state automatically so the closed/open banner follows D1
 // without forcing the client to kill and reopen Telegram.
 useEffect(()=>{if(!session)return;let stopped=false;const refresh=()=>api.session().then(fresh=>{if(stopped)return;setSession(prev=>prev?{...prev,...fresh,user:{...prev.user,...fresh.user}}:fresh)}).catch(()=>{});const timer=setInterval(refresh,15000);const onVisibility=()=>{if(document.visibilityState==='visible')refresh()};document.addEventListener('visibilitychange',onVisibility);return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility)}},[!!session]);
 const goto=(x:Tab)=>{haptic();setTab(x);scrollTo({top:0,behavior:'smooth'})};
 if(splash)return <StartupSplash locale={locale} startup={startup} onRetry={()=>location.reload()} t={t}/>;
 if(directWebBlocked)return <DirectWebGate locale={locale}/>;
 if(serviceUnavailable||session?.blocked)return <Unavailable404 locale={locale}/>;
 if(!session)return <StateScreen title="Chameleon Detailing" text={startup.error||t('errors.startup')} action={()=>location.reload()} actionLabel={t('common.retry')}/>;
 if(session.maintenance&&session.user.role!=='OWNER')return <StateScreen title={t('maintenance.title')} text={t('maintenance.text')} action={()=>location.reload()} actionLabel={t('common.retry')}/>;
 return <div className={`app ${tab==='calculator'?'calculator-active':''}`}><SeasonalDecor theme={session.theme?.seasonalTheme}/>
  <header><div className="brand"><img className="logo" src="/brand/chameleon-logo.webp" alt="Chameleon Detailing"/><div><b>Chameleon Detailing</b><span>{t('common.miniApp')}</span></div></div><button className="pill" aria-label={t('profile.language')} onClick={cycleLocale}><Globe2 size={16}/>{localeLabels[locale]}</button></header>
  <main>
   {!session.schedule.isOpen&&tab!=='calculator'&&<HolidayBanner t={t} schedule={session.schedule} locale={locale}/>}
   {tab==='home'&&<HomePage t={t} services={services} goto={goto} currency={currency} content={content} socials={socials} specialists={specialists} locale={locale}/>}
   {tab==='services'&&<ServicesPage t={t} services={services} goto={goto} currency={currency}/>}
   {tab==='calculator'&&<CalculatorPage t={t} services={services} options={serviceOptions} currency={currency} schedule={session.schedule} cars={cars} refreshCars={()=>api.cars().then(x=>setCars(x.cars||[]))} locale={locale} goto={goto} referralReward={session.referralReward}/>}
   {tab==='vip'&&<VipPage t={t} tier={session.user.tier}/>}
   {tab==='profile'&&<ProfilePage t={t} session={session} locale={locale} setLocale={setLocale} currency={currency} setCurrency={setCurrency} goto={goto}/>}
   {tab==='orders'&&<OrdersPage t={t} currency={currency} services={services} locale={locale}/>} 
   {tab==='cars'&&<CarsPage locale={locale} cars={cars} services={services} options={serviceOptions} goto={goto} refresh={()=>api.cars().then(x=>setCars(x.cars||[]))}/>}
  </main>
  <nav aria-label="Primary">{([['home',Home,t('nav.home')],['cars',Car,ui3(locale,'Автопарк','Garaż','Garage')],['services',Sparkles,t('nav.services')],['calculator',Calculator,t('nav.calculator')],['vip',Crown,t('nav.vip')],['profile',UserRound,t('nav.profile')]] as any).map(([id,I,label]:any)=><button className={tab===id?'active':''} onClick={()=>goto(id)} key={id} aria-label={label} title={label}><I/><span className="nav-label">{label}</span></button>)}</nav>
 </div>
}
function SeasonalDecor({theme}:{theme?:SeasonalTheme}){
 const key=((theme||'DEFAULT').toUpperCase()) as Exclude<SeasonalTheme,undefined>;
 const icons=seasonalDecorIcons[key]||[];
 if(!icons.length)return null;
 return <div className={`seasonal-decor seasonal-${key.toLowerCase().replace(/_/g,'-')}`} aria-hidden="true">{seasonalDecorPlacements.map((p,idx)=><span key={idx} className="seasonal-decor-item" style={{left:p.left,top:p.top,fontSize:`${p.size}px`,animationDuration:`${p.dur}s`,animationDelay:`${p.delay}s`,opacity:p.alpha}}>{icons[idx%icons.length]}</span>)}</div>}
function DirectWebGate({locale}:{locale:Locale}){const copy={uk:{title:'Найкраще працює прямо в Telegram',text:'Цей веб-вхід зараз закритий. Відкрий Chameleon Detailing у Telegram — там доступні твій профіль, заявки, персональні умови та всі можливості сервісу.',button:'Відкрити в Telegram'},pl:{title:'Najlepiej działa bezpośrednio w Telegramie',text:'Dostęp przez zwykły link jest teraz wyłączony. Otwórz Chameleon Detailing w Telegramie — tam znajdziesz swój profil, zlecenia i pełną funkcjonalność.',button:'Otwórz w Telegramie'},en:{title:'Best experienced directly in Telegram',text:'Direct web access is currently turned off. Open Chameleon Detailing in Telegram for your profile, requests, personal offers and the full experience.',button:'Open in Telegram'}}[locale];return <div className="web-gate"><div className="web-gate-glow"/><div className="web-gate-card"><img src="/brand/chameleon-logo.webp" alt="Chameleon Detailing"/><span className="eyebrow">CHAMELEON DETAILING</span><h1>{copy.title}</h1><p>{copy.text}</p><button className="primary" onClick={()=>openBot()}><MessageCircle/><span>{copy.button}</span><ChevronRight/></button></div></div>}
function StartupSplash({locale,startup,onRetry,t}:any){const stageKey:{[k:string]:TranslationKey}={INIT:'loading.init',AUTH:'loading.auth',PROFILE:'loading.profile',CONFIG:'loading.config',READY:'loading.ready'};return <div className={`startup-splash ${startup.stage==='READY'?'ready':''}`}><div className="splash-glow"/><img src="/brand/chameleon-logo.webp" className="splash-logo" alt=""/><h1>Chameleon Detailing</h1><div className="startup-progress"><i style={{width:`${startup.progress}%`}}/></div><b className="startup-stage">{t(stageKey[startup.stage]||'loading.init')}</b><p>{splashSlogan[locale as Locale]||splashSlogan.en}</p>{startup.error&&<div className="startup-error"><TriangleAlert/><span>{startup.error}</span><button onClick={onRetry}>{t('common.retry')}</button></div>}</div>}
function Unavailable404({locale}:{locale:Locale}){
 const copy:any={
  uk:{title:'404',text:'Сервіс тимчасово недоступний.',hint:'Спробуйте пізніше.'},
  pl:{title:'404',text:'Usługa jest tymczasowo niedostępna.',hint:'Spróbuj ponownie później.'},
  en:{title:'404',text:'Service temporarily unavailable.',hint:'Please try again later.'},
  de:{title:'404',text:'Der Service ist vorübergehend nicht verfügbar.',hint:'Bitte versuchen Sie es später erneut.'},
  fr:{title:'404',text:'Le service est temporairement indisponible.',hint:'Veuillez réessayer plus tard.'}
 }[locale]||{title:'404',text:'Service temporarily unavailable.',hint:'Please try again later.'};
 return <div className="state-screen unavailable-404"><img src="/brand/chameleon-logo.webp" className="logo xl" alt=""/><span className="eyebrow">CHAMELEON DETAILING</span><h1>{copy.title}</h1><p>{copy.text}</p><small>{copy.hint}</small></div>
}
function StateScreen({title,text,action,actionLabel}:any){return <div className="state-screen"><img src="/brand/chameleon-logo.webp" className="logo xl" alt=""/><h1>{title}</h1><p>{text}</p>{action&&<button className="primary" onClick={action}>{actionLabel}</button>}</div>}
function HolidayBanner({t,schedule,locale}:any){return <div className="holiday-banner"><Clock3/><div><b>{t('holiday.title')}</b><span>{t('holiday.text')}{schedule.nextWorkingAt?` · ${new Date(schedule.nextWorkingAt).toLocaleString(locale==='uk'?'uk-UA':locale==='pl'?'pl-PL':'en-US')}`:''}</span></div></div>}
function ServiceArt({service,small=false}:{service:Partial<Service>;small?:boolean}){const image=String(service.imageUrl||'').trim(),slug=String(service.slug||service.iconKey||'custom-service'),isDefault=image.startsWith('/service-icons/');const label=service.title||service.slug||'Service';return <div className={`service-art${small?' small':''}`}>{mainServiceSlugs.has(slug)?<PremiumMainServiceIcon slug={slug} label={label}/>:hasApprovedIcon(slug)&&(!image||isDefault)?<ApprovedServiceIcon slug={slug} label={label}/>:image?<img className="service-art-image" src={image} alt={label}/>:<Sparkles className="service-generic-icon"/>}</div>}

function socialLabel(type:string){const key=String(type||'').toLowerCase();return ({instagram:'Instagram',facebook:'Facebook',tiktok:'TikTok',youtube:'YouTube',telegram:'Telegram',whatsapp:'WhatsApp',website:'Website'} as Record<string,string>)[key]||key.replace(/[_-]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase())}
function SocialIcon({type}:{type:string}){const key=String(type||'').toLowerCase();const common={viewBox:'0 0 24 24',width:24,height:24,fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round' as const,strokeLinejoin:'round' as const,'aria-hidden':true};if(key==='instagram')return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r=".8" fill="currentColor" stroke="none"/></svg>;if(key==='facebook')return <svg {...common}><path d="M14 8.2h3V4.4c-.6-.1-1.8-.2-3.3-.2-3.2 0-5.3 1.9-5.3 5.5V13H5v4.2h3.4V22h4.2v-4.8h3.5l.6-4.2h-4.1V10c0-1.2.3-1.8 1.4-1.8Z" fill="currentColor" stroke="none"/></svg>;if(key==='tiktok')return <svg {...common}><path d="M14.5 4v9.1a4.4 4.4 0 1 1-3.8-4.35"/><path d="M14.5 4c.7 2.5 2.2 3.9 4.5 4.2"/></svg>;if(key==='youtube')return <svg {...common}><path d="M21 8.2a3 3 0 0 0-2.1-2.1C17.1 5.6 12 5.6 12 5.6s-5.1 0-6.9.5A3 3 0 0 0 3 8.2 31 31 0 0 0 2.6 12 31 31 0 0 0 3 15.8a3 3 0 0 0 2.1 2.1c1.8.5 6.9.5 6.9.5s5.1 0 6.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-3.8 31 31 0 0 0-.4-3.8Z"/><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none"/></svg>;if(key==='telegram')return <svg {...common}><path d="M21 4 3.8 10.5c-1 .4-.98 1 .18 1.34l4.4 1.38 1.68 5.1c.2.55.1.77.72.77.48 0 .7-.22.97-.48l2.14-2.08 4.46 3.3c.82.45 1.4.22 1.62-.76L22.7 6c.3-1.2-.46-1.75-1.7-2Z"/><path d="m8.4 13.2 9.3-5.9"/></svg>;if(key==='whatsapp')return <svg {...common}><path d="M20.5 11.8a8.4 8.4 0 0 1-12.4 7.4L3.4 20.5l1.3-4.6A8.4 8.4 0 1 1 20.5 11.8Z"/><path d="M8.4 8.2c.2-.5.4-.5.7-.5h.6c.2 0 .4 0 .6.5l.8 1.9c.1.3.1.5-.1.7l-.6.8c-.2.2-.3.4-.1.7.5 1 1.3 1.8 2.2 2.4.3.2.5.2.7 0l.9-1c.2-.3.5-.3.8-.2l1.9.9c.3.2.5.3.5.5 0 .2-.1 1.2-.7 1.8-.6.7-1.5 1-2.4.9-1-.2-2.4-.6-4.1-2.1-1.3-1.1-2.3-2.6-2.8-4.1-.3-.9 0-2.1 1.1-3.2Z"/></svg>;return <Globe2/>}
function SocialLinksSection({items,locale}:{items:SocialLink[];locale:Locale}){if(!items?.length)return null;const title=locale==='uk'?'Ми в соцмережах':locale==='pl'?'Znajdź nas w social media':'Follow us';const subtitle=locale==='uk'?'Новини, роботи та зв’язок з Chameleon Detailing':locale==='pl'?'Nowości, realizacje i kontakt z Chameleon Detailing':'Updates, recent work and contact with Chameleon Detailing';return <section className="social-section"><div className="social-heading"><span className="eyebrow">SOCIAL</span><h2>{title}</h2><p>{subtitle}</p></div><div className="social-grid">{items.map((item:SocialLink)=><a className="social-link" key={item.type} href={item.url} target="_blank" rel="noreferrer" onClick={e=>{e.preventDefault();haptic();openExternal(item.url)}}><span className="social-icon"><SocialIcon type={item.type}/></span><b>{socialLabel(item.type)}</b><ChevronRight/></a>)}</div></section>}
function SpecialistsSection({items,locale}:{items:Specialist[];locale:Locale}){if(!items?.length)return null;const title=locale==='uk'?'Наші професійні спеціалісти':locale==='pl'?'Nasi profesjonaliści':'Our professionals';const subtitle=locale==='uk'?'Знайомтесь з командою та переглядайте портфоліо':locale==='pl'?'Poznaj zespół i zobacz portfolio':'Meet the team and explore their portfolio';const portfolio=locale==='uk'?'Портфоліо':locale==='pl'?'Portfolio':'Portfolio';return <section className="specialists-section"><div className="social-heading"><span className="eyebrow">TEAM</span><h2>{title}</h2><p>{subtitle}</p></div><div className="specialists-grid">{items.map((x:Specialist)=><article className="specialist-card" key={x.id}><div className="specialist-avatar">{x.photoUrl?<img src={x.photoUrl} alt={x.name}/>:<span>{String(x.name||'?').slice(0,1).toUpperCase()}</span>}</div><div className="specialist-copy"><h3>{x.name}</h3>{x.roleTitle&&<p>{x.roleTitle}</p>}<div className="specialist-links">{x.portfolioUrl&&<a href={x.portfolioUrl} target="_blank" rel="noreferrer" onClick={e=>{e.preventDefault();haptic();openExternal(x.portfolioUrl||'')}}>{portfolio}<ChevronRight/></a>}{x.contactUrl&&<a href={x.contactUrl} target="_blank" rel="noreferrer" onClick={e=>{e.preventDefault();haptic();openExternal(x.contactUrl||'')}}>{x.contactLabel||'Link'}<ChevronRight/></a>}</div></div></article>)}</div></section>}
function HomePage({t,services,goto,currency,content,socials,specialists,locale}:any){const [sharing,setSharing]=useState(false);const referralTitle=content?.['referral.title']||t('home.referral'),referralSubtitle=content?.['referral.subtitle']||t('home.referralSubtitle'),referralShare=content?.['referral.share_text']||t('home.referralShare');const invite=async()=>{if(sharing)return;haptic();setSharing(true);try{const r=await api.referral();shareTelegramLink(r.url,referralShare);notify('success')}catch{notify('error')}finally{setSharing(false)}};return <><section className="hero"><div className="hero-copy"><div className="eyebrow">{t('home.eyebrow')}</div><h1>{t('home.hero')}</h1><p>{t('home.subtitle')}</p><button className="primary" onClick={()=>goto('calculator')}><Calculator/> <span>{t('home.calculate')}</span><ChevronRight/></button></div><div className="hero-mascot" aria-hidden="true"><img src="/brand/chameleon-logo.webp" alt=""/></div><div className="hero-badges"><span><ShieldCheck/>{t('home.benefitClean')}</span><span><Droplets/>{t('home.benefitProtection')}</span><span><Gem/>{t('home.benefitPremium')}</span></div></section><section><div className="section-title"><h2>{t('home.popular')}</h2><button onClick={()=>goto('services')}>{t('nav.services')}<ChevronRight/></button></div><div className="service-grid">{services.filter((s:any)=>Boolean(s.isPopular)).slice(0,4).map((s:any)=><article className="service-card" key={s.slug}><ServiceArt service={s}/><div><h3>{s.title}</h3><p>{s.description}</p><b>{t('home.from')} {money(s.basePrice,s.currency||currency)}</b>{s.standardBasePrice!=null&&Number(s.standardBasePrice)!==Number(s.basePrice)&&<small className="vip-price-note">{s.promotion?`🏷 -${s.promotion.percentDiscount}%`:`💎 ${t('vip.activePrice')}`} · <del>{money(s.standardBasePrice,s.currency||currency)}</del></small>}</div></article>)}</div></section><SpecialistsSection items={specialists||[]} locale={locale}/><SocialLinksSection items={socials||[]} locale={locale}/><button className="ref-card referral-button" onClick={invite} disabled={sharing} aria-busy={sharing}><Gift/><div><h3>{referralTitle}</h3><p>{sharing?t('home.referralPreparing'):referralSubtitle}</p></div>{sharing?<Loader2 className="spin"/>:<ChevronRight/>}</button></>}
function ServicesPage({t,services,goto,currency}:any){return <section><div className="page-head"><span>02</span><div><h1>{t('services.title')}</h1><p>{t('services.subtitle')}</p></div></div><div className="stack">{services.map((s:any)=><article className="list-card" key={s.slug}><ServiceArt service={s} small/><div className="grow"><h3>{s.title}</h3><p>{s.description}</p><b>{t('home.from')} {money(s.basePrice,s.currency||currency)} · {s.durationMin} {t('common.minutes')}</b>{s.standardBasePrice!=null&&Number(s.standardBasePrice)!==Number(s.basePrice)&&<small className="vip-price-note">{s.promotion?`🏷 -${s.promotion.percentDiscount}%`:`💎 ${t('vip.activePrice')}`} · <del>{money(s.standardBasePrice,s.currency||currency)}</del></small>}</div><button className="icon-btn" aria-label={t('home.calculate')} onClick={()=>goto('calculator')}><ChevronRight/></button></article>)}</div></section>}
const ui3=(locale:Locale,uk:string,pl:string,en:string)=>locale==='uk'?uk:locale==='pl'?pl:en;
function CalculatorPage({t,services,options,currency,schedule,cars,refreshCars,locale,goto,referralReward}:any){
 const [carMode,setCarMode]=useState<'own'|'other'|''>(''),[selected,setSelected]=useState<string[]>([]),[vehicle,setVehicle]=useState('sedan'),[condition,setCondition]=useState('normal'),[extra,setExtra]=useState<string[]>([]),[quote,setQuote]=useState<any>(null),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[processing,setProcessing]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''),[carId,setCarId]=useState<number|null>(null),[sheet,setSheet]=useState<'car'|'vehicle'|'condition'|'extras'|null>(null),[previewQuote,setPreviewQuote]=useState<any>(null),[previewBusy,setPreviewBusy]=useState(false);
 const timers=useRef<any[]>([]),previewRequestRef=useRef(0),previewTimerRef=useRef<number|undefined>(undefined);
 const [activeReward,setActiveReward]=useState<any>(referralReward||null);

 useEffect(()=>{setActiveReward(referralReward||null)},[referralReward?.id,referralReward?.type,referralReward?.value,referralReward?.currency,referralReward?.service]);
 useEffect(()=>{let live=true;const loadReward=()=>api.referralStatus(currency).then(x=>{if(live)setActiveReward(x.reward||null)}).catch(()=>{});void loadReward();const timer=window.setInterval(loadReward,5000);return()=>{live=false;window.clearInterval(timer)}},[currency]);
 useEffect(()=>{const saved=Number(sessionStorage.getItem('chameleon.carId')||0);if(saved&&(cars||[]).some((x:ClientCar)=>x.id===saved)){setCarMode('own');setCarId(saved);sessionStorage.removeItem('chameleon.carId')}},[(cars||[]).length]);
 useEffect(()=>{if(!carMode&&(cars||[]).length===1){setCarMode('own');setCarId(cars[0].id)}},[carMode,(cars||[]).length]);
 useEffect(()=>{const raw=sessionStorage.getItem('chameleon.repeatOrderId')||new URLSearchParams(location.search).get('repeat')||'';const id=Number(raw||0);if(!id)return;sessionStorage.removeItem('chameleon.repeatOrderId');api.order(id).then(({order}:any)=>{if(!order)return;const parse=(v:any)=>{try{const x=JSON.parse(String(v||'[]'));return Array.isArray(x)?x.map(String):[]}catch{return []}};const ss=parse(order.services_json);const oo=parse(order.options_json);if(ss.length)setSelected(ss);else if(order.service_slug)setSelected([String(order.service_slug)]);setExtra(oo);if(order.condition_slug)setCondition(String(order.condition_slug));if(order.vehicle_slug)setVehicle(String(order.vehicle_slug));if(Number(order.car_id||0)){setCarMode('own');setCarId(Number(order.car_id))}else{setCarMode('other');setCarId(null)}notify('success')}).catch(()=>{})},[]);
 useEffect(()=>()=>{timers.current.forEach(clearTimeout);if(previewTimerRef.current)window.clearTimeout(previewTimerRef.current)},[]);

 const selectedServices=services.filter((x:Service)=>selected.includes(x.slug));
 const selectedCar=(cars||[]).find((x:ClientCar)=>x.id===carId)||null;
 const displayCar=selectedCar||((cars||[])[0]||null);
 const carVehicle=carVehicleType(selectedCar?.bodyType);
 const requiresVehicle=selectedServices.some((x:Service)=>x.requirements?.requireVehicle!==false);
 const requiresCondition=selectedServices.some((x:Service)=>x.requirements?.requireCondition!==false);
 const allowOptions=selectedServices.some((x:Service)=>x.requirements?.allowOptions!==false);
 const availableOptions=(options||[]).filter((opt:ServiceOption)=>allowOptions&&(!opt.serviceSlugs?.length||opt.serviceSlugs.some(slug=>selected.includes(slug))));
 useEffect(()=>{setExtra(v=>v.filter(slug=>availableOptions.some((o:ServiceOption)=>o.slug===slug)))},[selected.join('|'),options]);
 useEffect(()=>{if(carMode==='own'&&carVehicle)setVehicle(carVehicle)},[carMode,carId,carVehicle]);

 const applyPackage=(car:ClientCar)=>{if(!car.package)return;const valid=(car.package.mainServices||[]).filter((slug:string)=>services.some((x:Service)=>x.slug===slug));if(valid.length)setSelected(valid);setExtra((car.package.options||[]).filter((slug:string)=>options.some((x:ServiceOption)=>x.slug===slug)));if(car.package.vehicle)setVehicle(car.package.vehicle);if(car.package.condition)setCondition(car.package.condition);notify('success')};
 const mutuallyExclusiveDetailing=new Set(['exterior-detailing','interior-detailing']);
 const fullDetailingBlocked=selected.some(slug=>mutuallyExclusiveDetailing.has(slug));
 const toggleService=(slug:string)=>{setQuote(null);setSent(false);setSelected(prev=>{if(slug==='full-detailing'&&prev.some(x=>mutuallyExclusiveDetailing.has(x)))return prev;if(mutuallyExclusiveDetailing.has(slug)&&prev.includes('full-detailing'))prev=prev.filter(x=>x!=='full-detailing');return prev.includes(slug)?prev.filter(x=>x!==slug):[...prev,slug]})};

 const quotePayload=()=>({services:selected,service:selected[0],vehicle:requiresVehicle?vehicle:null,condition:requiresCondition?condition:null,options:extra,currency,carId:carMode==='own'?carId:null});
 const configurationValid=Boolean(carMode&&selected.length&&(carMode!=='own'||carId));
 useEffect(()=>{
  if(previewTimerRef.current)window.clearTimeout(previewTimerRef.current);
  const requestId=++previewRequestRef.current;
  if(!configurationValid){setPreviewQuote(null);setPreviewBusy(false);return}
  setPreviewBusy(true);
  previewTimerRef.current=window.setTimeout(async()=>{try{const q=await api.quote(quotePayload());if(requestId===previewRequestRef.current)setPreviewQuote(q)}catch{if(requestId===previewRequestRef.current)setPreviewQuote(null)}finally{if(requestId===previewRequestRef.current)setPreviewBusy(false)}},320);
  return()=>{if(previewTimerRef.current)window.clearTimeout(previewTimerRef.current)}
 },[carMode,carId,selected.join('|'),vehicle,condition,extra.join('|'),currency]);

 const calculate=async()=>{if(!configurationValid)return;setBusy(true);setError('');setProcessing(true);setStatus(t('calculator.processing1'));const started=Date.now();timers.current=[setTimeout(()=>setStatus(t('calculator.processing2')),260),setTimeout(()=>setStatus(t('calculator.processing3')),520)];try{const q=previewQuote||await api.quote(quotePayload());const left=motion.calculatorOverlayMin-(Date.now()-started);if(left>0)await wait(left);setStatus(t('calculator.ready'));await wait(160);setQuote(q);setProcessing(false);notify('success')}catch(e:unknown){setError(friendlyError(e,t));setProcessing(false);notify('error')}finally{setBusy(false)}};
 const send=async(requestType='STANDARD')=>{setBusy(true);setError('');try{await api.request({...quotePayload(),requestType});setSent(true);setQuote(null);setActiveReward(null);notify('success');await refreshCars?.();goto('orders')}catch(e:unknown){setError(friendlyError(e,t));notify('error')}finally{setBusy(false)}};

 const rewardCopy=ui3(locale,'Реферальний бонус активний','Bonus polecający jest aktywny','Referral reward is active');
 const rewardValue=activeReward?.type==='PERCENT'?'-'+Number(activeReward.value||0)+'%':activeReward?.type==='FIXED'?'-'+money(activeReward.value,activeReward.currency||currency):activeReward?.type==='FREE_SERVICE'?ui3(locale,'Безкоштовна послуга','Bezpłatna usługa','Free service'):'';
 const carImageId=carVehicleType(displayCar?.bodyType)||vehicle||'sedan';
 const carImage=(vehicles.find(([id])=>id===carImageId)?.[2])||'/miniapp-vehicle-icons/sedan.webp';
 const localeTag=locale==='uk'?'uk-UA':locale==='pl'?'pl-PL':locale==='de'?'de-DE':locale==='fr'?'fr-FR':'en-US';
 const nextWorking=schedule?.nextWorkingAt?new Date(schedule.nextWorkingAt).toLocaleString(localeTag,{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
 const activeStep=quote?3:carMode?2:1;
 const orderedServices=[...services].sort((a:Service,b:Service)=>{const order=['full-detailing','interior-detailing','ceramic-coating','exterior-detailing'];const ai=order.indexOf(a.slug),bi=order.indexOf(b.slug);return (ai<0?99:ai)-(bi<0?99:bi)});
 const featuredServices=orderedServices.slice(0,Math.min(3,orderedServices.length));
 const secondaryServices=orderedServices.slice(featuredServices.length);
 const extrasCount=extra.length+secondaryServices.filter((svc:Service)=>selected.includes(svc.slug)).length;

 return <section className="calculator-experience">
  <div className="calculator-shell">
   <div className="calculator-progress" aria-label={ui3(locale,'Етапи розрахунку','Etapy kalkulacji','Calculation steps')}>
    {[
      [1,ui3(locale,'Автомобіль','Samochód','Vehicle')],
      [2,ui3(locale,'Напрямок догляду','Kierunek pielęgnacji','Care direction')],
      [3,ui3(locale,'Результат','Wynik','Result')]
    ].map(([n,label],idx)=><React.Fragment key={String(n)}><div className={`calculator-progress-step ${Number(n)<activeStep?'done':Number(n)===activeStep?'active':''}`} aria-current={Number(n)===activeStep?'step':undefined}><i>{Number(n)<activeStep?<Check/>:n}</i><span>{label}</span></div>{idx<2&&<b className={Number(n)<activeStep?'on':''}/>}</React.Fragment>)}
   </div>

   <div className="calculator-hero-copy">
    <div className="calculator-kicker"><i/>{ui3(locale,'ПЕРСОНАЛЬНИЙ ПІДХІД','INDYWIDUALNE PODEJŚCIE','PERSONAL APPROACH')}</div>
    <h1>{ui3(locale,'Розпочнемо з вашого автомобіля','Zacznijmy od Twojego samochodu','Let’s start with your car')}</h1>
    <p>{ui3(locale,'Це допоможе підібрати ідеальні рішення та показати точну ціну.','To pomoże dobrać idealne rozwiązania i pokazać dokładną cenę.','This helps us choose the right care and show an accurate price.')}</p>
   </div>

   <div className={`calculator-car-card ${carMode==='own'?'selected':''}`} role="button" tabIndex={0} aria-pressed={carMode==='own'} onClick={()=>{if(!(cars||[]).length){goto('cars');return}setCarMode('own');if(!carId&&displayCar)setCarId(displayCar.id)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!(cars||[]).length)goto('cars');else{setCarMode('own');if(!carId&&displayCar)setCarId(displayCar.id)}}}}>
    <div className="calculator-car-top">
     <span className="calculator-select-dot">{carMode==='own'?<Check/>:null}</span>
     <div className="calculator-car-heading"><strong>{ui3(locale,'Моє авто','Moje auto','My car')}</strong><small>{ui3(locale,'Вибрати зі свого автопарку','Wybierz ze swojego garażu','Choose from your garage')}</small></div>
     <button className="calculator-edit-car" onClick={e=>{e.stopPropagation();(cars||[]).length?setSheet('car'):goto('cars')}}><Pencil/>{ui3(locale,'Змінити','Zmień','Change')}</button>
    </div>
    {displayCar?<div className="calculator-car-body">
      <div className="calculator-car-identity">
       <BrandBadge brand={displayCar.brand}/>
       <div><b>{[displayCar.brand,displayCar.model].filter(Boolean).join(' ')||displayCar.name}</b><span>{[displayCar.modification,displayCar.bodyType?bodyTypeLabel(locale,carVehicleType(displayCar.bodyType)||displayCar.bodyType):''].filter(Boolean).join(' · ')}</span>{displayCar.plate&&<em className="calculator-plate">{displayCar.plate}</em>}</div>
      </div>
      <img className="calculator-car-visual" src={carImage} alt=""/>
     </div>:<div className="calculator-car-empty"><Car/><div><b>{ui3(locale,'Автомобілі ще не додані','Nie dodano jeszcze samochodu','No saved cars yet')}</b><span>{ui3(locale,'Додайте авто в Автопарк, щоб швидше оформлювати замовлення.','Dodaj samochód w Garażu, aby szybciej składać zlecenia.','Add a car in Garage to speed up future orders.')}</span></div><ChevronRight/></div>}
   </div>

   <button className={`calculator-other-car ${carMode==='other'?'selected':''}`} aria-pressed={carMode==='other'} onClick={()=>{setCarMode('other');setCarId(null)}}>
    <span className="calculator-radio">{carMode==='other'?<Check/>:null}</span><Car/><span><b>{ui3(locale,'Інше авто','Inne auto','Another car')}</b><small>{ui3(locale,'Разове замовлення без збереженого профілю','Jednorazowe zlecenie bez zapisanego profilu','One-time request without a saved profile')}</small></span><ChevronRight/>
   </button>

   <div className="calculator-section-title"><div><span>{ui3(locale,'ОБЕРІТЬ НАПРЯМОК ДОГЛЯДУ','WYBIERZ KIERUNEK PIELĘGNACJI','CHOOSE A CARE DIRECTION')}</span></div><small>{ui3(locale,'Крок 2 з 3','Krok 2 z 3','Step 2 of 3')}</small></div>

   <div className="calculator-service-grid">
    {featuredServices.map((svc:Service)=>{const blocked=svc.slug==='full-detailing'&&fullDetailingBlocked;const active=selected.includes(svc.slug);return <button key={svc.slug} className={`calculator-service-card ${active?'selected':''} ${blocked?'disabled':''}`} disabled={blocked} aria-pressed={active} onClick={()=>toggleService(svc.slug)}>
      <span className="calculator-service-icon">{mainServiceSlugs.has(svc.slug)?<PremiumMainServiceIcon slug={svc.slug} label={svc.title}/>:hasApprovedIcon(svc.slug)?<ApprovedServiceIcon slug={svc.slug} label={svc.title}/>:<Sparkles/>}</span>
      <span className="calculator-service-copy"><b>{svc.title}</b><small>{blocked?ui3(locale,'Вже включено у вибраний пакет','Już zawarte w wybranym pakiecie','Already included in the selected package'):svc.description}</small></span>
      <i>{active?<Check/>:<ChevronRight/>}</i>
    </button>})}
    {(secondaryServices.length>0||availableOptions.length>0)&&<button className={`calculator-service-card extras ${extrasCount?'selected':''}`} aria-pressed={extrasCount>0} onClick={()=>setSheet('extras')}><span className="calculator-service-icon"><Sparkles/></span><span className="calculator-service-copy"><b>{ui3(locale,'Додаткові послуги','Usługi dodatkowe','Additional services')}</b><small>{extrasCount?ui3(locale,`Вибрано: ${extrasCount}`,`Wybrano: ${extrasCount}`,`Selected: ${extrasCount}`):ui3(locale,'Окремі процедури для вашого авто','Dodatkowe zabiegi dla Twojego auta','Extra treatments for your car')}</small></span><i>{extrasCount?<Check/>:<ChevronRight/>}</i></button>}
   </div>

   {selected.length>0&&<div className="calculator-config-strip">
    {requiresVehicle&&<button onClick={()=>setSheet('vehicle')}><span>{ui3(locale,'Тип авто','Typ auta','Vehicle')}</span><b>{bodyTypeLabel(locale,vehicle)}</b><ChevronRight/></button>}
    {requiresCondition&&<button onClick={()=>setSheet('condition')}><span>{ui3(locale,'Стан','Stan','Condition')}</span><b>{conditions.find(([id])=>id===condition)?t(conditions.find(([id])=>id===condition)![1] as TranslationKey):condition}</b><ChevronRight/></button>}
    {availableOptions.length>0&&<button onClick={()=>setSheet('extras')}><span>{ui3(locale,'Додатково','Dodatki','Extras')}</span><b>{extra.length?ui3(locale,`${extra.length} вибрано`,`${extra.length} wybrano`,`${extra.length} selected`):ui3(locale,'Не вибрано','Nie wybrano','None')}</b><ChevronRight/></button>}
   </div>}

   {activeReward&&<div className="calculator-reward"><Gift/><div><b>{rewardCopy}</b><small>{[rewardValue,activeReward.service].filter(Boolean).join(' · ')}</small></div></div>}

   <button className="calculator-schedule-strip" onClick={()=>{}} aria-label={schedule?.isOpen?ui3(locale,'Сервіс працює','Serwis jest otwarty','Service is open'):ui3(locale,'Сервіс не працює','Serwis jest zamknięty','Service is closed')}>
    <Clock3/><span><b>{schedule?.isOpen?ui3(locale,'Сьогодні сервіс працює','Dziś serwis jest otwarty','Service is open today'):ui3(locale,'Сьогодні сервіс не працює.','Dziś serwis jest zamknięty.','Service is closed today.')}</b><small>{!schedule?.isOpen&&nextWorking?ui3(locale,'Найближчий робочий час: ','Najbliższy termin: ','Next working time: ')+nextWorking:schedule?.workingHours||''}</small></span><ChevronRight/>
   </button>

   {error&&!quote&&!processing&&<div className="inline-error calculator-inline-error"><TriangleAlert/>{error}</div>}
   <div className="calculator-bottom-spacer"/>
  </div>

  <div className="calculator-sticky-cta">
   <div className="calculator-sticky-price"><Calculator/><span><small>{previewQuote?ui3(locale,'Орієнтовно','Orientacyjnie','Estimated'):ui3(locale,'Від','Od','From')}</small><b>{previewBusy?ui3(locale,'Рахуємо…','Liczymy…','Calculating…'):previewQuote?money(previewQuote.finalPrice,previewQuote.currency||currency):selectedServices.length?money(selectedServices.reduce((sum:number,s:Service)=>sum+Number(s.basePrice||0),0),currency):'—'}</b></span></div>
   <i/>
   <button disabled={busy||!configurationValid} onClick={calculate}>{busy?<Loader2 className="spin"/>:<><span>{ui3(locale,'Продовжити','Kontynuuj','Continue')}</span><ChevronRight/></>}</button>
  </div>

  {sheet&&<div className="modal-backdrop calculator-sheet-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSheet(null)}}><div className="calculator-sheet">
   <div className="calculator-sheet-head"><div><span className="eyebrow">{ui3(locale,'НАЛАШТУВАННЯ','USTAWIENIA','CONFIGURATION')}</span><h3>{sheet==='car'?ui3(locale,'Оберіть автомобіль','Wybierz samochód','Choose a car'):sheet==='vehicle'?ui3(locale,'Тип автомобіля','Typ samochodu','Vehicle type'):sheet==='condition'?ui3(locale,'Стан автомобіля','Stan samochodu','Vehicle condition'):ui3(locale,'Додаткові послуги','Usługi dodatkowe','Additional services')}</h3></div><button className="modal-close" onClick={()=>setSheet(null)}><X/></button></div>
   <div className="calculator-sheet-body">
    {sheet==='car'&&<div className="choice-list saved-car-choice">{(cars||[]).map((car:ClientCar)=><Choice key={car.id} on={()=>{setCarMode('own');setCarId(car.id);const v=carVehicleType(car.bodyType);if(v)setVehicle(v);if(car.package)applyPackage(car);setSheet(null)}} active={carId===car.id} title={car.name} sub={[car.brand,car.model,car.plate].filter(Boolean).join(' · ')} icon={<BrandBadge brand={car.brand}/>}/>)}<button className="add-car-inline" onClick={()=>{setSheet(null);goto('cars')}}>{ui3(locale,'Керувати автопарком','Zarządzaj garażem','Manage Garage')}</button></div>}
    {sheet==='vehicle'&&<div className="choice-list vehicle-choice-list">{vehicles.map(([id,key,image])=><Choice key={id} on={()=>{setVehicle(id);setSheet(null)}} active={vehicle===id} title={t(key)} icon={<img className="vehicle-choice-image" src={image} alt={t(key)}/>}/>)}</div>}
    {sheet==='condition'&&<div className="choice-list">{conditions.map(([id,key])=><Choice key={id} on={()=>{setCondition(id);setSheet(null)}} active={condition===id} title={t(key)}/>)}</div>}
    {sheet==='extras'&&<div className="calculator-more-list">{secondaryServices.length>0&&<div className="choice-list">{secondaryServices.map((svc:Service)=>{const blocked=svc.slug==='full-detailing'&&fullDetailingBlocked;return <Choice key={svc.slug} on={()=>toggleService(svc.slug)} active={selected.includes(svc.slug)} disabled={blocked} title={svc.title} sub={svc.description} icon={mainServiceSlugs.has(svc.slug)?<PremiumMainServiceIcon slug={svc.slug} label={svc.title}/>:hasApprovedIcon(svc.slug)?<ApprovedServiceIcon slug={svc.slug} label={svc.title}/>:<Sparkles/>}/>})}</div>}{availableOptions.length>0&&<div className="choice-list calculator-option-list">{availableOptions.map((opt:ServiceOption)=><Choice key={opt.slug} on={()=>setExtra(extra.includes(opt.slug)?extra.filter(x=>x!==opt.slug):[...extra,opt.slug])} active={extra.includes(opt.slug)} title={opt.title} sub={`${opt.description?opt.description+' · ':''}+ ${money(opt.price,opt.currency||currency)}`} icon={hasApprovedIcon(opt.slug)?<ApprovedServiceIcon slug={opt.slug} label={opt.title}/>:<Sparkles/>}/>)}</div>}</div>}
   </div>
   {sheet==='extras'&&<button className="primary calculator-sheet-done" onClick={()=>setSheet(null)}>{ui3(locale,'Готово','Gotowe','Done')}</button>}
  </div></div>}

  {processing&&<ProcessingOverlay t={t} status={status}/>}
  {quote&&<ResultModal t={t} q={quote} sent={sent} busy={busy} error={error} schedule={schedule} locale={locale} onClose={()=>setQuote(null)} onEdit={()=>{setQuote(null)}} onSend={send}/>}
 </section>
}
function ProcessingOverlay({t,status}:any){return <div className="overlay-backdrop"><div className="processing-card"><img src="/brand/chameleon-logo.webp" alt=""/><h3>{t('calculator.processing')}</h3><div className="loader-bar"><i/></div><p>{status}</p></div></div>}
function ResultModal({t,q,sent,busy,error,schedule,onClose,onEdit,onSend,locale}:any){const standardTotal=Number(q.standardTotal??0);const referralLabel=locale==='uk'?'Реферальний бонус':locale==='pl'?'Bonus polecający':locale==='de'?'Empfehlungsbonus':locale==='fr'?'Bonus de parrainage':'Referral reward';const discountLabel=q.discountSource==='PERSONAL'?t('calculator.personalGift'):q.discountSource==='PROMOTION'?t('calculator.promotion'):q.discountSource==='REFERRAL'?referralLabel:q.discountSource==='MIXED'?(q.referralReward?referralLabel+' + '+ui3(locale,'інші знижки','inne rabaty','other discounts'):ui3(locale,'Знижки','Rabaty','Discounts')):t('calculator.vipDiscount');const ep=q.emergencyPreview;const emPct=ep?Math.round((Number(ep.multiplier||1)-1)*100):0;return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="result-modal"><button className="modal-close" aria-label={t('common.close')} onClick={onClose}><X/></button><span className="eyebrow">✨ {t('calculator.result')}</span><strong>{money(q.finalPrice,q.currency)}</strong>{q.discount>0&&standardTotal>0&&<small className="result-note"><del>{money(standardTotal,q.currency)}</del> · {discountLabel}</small>}{Array.isArray(q.serviceBreakdown)&&q.serviceBreakdown.length>1&&<div className="service-breakdown-list">{q.serviceBreakdown.map((x:any)=><p key={x.service}><span>{x.service}</span><b>{money(x.subtotal,q.currency)}</b></p>)}</div>}<div className="breakdown"><p><span>{t('common.base')}</span><b>{money(q.basePrice,q.currency)}</b></p>{q.requiresVehicle&&<p><span>{t('common.vehicle')}</span><b>× {q.vehicleMultiplier}</b></p>}{q.requiresCondition&&<p><span>{t('common.condition')}</span><b>× {q.conditionMultiplier}</b></p>}<p><span>{t('common.options')}</span><b>{money(q.optionsTotal,q.currency)}</b></p>{q.discount>0&&<p className="lime"><span>{discountLabel}</span><b>-{money(q.discount,q.currency)}</b></p>}<p className="lime total-row"><span>{t('common.total')}</span><b>{money(q.finalPrice,q.currency)}</b></p>{ep&&<><p className="emergency-row"><span>{t('calculator.emergencyExtra')} · ×{Number(ep.multiplier).toFixed(2)} (+{emPct}%)</span><b>+{money(ep.surcharge,ep.currency||q.currency)}</b></p><p className="emergency-total"><span>{t('calculator.emergencyTotal')}</span><b>{money(ep.finalPrice,ep.currency||q.currency)}</b></p></>}</div>{q.fxTimestamp&&<small>{t('common.fx')}: {new Date(q.fxTimestamp).toLocaleString()}</small>}{ep&&<small className="emergency-hint">{t('calculator.emergencyHint')}</small>}{sent?<div className="success"><Check/>{t('calculator.sent')}</div>:<div className="modal-actions">{schedule.isOpen?<button className="primary" onClick={()=>onSend('STANDARD')} disabled={busy}>{t('calculator.send')}</button>:<><button className="primary" onClick={()=>onSend('DEFERRED')} disabled={busy}>{t('calculator.deferred')}</button>{schedule.emergencyEnabled&&ep&&<button className="warning-btn emergency-order-btn" onClick={()=>onSend('EMERGENCY')} disabled={busy}><span>{t('calculator.emergency')}</span></button>}</>}<button className="secondary wide" onClick={onEdit}>{t('calculator.edit')}</button></div>}{error&&<div className="inline-error"><TriangleAlert/>{error}</div>}</div></div>}
function Choice({active,on,title,sub,icon,disabled=false}:any){return <button className={`choice ${active?'selected':''} ${disabled?'disabled':''}`} disabled={disabled} aria-disabled={disabled} onClick={()=>{if(disabled)return;haptic();on()}}>{icon&&<span className="choice-icon">{icon}</span>}<span className="grow"><b>{title}</b>{sub&&<small>{sub}</small>}</span><i>{active?<Check/>:disabled?<X/>:<ChevronRight/>}</i></button>}
function VipPage({t,tier}:any){const tierLabel=(tier||t('common.standard')).toUpperCase();return <section className="vip-section"><div className="vip-card"><div className="vip-orbit" aria-hidden="true"><i/><i/></div><div className="vip-topline"><div className="vip-wordmark"><strong>CHAMELEON</strong><span>DETAILING</span></div><div className="vip-tagline">{t('vip.tagline')}<i/></div></div><div className="vip-content"><span className="vip-eyebrow">{t('vip.status')}</span><h1>Chameleon</h1><i className="vip-accent"/><p>{t('vip.text')}</p><div className="vip-tier"><Crown/><i/><b>{tierLabel}</b></div></div><div className="vip-footer"><span>{t('vip.footer')}</span><div><i/>{t('vip.footerRight')}</div></div></div></section>}
function OrdersPage({t,currency,services,locale}:any){
 const [orders,setOrders]=useState<any[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState(''),[deleting,setDeleting]=useState<number|null>(null);
 const load=async()=>{setBusy(true);setError('');try{const r=await api.orders();setOrders(r.orders||[])}catch(e:unknown){setError(e instanceof Error?e.message:t('errors.generic'))}finally{setBusy(false)}};
 useEffect(()=>{load()},[]);
 const statusKey=(status:string)=>{const k=String(status||'REQUESTED').toUpperCase();const map:any={REQUESTED:'orders.status.requested',PENDING_CONFIRMATION:'orders.status.requested',CONFIRMED:'orders.status.confirmed',IN_PROGRESS:'orders.status.inProgress',COMPLETED:'orders.status.completed',COMPLETED_UNPAID:'orders.status.completedUnpaid',PAID:'orders.status.paid',REJECTED:'orders.status.rejected',CANCELLED:'orders.status.cancelled',DEFERRED:'orders.status.deferred'};return map[k]||'orders.status.requested'};
 const statusHint=(status:string)=>{const k=String(status||'REQUESTED').toUpperCase();const map:any={REQUESTED:'orders.hint.requested',PENDING_CONFIRMATION:'orders.hint.requested',CONFIRMED:'orders.hint.confirmed',IN_PROGRESS:'orders.hint.inProgress',COMPLETED:'orders.hint.completed',COMPLETED_UNPAID:'orders.hint.completedUnpaid',PAID:'orders.hint.paid',REJECTED:'orders.hint.rejected',CANCELLED:'orders.hint.cancelled',DEFERRED:'orders.hint.deferred'};return map[k]||'orders.hint.requested'};
 const requestTypeKey=(value:string)=>{const k=String(value||'STANDARD').toUpperCase();const map:any={STANDARD:'orders.type.standard',DEFERRED:'orders.type.deferred',EMERGENCY:'orders.type.emergency'};return map[k]||'orders.type.standard'};
 const paymentKey=(value:string)=>{const k=String(value||'PENDING').toUpperCase();const map:any={PENDING:'orders.payment.pending',PAID:'orders.payment.paid',UNPAID:'orders.payment.unpaid',REFUNDED:'orders.payment.refunded',FAILED:'orders.payment.failed'};return map[k]||'orders.payment.pending'};
 const serviceTitle=(slug:string)=>services?.find((x:Service)=>x.slug===slug)?.title||slug||'Chameleon Detailing';
 const canDelete=(status:string)=>['REQUESTED','PENDING_CONFIRMATION','REJECTED','CANCELLED','DEFERRED'].includes(String(status||'').toUpperCase());
 const remove=async(id:number)=>{if(!confirm(t('orders.deleteConfirm')))return;setDeleting(id);setError('');try{await api.deleteOrder(id);notify('success');setOrders(x=>x.filter(o=>o.id!==id))}catch(e:unknown){setError(e instanceof Error?e.message:t('errors.generic'));notify('error')}finally{setDeleting(null)}};
 return <section><div className="page-head"><span>📋</span><div><h1>{t('orders.title')}</h1><p>{t('orders.subtitle')}</p></div></div><button className="secondary wide orders-refresh" onClick={load} disabled={busy}>{busy?<Loader2 className="spin"/>:<RefreshCw/>}<span>{t('orders.refresh')}</span></button>{error&&<div className="inline-error"><TriangleAlert/>{error}</div>}<div className="stack orders-stack">{!busy&&orders.length===0&&<div className="empty-card"><ClipboardList/><p>{t('orders.empty')}</p></div>}{orders.map((o:any)=><article className="order-card" key={o.id}><div className="order-card-top"><div><span className="eyebrow">{t('orders.requestId')} <b>CHD-{o.id}</b></span><h3>{serviceTitle(o.service_slug)}</h3></div><div className="order-card-assignee-status"><b className={`order-status status-${String(o.status||'REQUESTED').toLowerCase()}`}>{t(statusKey(o.status) as TranslationKey)}</b><span className="order-master"><UserRound/>{o.responsible_name||((locale==='uk'?'Майстер не призначений':locale==='pl'?'Brak przypisanego pracownika':locale==='de'?'Kein Mitarbeiter zugewiesen':locale==='fr'?'Aucun responsable':'No master assigned'))}</span></div></div><p className="order-status-hint">{t(statusHint(o.status) as TranslationKey)}</p><div className="order-meta"><span>{t('orders.type')}<b>{t(requestTypeKey(o.request_type) as TranslationKey)}</b></span><span>{t('orders.payment')}<b>{t(paymentKey(o.payment_status) as TranslationKey)}</b></span><span>{t('orders.created')}<b>{o.created_at?new Date(o.created_at+'Z').toLocaleString(): '—'}</b></span>{o.scheduled_for&&<span>{t('orders.scheduled')}<b>{new Date(o.scheduled_for).toLocaleString()}</b></span>}</div><div className="order-price">{money(o.final_job_price??o.calculated_price,o.currency||currency)}</div>{Array.isArray(o.extra_services)&&o.extra_services.length>0&&<div className="order-extra-services">{o.extra_services.map((x:any,i:number)=><span key={i}>➕ {x.title} · {money(x.price,x.currency||o.currency||currency)}</span>)}</div>}{canDelete(o.status)&&<button className="danger-link" onClick={()=>remove(o.id)} disabled={deleting===o.id}>{deleting===o.id?<Loader2 className="spin"/>:<Trash2/>}<span>{t('orders.delete')}</span></button>}</article>)}</div></section>
}
function CarsPage({locale,cars,services,options,goto,refresh}:any){
 const [editing,setEditing]=useState<ClientCar|null|undefined>(undefined),[expandedCarId,setExpandedCarId]=useState<number|null>(null),[historyCar,setHistoryCar]=useState<ClientCar|null>(null),[orders,setOrders]=useState<any[]|null>(null),[deleteTarget,setDeleteTarget]=useState<ClientCar|null>(null),[busy,setBusy]=useState(false);
 const parseArray=(raw:any)=>{try{const v=JSON.parse(String(raw||'[]'));return Array.isArray(v)?v.map(String):[]}catch{return []}};
 const serviceName=(slug:string)=>services.find((x:Service)=>x.slug===slug)?.title||slug;
 const optionName=(slug:string)=>options.find((x:ServiceOption)=>x.slug===slug)?.title||slug;
 const formatDate=(raw?:string|null)=>raw?new Date(String(raw).endsWith('Z')?raw:raw+'Z').toLocaleDateString(locale==='uk'?'uk-UA':locale==='pl'?'pl-PL':'en-US',{day:'2-digit',month:'short',year:'numeric'}):'—';
 const reminder=(car:ClientCar)=>{if(!car.lastServiceAt)return '';const days=Math.floor((Date.now()-new Date(String(car.lastServiceAt).endsWith('Z')?String(car.lastServiceAt):String(car.lastServiceAt)+'Z').getTime())/86400000);if(days<90)return '';const months=Math.max(3,Math.round(days/30));return ui3(locale,`Давно не бачили ${car.name}. Минуло близько ${months} міс. — можливо, час освіжити авто.`,`Dawno nie widzieliśmy ${car.name}. Minęło około ${months} mies. — może czas odświeżyć auto.`,`It has been a while since ${car.name} visited us. About ${months} months have passed — it may be time for a refresh.`)};
 const openHistory=async(car:ClientCar)=>{setHistoryCar(car);setOrders(null);try{const r=await api.carHistory(car.id);setOrders(r.orders||[])}catch{setOrders([])}};
 const repeat=(o:any)=>{sessionStorage.setItem('chameleon.repeatOrderId',String(o.id));if(o.car_id||historyCar?.id)sessionStorage.setItem('chameleon.carId',String(o.car_id||historyCar?.id));setHistoryCar(null);goto('calculator')};
 const remove=async()=>{if(!deleteTarget)return;setBusy(true);try{await api.deleteCar(deleteTarget.id);if(expandedCarId===deleteTarget.id)setExpandedCarId(null);setDeleteTarget(null);await refresh();notify('success')}catch{notify('error')}finally{setBusy(false)}};
 return <section className="garage-page">
  <div className="page-head garage-head"><span><Car/></span><div><h1>{ui3(locale,'Мій автопарк','Mój garaż','My garage')}</h1><p>{ui3(locale,'Ваші автомобілі та історія їх обслуговування.','Twoje samochody i historia ich serwisowania.','Your cars and their service history.')}</p></div></div>
  <div className="stack car-stack">
   {(cars||[]).map((car:ClientCar)=>{const expanded=expandedCarId===car.id;const note=reminder(car);return <article className={`client-car-card garage-car-card ${expanded?'expanded':''}`} key={car.id}>
    <button className="garage-car-open" onClick={()=>setExpandedCarId(expanded?null:car.id)} aria-expanded={expanded}>
     <div className="client-car-icon"><CarIdentityIcon brand={car.brand} model={car.model}/></div>
     <div className="grow"><h3>{car.name}</h3><p>{[car.brand,car.model,car.modification].filter(Boolean).join(' · ')}</p><div className="car-tags">{car.bodyType&&<span>{bodyTypeLabel(locale,carVehicleType(car.bodyType)||car.bodyType)}</span>}{car.plate&&<span>{car.plate}</span>}{car.hasCeramic&&<span>{ui3(locale,'Кераміка','Ceramika','Ceramic')}</span>}{car.lastServiceAt&&<span>{ui3(locale,'Останній візит','Ostatnia wizyta','Last visit')}: {formatDate(car.lastServiceAt)}</span>}</div></div>
     <ChevronRight className="garage-chevron"/>
    </button>
    <button
      type="button"
      className="garage-card-delete"
      style={{position:'absolute',right:12,top:12,width:38,height:38,padding:0,margin:0,zIndex:4,display:'grid',placeItems:'center',borderRadius:12}}
      onClick={e=>{e.preventDefault();e.stopPropagation();setDeleteTarget(car)}}
      aria-label={ui3(locale,'Видалити','Usuń','Delete')}
      title={ui3(locale,'Видалити','Usuń','Delete')}
    ><Trash2/></button>
    {expanded&&<div className="garage-inline-menu">
      {note&&<div className="garage-inline-reminder"><Clock3/><span>{note}</span></div>}
      <div className="garage-inline-actions">
       <button className="garage-completed-button" onClick={()=>openHistory(car)}><History/><span>{ui3(locale,'Виконані замовлення','Wykonane zlecenia','Completed orders')}</span><ChevronRight/></button>
       <button className="garage-edit-button" onClick={()=>setEditing(car)} aria-label={ui3(locale,'Редагувати','Edytuj','Edit')} title={ui3(locale,'Редагувати','Edytuj','Edit')}><Pencil/></button>
      </div>
     </div>}
   </article>})}
   <button className="garage-add-card" onClick={()=>setEditing(null)}><span className="garage-add-plus">+</span><div><b>{ui3(locale,'Додати автомобіль','Dodaj samochód','Add car')}</b><small>{ui3(locale,'Зберегти ще одне авто в автопарку','Zapisz kolejne auto w garażu','Save another car in your garage')}</small></div></button>
  </div>
  {editing!==undefined&&<CarFormModal locale={locale} car={editing||null} onClose={()=>setEditing(undefined)} onSaved={async()=>{setEditing(undefined);await refresh()}}/>}
  {deleteTarget&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setDeleteTarget(null)}}><div className="result-modal confirm-delete-modal"><button className="modal-close" onClick={()=>setDeleteTarget(null)} disabled={busy}><X/></button><span className="eyebrow">{ui3(locale,'ВИДАЛЕННЯ АВТО','USUWANIE AUTA','DELETE CAR')}</span><h2>{deleteTarget.name}</h2><p>{ui3(locale,'Видалити цей автомобіль з автопарку? Історія старих замовлень у базі залишиться.','Usunąć ten samochód z garażu? Historia starych zleceń pozostanie w bazie.','Remove this car from your garage? Existing order history will remain in the database.')}</p><div className="confirm-actions"><button className="secondary" onClick={()=>setDeleteTarget(null)} disabled={busy}>{ui3(locale,'Ні','Nie','No')}</button><button className="danger-btn" onClick={remove} disabled={busy}>{busy?<Loader2 className="spin"/>:ui3(locale,'Так, видалити','Tak, usuń','Yes, delete')}</button></div></div></div>}
  {historyCar&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setHistoryCar(null)}}><div className="result-modal car-overview-modal"><button className="modal-close" onClick={()=>setHistoryCar(null)}><X/></button>
   <div className="car-overview-identity"><div className="client-car-icon"><CarIdentityIcon brand={historyCar.brand} model={historyCar.model}/></div><div><span className="eyebrow">{ui3(locale,'ВИКОНАНІ ЗАМОВЛЕННЯ','WYKONANE ZLECENIA','COMPLETED ORDERS')}</span><h2>{historyCar.name}</h2><p>{[historyCar.brand,historyCar.model,historyCar.modification].filter(Boolean).join(' · ')}</p></div></div>
   {orders===null?<div className="modal-loading"><Loader2 className="spin"/></div>:<div className="garage-order-list">{orders.length?orders.map((o:any)=>{const ss=parseArray(o.services_json);const os=parseArray(o.options_json);return <article className="garage-order-row" key={o.id}><div className="garage-order-top"><div><b>#{o.id}</b><time>{formatDate(o.completed_at||o.created_at)}</time></div><strong>{money(o.final_job_price??o.calculated_price,o.currency||'PLN')}</strong></div><div className="garage-order-services">{(ss.length?ss:[o.service_slug]).filter(Boolean).map((slug:string)=><span key={slug}>{serviceName(slug)}</span>)}{os.map((slug:string)=><small key={slug}>+ {optionName(slug)}</small>)}</div><div className="garage-order-bottom"><span>{ui3(locale,'Роботу виконано','Praca wykonana','Completed')}</span><button onClick={()=>repeat(o)}><RefreshCw/><span>{ui3(locale,'Повторити','Powtórz','Repeat')}</span></button></div></article>}):<div className="empty-card compact"><ClipboardList/><p>{ui3(locale,'Для цього авто ще немає виконаних замовлень.','Dla tego auta nie ma jeszcze wykonanych zleceń.','There are no completed orders for this car yet.')}</p></div>}</div>}
  </div></div>}
 </section>
}
function CarFormModal({locale,car,onClose,onSaved}:any){
 const [form,setForm]=useState<any>({name:car?.name||'',brand:car?.brand||'',model:car?.model||'',modification:car?.modification||'',bodyType:carVehicleType(car?.bodyType)||car?.bodyType||'sedan',plate:car?.plate||'',hasCeramic:!!car?.hasCeramic,ownerPhone:car?.ownerPhone||''}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const set=(key:string,value:any)=>setForm((x:any)=>({...x,[key]:value}));
 const save=async()=>{if(!String(form.name||'').trim()){setError(ui3(locale,'Вкажіть назву автомобіля.','Podaj nazwę samochodu.','Enter a car name.'));return}setBusy(true);setError('');try{if(car?.id)await api.updateCar(car.id,form);else await api.saveCar(form);notify('success');await onSaved()}catch(e:any){setError(String(e?.message||e));notify('error')}finally{setBusy(false)}};
 const title=car?ui3(locale,'Редагувати автомобіль','Edytuj samochód','Edit vehicle'):ui3(locale,'Додати автомобіль','Dodaj samochód','Add vehicle');
 const subtitle=car?ui3(locale,'Оновіть дані автомобіля — вони автоматично використовуються в калькуляторі.','Zaktualizuj dane auta — zostaną automatycznie użyte w kalkulatorze.','Update the vehicle details — they will be reused automatically in the calculator.'):ui3(locale,'Додайте авто один раз, щоб надалі швидше створювати замовлення.','Dodaj auto raz, aby później szybciej tworzyć zlecenia.','Save the vehicle once to make future orders faster.');
 return <div className="modal-backdrop car-form-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>
  <div className="result-modal car-form-modal">
   <div className="car-form-header">
    <div className="car-form-preview"><CarIdentityIcon brand={form.brand} model={form.model}/></div>
    <div className="grow"><span className="eyebrow">{car?ui3(locale,'АВТО В ГАРАЖІ','AUTO W GARAŻU','GARAGE VEHICLE'):ui3(locale,'НОВЕ АВТО','NOWE AUTO','NEW VEHICLE')}</span><h2>{title}</h2><p>{subtitle}</p></div>
    <button className="modal-close car-form-close" onClick={onClose} disabled={busy} aria-label={ui3(locale,'Закрити','Zamknij','Close')}><X/></button>
   </div>

   <div className="car-form-body">
    <section className="car-form-section">
     <div className="car-form-section-title"><Car/><div><b>{ui3(locale,'Основні дані','Dane podstawowe','Vehicle details')}</b><small>{ui3(locale,'Марка, модель та тип кузова','Marka, model i typ nadwozia','Brand, model and body type')}</small></div></div>
     <div className="car-form-grid primary-fields">
      <label className="span-2"><span>{ui3(locale,'Назва в автопарку','Nazwa w garażu','Garage name')} *</span><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Audi RS6"/></label>
      <label><span>{ui3(locale,'Марка','Marka','Brand')}</span><div className="brand-select-row"><BrandBadge brand={form.brand}/><select value={form.brand} onChange={e=>{set('brand',e.target.value);set('model','')}}><option value="">{ui3(locale,'Оберіть марку','Wybierz markę','Choose brand')}</option>{carBrands.map(brand=><option key={brand} value={brand}>{brand}</option>)}</select></div></label>
      <label><span>{ui3(locale,'Модель','Model','Model')}</span><select value={modelsForBrand(form.brand).includes(form.model)?form.model:(form.model?'__custom':'')} onChange={e=>{const v=e.target.value;set('model',v==='__custom'?'':v)}} disabled={!form.brand}><option value="">{ui3(locale,'Оберіть модель','Wybierz model','Choose model')}</option>{modelsForBrand(form.brand).map(model=><option key={model} value={model}>{model}</option>)}<option value="__custom">{ui3(locale,'Інша модель','Inny model','Other model')}</option></select>{form.brand&&(!modelsForBrand(form.brand).includes(form.model))&&<input value={form.model} onChange={e=>set('model',e.target.value)} placeholder={ui3(locale,'Введіть модель','Wpisz model','Enter model')}/>}</label>
      <label><span>{ui3(locale,'Модифікація','Wersja','Modification')}</span><input value={form.modification} onChange={e=>set('modification',e.target.value)} placeholder="RS / Competition / AMG"/></label>
      <label><span>{ui3(locale,'Тип кузова','Typ nadwozia','Body type')} *</span><select value={form.bodyType} onChange={e=>set('bodyType',e.target.value)}>{canonicalBodyTypes.map(type=><option key={type} value={type}>{bodyTypeLabel(locale,type)}</option>)}</select></label>
     </div>
     <div className="car-form-note"><span>{ui3(locale,'Тип кузова автоматично підтягується в калькуляторі після вибору цього авто.','Typ nadwozia zostanie automatycznie użyty w kalkulatorze po wybraniu tego auta.','The body type will be applied automatically in the calculator when this vehicle is selected.')}</span></div>
    </section>

    <section className="car-form-section">
     <div className="car-form-section-title"><ShieldCheck/><div><b>{ui3(locale,'Дані для обслуговування','Dane serwisowe','Service details')}</b><small>{ui3(locale,'Номер, контакт та захист кузова','Rejestracja, kontakt i ochrona lakieru','Plate, contact and paint protection')}</small></div></div>
     <div className="car-form-grid service-fields">
      <label><span>{ui3(locale,'Номер автомобіля','Numer rejestracyjny','License plate')}</span><input value={form.plate} onChange={e=>set('plate',e.target.value)} placeholder="WX 1234AB"/></label>
      <label><span>{ui3(locale,'Телефон власника','Telefon właściciela','Owner phone')}</span><input inputMode="tel" value={form.ownerPhone} onChange={e=>set('ownerPhone',e.target.value)} placeholder="+48 000 000 000"/></label>
      <label className="ceramic-toggle span-2"><input type="checkbox" checked={!!form.hasCeramic} onChange={e=>set('hasCeramic',e.target.checked)}/><div><b>{ui3(locale,'На автомобілі є керамічне покриття','Auto ma powłokę ceramiczną','Ceramic coating installed')}</b><small>{ui3(locale,'Це допомагає пропонувати коректні подальші роботи.','Pomaga to proponować odpowiednie kolejne usługi.','This helps suggest the right maintenance services later.')}</small></div></label>
     </div>
    </section>

    {error&&<div className="inline-error"><TriangleAlert/>{error}</div>}
   </div>

   <div className="car-form-footer">
    <button className="secondary" onClick={onClose} disabled={busy}>{ui3(locale,'Скасувати','Anuluj','Cancel')}</button>
    <button className="primary" onClick={save} disabled={busy}>{busy?<Loader2 className="spin"/>:<Check/>}<span>{car?ui3(locale,'Зберегти зміни','Zapisz zmiany','Save changes'):ui3(locale,'Додати авто','Dodaj auto','Add vehicle')}</span></button>
   </div>
  </div>
 </div>
}
function ProfilePage({t,session,locale,setLocale,currency,setCurrency,goto}:any){const changeCurrency=async(next:string)=>{const value=next.toUpperCase();setCurrency(value);try{await api.setCurrency(value);notify('success')}catch{notify('error')}};return <section><div className="profile-card"><div className="avatar"><img src={session.user.photoUrl||api.profilePhotoUrl()} alt={session.user.firstName||'Telegram profile'} onError={e=>{const img=e.currentTarget;img.style.display='none';const fallback=img.nextElementSibling as HTMLElement|null;if(fallback)fallback.style.display='grid'}}/><span style={{display:'none'}}>{(session.user.firstName||'C')[0]}</span></div><div className="grow"><h2>{session.user.firstName}</h2><p>{session.user.username?'@'+session.user.username:t('common.telegramUser')}</p><small>{t('profile.role')}: {t((`role.${session.user.role}` as TranslationKey))}</small></div></div><div className="settings-card"><label><Globe2/><span>{t('profile.language')}</span><select value={locale} onChange={e=>setLocale(e.target.value as Locale)}>{supportedLocales.map(code=><option value={code} key={code}>{localeNames[code]}</option>)}</select></label><label><Gem/><span>{t('profile.currency')}</span><select value={currency} onChange={e=>changeCurrency(e.target.value)}><option>PLN</option><option>USD</option><option>UAH</option></select></label><button className="profile-action" onClick={()=>goto('orders')}><ClipboardList/><span><b>{t('profile.requests')}</b><small>{t('profile.requestsHint')}</small></span><ChevronRight/></button><button className="profile-action" onClick={()=>goto('cars')}><Car/><span><b>{ui3(locale,'Мої автомобілі','Moje samochody','My cars')}</b><small>{ui3(locale,'Авто, пакети та історія робіт','Auta, pakiety i historia prac','Cars, packages and service history')}</small></span><ChevronRight/></button><button className="profile-action" onClick={()=>openBot()}><MessageCircle/><span><b>{t('profile.chat')}</b><small>{t('profile.chatHint')}</small></span><ChevronRight/></button></div></section>}
const previewFx:Record<string,Record<string,number>>={PLN:{PLN:1,USD:.26,UAH:11.1},USD:{USD:1,PLN:3.85,UAH:42.7},UAH:{UAH:1,PLN:.09,USD:.0234}};
const convertPreview=(v:number,from:string,to:string)=>Number(v||0)*(previewFx[from]?.[to]||1);
const money=(v:number,c:string)=>new Intl.NumberFormat(undefined,{style:'currency',currency:c||'PLN',maximumFractionDigits:2}).format(Number(v||0));
