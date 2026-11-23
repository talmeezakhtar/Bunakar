/// <reference lib="webworker" />
import { photoToChart } from './photoChart'
import type { PhotoChartInput, PhotoChartResult } from './photoChart'

export type PhotoChartRequest = { id: number; input: PhotoChartInput }
export type PhotoChartResponse = { id: number; result: PhotoChartResult } | { id: number; error: string }

self.onmessage = (e: MessageEvent<PhotoChartRequest>) => {
  const { id, input } = e.data
  try {
    const result = photoToChart(input)
    ;(self as unknown as Worker).postMessage({ id, result } satisfies PhotoChartResponse, result.sample ? [result.cells.buffer, result.sample.buffer] : [result.cells.buffer])
  } catch (err) {
    ;(self as unknown as Worker).postMessage({ id, error: err instanceof Error ? err.message : String(err) } satisfies PhotoChartResponse)
  }
}
