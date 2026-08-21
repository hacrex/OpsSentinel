const baseUrl = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const expectedSiteUrl = process.env.SMOKE_EXPECT_SITE_URL || 'https://opsentinel.dev';
const expectedRobots = process.env.SMOKE_EXPECT_ROBOTS || 'index, follow';
const expectedSitemap = `${expectedSiteUrl}/sitemap.xml`;

const checks = [
  { path: '/', contains: '<div id="root">' },
  { path: '/features', contains: '<div id="root">' },
  { path: '/infrastructure', contains: '<div id="root">' },
  { path: '/configuration', contains: '<div id="root">' },
  { path: '/pricing', contains: '<div id="root">' },
  { path: '/docs', contains: '<div id="root">' },
  { path: '/does-not-exist', contains: '<div id="root">' },
  { path: '/sitemap.xml', contains: expectedSiteUrl },
  { path: '/robots.txt', contains: `Sitemap: ${expectedSitemap}` },
  { path: '/favicon.svg' },
  { path: '/og-image.png' },
];

const html = await fetch(`${baseUrl}/`);
if (!html.ok) {
  throw new Error(`Homepage returned HTTP ${html.status}`);
}

const htmlText = await html.text();
const normalizedHtml = htmlText.replaceAll(' />', '>');
const requiredMetadata = [
  `<link rel="canonical" href="${expectedSiteUrl}">`,
  `<meta property="og:url" content="${expectedSiteUrl}">`,
  `<meta property="og:image" content="${expectedSiteUrl}/og-image.png">`,
  `<meta name="robots" content="${expectedRobots}">`,
];

for (const metadata of requiredMetadata) {
    if (!normalizedHtml.includes(metadata)) {
    throw new Error(`Homepage is missing expected metadata: ${metadata}`);
  }
}

for (const check of checks) {
  const response = await fetch(`${baseUrl}${check.path}`);
  if (!response.ok) {
    throw new Error(`${check.path} returned HTTP ${response.status}`);
  }

  if (check.contains) {
    const body = await response.text();
    if (!body.includes(check.contains)) {
      throw new Error(`${check.path} did not contain expected text: ${check.contains}`);
    }
  }

  console.log(`✓ ${check.path}`);
}

console.log(`Smoke tests passed for ${baseUrl}`);
