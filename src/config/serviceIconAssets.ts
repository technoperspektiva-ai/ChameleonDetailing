export const optionIconAsset:Record<string,string>={
 'leather-protection':'/service-icons/leather-protection.webp',
 'seat-cleaning-1':'/service-icons/seat-cleaning-1.webp',
 'seat-cleaning-2':'/service-icons/seat-cleaning-2.webp',
 'seat-cleaning-4':'/service-icons/seat-cleaning-4.webp',
 'plastic-restoration':'/service-icons/plastic-restoration.webp',
 'anti-rain':'/service-icons/anti-rain.webp',
 'body-bitumen-removal':'/service-icons/body-bitumen-removal.webp',
 'body-metal-fallout-removal':'/service-icons/body-metal-fallout-removal.webp',
 'hard-wax':'/service-icons/hard-wax.webp',
 'liquid-wax':'/service-icons/liquid-wax.webp',
 'pet-hair':'/service-icons/pet-hair.webp',
 'ceramic-spray':'/service-icons/ceramic-spray.webp',
 'odor':'/service-icons/odor.webp',
 'wax':'/service-icons/wax.webp'
};
export const optionIconUrl=(slug?:string)=>optionIconAsset[String(slug||'')]||'';
