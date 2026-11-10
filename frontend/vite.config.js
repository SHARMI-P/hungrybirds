import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // REACT_APP_* is still accepted so existing Vercel env vars keep working.
  envPrefix: ['VITE_', 'REACT_APP_'],
  server: { port: 3000 },
  preview: { port: 3000 },
  // Same output folder as Create React App, so the Vercel project settings don't change.
  build: { outDir: 'build', sourcemap: false },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
  },
});
