import en from './en.json';
import uk from './uk.json';
import pl from './pl.json';
import de from './de.json';
import fr from './fr.json';

export type Locale='uk'|'pl'|'en'|'de'|'fr';
export const supportedLocales:Locale[]=['uk','pl','en','de','fr'];
export const localeLabels:Record<Locale,string>={uk:'UA',pl:'PL',en:'EN',de:'DE',fr:'FR'};
export const localeNames:Record<Locale,string>={uk:'Українська',pl:'Polski',en:'English',de:'Deutsch',fr:'Français'};
export type TranslationKey=keyof typeof en;
const dictionaries:Record<Locale,Record<string,string>>={en,uk,pl,de,fr};

export const normalizeLocale=(value?:string|null):Locale=>{
  const v=(value||'').toLowerCase();
  if(v.startsWith('uk')||v.startsWith('ua'))return 'uk';
  if(v.startsWith('pl'))return 'pl';
  if(v.startsWith('de'))return 'de';
  if(v.startsWith('fr'))return 'fr';
  return 'en';
};

const isLongDebug=()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('debugLocale')==='long';
export const createTranslator=(locale:Locale)=>(key:TranslationKey):string=>{
  const value=dictionaries[locale]?.[key]??dictionaries.en[key]??'Something went wrong';
  if(import.meta.env.DEV&&dictionaries[locale]?.[key]===undefined)console.warn(`[i18n] Missing ${locale}:${key}`);
  return isLongDebug()?`${value} · ${value}`:value;
};
export const splashSlogan:Record<Locale,string>={uk:uk['splash.slogan'],pl:pl['splash.slogan'],en:en['splash.slogan'],de:de['splash.slogan'],fr:fr['splash.slogan']};
