/**
 * A small LRU keyed by content hash. Loads for the same key share one promise while in flight;
 * values pushed out of the LRU are disposed (GPU textures are not garbage collected).
 */
export class LruCache<V> {
  private readonly entries = new Map<string, V>()
  private readonly inflight = new Map<string, Promise<V>>()
  private readonly max: number
  private readonly dispose: (value: V) => void

  constructor(max: number, dispose: (value: V) => void) {
    this.max = max
    this.dispose = dispose
  }

  get size(): number {
    return this.entries.size
  }

  has(key: string): boolean {
    return this.entries.has(key)
  }

  /** The cached value (marking it most recently used), or loads it once for all concurrent callers. */
  get(key: string, load: () => Promise<V>): Promise<V> {
    const hit = this.entries.get(key)
    if (hit !== undefined) {
      this.entries.delete(key)
      this.entries.set(key, hit)
      return Promise.resolve(hit)
    }
    const pending = this.inflight.get(key)
    if (pending) return pending
    const p = load().then(
      (value) => {
        this.inflight.delete(key)
        this.entries.set(key, value)
        while (this.entries.size > this.max) {
          const [oldKey, oldValue] = this.entries.entries().next().value as [string, V]
          this.entries.delete(oldKey)
          this.dispose(oldValue)
        }
        return value
      },
      (err: unknown) => {
        // A failed load is not cached; the next caller retries.
        this.inflight.delete(key)
        throw err
      },
    )
    this.inflight.set(key, p)
    return p
  }

  delete(key: string): void {
    const v = this.entries.get(key)
    if (v === undefined) return
    this.entries.delete(key)
    this.dispose(v)
  }

  clear(): void {
    for (const v of this.entries.values()) this.dispose(v)
    this.entries.clear()
  }
}

export const RUG_TEXTURE_CACHE_SIZE = 12
