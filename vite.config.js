import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react', 'chart.js', 'react-chartjs-2'],
          firebase: ['firebase/app', 'firebase/storage', 'firebase/firestore']
        }
      }
    }
  }
});
