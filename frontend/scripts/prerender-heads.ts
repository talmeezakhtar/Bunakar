/**
 * After `vite build`: gives every public page its own HTML file with its own title, description,
 * canonical and link-preview tags, so crawlers and link previews (which don't run JavaScript) see
 * the right page instead of the home page. Also writes the 404 page (served with a real 404
 * status) and the sitemap, all from src/seo/routeMeta.ts.
 *
 * Run: tsx scripts/prerender-heads.ts (part of `npm run build`).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FAQ } from '../src/data/faq'
import { publicRoutes } from '../src/seo/fabricMeta'
import { fullTitle } from '../src/seo/routeMeta'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const siteUrl = (
  process.env.VITE_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://bunakar.vercel.app')
).replace(/\/$/, '')
const shell = readFileSync(join(dist, 'index.html'), 'utf8')

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Replaces one tag's attribute value, failing loudly if index.html no longer has the tag. */
function setAttr(html: string, tag: RegExp, value: string) {
  if (!tag.test(html)) throw new Error(`prerender-heads: index.html is missing ${tag}`)
  return html.replace(tag, (m) => m.replace(/(content|href)="[^"]*"/, `$1="${escape(value)}"`))
}

function page(path: string, title: string, description: string, extraHead = '') {
  let html = shell.replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
  html = setAttr(html, /<meta\s+name="description"[^>]*>/, description)
  html = setAttr(html, /<link rel="canonical"[^>]*>/, `${siteUrl}${path}`)
  html = setAttr(html, /<meta property="og:title"[^>]*>/, title)
  html = setAttr(html, /<meta property="og:description"[^>]*>/, description)
  html = setAttr(html, /<meta property="og:url"[^>]*>/, `${siteUrl}${path}`)
  html = setAttr(html, /<meta name="twitter:title"[^>]*>/, title)
  html = setAttr(html, /<meta name="twitter:description"[^>]*>/, description)
  return extraHead ? html.replace('</head>', `${extraHead}\n  </head>`) : html
}

const faqLd = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.flatMap((g) => g.items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } }))),
}).replace(/</g, '\\u003c')

const routes = publicRoutes()
for (const [path, meta] of routes) {
  const extra = path === '/faq' ? `    <script type="application/ld+json">${faqLd}</script>` : ''
  const html = page(path, fullTitle(meta.title), meta.description, extra)
  const file = path === '/' ? join(dist, 'index.html') : join(dist, path, 'index.html')
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
}

// Unknown URLs: the app (which shows its own "not found" page), served with a 404 status.
writeFileSync(
  join(dist, '404.html'),
  page('/404', fullTitle('Page not found'), 'This page does not exist on Bunakar.', '    <meta name="robots" content="noindex" />').replace(
    /\s*<link rel="canonical"[^>]*>/,
    '',
  ),
)

const today = new Date().toISOString().slice(0, 10)
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    ([path, m]) => `  <url>
    <loc>${siteUrl}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${m.changefreq}</changefreq>
    <priority>${m.priority.toFixed(1)}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`,
)

console.log(`prerender-heads: ${routes.length} pages, 404.html and sitemap.xml written for ${siteUrl}`)
