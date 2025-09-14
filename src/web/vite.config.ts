import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  server: {
    port: Number(process.env.WEB_PORT || 5173),
    proxy: {
      '/api': 'http://localhost:' + (process.env.SERVER_PORT || 3001),
      '/uploads': 'http://localhost:' + (process.env.SERVER_PORT || 3001),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
  },
  css: {
    postcss: path.resolve(__dirname, 'postcss.config.cjs'),
  },
});
