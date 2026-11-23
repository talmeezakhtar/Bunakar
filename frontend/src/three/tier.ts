/**
 * How much 3D this device should get. Read once per visit; `PerformanceMonitor` can still step a
 * running scene down if frames drop.
 *
 * - high: WebGL2 on a capable machine - sheen material, shadows, DPR up to 1.75.
 * - low:  WebGL2 on a modest or small device - standard material, no shadows, DPR 1.
 * - none: no WebGL2, or the visitor asked to save data - 2D everywhere.
 */
export type Tier3D = 'high' | 'low' | 'none'

let cached: Tier3D | undefined

export function detectTier(): Tier3D {
  if (cached) return cached
  cached = compute()
  return cached
}

function compute(): Tier3D {
  if (typeof window === 'undefined') return 'none'
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
  if (nav.connection?.saveData) return 'none'
  let gl: WebGL2RenderingContext | null = null
  try {
    gl = document.createElement('canvas').getContext('webgl2')
  } catch {
    return 'none'
  }
  if (!gl) return 'none'
  const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  const memory = nav.deviceMemory ?? 8
  const cores = nav.hardwareConcurrency ?? 8
  const small = Math.min(window.screen.width, window.screen.height) < 500
  if (maxTexture < 4096 || memory < 4 || cores < 4 || small) return 'low'
  return 'high'
}
