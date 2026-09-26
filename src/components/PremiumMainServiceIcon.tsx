import React from 'react';

type Props={slug?:string;label?:string};

const approvedMainServiceIcons=new Set([
 'exterior-detailing',
 'interior-detailing',
 'full-detailing',
 'ceramic-coating'
]);

export function PremiumMainServiceIcon({slug,label}:Props){
 const key=String(slug||'');
 if(!approvedMainServiceIcons.has(key))return null;
 const src=key==='exterior-detailing'?'/service-icons/exterior-detailing.png':`/main-service-icons/${key}.webp`;
 return <span className="premium-main-service-icon" role="img" aria-label={label||slug||'Service'}>
  <img
   src={src}
   alt=""
   aria-hidden="true"
   onError={e=>{const img=e.currentTarget;const fallback=`/service-icons/${key}.png`;if(img.src.endsWith(fallback))return;img.src=fallback}}
  />
 </span>;
}
