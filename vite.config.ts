import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: { target: 'es2019', assetsInlineLimit: 100000000, cssCodeSplit: false },
  test: { environment: 'jsdom', globals: true, include: ['src/**/*.test.ts'] },
});
