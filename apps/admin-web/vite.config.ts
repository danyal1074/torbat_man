import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
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
