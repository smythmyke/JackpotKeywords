import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor-markdown': ['react-markdown'],
          'vendor-helmet': ['react-helmet-async'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@jackpotkeywords/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
