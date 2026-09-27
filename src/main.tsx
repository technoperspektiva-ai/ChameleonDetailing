import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { DesktopApp } from './DesktopApp';
import './styles.css';

const isDesktop=location.pathname==='/desktop'||location.pathname.startsWith('/desktop/');

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{isDesktop?<DesktopApp/>:<App/>}</React.StrictMode>
);
