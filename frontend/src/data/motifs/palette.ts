/**
 * Colour roles -> rug palette, and pure SVG string renderers for previews.
 *
 * `resolveRoles` reads the rug's colours (most used first, or weighted): primary is the most used
 * colour, accent the one that contrasts most with it, ground and secondary the next most used,
 * outline a deep shade of the darkest. Missing roles are derived so a one-colour rug still works.
 */
import type { MotifArt, MotifRole, MotifSpec, RoleColors } from './types'

export type PaletteInput = readonly (string | { color: string; weight?: number })[]

// ---------------------------------------------------------------- colour maths

type RGB = [number, number, number]

export function parseHex(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB
}

const toHex = (c: RGB) => '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')

export function mix(a: string, b: string, t: number): string {
  const x = parseHex(a) ?? [0, 0, 0], y = parseHex(b) ?? [0, 0, 0]
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as RGB)
}

export function luminance(hex: string): number {
  const c = parseHex(hex) ?? [0, 0, 0]
  const lin = c.map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

export function contrast(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Perceptual-ish distance (redmean RGB), 0..~765. */
function colorDist(a: string, b: string): number {
  const x = parseHex(a) ?? [0, 0, 0], y = parseHex(b) ?? [0, 0, 0]
  const r = (x[0] + y[0]) / 2
  const d = [x[0] - y[0], x[1] - y[1], x[2] - y[2]]
  return Math.sqrt((2 + r / 256) * d[0] ** 2 + 4 * d[1] ** 2 + (2 + (255 - r) / 256) * d[2] ** 2)
}

/** Lighten a dark colour / darken a light one by t. */
const shift = (c: string, t: number) => (luminance(c) < 0.18 ? mix(c, '#f4ead8', t) : mix(c, '#1a1410', t))

// ---------------------------------------------------------------- roles

/** Roles a spec actually uses (corner included for borders). */
export function usedRoles(spec: MotifSpec | MotifArt): MotifRole[] {
  const set = new Set<MotifRole>()
  for (const l of spec.layers) set.add(l.role)
  if ('kind' in spec && spec.kind === 'border') for (const l of spec.corner.layers) set.add(l.role)
  return [...set]
}

/** Rug colours, most used first, duplicates merged. */
export function rankColors(input: PaletteInput): string[] {
  const w = new Map<string, number>()
  const order: string[] = []
  for (const it of input) {
    const raw = typeof it === 'string' ? it : it.color
    const p = parseHex(raw)
    if (!p) continue
    const hex = toHex(p)
    if (!w.has(hex)) order.push(hex)
    w.set(hex, (w.get(hex) ?? 0) + (typeof it === 'string' ? 1 : (it.weight ?? 1)))
  }
  return order.sort((a, b) => w.get(b)! - w.get(a)! || order.indexOf(a) - order.indexOf(b))
}

const FALLBACK = '#7a2436'

/**
 * Map every role `spec` uses to a colour from the rug palette. `tint` (optional, a hex colour)
 * replaces the primary, the "custom colour" option; the other roles still come from the rug.
 */
export function resolveRoles(spec: MotifSpec | MotifArt, swatchColors: PaletteInput, tint?: string): Record<MotifRole, string> & RoleColors {
  let ranked = rankColors(swatchColors)
  const t = tint && parseHex(tint) ? toHex(parseHex(tint)!) : undefined
  if (t) ranked = [t, ...ranked.filter((c) => c !== t)]
  if (!ranked.length) ranked = [FALLBACK]
  const primary = ranked[0]
  const rest = ranked.slice(1)

  // accent: strongest contrast with primary (luminance contrast weighted with hue distance)
  const score = (c: string) => contrast(c, primary) + colorDist(c, primary) / 160
  const accentPick = rest.length ? rest.reduce((a, b) => (score(b) > score(a) ? b : a)) : undefined
  const accent = accentPick && score(accentPick) > 2.2 ? accentPick : luminance(primary) < 0.3 ? mix(primary, '#e9c46a', 0.75) : mix(primary, '#1c2444', 0.75)
  const pool = rest.filter((c) => c !== accentPick && colorDist(c, primary) > 40)

  const ground = pool[0] ?? shift(primary, 0.55)
  const secondary = pool[1] ?? (accentPick && accentPick !== accent ? accentPick : mix(primary, accent, 0.45))
  const all = [primary, accent, ground, secondary]
  const darkest = all.reduce((a, b) => (luminance(b) < luminance(a) ? b : a))
  const outline = luminance(darkest) < 0.06 ? mix(darkest, '#000000', 0.35) : mix(darkest, '#14100c', 0.6)

  const roles: Record<MotifRole, string> = { ground, primary, secondary, accent, outline }
  // keep adjacent fills from merging: nudge any role that collides with primary
  for (const r of ['ground', 'secondary'] as const) if (colorDist(roles[r], primary) < 30) roles[r] = shift(roles[r], 0.35)
  const used = usedRoles(spec)
  return Object.fromEntries(used.map((r) => [r, roles[r]])) as Record<MotifRole, string>
}

// ---------------------------------------------------------------- SVG output

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Paths of a block of art, no <svg> wrapper. */
export function artPaths(art: MotifArt, colors: RoleColors): string {
  return art.layers.map((l) => `<path fill="${esc(colors[l.role] ?? '#000')}" d="${l.d}"/>`).join('')
}

/** A standalone SVG of a piece, or of one border repeat. */
export function motifToSvg(spec: MotifSpec | MotifArt, colors: RoleColors, opts: { width?: number; height?: number; title?: string } = {}): string {
  const [, , w, h] = spec.viewBox
  const size = (opts.width ? ` width="${opts.width}"` : '') + (opts.height ? ` height="${opts.height}"` : '')
  const title = opts.title ? `<title>${esc(opts.title)}</title>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"${size}>${title}${artPaths(spec, colors)}</svg>`
}

/**
 * A rectangular frame of a border: four corners and `cols` x `rows` repeats along the edges.
 * `idPrefix` keeps <defs> ids unique when several frames share a page.
 */
export function borderFrameSvg(spec: MotifSpec & { kind: 'border' }, colors: RoleColors, cols: number, rows: number, idPrefix = 'b', inner?: string): string {
  const H = spec.viewBox[3], W = spec.viewBox[2]
  const TW = 2 * H + cols * W, TH = 2 * H + rows * W
  const u = `${idPrefix}u`, c = `${idPrefix}c`
  // units overlap a hair so anti-aliased seams between them don't show
  const ov = `scale(${(W + 0.4) / W} 1)`, oc = `scale(${(H + 0.4) / H})`
  const uses: string[] = []
  for (let i = 0; i < cols; i++) {
    uses.push(`<use href="#${u}" transform="translate(${H + i * W} 0) ${ov}"/>`)
    uses.push(`<use href="#${u}" transform="translate(${TW - H - i * W} ${TH}) rotate(180) ${ov}"/>`)
  }
  for (let j = 0; j < rows; j++) {
    uses.push(`<use href="#${u}" transform="translate(${TW} ${H + j * W}) rotate(90) ${ov}"/>`)
    uses.push(`<use href="#${u}" transform="translate(0 ${TH - H - j * W}) rotate(270) ${ov}"/>`)
  }
  uses.push(`<use href="#${c}" transform="${oc}"/>`, `<use href="#${c}" transform="translate(${TW} 0) rotate(90) ${oc}"/>`)
  uses.push(`<use href="#${c}" transform="translate(${TW} ${TH}) rotate(180) ${oc}"/>`, `<use href="#${c}" transform="translate(0 ${TH}) rotate(270) ${oc}"/>`)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TW} ${TH}"><defs><g id="${u}">${artPaths(spec, colors)}</g><g id="${c}">${artPaths(spec.corner, colors)}</g></defs>${inner ?? ''}${uses.join('')}</svg>`
}
