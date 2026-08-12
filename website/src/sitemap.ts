import type { Route } from '@pyyupsk/vite-plugin-sitemap';

export default [
  {
    url: 'https://opsentinel.dev/',
    priority: 1.0,
    changefreq: 'daily',
  },
  {
    url: 'https://opsentinel.dev/features',
    priority: 0.9,
    changefreq: 'weekly',
  },
  {
    url: 'https://opsentinel.dev/infrastructure',
    priority: 0.8,
    changefreq: 'weekly',
  },
  {
    url: 'https://opsentinel.dev/configuration',
    priority: 0.8,
    changefreq: 'weekly',
  },
  {
    url: 'https://opsentinel.dev/pricing',
    priority: 0.9,
    changefreq: 'weekly',
  },
  {
    url: 'https://opsentinel.dev/docs',
    priority: 0.7,
    changefreq: 'weekly',
  },
] satisfies Route[];
