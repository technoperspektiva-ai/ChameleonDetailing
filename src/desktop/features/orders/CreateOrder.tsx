import {useMemo,useState} from 'react';
import {CarFront,Plus,Tag,Trash2,UserPlus,Wrench} from 'lucide-react';
import {useData,usePreference} from '../../hooks';
import {post} from '../../api/desktopApi';
import {Drawer} from '../../components/primitives';
import {showError,notify} from '../../components/Toast';
import {fromBusinessLocal,money} from '../../format';
import type {Client,Vehicle,Service} from '../../types/desktop';

type CatalogOption={id:number;slug:string;title:string;price:number;base_currency:string;display_price?:number;display_currency?:string;enabled:number};
type ExtraDraft={id:number;title:string;price:number};
type NewClient={firstName:string;username:string;phone:string;telegramUserId:string};
type NewCar={brand:string;model:string;plate:string;name:string;bodyType:string;modification:string;ownerPhone:string;hasCeramic:boolean};

const bodyTypes=[['sedan','Седан'],['hatchback','Хетчбек / універсал'],['suv','SUV'],['large-suv','Великий SUV'],['van','Вен / бус']] as const;
const orderStatuses=[['REQUESTED','Подано'],['PENDING_CONFIRMATION','Очікує підтвердження'],['CONFIRMED','Підтверджено']] as const;

