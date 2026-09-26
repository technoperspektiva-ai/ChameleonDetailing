import React from 'react';
import {approvedIconStyle,hasApprovedIcon} from '../config/serviceIconAssets';

export function ApprovedServiceIcon({slug,label,className=''}:{slug?:string;label?:string;className?:string}){
 if(!hasApprovedIcon(slug))return null;
 return <span className={`approved-service-icon ${className}`.trim()} role="img" aria-label={label||slug||'Service'} style={approvedIconStyle(slug)}/>;
}
