import { heightToNormal } from './normal'
import { photoHeight } from './photoHeight'
import type { NormalRequest, NormalResponse } from './normalMap.worker'

/**
 * Normal maps off the main thread (falls back to the main thread when a worker can't start).
 * Kept free of three.js so the 2D woven-rug renderer can use it without the 3D chunk.
 */

let worker: Worker | null | undefined
let nextId = 1
const waiting = new Map<number, { resolve: (n: Uint8Array) => void; reject: (e: Error) => void }>()

function getWorker(): Worker | null {
  if (worker !== undefined) return worker
  try {
    worker = new Worker(new URL('./normalMap.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<NormalResponse>) => {
      const job = waiting.get(e.data.id)
      if (!job) return
      waiting.delete(e.data.id)
      if ('error' in e.data) job.reject(new Error(e.data.error))
      else job.resolve(e.data.normal)
    }
    worker.onerror = () => {
      // Worker can't start (CSP, old browser): finish the queued jobs on the main thread.
      for (const job of waiting.values()) job.reject(new Error('normal map worker failed'))
      waiting.clear()
      worker?.terminate()
      worker = null
    }
  } catch {
    worker = null
  }
  return worker
}

function post(wk: Worker, msg: NormalRequest, transfer: Transferable[]): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    waiting.set(msg.id, { resolve, reject })
    wk.postMessage(msg, transfer)
  })
}

/** Normal map off the main thread when possible (a copy of `height` goes to the worker). */
export async function computeNormalMap(height: Float32Array, w: number, h: number, strength: number): Promise<Uint8Array> {
  const wk = getWorker()
  if (wk) {
    const copy = height.slice()
    try {
      return await post(wk, { id: nextId++, height: copy, w, h, strength }, [copy.buffer])
    } catch {
      // fall through to the main thread
    }
  }
  return heightToNormal(height, w, h, strength)
}

/** A photo's pile relief and its normal map, both off the main thread when possible. */
export async function computePhotoNormalMap(rgba: Uint8ClampedArray, w: number, h: number, strength: number): Promise<Uint8Array> {
  const wk = getWorker()
  if (wk) {
    const copy = rgba.slice()
    try {
      return await post(wk, { id: nextId++, rgba: copy, w, h, strength }, [copy.buffer])
    } catch {
      // fall through to the main thread
    }
  }
  return heightToNormal(photoHeight(rgba, w, h), w, h, strength)
}