export function CreateOrder({userId,close,created}:{userId?:number;close:()=>void;created:(id:number)=>void}){
 const [currency]=usePreference('currency','PLN');
 const catalogUrl='/api/desktop/services/catalog?currency='+encodeURIComponent(currency);
 const {rows:clients}=useData<Client>('/api/desktop/clients','clients');
 const {rows:cars}=useData<Vehicle>('/api/desktop/cars','cars');
 const {rows:services}=useData<Service>(catalogUrl,'services');
 const {rows:options}=useData<CatalogOption>(catalogUrl,'options');
 const {rows:staffRows}=useData<any>('/api/desktop/staff','staff');

 const [clientMode,setClientMode]=useState<'existing'|'new'>('existing');
 const [client,setClient]=useState(String(userId||''));
 const [clientQuery,setClientQuery]=useState('');
 const [newClient,setNewClient]=useState<NewClient>({firstName:'',username:'',phone:'',telegramUserId:''});

 const [carMode,setCarMode]=useState<'existing'|'new'>(userId?'existing':'new');
 const [car,setCar]=useState('');
 const [newCar,setNewCar]=useState<NewCar>({brand:'',model:'',plate:'',name:'',bodyType:'sedan',modification:'',ownerPhone:'',hasCeramic:false});

 const [primaryMode,setPrimaryMode]=useState<'catalog'|'manual'>('catalog');
 const [service,setService]=useState('');
 const [additionalServices,setAdditionalServices]=useState<number[]>([]);
 const [optionIds,setOptionIds]=useState<number[]>([]);
 const [manualWork,setManualWork]=useState({title:'',price:'',durationMin:'60'});
 const [extraTitle,setExtraTitle]=useState('');
 const [extraPrice,setExtraPrice]=useState('');
 const [customExtras,setCustomExtras]=useState<ExtraDraft[]>([]);

 const [discountPct,setDiscountPct]=useState(0);
 const [finalOverride,setFinalOverride]=useState('');
 const [date,setDate]=useState('');
 const [status,setStatus]=useState('PENDING_CONFIRMATION');
 const [duration,setDuration]=useState('');
 const [responsible,setResponsible]=useState('');
 const [note,setNote]=useState('');
 const [busy,setBusy]=useState(false);

 const needle=clientQuery.trim().toLowerCase().replace(/^@/,'');
 const matchingClients=needle?clients.filter(x=>[x.first_name,x.username,x.phone_number,x.telegram_user_id].filter(Boolean).join(' ').toLowerCase().includes(needle)):clients;
 const selectedClient=clients.find(x=>String(x.id)===client);
 const clientCars=cars.filter(x=>x.user_id===Number(client));
 const activeServices=services.filter(x=>Number(x.enabled)!==0);
 const activeOptions=options.filter(x=>Number(x.enabled)!==0);

 const servicePrice=(x:any)=>Number(x.display_price??x.base_price??x.price??0);
 const primaryService=activeServices.find(x=>String(x.id)===service);
 const selectedAdditional=activeServices.filter(x=>additionalServices.includes(Number(x.id))&&String(x.id)!==service);
 const selectedOptions=activeOptions.filter(x=>optionIds.includes(Number(x.id)));
 const subtotal=useMemo(()=>{
  const primary=primaryMode==='catalog'?servicePrice(primaryService):Math.max(0,Number(manualWork.price||0));
  const extras=selectedAdditional.reduce((sum,x)=>sum+servicePrice(x),0);
  const optionsTotal=selectedOptions.reduce((sum,x)=>sum+servicePrice(x),0);
  const custom=customExtras.reduce((sum,x)=>sum+Math.max(0,Number(x.price||0)),0);
  return Math.round((primary+extras+optionsTotal+custom)*100)/100;
 },[primaryMode,service,manualWork.price,additionalServices.join(','),optionIds.join(','),customExtras,currency,services,options]);
 const discountAmount=Math.round(subtotal*Math.max(0,Math.min(90,discountPct))/100*100)/100;
 const calculatedFinal=Math.max(0,Math.round((subtotal-discountAmount)*100)/100);
 const finalPrice=finalOverride.trim()===''?calculatedFinal:Math.max(0,Number(finalOverride||0));

 const toggle=(list:number[],id:number,set:(v:number[])=>void)=>set(list.includes(id)?list.filter(x=>x!==id):[...list,id]);
 const addCustomExtra=()=>{
  const title=extraTitle.trim(),price=Math.max(0,Number(extraPrice||0));
  if(!title)return;
  setCustomExtras(x=>[...x,{id:Date.now()+x.length,title,price}]);setExtraTitle('');setExtraPrice('');
 };

 const validClient=clientMode==='existing'?Boolean(client):Boolean(newClient.firstName.trim());
 const validCar=carMode==='existing'?Boolean(car):Boolean(newCar.brand.trim()||newCar.model.trim()||newCar.plate.trim());
 const validPrimary=primaryMode==='catalog'?Boolean(service):Boolean(manualWork.title.trim());
 const canSubmit=validClient&&validCar&&validPrimary&&!busy;

 const submit=async()=>{
  setBusy(true);
  try{
   const payload:any={
    currency,
    status,
    scheduledFor:date?fromBusinessLocal(date):null,
    staffNote:note,
    discountPercent:discountPct,
    discountAmount,
    finalPrice,
    serviceIds:primaryMode==='catalog'?[Number(service),...additionalServices.filter(id=>id!==Number(service))]:additionalServices,
    optionIds,
    customExtras:customExtras.map(x=>({title:x.title,price:x.price,currency})),
   };
   if(duration.trim())payload.estimatedDurationMin=Math.max(5,Number(duration));
   if(responsible)payload.responsibleStaffId=Number(responsible);
   if(clientMode==='existing')payload.userId=Number(client);
   else payload.newClient={firstName:newClient.firstName.trim(),username:newClient.username.trim().replace(/^@/,''),phone:newClient.phone.trim(),telegramUserId:newClient.telegramUserId.trim()?Number(newClient.telegramUserId):undefined};
   if(carMode==='existing')payload.carId=Number(car);
   else payload.newCar={...newCar,name:newCar.name.trim()||[newCar.brand,newCar.model].filter(Boolean).join(' ')||newCar.plate||'Автомобіль'};
   if(primaryMode==='manual')payload.customPrimary={title:manualWork.title.trim(),price:Math.max(0,Number(manualWork.price||0)),currency,durationMin:Math.max(5,Number(manualWork.durationMin||60))};
   const d=await post('/api/desktop/orders',payload);
   notify('Замовлення CHD-'+d.id+' створено');
   created(d.id);
  }catch(error){showError(error)}finally{setBusy(false)}
 };

 return <Drawer title="Нове замовлення" close={close}>
  <form className="desk-form create-order-form" onSubmit={async e=>{e.preventDefault();if(canSubmit)await submit()}}>
   <section className="create-order-section full">
    <header><span><UserPlus/></span><div><b>Клієнт</b><small>Оберіть з бази або заведіть нового прямо тут</small></div><div className="create-order-mode"><button type="button" className={clientMode==='existing'?'active':''} onClick={()=>setClientMode('existing')}>З бази</button><button type="button" className={clientMode==='new'?'active':''} onClick={()=>{setClientMode('new');setClient('');setCar('');setCarMode('new')}}>Новий</button></div></header>
    {clientMode==='existing'?<div className="client-lookup"><input type="search" value={clientQuery} onChange={e=>setClientQuery(e.target.value)} placeholder="@telegram, телефон, ім’я або Telegram ID"/><select value={client} onChange={e=>{setClient(e.target.value);setCar('');setCarMode('existing')}}><option value="">Оберіть клієнта…</option>{matchingClients.slice(0,150).map(x=><option key={x.id} value={x.id}>{x.first_name||x.username||x.id}{x.username?' · @'+x.username:''}{x.phone_number?' · '+x.phone_number:''}</option>)}</select></div>:<div className="create-order-grid"><label>Ім’я *<input value={newClient.firstName} onChange={e=>setNewClient({...newClient,firstName:e.target.value})} placeholder="Напр. Олексій"/></label><label>Telegram @<input value={newClient.username} onChange={e=>setNewClient({...newClient,username:e.target.value})} placeholder="@username"/></label><label>Телефон<input value={newClient.phone} onChange={e=>setNewClient({...newClient,phone:e.target.value})} placeholder="+48…"/></label><label>Telegram ID <small>необов’язково</small><input inputMode="numeric" value={newClient.telegramUserId} onChange={e=>setNewClient({...newClient,telegramUserId:e.target.value.replace(/\D/g,'')})} placeholder="Якщо відомий"/></label></div>}
    {selectedClient&&clientMode==='existing'&&<p className="create-order-context">{selectedClient.username?'@'+selectedClient.username+' · ':''}{selectedClient.phone_number||'телефон не вказано'} · {selectedClient.cars||0} авто</p>}
   </section>

   <section className="create-order-section full">
    <header><span><CarFront/></span><div><b>Автомобіль</b><small>Можна створити авто, якого ще немає в базі</small></div><div className="create-order-mode"><button type="button" disabled={clientMode==='new'||!client} className={carMode==='existing'?'active':''} onClick={()=>setCarMode('existing')}>З бази</button><button type="button" className={carMode==='new'?'active':''} onClick={()=>{setCarMode('new');setCar('')}}>Нове авто</button></div></header>
    {carMode==='existing'&&clientMode==='existing'?<label className="full">Автомобіль<select value={car} onChange={e=>setCar(e.target.value)}><option value="">Оберіть автомобіль…</option>{clientCars.map(x=><option key={x.id} value={x.id}>{[x.brand,x.model,x.modification,x.plate].filter(Boolean).join(' · ')||x.name||('Авто #'+x.id)}</option>)}</select>{client&&!clientCars.length&&<small>У клієнта ще немає авто — перемкніть на «Нове авто».</small>}</label>:<div className="create-order-grid"><label>Марка<input value={newCar.brand} onChange={e=>setNewCar({...newCar,brand:e.target.value})} placeholder="BMW"/></label><label>Модель<input value={newCar.model} onChange={e=>setNewCar({...newCar,model:e.target.value})} placeholder="X5"/></label><label>Номер<input value={newCar.plate} onChange={e=>setNewCar({...newCar,plate:e.target.value.toUpperCase()})} placeholder="AA 1234 KT"/></label><label>Тип кузова<select value={newCar.bodyType} onChange={e=>setNewCar({...newCar,bodyType:e.target.value})}>{bodyTypes.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label>Модифікація<input value={newCar.modification} onChange={e=>setNewCar({...newCar,modification:e.target.value})} placeholder="M Competition / 3.0d"/></label><label>Назва в базі<input value={newCar.name} onChange={e=>setNewCar({...newCar,name:e.target.value})} placeholder="Необов’язково"/></label><label>Телефон власника<input value={newCar.ownerPhone} onChange={e=>setNewCar({...newCar,ownerPhone:e.target.value})} placeholder="Якщо інший"/></label><label className="create-order-check"><input type="checkbox" checked={newCar.hasCeramic} onChange={e=>setNewCar({...newCar,hasCeramic:e.target.checked})}/>Є кераміка</label></div>}
   </section>

   <section className="create-order-section full">
    <header><span><Wrench/></span><div><b>Роботи</b><small>Каталог + разова робота + додаткові опції</small></div><div className="create-order-mode"><button type="button" className={primaryMode==='catalog'?'active':''} onClick={()=>setPrimaryMode('catalog')}>З каталогу</button><button type="button" className={primaryMode==='manual'?'active':''} onClick={()=>setPrimaryMode('manual')}>Разова</button></div></header>
    {primaryMode==='catalog'?<label className="full">Основна послуга<select value={service} onChange={e=>{setService(e.target.value);setAdditionalServices(x=>x.filter(id=>id!==Number(e.target.value)))}}><option value="">Оберіть основну послугу…</option>{activeServices.map((x:any)=><option key={x.id} value={x.id}>{x.title} · {money(servicePrice(x),x.display_currency||currency)}</option>)}</select></label>:<div className="create-order-grid"><label className="span-2">Назва разової роботи *<input value={manualWork.title} onChange={e=>setManualWork({...manualWork,title:e.target.value})} placeholder="Напр. локальне відновлення лаку"/></label><label>Ціна · {currency}<input type="number" min="0" step=".01" value={manualWork.price} onChange={e=>setManualWork({...manualWork,price:e.target.value})}/></label><label>Тривалість, хв<input type="number" min="5" value={manualWork.durationMin} onChange={e=>setManualWork({...manualWork,durationMin:e.target.value})}/></label></div>}

    <details className="create-order-details">
     <summary>Додаткові основні послуги <b>{additionalServices.length||''}</b></summary>
     <div className="create-order-choice-grid">{activeServices.filter(x=>String(x.id)!==service).map((x:any)=><label className={additionalServices.includes(Number(x.id))?'selected':''} key={x.id}><input type="checkbox" checked={additionalServices.includes(Number(x.id))} onChange={()=>toggle(additionalServices,Number(x.id),setAdditionalServices)}/><span><b>{x.title}</b><small>{money(servicePrice(x),x.display_currency||currency)}</small></span></label>)}</div>
    </details>

    <details className="create-order-details">
     <summary>Додаткові опції <b>{optionIds.length||''}</b></summary>
     <div className="create-order-choice-grid">{activeOptions.map((x:any)=><label className={optionIds.includes(Number(x.id))?'selected':''} key={x.id}><input type="checkbox" checked={optionIds.includes(Number(x.id))} onChange={()=>toggle(optionIds,Number(x.id),setOptionIds)}/><span><b>{x.title}</b><small>+ {money(servicePrice(x),x.display_currency||currency)}</small></span></label>)}</div>
    </details>

    <div className="create-order-custom-extra">
     <div><input value={extraTitle} onChange={e=>setExtraTitle(e.target.value)} placeholder="Разова додаткова робота"/><input type="number" min="0" step=".01" value={extraPrice} onChange={e=>setExtraPrice(e.target.value)} placeholder={'Ціна · '+currency}/><button type="button" onClick={addCustomExtra} disabled={!extraTitle.trim()}><Plus/>Додати</button></div>
     {customExtras.map(x=><p key={x.id}><span>{x.title}</span><b>{money(x.price,currency)}</b><button type="button" aria-label="Прибрати" onClick={()=>setCustomExtras(v=>v.filter(y=>y.id!==x.id))}><Trash2/></button></p>)}
    </div>
   </section>

   <section className="create-order-section full">
    <header><span><Tag/></span><div><b>Ціна й знижка</b><small>Уся форма працює у вибраній валюті {currency}</small></div><strong className="create-order-currency">{currency}</strong></header>
    <div className="create-order-discount">
     <div className="discount-presets">{[0,5,10,15,20].map(v=><button type="button" key={v} className={discountPct===v?'active':''} onClick={()=>setDiscountPct(v)}>{v?'-'+v+'%':'Без знижки'}</button>)}</div>
     <label>Знижка, %<input type="number" min="0" max="90" value={discountPct} onChange={e=>setDiscountPct(Math.max(0,Math.min(90,Number(e.target.value||0))))}/></label>
     <label>Фінальна сума <small>можна перевизначити</small><input type="number" min="0" step=".01" value={finalOverride} onChange={e=>setFinalOverride(e.target.value)} placeholder={String(calculatedFinal)}/></label>
    </div>
    <div className="create-order-total"><p><span>Роботи та опції</span><b>{money(subtotal,currency)}</b></p><p><span>Знижка</span><b>- {money(discountAmount,currency)}</b></p><p><span>До оплати</span><strong>{money(finalPrice,currency)}</strong></p></div>
   </section>

   <section className="create-order-section full">
    <header><span><Wrench/></span><div><b>Організація роботи</b><small>Час виконання почнеться тільки після статусу «Підтверджено»</small></div></header>
    <div className="create-order-grid">
     <label>Статус<select value={status} onChange={e=>setStatus(e.target.value)}>{orderStatuses.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
     <label>Відповідальний<select value={responsible} onChange={e=>setResponsible(e.target.value)}><option value="">Я / поточний Staff</option>{staffRows.filter((x:any)=>x.status==='ACTIVE').map((x:any)=><option value={x.id} key={x.id}>{x.staff_display_name||x.first_name||x.username||('Staff #'+x.id)} · {x.role}</option>)}</select></label>
     <label>Планова дата й час · Варшава<input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/></label>
     <label>Тривалість, хв <small>необов’язково</small><input type="number" min="5" max="10080" value={duration} onChange={e=>setDuration(e.target.value)} placeholder="Авто з послуг"/></label>
    </div>
    <label className="desk-field">Внутрішня примітка<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Що важливо знати майстру або менеджеру"/></label>
   </section>

   <div className="create-order-submit full">
    <div><small>Буде створено</small><b>{clientMode==='existing'?(selectedClient?.first_name||'клієнт'):newClient.firstName||'новий клієнт'} · {carMode==='existing'?(clientCars.find(x=>String(x.id)===car)?.brand||'авто'):(newCar.brand||newCar.model||newCar.plate||'нове авто')}</b></div>
    <button className="desk-primary" disabled={!canSubmit}>{busy?'Створення…':'Створити замовлення · '+money(finalPrice,currency)}</button>
   </div>
  </form>
 </Drawer>
}
