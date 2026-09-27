import sedanUrl from '../assets/vehicles/sedan.webp';
import hatchbackUrl from '../assets/vehicles/hatchback.webp';
import suvUrl from '../assets/vehicles/suv.webp';
import largeSuvUrl from '../assets/vehicles/large-suv.webp';
import vanUrl from '../assets/vehicles/van.webp';

const artwork={
 sedan:sedanUrl,
 hatchback:hatchbackUrl,
 suv:suvUrl,
 'large-suv':largeSuvUrl,
 van:vanUrl,
} as const;

export function vehicleArtwork(body?:string|null){
 const raw=String(body||'').trim().toLowerCase().replace(/[_\s]+/g,'-');
 const type=
  (raw.includes('large')&&raw.includes('suv'))||(raw.includes('велики')&&raw.includes('сув'))?'large-suv':
  raw.includes('suv')||raw.includes('сув')||raw.includes('кросовер')||raw.includes('crossover')?'suv':
  raw.includes('van')||raw.includes('bus')||raw.includes('бус')||raw.includes('вен')?'van':
  raw.includes('hatch')||raw.includes('хетч')||raw.includes('універс')||raw.includes('wagon')?'hatchback':
  'sedan';
 return artwork[type];
}
