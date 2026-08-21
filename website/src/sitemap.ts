import type { Route } from '@pyyupsk/vite-plugin-sitemap';

export default [
  {
    url: '/',
    priority: 1.0,
    changefreq: 'daily',
  },
  {
    url: '/features',
    priority: 0.9,
    changefreq: 'weekly',
  },
  {
    url: '/infrastructure',
    priority: 0.8,
    changefreq: 'weekly',
  },
  {
    url: '/configuration',
    priority: 0.8,
    changefreq: 'weekly',
  },
  {
    url: '/pricing',
    priority: 0.9,
    changefreq: 'weekly',
  },
  {
    url: '/docs',
    priority: 0.7,
    changefreq: 'weekly',
  },
] satisfies Route[];
