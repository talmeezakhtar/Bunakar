import type { Page, Route } from '@playwright/test'

/**
 * A fake Bunakar API inside the browser: answers requests to http://api.test the way the NestJS
 * backend does, from in-memory state. Tests set the account's plan, seed designs, or make the
 * server fail, then read back what the site sent.
 */
export type FakeUser = { id: string; email: string; name: string; role: string; plan: 'free' | 'pro' }

export type FakeApi = {
  user: FakeUser | null
  designs: { id: string; kind: 'tile' | 'freeform' | 'studio'; record: Record<string, unknown> }[]
  /** Saved-design cap applied to Free accounts (the backend's FREE_DESIGN_LIMIT). */
  freeLimit: number
  /** When true every request fails like a server that can't be reached. */
  offline: boolean
  posts: { path: string; body: unknown }[]
}

function token(user: FakeUser) {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`
}

export async function fakeApi(page: Page, init: Partial<FakeApi> = {}): Promise<FakeApi> {
  const api: FakeApi = { user: null, designs: [], freeLimit: 5, offline: false, posts: [], ...init }
  let next = 1
  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: body === undefined ? '' : JSON.stringify(body) })

  // The first-visit intro (index.html) plays once a session; tests start as a visitor who has seen it.
  await page.addInitScript(() => sessionStorage.setItem('bk-intro', '1'))
  await page.route('http://api.test/**', async (route) => {
    const req = route.request()
    if (req.method() === 'OPTIONS')
      return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
    if (api.offline) return route.abort('connectionrefused')
    const url = new URL(req.url())
    const path = url.pathname
    const body = req.postData() ? JSON.parse(req.postData()!) : undefined
    if (req.method() === 'POST') api.posts.push({ path, body })

    // An empty catalogue makes the app use its bundled swatches (the same ids the tests expect).
    if (path === '/swatches') return json(route, 200, [])
    if (path === '/auth/login' || path === '/auth/register') {
      api.user ??= { id: 'u1', email: body.email, name: body.name ?? 'Test Weaver', role: 'seller', plan: 'free' }
      return json(route, 201, { accessToken: token(api.user), user: api.user })
    }
    if (path === '/auth/me') return api.user ? json(route, 200, api.user) : json(route, 401, { message: 'Unauthorized' })
    if (path === '/contact-messages' || path === '/upgrade-requests') return json(route, 201, { id: `m${next++}` })

    // Tile, freeform and studio (`/rug-designs`) designs; every kind counts toward the Free limit.
    const m = /^\/(tile|freeform|rug)-designs(?:\/([^/]+))?(\/public)?$/.exec(path)
    if (m) {
      const kind = m[1] === 'rug' ? 'studio' : (m[1] as 'tile' | 'freeform')
      const id = m[2]
      if (req.method() === 'GET' && !id) {
        const records = api.designs.filter((d) => d.kind === kind).map((d) => d.record)
        // `?summary=1`: names and sizes, no design bodies.
        return json(route, 200, url.searchParams.get('summary') ? records.map(({ doc: _doc, ...rest }) => ({ thumbnail: null, ...rest })) : records)
      }
      if (req.method() === 'GET' && id) {
        const d = api.designs.find((x) => x.record.id === id)
        return d ? json(route, 200, d.record) : json(route, 404, { message: 'Not found' })
      }
      if (req.method() === 'POST') {
        if (api.user?.plan !== 'pro' && api.designs.length >= api.freeLimit)
          return json(route, 402, { statusCode: 402, code: 'plan_limit', limit: api.freeLimit, message: `The Free plan keeps ${api.freeLimit} designs. Delete one, or upgrade to Pro for unlimited designs.` })
        const record = { ...body, id: `d${next++}`, updatedAt: new Date().toISOString() }
        api.designs.push({ id: record.id, kind, record })
        return json(route, 201, record)
      }
      if (req.method() === 'PUT' && id) {
        const d = api.designs.find((x) => x.record.id === id)
        if (!d) return json(route, 404, { message: 'Not found' })
        d.record = { ...body, id, updatedAt: new Date().toISOString() }
        return json(route, 200, d.record)
      }
      if (req.method() === 'DELETE' && id) {
        api.designs = api.designs.filter((x) => x.record.id !== id)
        return json(route, 200, undefined)
      }
    }
    return json(route, 404, { message: `fake api: no route for ${req.method()} ${path}` })
  })
  return api
}

/** Starts the page signed in as `user` (token and user in storage, as after a real login). */
export async function signIn(page: Page, api: FakeApi, user: Partial<FakeUser> = {}) {
  api.user = { id: 'u1', email: 'weaver@example.com', name: 'Test Weaver', role: 'seller', plan: 'free', ...user }
  const t = token(api.user)
  await page.addInitScript(
    ([tok, u]) => {
      localStorage.setItem('bunakar_token', tok)
      localStorage.setItem('bunakar_user', u)
    },
    [t, JSON.stringify(api.user)] as const,
  )
}
