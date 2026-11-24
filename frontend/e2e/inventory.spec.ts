import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fakeApi, signIn } from './api'

/**
 * The feature inventory: the flows a visitor depends on, end to end, against the production
 * build and the fake API. Desktop only (layout is covered per size in pages.spec / a11y.spec).
 */
test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, 'desktop flows')

const toast = (page: Page, text: RegExp | string) => page.locator('[role=status],[role=alert]').filter({ hasText: text }).first()
/** The studio's summary line under the inspector: "2 yarns in use · 777,600 knots". */
const yarnsInUse = (page: Page) => page.getByText(/\d+ yarns? in use/).first()
const tab = (page: Page, name: RegExp) => page.getByRole('tab', { name })

/** Through the studio's setup: a construction, then straight into the editor. */
async function startRug(page: Page, construction = 'Hand-knotted') {
  await page.goto('/studio?new=1')
  await page.getByRole('radio', { name: new RegExp(`^${construction}`) }).click()
  await page.getByRole('button', { name: /Start designing/ }).click()
  // The editor loads on its own after the setup step: wait for it before typing.
  await expect(page.getByRole('tablist', { name: 'Inspector sections' })).toBeVisible()
}

/** Paints the knot under the chart's keyboard cursor with the current yarn. */
async function paintHere(page: Page) {
  const chart = page.getByRole('application', { name: /Knot chart/ })
  await chart.focus()
  await page.keyboard.press('Enter')
}

/** An old tile design record, as the tile designer saved it. */
const tileRecord = (id: string, name: string) => ({
  id,
  name,
  widthTiles: 4,
  heightTiles: 6,
  orientation: 'normal',
  rugCategory: 'area',
  backgroundId: 'light-wood',
  tiles: [{ row: 0, col: 0, swatchId: 'solid-wine', cutType: 'full', rotation: 0 }],
  myStyles: ['solid-wine'],
  overlays: [],
  updatedAt: new Date().toISOString(),
})

/** An old freeform design record. */
const freeformRecord = (id: string, name: string) => ({
  id,
  name,
  widthFt: 5,
  heightFt: 8,
  rugCategory: 'area',
  backgroundId: 'light-wood',
  ground: { swatchId: 'wool-ivory', texture: 'cut', carve: 'none', carveAngle: 0, pile: 'standard' },
  shapes: [
    { id: 's1', points: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 3 }, { x: 1, y: 3 }], smooth: true, swatchId: 'wool-coral', texture: 'cut', carve: 'none', carveAngle: 0, pile: 'standard' },
  ],
  myStyles: ['wool-ivory', 'wool-coral'],
  updatedAt: new Date().toISOString(),
})

test.describe('studio: the earlier designers open here', () => {
  test('a saved tile design and a freeform design open converted; the originals stay', async ({ page }) => {
    const api = await fakeApi(page)
    await signIn(page, api)
    api.designs = [
      { id: 't1', kind: 'tile', record: tileRecord('t1', 'Old hallway runner') },
      { id: 'f1', kind: 'freeform', record: freeformRecord('f1', 'Old pebble rug') },
    ]
    await page.goto('/designer?design=t1')
    await expect(page).toHaveURL(/\/studio/)
    await expect(toast(page, /Old hallway runner.*is open in the Studio/)).toBeVisible()
    await expect(tab(page, /tiles/i)).toBeVisible()

    await page.goto('/freeform?design=f1')
    await expect(page).toHaveURL(/\/studio/)
    await expect(tab(page, /shapes/i)).toBeVisible()
    await expect(page.getByText(/1 shape\b/).first()).toBeVisible()
    // Opening converted changes nothing on the server.
    expect(api.posts).toHaveLength(0)
    expect(api.designs).toHaveLength(2)
  })

  test("work left in an earlier designer on this device comes along", async ({ page }) => {
    await fakeApi(page)
    await page.addInitScript((draft) => localStorage.setItem('bunakar.draft.v1.tile', draft), JSON.stringify({ v: 1, state: { ...tileRecord('x', 'Unsaved tiles'), id: null, tiles: { '0,0': [{ swatchId: 'solid-wine', cutType: 'full', rotation: 0 }] } }, at: Date.now() }))
    await page.goto('/designer')
    await expect(page).toHaveURL(/\/studio/)
    await expect(toast(page, /brought over the rug/i)).toBeVisible()
    await expect(tab(page, /tiles/i)).toBeVisible()
  })
})

