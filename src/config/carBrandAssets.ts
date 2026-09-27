import c0 from './carBrandSpriteChunks/chunk0';
import c1 from './carBrandSpriteChunks/chunk1';
import c2 from './carBrandSpriteChunks/chunk2';
import c3 from './carBrandSpriteChunks/chunk3';
import c4 from './carBrandSpriteChunks/chunk4';
import c5 from './carBrandSpriteChunks/chunk5';
import c6 from './carBrandSpriteChunks/chunk6';
import c7 from './carBrandSpriteChunks/chunk7';
import c8 from './carBrandSpriteChunks/chunk8';
import c9 from './carBrandSpriteChunks/chunk9';
import c10 from './carBrandSpriteChunks/chunk10';
import c11 from './carBrandSpriteChunks/chunk11';
import c12 from './carBrandSpriteChunks/chunk12';
import c13 from './carBrandSpriteChunks/chunk13';
import c14 from './carBrandSpriteChunks/chunk14';
import c15 from './carBrandSpriteChunks/chunk15';
import c16 from './carBrandSpriteChunks/chunk16';
import c17 from './carBrandSpriteChunks/chunk17';
import c18 from './carBrandSpriteChunks/chunk18';
import c19 from './carBrandSpriteChunks/chunk19';
import c20 from './carBrandSpriteChunks/chunk20';
import c21 from './carBrandSpriteChunks/chunk21';
import c22 from './carBrandSpriteChunks/chunk22';
import c23 from './carBrandSpriteChunks/chunk23';
import c24 from './carBrandSpriteChunks/chunk24';
import c25 from './carBrandSpriteChunks/chunk25';
import c26 from './carBrandSpriteChunks/chunk26';

export const carBrandSprite='data:image/webp;base64,'+[c0,c1,c2,c3,c4,c5,c6,c7,c8,c9,c10,c11,c12,c13,c14,c15,c16,c17,c18,c19,c20,c21,c22,c23,c24,c25,c26].join('');

export const carBrandIndex:Record<string,number>={
 'abarth':0,
 'alfa_romeo':1,
 'audi':2,
 'bentley':3,
 'bmw':4,
 'byd':5,
 'chevrolet':6,
 'chrysler':7,
 'citroen':8,
 'cupra':9,
 'dacia':10,
 'dodge':11,
 'ds_automobiles':12,
 'ferrari':13,
 'fiat':14,
 'ford':15,
 'genesis':16,
 'gmc':17,
 'honda':18,
 'hyundai':19,
 'infiniti':20,
 'jaguar':21,
 'jeep':22,
 'kia':23,
 'lamborghini':24,
 'land_rover':25,
 'lexus':26,
 'maserati':27,
 'mazda':28,
 'mercedes_benz':29,
 'mg':30,
 'mini':31,
 'mitsubishi':32,
 'nissan':33,
 'opel':34,
 'other_brand':35,
 'peugeot':36,
 'polestar':37,
 'porsche':38,
 'renault':39,
 'range_rover':49,
 'seat':40,
 'skoda':41,
 'smart':42,
 'subaru':43,
 'suzuki':44,
 'tesla':45,
 'toyota':46,
 'volkswagen':47,
 'volvo':48
};

const standaloneCarBrandIcons=new Set([
 'abarth',
 'acura',
 'alfa_romeo',
 'aston_martin',
 'audi',
 'bentley',
 'bmw',
 'byd',
 'chery',
 'chevrolet',
 'chrysler',
 'citroen',
 'cupra',
 'dacia',
 'dodge',
 'ds_automobiles',
 'ferrari',
 'fiat',
 'ford',
 'genesis',
 'gmc',
 'hyundai',
 'infiniti',
 'jaguar',
 'jeep',
 'kia',
 'lamborghini',
 'land_rover',
 'lexus',
 'maserati',
 'mazda',
 'mclaren',
 'mercedes_benz',
 'mg',
 'mini',
 'mitsubishi',
 'nissan',
 'opel',
 'peugeot',
 'polestar',
 'porsche',
 'renault',
 'rolls_royce',
 'seat',
 'skoda',
 'smart',
 'subaru',
 'suzuki',
 'tesla',
 'toyota',
 'volkswagen',
 'volvo'
]);

export const normalizeBrandAssetKey=(brand?:string)=>{
 const raw=String(brand||'')
  .trim()
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g,'')
  .replace(/&/g,'and')
  .replace(/[^a-z0-9]+/g,'_')
  .replace(/^_+|_+$/g,'');
 const aliases:Record<string,string>={
  'mercedes':'mercedes_benz',
  'mercedes_benz':'mercedes_benz',
  'vw':'volkswagen',
  'land_rover':'land_rover',
  'alfa_romeo':'alfa_romeo',
  'ds':'ds_automobiles',
  'ds_automobiles':'ds_automobiles',
  'rolls_royce':'rolls_royce',
  'aston_martin':'aston_martin',
  'mclaren':'mclaren'
 };
 const key=aliases[raw]||raw;
 if(standaloneCarBrandIcons.has(key)||Object.prototype.hasOwnProperty.call(carBrandIndex,key))return key;
 return 'other_brand';
};

export const carBrandSpriteStyle=(brand?:string)=>{
 const key=normalizeBrandAssetKey(brand);
 const index=carBrandIndex[key]??carBrandIndex.other_brand;
 const col=index%8,row=Math.floor(index/8);
 return {
  backgroundImage:`url("${carBrandSprite}")`,
  backgroundSize:'800% 700%',
  backgroundPosition:`${col*(100/7)}% ${row*(100/6)}%`,
  backgroundRepeat:'no-repeat'
 } as const;
};

export const carBrandStandaloneIconSrc=(brand?:string)=>{
 const key=normalizeBrandAssetKey(brand);
 return standaloneCarBrandIcons.has(key)?`/car-brand-icons/${key}.png`:null;
};
