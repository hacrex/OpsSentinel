import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import sitemap from '@pyyupsk/vite-plugin-sitemap'

const trimTrailingSlash = (value) => value.replace(/\/$/, '')

function seoMetadata(env, mode) {
  const siteUrl = trimTrailingSlash(env.VITE_SITE_URL || 'https://opsentinel.dev')
  const indexable = env.VITE_SITE_INDEXABLE
    ? env.VITE_SITE_INDEXABLE === 'true'
    : mode === 'production'
  const robots = indexable ? 'index, follow' : 'noindex, nofollow'

  return {
    name: 'opsentinel-seo-metadata',
    transformIndexHtml(html) {
      return html
        .replaceAll('__SITE_URL__', siteUrl)
        .replaceAll('__ROBOTS_CONTENT__', robots)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const siteUrl = trimTrailingSlash(env.VITE_SITE_URL || 'https://opsentinel.dev')

  return {
    plugins: [
      react(),
      seoMetadata(env, mode),
      sitemap({
        hostname: siteUrl,
        generateRobotsTxt: true,
        changefreq: 'weekly',
        priority: 0.7,
      }),
    ],
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            icons: ['lucide-react'],
            markdown: ['react-markdown', 'remark-gfm'],
          },
        },
      },
    },
  }
})
