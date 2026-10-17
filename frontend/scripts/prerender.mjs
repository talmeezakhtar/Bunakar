// Runs after `vite build`. Serves dist/ locally, loads each public route in headless Chrome,
// and overwrites that route's HTML with what actually rendered - so crawlers that don't run JS
// still see the real content instead of an empty <div id="root">. The deployed app still
// hydrates normally on top of this; nothing here changes runtime behaviour for real visitors.
import { createServer } from 'node:http'
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import puppeteer from 'puppeteer'

const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([a-zA-Z]):/, '$1:')
const PORT = 4173

const CONTENT_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
}

// Just enough of a static file server to serve the built SPA, including its catch-all fallback
// to index.html for client-side routes - no need for a dependency just for this.
function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const urlPath = req.url.split('?')[0]
      const filePath = join(DIST, urlPath)
      const target = existsSync(filePath) && urlPath !== '/' ? filePath : join(DIST, 'index.html')
      res.setHeader('Content-Type', CONTENT_TYPES[extname(target)] ?? 'application/octet-stream')
      createReadStream(target).pipe(res)
    })
    server.listen(PORT, () => resolve(server))
  })
}

// route -> a selector that only exists once the page has fully rendered (past loading states).
const ROUTES = {
  '/': 'footer',
  '/login': 'input[type="email"], input[name="email"]',
}

async function prerender() {
  const server = await startServer()
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  // Rendered first, written after: the static server falls back to dist/index.html for every
  // route, so writing a route's output as we go would feed an already-mutated shell to the
  // next route's navigation.
  const rendered = []
  try {
    for (const [route, readySelector] of Object.entries(ROUTES)) {
      const page = await browser.newPage()
      await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle0' })
      await page.waitForSelector(readySelector, { timeout: 10_000 })
      const html = await page.evaluate(() => document.documentElement.outerHTML)
      rendered.push([route, html])
      await page.close()
    }
  } finally {
    await browser.close()
    server.close()
  }
  for (const [route, html] of rendered) {
    const outDir = route === '/' ? DIST : join(DIST, route)
    mkdirSync(outDir, { recursive: true })
    writeFileSync(join(outDir, 'index.html'), `<!doctype html>\n${html}`)
    console.log(`prerendered ${route}`)
  }
}

await prerender()
