import type {ReactNode} from 'react';
export function Panel({title,children,action}:{title:string;children:ReactNode;action?:ReactNode}){return <section className="desk-panel"><div className="desk-panel-head"><h2>{title}</h2>{action}</div>{children}</section>}
