import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fakeApi } from './api'

/** Every public page: loads, has its heading, logs no errors and never scrolls sideways. */
const PAGES: { path: string; heading: RegExp }[] = [
  { path: '/', heading: /design your own hand-knotted rug/i },
  { path: '/about', heading: /rug design studio/i },
  { path: '/pricing', heading: /free to design/i },
  { path: '/credits', heading: /credits/i },
  { path: '/faq', heading: /questions, answered/i },
  { path: '/contact', heading: /write to us/i },
  { path: '/privacy', heading: /privacy policy/i },
  { path: '/terms', heading: /terms of use/i },
  { path: '/cancellation', heading: /cancellation and refunds/i },
  { path: '/login', heading: /./ },
  { path: '/fabrics', heading: /fabrics/i },
  { path: '/fabrics/silk', heading: /silk/i },
  { path: '/fabrics/jute', heading: /jute/i },
  { path: '/studio?new=1', heading: /start a rug/i },
  // The earlier designers' addresses lead to the Studio.
  { path: '/designer', heading: /start a rug/i },
  { path: '/freeform', heading: /start a rug/i },
  { path: '/designer/preview?template=persian-medallion&colorway=kilim-red&w=6&h=9', heading: /./ },
  { path: '/no-such-page', heading: /this thread came loose/i },
]

/** Errors the page itself raised (the fake API's unreachable-on-purpose calls aside). */
function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/api\.test|Failed to load resource/.test(m.text())) errors.push(m.text())
  })
  return errors
}

export async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, 'page is wider than the screen').toBeLessThanOrEqual(1)
}

for (const p of PAGES) {
  test(`${p.path} loads cleanly @layout`, async ({ page }) => {
    await fakeApi(page)
    const errors = watchErrors(page)
    await page.goto(p.path)
    const h1 = page.locator('h1').first()
    if (p.path.startsWith('/designer') || p.path === '/freeform' || p.path === '/login') await expect(page.locator('main')).toBeVisible()
    else await expect(h1).toHaveText(p.heading)
    await page.waitForTimeout(500)
    await noSidewaysScroll(page)
    expect(errors, 'errors on the page').toEqual([])
  })
}

test('a fabric page shows its close-up, in 3D or as a picture @fallback', async ({ page }) => {
  await fakeApi(page)
  const errors = watchErrors(page)
  await page.goto('/fabrics/silk')
  await expect(page.locator('h1').first()).toHaveText(/silk/i)
  // With WebGL a canvas; without it, the lit 2D swatch and its own hint.
  await expect(page.getByText(/move the pointer to move the (lamp|light)/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /design a rug in silk/i })).toHaveAttribute('href', /fibre=silk/)
  expect(errors, 'errors on the page').toEqual([])
})

test('the first-visit intro plays once a session and lifts away', async ({ page }) => {
  await fakeApi(page)
  // A fresh session, and a record of every state the intro passes through (timing-proof).
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-fresh')) {
      sessionStorage.setItem('e2e-fresh', '1')
      sessionStorage.removeItem('bk-intro')
    }
    const seen: string[] = ((window as unknown as { introStates: string[] }).introStates = [])
    new MutationObserver((changes) => changes.forEach((c) => c.target === document.documentElement && seen.push(document.documentElement.dataset.intro ?? ''))).observe(document, {
      subtree: true,
      attributeFilter: ['data-intro'],
    })
  })
  await page.goto('/about')
  await expect(page.locator('html')).toHaveAttribute('data-intro', 'seen', { timeout: 15000 })
  await expect(page.locator('#intro')).toBeHidden()
  const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  expect(await page.evaluate(() => (window as unknown as { introStates: string[] }).introStates)).toEqual(reduced ? ['seen'] : ['playing', 'seen'])
  // Within the session it doesn't play again.
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-intro', 'seen')
})
