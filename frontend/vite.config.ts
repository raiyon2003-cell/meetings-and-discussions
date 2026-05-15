import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    /** Listen on all interfaces so http://localhost:5173 and LAN URLs work reliably. */
    host: true,
    port: 5173,
    strictPort: false,
    /** Open the system browser when you run `npm run dev` (disable with BROWSER=none). */
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts')) return 'recharts';
          if (id.includes('@tanstack/react-query')) return 'tanstack-query';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('react-router')) return 'react-router';
          if (id.includes('react-dom') || id.includes('/react/')) return 'react-core';
          if (id.includes('axios')) return 'axios';
          if (id.includes('lucide-react')) return 'lucide';
          if (id.includes('@radix-ui')) return 'radix';
          return 'vendor';
        },
      },
    },
  },
});
