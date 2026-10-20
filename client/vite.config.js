import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { apiProxy } from './api-proxy.js';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: apiProxy(process.env),
    watch: { usePolling: true, interval: 300 },
  },
});
