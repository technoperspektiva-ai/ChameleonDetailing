import {notify} from '../components/Toast';
export const api=async(path:string,init:RequestInit={})=>{
 const session=localStorage.getItem('chameleon.desktop.session')||'';
 const r=await fetch(path,{...init,headers:{'content-type':'application/json',...(session?{authorization:'Bearer '+session}:{}),...(init.headers||{})}});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(d.error||('HTTP '+r.status));
 if(init.method&&init.method!=='GET'&&!/login|logout|draft|personal-workspace/.test(path))notify('Зміни збережено');
 return d;
};
export const post=(path:string,data:any,method='POST')=>api(path,{method,body:JSON.stringify(data)});

