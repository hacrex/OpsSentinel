import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/events': 'http://localhost:3001',
      '/repos': 'http://localhost:3001',
      '/webhook': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
      '/rerun': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
      '/settings': 'http://localhost:3001',
    },
  },
})
