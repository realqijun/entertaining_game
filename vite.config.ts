/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // three.js is ~700 kB minified (~180 kB gzipped); that's expected for this game.
  build: { chunkSizeWarningLimit: 1200 },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
