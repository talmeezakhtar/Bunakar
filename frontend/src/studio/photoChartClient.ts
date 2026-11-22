import { photoToChart } from './photoChart'
import type { PhotoChartInput, PhotoChartResult } from './photoChart'
import type { PhotoChartResponse } from './photoChart.worker'

/**
 * Photo to chart off the main thread, one job at a time: a newer request replaces one still
 * waiting (the preview re-runs as settings change). Falls back to the main thread when a
 * worker can't start.
 */
let worker: Worker | null | undefined
let nextId = 1
const waiting = new Map<number, { resolve: (r: PhotoChartResult) => void; reject: (e: Error) => void }>()

function getWorker(): Worker | null {
  if (worker !== undefined) return worker
  try {
    worker = new Worker(new URL('./photoChart.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<PhotoChartResponse>) => {
      const job = waiting.get(e.data.id)
      if (!job) return
      waiting.delete(e.data.id)
      if ('error' in e.data) job.reject(new Error(e.data.error))
      else job.resolve(e.data.result)
    }
    worker.onerror = () => {
      for (const job of waiting.values()) job.reject(new Error('photo worker failed'))
      waiting.clear()
      worker?.terminate()
      worker = null
    }
  } catch {
    worker = null
  }
  return worker
}

export function photoToChartAsync(input: PhotoChartInput): Promise<PhotoChartResult> {
  const w = getWorker()
  if (!w) return new Promise((resolve) => setTimeout(() => resolve(photoToChart(input)), 0))
  const id = nextId++
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject })
    // The photo's pixels are copied, not transferred: the dialog keeps them for the next run.
    w.postMessage({ id, input })
  })
}
