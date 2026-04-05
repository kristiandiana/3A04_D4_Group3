import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/login': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/signup': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/public': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/operator': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/admin': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/sim': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
