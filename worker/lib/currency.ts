export const fx:Record<string,Record<string,number>>={
 PLN:{PLN:1,USD:.26,UAH:11.1},
 USD:{USD:1,PLN:3.85,UAH:42.7},
 UAH:{UAH:1,PLN:.09,USD:.0234}
};
export const normalizeCurrency=(value?:string|null)=>{const c=String(value||'').toUpperCase();return ['PLN','USD','UAH'].includes(c)?c:'PLN'};
export const convertCurrency=(amount:number,from:string,to:string)=>{const f=normalizeCurrency(from),t=normalizeCurrency(to);return Math.round((Number(amount||0)*(fx[f]?.[t]||1))*100)/100};
