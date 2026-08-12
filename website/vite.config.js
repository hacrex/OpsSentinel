import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sitemap from '@pyyupsk/vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    react(),
    sitemap({
      hostname: 'https://opsentinel.dev',
      generateRobotsTxt: true,
      changefreq: 'weekly',
      priority: 0.7,
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