test('a damaged draft from an earlier designer starts a fresh rug instead', async ({ page }) => {
  await fakeApi(page)
  await page.addInitScript(() => localStorage.setItem('bunakar.draft.v1.tile', JSON.stringify({ v: 1, state: { tiles: [{ broken: true }] }, at: 1 })))
  await page.goto('/designer')
  await expect(page.getByRole('heading', { name: /start a rug/i })).toBeVisible()
})

test.describe('studio', () => {
  test('opens at once while the server is still waking up', async ({ page }) => {
    await fakeApi(page)
    // A sleeping API: the catalogue takes 30 s to answer.
    await page.route('**/swatches', (route) => new Promise((done) => setTimeout(() => done(route.fulfill({ status: 200, body: '[]' }).catch(() => {})), 30_000)))
    const started = Date.now()
    await page.goto('/studio?new=1')
    await expect(page.getByRole('button', { name: /Start designing/ })).toBeVisible({ timeout: 5_000 })
    expect(Date.now() - started).toBeLessThan(5_000)
  })

  test('a Kashan from a style: quarter-symmetric, with a quarter chart for the weaver', async ({ page }) => {
    await fakeApi(page)
    await startRug(page)
    await tab(page, /layout/i).click()
    await page.getByRole('button', { name: 'Kashan' }).click()
    await expect(yarnsInUse(page)).toHaveText(/[3-9] yarns in use/)
    await tab(page, /^rug$/i).click()
    const weaver = page.locator('section').filter({ hasText: 'For the weaver' })
    await expect(weaver.getByRole('checkbox', { name: /one quarter only/ })).toBeChecked()
    await expect(weaver.getByText(/mirrors in four/)).toBeVisible()
  })

  test('paint, undo, redo; an unsaved rug survives a reload', async ({ page }) => {
    await fakeApi(page)
    await startRug(page)
    await expect(yarnsInUse(page)).toHaveText(/1 yarn in use/)
    await page.keyboard.press('2') // the second yarn
    await paintHere(page)
    await expect(yarnsInUse(page)).toHaveText(/2 yarns in use/)
    await page.getByRole('button', { name: /^Undo/ }).click()
    await expect(yarnsInUse(page)).toHaveText(/1 yarn in use/)
    await page.getByRole('button', { name: /^Redo/ }).click()
    await expect(yarnsInUse(page)).toHaveText(/2 yarns in use/)

    await page.waitForTimeout(1500) // the draft autosave settles
    await page.goto('/studio')
    await expect(toast(page, /restored the rug/i)).toBeVisible()
    await expect(yarnsInUse(page)).toHaveText(/2 yarns in use/)
  })

  test('a guest saving is sent to log in, then comes back to the same rug', async ({ page }) => {
    const api = await fakeApi(page)
    await startRug(page)
    await page.keyboard.press('2')
    await paintHere(page)
    await page.getByRole('button', { name: 'Sign in to save' }).click()
    await expect(page).toHaveURL(/\/login/)
    await page.getByLabel('Email').fill('weaver@example.com')
    await page.getByLabel('Password', { exact: true }).fill('test-pass-123')
    await page.getByRole('button', { name: /^Log in$/ }).last().click()
    await expect(page).toHaveURL(/\/studio/)
    await expect(yarnsInUse(page)).toHaveText(/2 yarns in use/)
    await expect.poll(() => api.posts.filter((p) => p.path === '/rug-designs').length).toBe(1)
  })

  test('the Free plan limit explains itself and keeps the rug', async ({ page }) => {
    const api = await fakeApi(page)
    await signIn(page, api)
    api.designs = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, kind: 'tile' as const, record: tileRecord(`s${i}`, `Saved ${i}`) }))
    await startRug(page)
    await page.keyboard.press('2')
    await paintHere(page)
    await page.getByRole('button', { name: /^Save$/ }).click()
    const t = toast(page, /Free plan keeps 5 designs/)
    await expect(t).toBeVisible()
    await expect(yarnsInUse(page)).toHaveText(/2 yarns in use/)
    await t.getByRole('button', { name: 'See Pro' }).click()
    await expect(page).toHaveURL(/\/pricing/)
  })

  test("the weaver's chart is Pro: Free is told, Pro downloads it", async ({ page }) => {
    const api = await fakeApi(page)
    await startRug(page)
    await page.keyboard.press('2')
    await paintHere(page)
    await tab(page, /^rug$/i).click()
    await page.getByRole('button', { name: /Download the weaver's chart/ }).click()
    await expect(toast(page, /weaver's charts come with Pro/i)).toBeVisible()

    await signIn(page, api, { plan: 'pro' })
    await page.goto('/studio')
    await tab(page, /^rug$/i).click()
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: /Download the weaver's chart/ }).click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/weavers-chart\.html$/)
    const html = await readFile((await file.path())!, 'utf8')
    expect(html).toContain("weaver's chart")
    expect(html).toMatch(/Whole rug/)
  })

  test('a kilim warns of long slits, and stepping the edges clears them', async ({ page }) => {
    await fakeApi(page)
    await startRug(page, 'Flatweave')
    await tab(page, /layout/i).click()
    await page.getByRole('button', { name: 'Kilim', exact: true }).click()
    await tab(page, /^rug$/i).click()
    await expect(page.getByText(/places? where two colours meet in a straight line/)).toBeVisible()
    await page.getByRole('button', { name: 'Step the edges' }).click()
    await expect(page.getByText(/No long slits/)).toBeVisible()
  })

  test('a round rug: borders follow the edge', async ({ page }) => {
    await fakeApi(page)
    await startRug(page)
    await tab(page, /layout/i).click()
    await page.getByRole('button', { name: 'Tabriz' }).click()
    await tab(page, /^rug$/i).click()
    await page.getByLabel('Shape').selectOption('round')
    await expect(page.getByText(/6' x 6'/).first()).toBeVisible()
    await expect(page.getByRole('application', { name: /Knot chart, 720 by 720/ })).toBeVisible()
  })

  test('a hand-tufted rug draws with the freeform tools; its template is Pro', async ({ page }) => {
    const api = await fakeApi(page)
    await startRug(page, 'Hand-tufted')
    await expect(tab(page, /shapes/i)).toBeVisible()
    await page.getByRole('button', { name: 'Generate' }).click()
    await expect(page.getByText(/[1-9]\d* shapes/).first()).toBeVisible()
    await page.getByRole('button', { name: /Download tufting template/ }).click()
    await expect(toast(page, /tufting templates come with Pro/i)).toBeVisible()
    expect(api.posts).toHaveLength(0)
  })

  test('a drawn shape is finished with Done, no double-click or Enter needed', async ({ page }) => {
    await fakeApi(page)
    await startRug(page, 'Hand-tufted')
    const tools = page.getByRole('radiogroup', { name: 'Canvas tool' })
    await tools.getByRole('radio', { name: 'Draw' }).click()
    const canvas = page.getByRole('application', { name: /Freeform rug/ })
    const box = (await canvas.boundingBox())!
    for (const [x, y] of [[0.3, 0.3], [0.7, 0.3], [0.7, 0.6], [0.3, 0.6]]) await page.mouse.click(box.x + box.width * x, box.y + box.height * y)
    await page.getByRole('toolbar', { name: 'Shape being drawn' }).getByRole('button', { name: 'Done' }).click()
    await expect(canvas).toHaveAccessibleName(/1 shapes?\./)
    // Finished: back to Select, with the new shape's handles to reshape it.
    await expect(tools.getByRole('radio', { name: 'Select' })).toBeChecked()
  })

  test('leaving with unsaved changes asks first', async ({ page }) => {
    const api = await fakeApi(page)
    await signIn(page, api)
    await startRug(page)
    await page.keyboard.press('2')
    await paintHere(page)
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Pricing' }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await expect(page).toHaveURL(/\/studio/)
  })
})

test.describe('room preview', () => {
  test('steps through 3D rooms and downloads a marked image on Free', async ({ page }) => {
    await fakeApi(page)
    await page.goto('/designer/preview?template=persian-medallion&colorway=kilim-red&w=6&h=9')
    const first = await page.getByText(/of 10/).first().textContent()
    await page.getByRole('button', { name: 'Next room' }).click()
    await expect(page.getByText(/of 10/).first()).not.toHaveText(first!)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: /Download this view/ }).click()
    expect((await download).suggestedFilename()).toMatch(/\.png$/)
    await expect(toast(page, /1200px with a small Bunakar mark/)).toBeVisible()
  })
})

