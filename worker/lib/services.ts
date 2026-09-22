export type ServiceLocale='uk'|'pl'|'en';
export type ServiceCatalogItem={
  id:number;
  slug:string;
  basePrice:number;
  currency:string;
  durationMin:number;
  category:string;
  defaultImageUrl?:string;
  defaultIconKey?:string;
  translations:Record<ServiceLocale,{title:string;description:string}>;
};

export const defaultServiceImageMap:Record<string,string>={
  'exterior-detailing':'/service-icons/exterior-detailing.png',
  'interior-detailing':'/service-icons/interior-detailing.png',
  'full-detailing':'/service-icons/full-detailing.png',
  'ceramic-coating':'/service-icons/ceramic-coating.png'
};

export const serviceCatalog:ServiceCatalogItem[]=[
  {
    id:1,slug:'exterior-detailing',basePrice:150,currency:'PLN',durationMin:90,category:'EXTERIOR',defaultImageUrl:defaultServiceImageMap['exterior-detailing'],defaultIconKey:'exterior-detailing',
    translations:{
      uk:{title:'Детейлінг екстер’єру',description:'Глибоке очищення, деконтамінація та тривалий блиск.'},
      pl:{title:'Detailing zewnętrzny',description:'Dokładne czyszczenie, dekontaminacja i długotrwały połysk.'},
      en:{title:'Exterior Detailing',description:'Deep clean, decontamination and lasting shine.'}
    }
  },
  {
    id:2,slug:'interior-detailing',basePrice:120,currency:'PLN',durationMin:120,category:'INTERIOR',defaultImageUrl:defaultServiceImageMap['interior-detailing'],defaultIconKey:'interior-detailing',
    translations:{
      uk:{title:'Детейлінг інтер’єру',description:'Свіжий, чистий і комфортний салон.'},
      pl:{title:'Detailing wnętrza',description:'Świeże, czyste i komfortowe wnętrze.'},
      en:{title:'Interior Detailing',description:'Fresh, clean and comfortable interior.'}
    }
  },
  {
    id:3,slug:'full-detailing',basePrice:250,currency:'PLN',durationMin:180,category:'FULL',defaultImageUrl:defaultServiceImageMap['full-detailing'],defaultIconKey:'full-detailing',
    translations:{
      uk:{title:'Повний детейлінг',description:'Комплексне оновлення авто всередині та зовні.'},
      pl:{title:'Pełny detailing',description:'Kompleksowe odświeżenie auta wewnątrz i na zewnątrz.'},
      en:{title:'Full Detailing',description:'Complete inside & out showroom refresh.'}
    }
  },
  {
    id:4,slug:'ceramic-coating',basePrice:800,currency:'PLN',durationMin:360,category:'PROTECTION',defaultImageUrl:defaultServiceImageMap['ceramic-coating'],defaultIconKey:'ceramic-coating',
    translations:{
      uk:{title:'Керамічне покриття',description:'Довготривалий захист лакофарбового покриття та глибокий блиск.'},
      pl:{title:'Powłoka ceramiczna',description:'Długotrwała ochrona lakieru i głęboki połysk.'},
      en:{title:'Ceramic Coating',description:'Long-term paint protection and gloss.'}
    }
  }
];

export const normalizeServiceLocale=(locale?:string|null):ServiceLocale=>{
  const v=(locale||'').toLowerCase();
  if(v.startsWith('uk')||v.startsWith('ua'))return 'uk';
  if(v.startsWith('pl'))return 'pl';
  return 'en';
};

export const fallbackServicesFor=(locale?:string|null)=>{
  const l=normalizeServiceLocale(locale);
  return serviceCatalog.map(s=>({
    id:s.id,
    slug:s.slug,
    title:s.translations[l].title,
    description:s.translations[l].description,
    basePrice:s.basePrice,
    currency:s.currency,
    durationMin:s.durationMin,
    category:s.category,
    imageUrl:s.defaultImageUrl||'',
    iconKey:s.defaultIconKey||'',
    isPopular:true
  }));
};
