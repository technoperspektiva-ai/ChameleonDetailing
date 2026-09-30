import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins:[react()],
  build:{ outDir:'dist', sourcemap:false },
  server:{ port:5173 },
  // Used only by `vite preview` during the temporary review tunnel.
  // Production is served by Cloudflare Workers and is unaffected.
  preview:{ allowedHosts:true }
});
