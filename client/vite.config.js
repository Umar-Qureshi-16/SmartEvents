import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // The browser talks to the API through this origin, so session cookies are
    // first-party in development exactly as they are behind the Vercel rewrite.
    proxy: {
      '/api': { target: process.env.LOCAL_API_URL || 'http://127.0.0.1:5000', changeOrigin: false },
    },
  },
  test: {
    environment: 'jsdom',
    // Tests assert the same-origin default; a developer's client/.env must not change it.
    env: { VITE_API_URL: '' },
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
  },
})

// TRG-HOT-RESTART-001
