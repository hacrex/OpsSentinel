# OpsSentinel Marketing Website

This is the static marketing and documentation site for OpsSentinel, separate from the application frontend. The current release is positioned around self-hosted, GitHub-native CI/CD observability: live workflow visibility, AI-assisted failure analysis, triage, MTTR tracking, and one-click workflow re-runs. Broader IaC, configuration-management, and cross-provider GitOps capabilities are roadmap areas unless explicitly marked otherwise on the site.

## Structure

```
website/
├── src/
│   ├── pages/
│   │   ├── Home.jsx            # Homepage and current-release positioning
│   │   ├── Features.jsx        # Available capabilities and roadmap scope
│   │   ├── Infrastructure.jsx  # Infrastructure roadmap/context page
│   │   ├── Configuration.jsx   # Configuration-management roadmap/context page
│   │   ├── Pricing.jsx         # Self-hosted pricing and roadmap offering
│   │   ├── Docs.jsx             # GitHub-backed Markdown documentation viewer
│   │   └── NotFound.jsx         # 404 page
│   ├── components/
│   │   └── Layout.jsx           # Shared navigation, theme toggle, and footer
│   ├── context/
│   │   └── ThemeContext.jsx     # Light/dark theme state
│   ├── styles.css               # Global styles and responsive layout rules
│   ├── App.jsx                  # Client-side route definitions
│   └── main.jsx                 # Application entry point
├── scripts/
│   └── smoke-test.mjs           # Route, asset, and SEO smoke checks
├── public/                      # Small static assets such as the favicon
├── index.html                   # HTML shell and SEO/social metadata
├── package.json                 # Dependencies and scripts
├── eslint.config.js             # Website-local ESLint 9 flat configuration
├── vite.config.js               # Vite build, chunking, and environment-aware sitemap configuration
├── .env.example                 # SEO, indexing, and docs-source configuration
└── Dockerfile                   # Production NGINX container
```

## Development

```bash
npm ci
npm run dev
```

## Quality checks

```bash
npm run lint
npm run build
npm run test:smoke
```

`npm run lint` uses the website-local ESLint 9 flat configuration. `npm run build` creates the production bundle in `dist/` and generates the sitemap and robots files through the Vite configuration. `npm run test:smoke` checks the running preview for all routes, static assets, generated SEO metadata, sitemap content, and robots directives.

## Deployment

### Static Hosting (Recommended)
Deploy the `dist/` folder to Netlify, Vercel, Cloudflare Pages, or another static host that supports SPA fallback rewrites. The repository includes `vercel.json` for Vercel routing.

### Docker
```bash
docker build -t opsentinel-website .
docker run --rm -p 8080:80 opsentinel-website
```

## Environment and runtime notes

Copy `.env.example` to `.env.local` when developing locally. `VITE_SITE_URL` controls canonical, Open Graph, sitemap, and robots URLs. `VITE_SITE_INDEXABLE=false` should be used for local, preview, fork, and branch deployments so they emit `noindex, nofollow`; production should explicitly set it to `true`. `VITE_DOCS_OWNER`, `VITE_DOCS_REPO`, and `VITE_DOCS_BRANCH` control the GitHub-backed documentation source.

The documentation route fetches Markdown from the configured public GitHub repository, so documentation testing requires network access. The primary site action points to the public [OpsSentinel GitHub repository](https://github.com/hacrex/OpsSentinel). The application frontend is maintained separately under `frontend/`; deploy it independently if a live application environment is available.
