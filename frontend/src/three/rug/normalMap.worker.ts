import { heightToNormal } from './normal'
import { photoHeight } from './photoHeight'

/** Either a height field, or a photo's pixels to derive the height from first. */
export type NormalRequest = { id: number; w: number; h: number; strength: number } & ({ height: Float32Array } | { rgba: Uint8ClampedArray })
export type NormalResponse = { id: number; normal: Uint8Array } | { id: number; error: string }

// The app compiles against the DOM lib only, so describe the worker scope we use.
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<NormalRequest>) => void) | null
  postMessage(message: NormalResponse, options?: { transfer?: Transferable[] }): void
}

scope.onmessage = (e) => {
  const { id, w, h, strength } = e.data
  try {
    const height = 'height' in e.data ? e.data.height : photoHeight(e.data.rgba, w, h)
    const normal = heightToNormal(height, w, h, strength)
    scope.postMessage({ id, normal }, { transfer: [normal.buffer] })
  } catch (err) {
    scope.postMessage({ id, error: String(err) })
  }
}
