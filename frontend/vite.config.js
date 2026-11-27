import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '^/api/feedback(?:/|$)': {
        // Somente o proxy de desenvolvimento; não é incorporado ao bundle público.
        target: process.env.FEEDBACK_PROXY_TARGET || 'http://127.0.0.1:3333',
        changeOrigin: false,
      },
      '^/api/metricas(?:/|$)': {
        target: 'http://127.0.0.1:3333',
        changeOrigin: false,
      },
    },
  },
})
