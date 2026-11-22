// Self-check for the texture LRU: `npx tsx src/three/rug/textureCache.check.ts`.
import { LruCache } from './textureCache'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}

const disposed: string[] = []
const cache = new LruCache<string>(2, (v) => disposed.push(v))
let loads = 0
const load = (v: string) => () => {
  loads++
  return new Promise<string>((r) => setTimeout(() => r(v), 1))
}
const [a1, a2] = await Promise.all([cache.get('a', load('A')), cache.get('a', load('A'))])
assert(a1 === 'A' && a2 === 'A' && loads === 1, 'in-flight loads are shared')
await cache.get('b', load('B'))
await cache.get('a', load('A')) // touch a: b is now least recent
await cache.get('c', load('C'))
assert(disposed.join() === 'B', `evicts and disposes the least recent (${disposed})`)
assert(cache.has('a') && cache.has('c') && cache.size === 2, 'keeps the recent ones')
await cache.get('x', () => Promise.reject(new Error('boom'))).catch(() => {})
assert(!cache.has('x'), 'failures are not cached')
assert((await cache.get('x', load('X'))) === 'X', 'a failed key can load again')
cache.clear()
assert(cache.size === 0 && disposed.length === 4, 'clear disposes everything')
console.log('textureCache: ok')
