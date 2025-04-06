/// <reference types="vitest" /> 

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es', // Ensures worker uses ES modules
  },
  test: {
    globals: true, // Use Vitest global APIs (describe, test, expect)
    environment: 'jsdom', // Simulate DOM environment
    setupFiles: './src/setupTests.ts', // Optional: Setup file for tests
    // Optional: Enable CSS processing in tests if needed (e.g., for CSS Modules)
    // css: true,
  },
  define: {
    'process.env': {},
  },
})
