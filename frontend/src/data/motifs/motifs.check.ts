// Self-check for the vector motif library: `npx tsx src/data/motifs/motifs.check.ts`.
// Every legacy design id resolves to a motif; every path stays inside its viewBox; every role a
// motif uses gets a colour from a range of rug palettes; generation is deterministic per seed.
import { findDesignAsset } from '../designAssets'
import { LEGACY_ALIASES, resolveLegacyId } from './legacyAliases'
import { MOTIF_DEFS, allMotifs, generateMotif, getMotif } from './catalogue'
import { motifToSvg, parseHex, resolveRoles, usedRoles } from './palette'
import { sampleCubic } from './geom'
import type { Pt } from './geom'
import type { MotifArt } from './types'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}

// ids are unique
const ids = MOTIF_DEFS.map((d) => d.id)
assert(new Set(ids).size === ids.length, 'duplicate motif id')

// legacy ids
// The 68 raster ids saved designs may still use (assets-src/designs): borders are named "*-border-*".
const LEGACY_IDS = Object.keys(LEGACY_ALIASES)
assert(LEGACY_IDS.length === 68, `expected 68 legacy ids, got ${LEGACY_IDS.length}`)
for (const id of LEGACY_IDS) {
  const alias = LEGACY_ALIASES[id]
  const kind = id.includes('-border-') ? 'border' : 'piece'
  const spec = getMotif(resolveLegacyId(id))
  assert(spec, `legacy id ${id} -> ${alias.motifId} does not resolve`)
  assert(spec!.kind === kind, `legacy id ${id} is a ${kind} but maps to a ${spec!.kind}`)
  // What the designer actually reads: the asset, with a legacy piece keeping its old proportions.
  const asset = findDesignAsset(id)
  assert(asset && asset.kind === kind, `findDesignAsset(${id}) does not resolve`)
  if (kind === 'piece') assert(Math.abs(asset!.aspect - alias.aspect) < 1e-6, `legacy piece ${id} changed proportions`)
}

// paths: absolute M/L/C/Z only, every coordinate inside the viewBox
const EPS = 0.05
function checkArt(art: MotifArt, where: string) {
  const [, , w, h] = art.viewBox
  assert(art.layers.length > 0, `${where}: no layers`)
  for (const l of art.layers) {
    assert(/^[MLCZ0-9 .\-e]+$/.test(l.d), `${where}: unexpected path command in ${l.role}`)
    // walk the commands; cubics are checked along the curve (control points may sit outside)
    const pts: Pt[] = []
    let cur: Pt = [0, 0]
    for (const [, cmd, args] of l.d.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
      const n = args.trim() ? args.trim().split(/\s+/).map(Number) : []
      assert(n.every(Number.isFinite), `${where}: non-finite coordinate`)
      if (cmd === 'M' || cmd === 'L') { assert(n.length === 2, `${where}: bad ${cmd}`); cur = [n[0], n[1]]; pts.push(cur) }
      else if (cmd === 'C') {
        assert(n.length === 6, `${where}: bad C`)
        const p1: Pt = [n[4], n[5]]
        pts.push(...sampleCubic(cur, [n[0], n[1]], [n[2], n[3]], p1, 16), p1)
        cur = p1
      }
    }
    for (const [x, y] of pts) {
      assert(x >= -EPS && x <= w + EPS && y >= -EPS && y <= h + EPS, `${where}: point (${x.toFixed(2)}, ${y.toFixed(2)}) outside 0 0 ${w} ${h} in ${l.role}`)
    }
  }
}

const palettes = [
  ['#7a2436', '#7a2436', '#d9a441', '#e6d5b3', '#1c2444'],
  ['#1c2444', '#e6d5b3'],
  ['#e6d5b3'],
  [{ color: '#3f9c82', weight: 5 }, { color: '#e0916b', weight: 2 }, { color: '#8fa8d9', weight: 1 }],
  [],
]

for (const spec of allMotifs()) {
  checkArt(spec, spec.id)
  if (spec.kind === 'border') {
    checkArt(spec.corner, `${spec.id} corner`)
    const [, , cw, ch] = spec.corner.viewBox
    assert(cw === ch && ch === spec.viewBox[3], `${spec.id}: corner must be a strip-height square`)
  }
  assert(Math.abs(spec.viewBox[2] / spec.viewBox[3] - spec.aspect) < 0.01, `${spec.id}: aspect does not match viewBox`)
  for (const p of palettes) {
    for (const tint of [undefined, '#336699']) {
      const colors = resolveRoles(spec, p, tint)
      for (const r of usedRoles(spec)) assert(colors[r] && parseHex(colors[r]), `${spec.id}: role ${r} has no colour`)
    }
  }
}

// determinism: same seed -> identical output; renderer is pure
for (const def of MOTIF_DEFS) {
  const a = JSON.stringify(generateMotif(def)), b = JSON.stringify(generateMotif(def))
  assert(a === b, `${def.id}: not deterministic`)
  const s1 = generateMotif(def, 12345), s2 = generateMotif(def, 12345)
  assert(JSON.stringify(s1) === JSON.stringify(s2), `${def.id}: seed override not deterministic`)
}
const spec = getMotif('medallion-star')!
const colors = resolveRoles(spec, palettes[0])
assert(motifToSvg(spec, colors) === motifToSvg(spec, colors), 'motifToSvg not pure')
assert(colors.primary === '#7a2436', 'primary should be the most used colour')

// palette sanity: accent contrasts with primary
const navy = resolveRoles(getMotif('rosette-classic')!, ['#1c2444', '#1c2444', '#d9a441', '#24305a'])
assert(navy.accent === '#d9a441', `accent should be the most contrasting colour, got ${navy.accent}`)

const pieces = MOTIF_DEFS.filter((d) => d.kind === 'piece').length
console.log(`motifs ok: ${pieces} pieces, ${MOTIF_DEFS.length - pieces} borders, ${LEGACY_IDS.length} legacy ids`)
