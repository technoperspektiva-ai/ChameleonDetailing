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
 return <span className="premium-main-service-icon" role="img" aria-label={label||slug||'Service'}>
  <img src={`/main-service-icons/${key}.webp`} alt="" aria-hidden="true"/>
 </span>;
}
