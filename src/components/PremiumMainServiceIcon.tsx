import React from 'react';

type Props={slug?:string;label?:string};

const common={fill:'none',stroke:'currentColor',strokeLinecap:'round' as const,strokeLinejoin:'round' as const};

export function PremiumMainServiceIcon({slug,label}:Props){
 const key=String(slug||'');
 return <span className="premium-main-service-icon" role="img" aria-label={label||slug||'Service'}>
  <svg viewBox="0 0 64 64" aria-hidden="true">
   <g {...common} strokeWidth="2.35">
    {key==='exterior-detailing'&&<>
     <path className="main-stroke" d="M11 39h42l-4-11-9-5H24l-9 5-4 11Z"/>
     <path className="main-stroke" d="M17 31h30M18 39v5m28-5v5"/>
     <circle className="main-stroke" cx="21" cy="43" r="4.5"/><circle className="main-stroke" cx="43" cy="43" r="4.5"/>
     <path className="accent-stroke" d="m49 12 1.7 4.5L55 18l-4.3 1.5L49 24l-1.7-4.5L43 18l4.3-1.5L49 12Z"/>
     <path className="accent-stroke" d="M14 17c2 2 3 4 3 6"/>
    </>}
    {key==='interior-detailing'&&<>
     <path className="main-stroke" d="M23 13c6 0 10 5 10 11v9h10c6 0 10 4 10 10v8H20V24c0-7 1-11 3-11Z"/>
     <path className="main-stroke" d="M20 40h33M27 51v4m19-4v4"/>
     <path className="accent-stroke" d="m47 14 1.6 4.2 4.1 1.5-4.1 1.5L47 25.5l-1.6-4.3-4.1-1.5 4.1-1.5L47 14Z"/>
     <path className="accent-stroke" d="M38 28c3 1 5 3 6 6"/>
    </>}
    {key==='full-detailing'&&<>
     <path className="main-stroke" d="M12 40h40l-4-10-8-5H24l-8 5-4 10Z"/>
     <circle className="main-stroke" cx="21" cy="44" r="4.2"/><circle className="main-stroke" cx="43" cy="44" r="4.2"/>
     <path className="accent-stroke" d="M10 23A23 23 0 0 1 48 16"/>
     <path className="accent-stroke" d="m47 11 2 6-6 2"/>
     <path className="accent-stroke" d="M54 41a23 23 0 0 1-38 9"/>
     <path className="accent-stroke" d="m17 55-2-6 6-2"/>
    </>}
    {key==='ceramic-coating'&&<>
     <path className="main-stroke" d="M12 39h31l-4-10-7-4H22l-7 4-3 10Z"/>
     <circle className="main-stroke" cx="20" cy="43" r="4"/><circle className="main-stroke" cx="36" cy="43" r="4"/>
     <path className="accent-stroke" d="M47 16 57 20v8c0 8-4 14-10 19-6-5-10-11-10-19v-8l10-4Z"/>
     <path className="accent-stroke" d="M47 25c3.5 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 1.5-5 5-9Z"/>
    </>}
   </g>
  </svg>
 </span>;
}
