import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({registerType:'prompt',manifest:{name:'تربتینو',short_name:'تربتینو',lang:'fa',dir:'rtl',start_url:'/',display:'standalone',background_color:'#FAFAFC',theme_color:'#6F248E',icons:[{src:'/logo-mark.png',sizes:'any',type:'image/png',purpose:'any'}]},workbox:{globPatterns:['**/*.{js,css,html,woff2,svg,png}'],navigateFallback:'/index.html',navigateFallbackDenylist:[/^\/v1/,/^\/health/,/^\/admin(?:\/|$)/],runtimeCaching:[]}})],
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
