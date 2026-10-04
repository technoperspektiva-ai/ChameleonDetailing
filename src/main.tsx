import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { DesktopApp } from './DesktopApp';
import './styles.css';
import './visual-v2.css';

const isDesktop=location.pathname==='/desktop'||location.pathname.startsWith('/desktop/');
document.documentElement.classList.toggle('desktop-route',isDesktop);
const desktopPhone=isDesktop&&typeof screen!=='undefined'&&navigator.maxTouchPoints>0&&Math.min(screen.width,screen.height)<=680;
document.documentElement.classList.toggle('desktop-phone',desktopPhone);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isDesktop?<DesktopApp/>:<App/>}</React.StrictMode>
);
