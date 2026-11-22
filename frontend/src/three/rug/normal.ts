/**
 * Tangent-space normal map from a height field, with a Sobel gradient. Pure (no DOM), so it runs
 * in the worker and in checks.
 *
 * `height` is row-major in image order (row 0 = top), values roughly 0..1. Output is RGBA8 in the
 * same order, OpenGL convention (green = up the image, i.e. +V once uploaded with flipY), which is
 * what three.js expects. `strength` scales slopes: 0 is flat, higher is deeper relief. Edges clamp.
 */
export function heightToNormal(height: ArrayLike<number>, w: number, h: number, strength: number): Uint8Array {
  if (height.length < w * h) throw new Error('height is smaller than w*h')
  const out = new Uint8Array(w * h * 4)
  const at = (x: number, y: number) => height[(y < 0 ? 0 : y >= h ? h - 1 : y) * w + (x < 0 ? 0 : x >= w ? w - 1 : x)]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = at(x - 1, y - 1)
      const t = at(x, y - 1)
      const tr = at(x + 1, y - 1)
      const l = at(x - 1, y)
      const r = at(x + 1, y)
      const bl = at(x - 1, y + 1)
      const b = at(x, y + 1)
      const br = at(x + 1, y + 1)
      // Slopes per pixel, x to the right and y down the image.
      const dx = (tr + 2 * r + br - tl - 2 * l - bl) / 8
      const dy = (bl + 2 * b + br - tl - 2 * t - tr) / 8
      // Up the image is -y, so the normal's up component is +dy.
      const nx = -dx * strength
      const ny = dy * strength
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1)
      const i = (y * w + x) * 4
      out[i] = Math.round((nx * inv * 0.5 + 0.5) * 255)
      out[i + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255)
      out[i + 2] = Math.round((inv * 0.5 + 0.5) * 255)
      out[i + 3] = 255
    }
  }
  return out
}
