import { heightToNormal } from './normal'

export type NormalRequest = { id: number; height: Float32Array; w: number; h: number; strength: number }
export type NormalResponse = { id: number; normal: Uint8Array } | { id: number; error: string }

// The app compiles against the DOM lib only, so describe the worker scope we use.
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<NormalRequest>) => void) | null
  postMessage(message: NormalResponse, options?: { transfer?: Transferable[] }): void
}

scope.onmessage = (e) => {
  const { id, height, w, h, strength } = e.data
  try {
    const normal = heightToNormal(height, w, h, strength)
    scope.postMessage({ id, normal }, { transfer: [normal.buffer] })
  } catch (err) {
    scope.postMessage({ id, error: String(err) })
  }
}
