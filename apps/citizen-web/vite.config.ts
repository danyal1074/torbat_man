import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'تربتینو — شهر تو، همراه تو', short_name: 'تربتینو', lang: 'fa', dir: 'rtl', start_url: '/',
        description: 'شهر تو، همراه تو — سوپراپلیکیشن شهروندی تربتینو',
        display: 'standalone', background_color: '#FAFAFC', theme_color: '#6F248E',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,woff2,svg,png}'],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        runtimeCaching: [{
          urlPattern: ({ request, sameOrigin, url }) => sameOrigin && request.mode === 'navigate'
            && !/^\/(?:v1|admin|login|account|notifications|requests|health)(?:\/|$)/.test(url.pathname)
            && !/^\/shahrbin\/(?:new|reports|success)(?:\/|$)/.test(url.pathname),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'torbatino-public-pages',
            cacheableResponse: { statuses: [200] },
            expiration: { maxEntries: 30, maxAgeSeconds: 7 * 24 * 3600 },
          },
        }],
      },
    }),
  ],
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
