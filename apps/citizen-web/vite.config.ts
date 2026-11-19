import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({registerType:'prompt',manifest:{name:'تربت من',short_name:'تربت من',lang:'fa',dir:'rtl',start_url:'/',display:'standalone',background_color:'#FAFAFC',theme_color:'#6F248E',icons:[{src:'/app-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]},workbox:{globPatterns:['**/*.{js,css,html,woff2,svg}'],navigateFallback:'/index.html',navigateFallbackDenylist:[/^\/v1/,/^\/health/],runtimeCaching:[]}})],
  server: {
    port: 5173,
    proxy: {
      '/v1': {
        target: process.env.API_TARGET ?? 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
      '/health': {
        target: process.env.API_TARGET ?? 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
});
