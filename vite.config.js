import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['framer-motion'],
          map: ['leaflet', 'react-leaflet'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
});