test.describe('my designs', () => {
  test('lists saved rugs and deletes one after asking', async ({ page }) => {
    const api = await fakeApi(page)
    await signIn(page, api)
    api.designs = [
      { id: 'a', kind: 'tile', record: tileRecord('a', 'Hallway runner') },
      { id: 'b', kind: 'freeform', record: freeformRecord('b', 'Study rug') },
    ]
    await page.goto('/my-designs')
    const cards = page.getByRole('listitem').filter({ hasText: /Hallway runner|Study rug/ })
    await expect(cards).toHaveCount(2)
    // Both kinds open in the Studio now.
    await expect(cards.filter({ hasText: 'Hallway runner' }).getByRole('link', { name: /Open/ }).first()).toHaveAttribute('href', /\/studio\?from=tile&design=a/)
    await cards.first().getByRole('button', { name: /delete/i }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: /delete/i }).click()
    await expect(cards).toHaveCount(1)
  })
})

test.describe('forms', () => {
  test('contact: sends, and keeps the message when the server is down', async ({ page }) => {
    const api = await fakeApi(page)
    await page.goto('/contact')
    await page.getByLabel('Name').fill('Asha')
    await page.getByLabel('Email').fill('asha@example.com')
    await page.getByLabel("What's it about?").selectOption('business')
    await page.getByLabel('Message').fill('Can our studio use Bunakar?')

    api.offline = true
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.getByRole('alert')).toContainText(/try again/i)
    await expect(page.getByLabel('Message')).toHaveValue('Can our studio use Bunakar?')

    api.offline = false
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.getByRole('status')).toContainText(/reply to asha@example.com/)
    expect(api.posts.at(-1)).toEqual({ path: '/contact-messages', body: { name: 'Asha', email: 'asha@example.com', topic: 'business', message: 'Can our studio use Bunakar?' } })
  })

  test('pricing: joining the Pro list sends the chosen billing', async ({ page }) => {
    const api = await fakeApi(page)
    await page.goto('/pricing')
    await page.getByRole('radio', { name: 'Monthly' }).click()
    await page.getByRole('link', { name: 'Join Pro' }).click()
    await page.getByLabel('Name').fill('Dev Studio')
    await page.getByLabel('Email').fill('studio@example.com')
    await page.getByLabel("You're designing for").selectOption('business')
    await page.getByRole('button', { name: 'Join the Pro list' }).click()
    await expect(page.getByRole('status')).toContainText(/on the list/)
    expect(api.posts.at(-1)?.body).toMatchObject({ billing: 'monthly', use: 'business', email: 'studio@example.com' })
  })
})
