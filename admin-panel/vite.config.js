import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'REACT_APP_'], // existing REACT_APP_API_URL on Vercel keeps working
  server: { port: 3001 }, // cross-platform (the old `set PORT=3001` only worked on Windows)
  preview: { port: 3001 },
  build: { outDir: 'build' },
});
