import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/categories': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/income': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/expenses': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/dashboard': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
