# OpsSentinel Marketing Website

This is the marketing/landing page website for OpsSentinel, separate from the application frontend.

## Structure

```
website/
├── src/
│   ├── pages/
│   │   ├── Home.jsx      # Landing page
│   │   ├── Features.jsx   # Features page
│   │   ├── Pricing.jsx    # Pricing page
│   │   ├── Docs.jsx       # Documentation page
│   │   └── NotFound.jsx   # 404 page
│   ├── components/
│   │   └── Layout.jsx     # Shared layout (nav, footer)
│   ├── styles.css         # Global styles
│   ├── App.jsx            # Router
│   └── main.jsx           # Entry point
├── public/
│   └── favicon.svg        # Site favicon
├── index.html             # HTML template
├── package.json           # Dependencies
├── vite.config.js         # Vite configuration
└── Dockerfile             # Production build
```

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output is in `dist/` folder.

## Deployment

### Static Hosting (Recommended)
Deploy the `dist/` folder to:
- Netlify
- Vercel
- Cloudflare Pages
- AWS S3 + CloudFront

### Docker
```bash
docker build -t opsentinel-website .
docker run -p 80:80 opsentinel-website
```

## Environment Variables

This is a static site with no environment variables needed. All links point to:
- GitHub repo: `https://github.com/hacrex/OpsSentinel`
- App: Separate deployment of the `frontend/` directory
