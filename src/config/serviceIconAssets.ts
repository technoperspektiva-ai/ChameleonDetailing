import c0 from './iconSpriteChunks/chunk0';
import c1 from './iconSpriteChunks/chunk1';
import c2 from './iconSpriteChunks/chunk2';
import c3 from './iconSpriteChunks/chunk3';
import c4 from './iconSpriteChunks/chunk4';
import c5 from './iconSpriteChunks/chunk5';
import c6 from './iconSpriteChunks/chunk6';
import c7 from './iconSpriteChunks/chunk7';
import c8 from './iconSpriteChunks/chunk8';
import c9 from './iconSpriteChunks/chunk9';
import c10 from './iconSpriteChunks/chunk10';

export const approvedIconSprite='data:image/webp;base64,'+[c0,c1,c2,c3,c4,c5,c6,c7,c8,c9,c10].join('');

export const approvedIconIndex:Record<string,number>={
 'exterior-detailing':0,
 'interior-detailing':1,
 'full-detailing':2,
 'ceramic-coating':3,
 'leather-protection':4,
 'seat-cleaning-1':5,
 'seat-cleaning-2':6,
 'seat-cleaning-4':7,
 'plastic-restoration':8,
 'anti-rain':9,
 'body-bitumen-removal':10,
 'body-metal-fallout-removal':11,
 'hard-wax':12,
 'liquid-wax':13,
 'pet-hair':14,
 'ceramic-spray':15,
 'odor':16,
 'wax':17
};

export const hasApprovedIcon=(slug?:string)=>Object.prototype.hasOwnProperty.call(approvedIconIndex,String(slug||''));
export const approvedIconStyle=(slug?:string)=>{
 const index=approvedIconIndex[String(slug||'')];
 if(index===undefined)return undefined;
 const col=index%5,row=Math.floor(index/5);
 return {
  backgroundImage:`url("${approvedIconSprite}")`,
  backgroundSize:'500% 400%',
  backgroundPosition:`${col*25}% ${row*(100/3)}%`,
  backgroundRepeat:'no-repeat'
 } as const;
};
