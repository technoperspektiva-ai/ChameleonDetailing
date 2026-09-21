import en from './en.json';
import uk from './uk.json';
import pl from './pl.json';

export type Locale='uk'|'pl'|'en';
export const supportedLocales:Locale[]=['uk','pl','en'];
export const localeLabels:Record<Locale,string>={uk:'UA',pl:'PL',en:'EN'};
export const localeNames:Record<Locale,string>={uk:'Українська',pl:'Polski',en:'English'};
export type TranslationKey=keyof typeof en;
const dictionaries:Record<Locale,Record<string,string>>={en,uk,pl};

export const normalizeLocale=(value?:string|null):Locale=>{
  const v=(value||'').toLowerCase();
  if(v.startsWith('uk')||v.startsWith('ua'))return 'uk';
  if(v.startsWith('pl'))return 'pl';
  return 'en';
};

const isLongDebug=()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('debugLocale')==='long';
export const createTranslator=(locale:Locale)=>(key:TranslationKey):string=>{
  const value=dictionaries[locale]?.[key]??dictionaries.en[key]??'Something went wrong';
  if(import.meta.env.DEV&&dictionaries[locale]?.[key]===undefined)console.warn(`[i18n] Missing ${locale}:${key}`);
  return isLongDebug()?`${value} · ${value}`:value;
};
export const splashSlogan:Record<Locale,string>={uk:uk['splash.slogan'],pl:pl['splash.slogan'],en:en['splash.slogan']};
