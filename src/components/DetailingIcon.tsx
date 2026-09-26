import React from 'react';

type Props={type?:string;label?:string};

const normalize=(value?:string)=>String(value||'custom-service').toLowerCase().replace(/_/g,'-');

function Glyph({type}:{type:string}){
 const t=normalize(type);
 const p=(d:string,key?:string)=><path key={key||d} d={d}/>;
 if(['exterior-detailing','exterior-wash'].includes(t))return <>{p('M20 55h56l-5-17-12-7H38l-12 7-6 17Z')}<circle cx="31" cy="59" r="7"/><circle cx="65" cy="59" r="7"/><path d="M28 38h40M18 48h-5m70 0h-5M25 25c5 4 7 8 7 13m39-13c-5 4-7 8-7 13"/></>;
 if(['interior-detailing','interior-cleaning','fabric-cleaning','seat-cleaning','seat-cleaning-1','seat-cleaning-2','seat-cleaning-4'].includes(t))return <><path d="M35 19c8 0 13 7 13 15v11h12c8 0 14 6 14 14v13H30V35c0-9 2-16 5-16Z"/><path d="M30 53h44M40 72v7m24-7v7"/><path d="M55 26h15l5 9"/></>;
 if(['full-detailing','detailing-package','quick-detail'].includes(t))return <>{p('M18 56h60l-5-17-12-7H35l-12 7-5 17Z')}<circle cx="30" cy="60" r="7"/><circle cx="66" cy="60" r="7"/><path d="m75 18 2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7ZM23 19l1.5 5 5 1.5-5 1.5-1.5 5-1.5-5-5-1.5 5-1.5 1.5-5Z"/></>;
 if(['ceramic-coating','leather-protection','paint-protection-film-care','ppf-maintenance','wheel-coating'].includes(t))return <><path d="M48 14 73 24v18c0 18-10 30-25 40-15-10-25-22-25-40V24l25-10Z"/><path d="m36 42 8 8 17-19"/><path d="M35 27h26m-23 10h20"/></>;
 if(['paint-correction','polishing'].includes(t))return <><circle cx="47" cy="52" r="25"/><circle cx="47" cy="52" r="11"/><path d="M48 26V15h20l8 8v11H62"/><path d="M24 69c13 10 32 10 46 0"/></>;
 if(['headlights-restoration'].includes(t))return <><path d="M17 56c12-21 31-32 57-30l6 30c-22 6-43 6-63 0Z"/><path d="M33 50c10-10 21-15 34-14"/><circle cx="56" cy="43" r="8"/></>;
 if(['engine-bay-cleaning'].includes(t))return <><rect x="19" y="27" width="58" height="43" rx="8"/><path d="M31 38h14v20H31zm20-7h16v28H51M25 22v8m45-8v8M14 43h8m52 0h8"/><path d="M36 64h25"/></>;
 if(['wheel-cleaning','wheel-tar-removal','wheel-iron-remover'].includes(t))return <><circle cx="48" cy="48" r="30"/><circle cx="48" cy="48" r="10"/><path d="M48 18v20m0 20v20M18 48h20m20 0h20M27 27l14 14m14 14 14 14m0-42L55 41M41 55 27 69"/></>;
 if(['tire-dressing'].includes(t))return <><circle cx="43" cy="49" r="28"/><circle cx="43" cy="49" r="16"/><path d="M69 22h12v32H69zM68 54l-9 12"/></>;
 if(['brake-calipers'].includes(t))return <><circle cx="49" cy="49" r="28"/><circle cx="49" cy="49" r="9"/><path d="M22 38h18v23H22c-7 0-10-5-10-12s3-11 10-11Z"/></>;
 if(['glass-cleaning','window-tinting'].includes(t))return <><path d="M19 67 33 25h40l7 42H19Z"/><path d="M26 57 72 35M31 66 77 44"/><path d="M18 76h62"/></>;
 if(['rain-repellent','anti-rain'].includes(t))return <><path d="M48 15c12 16 21 27 21 40 0 12-9 22-21 22S27 67 27 55c0-13 9-24 21-40Z"/><path d="M37 57c3 7 8 10 15 10"/><path d="M17 25h13m36 0h13"/></>;
 if(['plastic-trim-restoration','plastic-restoration'].includes(t))return <><path d="M19 60h58V33H45l-8 10H19v17Z"/><path d="M29 33v-9h22"/><path d="m70 18 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z"/></>;
 if(['chrome-care'].includes(t))return <><path d="M20 59c9-25 24-36 55-34l3 34H20Z"/><path d="M29 48h39M35 36h29"/><path d="m71 16 2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7Z"/></>;
 if(['mat-cleaning','carpet-ceramic'].includes(t))return <><rect x="22" y="21" width="52" height="54" rx="9"/><path d="M31 34h34M31 44h34M31 54h34M31 64h34"/></>;
 if(['leather-care','leather-cleaning'].includes(t))return <><path d="M35 18c9 0 14 7 14 17v10h13c8 0 14 6 14 14v13H29V34c0-10 2-16 6-16Z"/><path d="M58 21 73 27v11c0 10-5 17-15 24-9-7-14-14-14-24V27l14-6Z"/></>;
 if(['odor-removal'].includes(t))return <><path d="M22 57c14-8 15-21 26-21s12 13 26 21"/><path d="M25 68c12-6 15-16 23-16s11 10 23 16"/><path d="M35 31c0-7 5-12 13-17m13 17c0-7-5-12-13-17"/></>;
 if(['air-vent-cleaning'].includes(t))return <><circle cx="48" cy="48" r="28"/><path d="M31 39h34M28 48h40M31 57h34"/><path d="M75 70 61 58"/></>;
 if(['dashboard-care'].includes(t))return <><path d="M18 62c4-22 17-34 30-34s26 12 30 34H18Z"/><path d="M31 50h34M48 28v12"/><circle cx="48" cy="50" r="6"/></>;
 if(['pet-hair','pet-hair-removal'].includes(t))return <><path d="M24 63c9-3 14-12 19-22m-7 31c8-5 12-15 15-27m1 27c6-7 8-17 8-28m9 23c4-9 3-19 0-28"/><rect x="17" y="57" width="50" height="14" rx="7"/></>;
 if(['stain-removal','body-bitumen-removal','tar-removal'].includes(t))return <><path d="M24 65c5-13 2-20 12-24 8-4 11 4 18 0 9-5 17 4 17 12 0 12-12 20-25 20S20 74 24 65Z"/><path d="M64 21 78 35 58 55 44 41 64 21Z"/></>;
 if(['clay-bar-treatment','hard-wax'].includes(t))return <><rect x="20" y="31" width="56" height="34" rx="10"/><path d="M29 42h38M29 52h31"/></>;
 if(['iron-remover','body-metal-fallout-removal'].includes(t))return <><path d="M18 63h60"/><circle cx="31" cy="44" r="5"/><circle cx="48" cy="35" r="4"/><circle cx="63" cy="47" r="6"/><path d="M28 23v8m21-14v8m18 0v8"/></>;
 if(['bug-removal'].includes(t))return <><ellipse cx="48" cy="49" rx="12" ry="18"/><path d="M36 42 24 34m12 16-15 1m16 7-12 10m35-26 12-8m-12 16 15 1M59 58l12 10M48 31V20"/></>;
 if(['water-spot-removal'].includes(t))return <><circle cx="33" cy="39" r="8"/><circle cx="58" cy="31" r="5"/><circle cx="62" cy="57" r="10"/><circle cx="31" cy="62" r="4"/><path d="M18 75h60"/></>;
 if(['ppf-installation'].includes(t))return <><path d="M19 66 72 24v42H19Z"/><path d="M25 58 63 28M42 66l30-25"/><path d="M72 24h9v42h-9"/></>;
 if(['vinyl-wrap-care'].includes(t))return <><path d="M22 29h45c9 0 14 5 14 12s-5 12-14 12H39v19H22V29Z"/><path d="M36 53c3-7 8-12 15-15"/></>;
 if(['liquid-wax'].includes(t))return <><path d="M36 21h24v10h6v42H30V31h6V21Z"/><path d="M48 40c7 9 11 15 11 21a11 11 0 1 1-22 0c0-6 4-12 11-21Z"/></>;
 if(['fabric-ceramic'].includes(t))return <><path d="M34 19c8 0 14 7 14 16v10h13c8 0 14 6 14 14v13H29V35c0-9 2-16 5-16Z"/><path d="M57 26 71 31v9c0 9-5 15-14 21-8-6-13-12-13-21v-9l13-5Z"/></>;
 if(['leather-protection'].includes(t))return <><path d="M34 19c8 0 14 7 14 16v10h13c8 0 14 6 14 14v13H29V35c0-9 2-16 5-16Z"/><path d="M57 24 73 30v11c0 11-6 18-16 25-10-7-16-14-16-25V30l16-6Z"/></>;
 if(['underbody-wash'].includes(t))return <><path d="M18 45h60l-5-12H31l-6 12Z"/><circle cx="31" cy="48" r="6"/><circle cx="65" cy="48" r="6"/><path d="M28 65c5-8 11-8 16 0m8 0c5-8 11-8 16 0M34 73h28"/></>;
 if(['custom-service'].includes(t))return <><circle cx="48" cy="48" r="24"/><path d="M48 35v26M35 48h26"/><path d="M48 15v8m0 50v8M15 48h8m50 0h8"/></>;
 return <>{p('M18 56h60l-5-17-12-7H35l-12 7-5 17Z')}<circle cx="30" cy="60" r="7"/><circle cx="66" cy="60" r="7"/><path d="m72 18 2 7 7 2-7 2-2 7-2-7-7-2 7-2 2-7Z"/></>;
}

export function DetailingIcon({type,label}:Props){
 return <svg className="detailing-icon" viewBox="0 0 96 96" role="img" aria-label={label||type||'Service'}>
  <g fill="none" stroke="#a4ff00" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{filter:'drop-shadow(0 0 5px rgba(164,255,0,.35))'}}>
   <Glyph type={type||'custom-service'}/>
  </g>
 </svg>;
}
