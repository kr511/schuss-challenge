import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src/vite-root'),
  build: {
    outDir: resolve(__dirname, 'dist-react'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: true,
  },
});
