/**
 * Free-plan downloads: the image scaled so its long side is at most `maxPx`, with a small
 * "Made with Bunakar" mark in the corner. Pro downloads skip this. Browser only.
 */
export async function freePlanImage(blob: Blob, maxPx: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const k = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * k)
  const h = Math.round(bitmap.height * k)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const g = canvas.getContext('2d')
  if (!g) throw new Error('Canvas unavailable')
  g.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const size = Math.max(12, Math.round(Math.min(w, h) * 0.022))
  const text = 'Made with Bunakar · Free plan'
  g.font = `600 ${size}px "Instrument Sans", system-ui, sans-serif`
  const tw = g.measureText(text).width
  const pad = Math.round(size * 0.6)
  const x = w - tw - pad * 3
  const y = h - size - pad * 3
  g.fillStyle = 'rgba(251, 248, 242, 0.82)'
  g.beginPath()
  g.roundRect(x - pad, y - pad, tw + pad * 2, size + pad * 2, pad)
  g.fill()
  g.fillStyle = '#1f1b16'
  g.textBaseline = 'top'
  g.fillText(text, x, y + size * 0.05)

  const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!out) throw new Error('Could not create image')
  return out
}
