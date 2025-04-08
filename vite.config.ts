/// <reference types="vitest" /> 

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const appVersion = process.env.npm_package_version || '0.0.0';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {

  // Base define configuration (applies always)
  const defineConf: Record<string, any> = {
    'process.env.NODE_ENV': JSON.stringify(mode),
    '__APP_VERSION__': JSON.stringify(appVersion),
  };

  // Specific defines ONLY for production build
  if (mode === 'production') {
    defineConf['process.platform'] = JSON.stringify('browser');
  }

  return {
    plugins: [react()],
    worker: {
      format: 'es', // Ensures worker uses ES modules
    },
    base: '/codecleanse/',
    test: {
      globals: true, // Use Vitest global APIs (describe, test, expect)
      environment: 'jsdom', // Simulate DOM environment
      setupFiles: './src/setupTests.ts', // Optional: Setup file for tests
      // Optional: Enable CSS processing in tests if needed (e.g., for CSS Modules)
      // css: true,
    },
    define: defineConf,
  }
});
