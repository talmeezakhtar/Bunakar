// Self-check for design-piece / border rules: `npx tsx src/store/overlays.check.ts`.
import { createDefaultTileDesign, tileKey } from '../types/tileDesign'
import type { DesignOverlay, TileDesignState } from '../types/tileDesign'
import { tileDesignReducer as reduce } from './tileDesignReducer'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}

const piece = (id: string, row: number, col: number, w = 2, h = 2): DesignOverlay => ({
  id, assetId: 'm', row, col, widthTiles: w, heightTiles: h, rotation: 0,
})

const empty = createDefaultTileDesign(4, 5)
const paint = (s: TileDesignState) => reduce(s, { type: 'PAINT_RANGE', r0: 0, c0: 0, r1: s.heightTiles - 1, c1: s.widthTiles - 1, swatchId: 'x', cutType: 'full', rotation: 0 })

// Nothing beneath -> refused.
assert(reduce(empty, { type: 'PLACE_OVERLAY', overlay: piece('a', 0, 0) }).overlays.length === 0, 'needs tiles beneath')

const s = paint(empty)
let t = reduce(s, { type: 'PLACE_OVERLAY', overlay: piece('a', 0, 0) })
assert(t.overlays.length === 1, 'placed on tiles')
assert(reduce(s, { type: 'PLACE_OVERLAY', overlay: piece('z', 4, 3) }).overlays.length === 0, 'off the rug refused')

// Overlays never stack: an overlapping one replaces, a disjoint one adds.
t = reduce(t, { type: 'PLACE_OVERLAY', overlay: piece('b', 1, 1) })
assert(t.overlays.map((o) => o.id).join() === 'b', 'overlap replaces')
t = reduce(t, { type: 'PLACE_OVERLAY', overlay: piece('c', 3, 0, 1, 1) })
assert(t.overlays.length === 2, 'disjoint adds')

// Deleting a tile under an overlay removes the overlay (nothing beneath any more).
const u = reduce(t, { type: 'DELETE_PIECE', row: 2, col: 2, index: 0 })
assert(u.overlays.map((o) => o.id).join() === 'c', 'lost footing -> removed')

// No-op actions keep identity (dirty tracking compares states by reference).
assert(reduce(t, { type: 'REMOVE_OVERLAY', id: 'nope' }) === t, 'no-op keeps identity')

// Rotate: a 2x1 piece at (0,0) on a 4-wide x 5-tall rug lands at (0, 5-0-1=4) as 1x2.
const r = reduce(reduce(s, { type: 'PLACE_OVERLAY', overlay: piece('p', 0, 0, 2, 1) }), { type: 'ROTATE_GRID' })
const p = r.overlays[0]
assert(p && p.row === 0 && p.col === 4 && p.widthTiles === 1 && p.heightTiles === 2 && p.rotation === 90, `rotate ${JSON.stringify(p)}`)

// Inserting a row keeps the overlay over the same tiles.
const ins = reduce(t, { type: 'INSERT_ROW_TOP' })
assert(ins.overlays.find((o) => o.id === 'b')?.row === 2, 'insert row shifts overlay')

// Frame: all four sides, facing outward; refused if any edge cell is bare.
const f = reduce(s, { type: 'FRAME_BORDER', assetId: 'b1', thickness: 0.5, idPrefix: 'f' })
assert(f.overlays.map((o) => `${o.id}:${o.rotation}`).join() === 'f-t:0,f-b:180,f-l:270,f-r:90', 'frame runs')
const holed = { ...s, tiles: { ...s.tiles } }
delete holed.tiles[tileKey(4, 2)]
assert(reduce(holed, { type: 'FRAME_BORDER', assetId: 'b1', thickness: 1, idPrefix: 'f' }) === holed, 'frame needs full edge')

// Replacing a design keeps its spot.
// Recolouring one run of a Frame recolours the whole Frame; null puts it back to matching the rug.
const tinted = reduce(f, { type: 'SET_OVERLAY_TINT', id: 'f-l', tint: 'sw-gold' })
assert(tinted.overlays.filter((o) => o.id.startsWith('f-')).every((o) => o.tint === 'sw-gold'), 'tint applies to the whole frame')
const untinted = reduce(tinted, { type: 'SET_OVERLAY_TINT', id: 'f-t', tint: null })
assert(untinted.overlays.every((o) => o.tint === undefined), 'null tint matches the rug again')
assert(reduce(untinted, { type: 'SET_OVERLAY_TINT', id: 'f-t', tint: null }) === untinted, 'no-op tint keeps the state')

const rep = reduce(t, { type: 'REPLACE_OVERLAY_ASSET', id: 'b', assetId: 'm2' })
assert(rep.overlays.find((o) => o.id === 'b')?.assetId === 'm2', 'replace asset')

// Border runs drawn by hand meet at the corners instead of wiping each other out.
{
  const run = (id: string, row: number, col: number, w: number, h: number, rotation: 0 | 90 | 180 | 270, thickness: 0.5 | 1 = 1): DesignOverlay => ({
    id, assetId: 'border-herati-guard', row, col, widthTiles: w, heightTiles: h, rotation, thickness,
  })
  let f = paint(createDefaultTileDesign(4, 5))
  f = reduce(f, { type: 'PLACE_OVERLAY', overlay: run('top', 0, 0, 4, 1, 0) })
  // Left side drawn from the very top corner down to the bottom corner.
  f = reduce(f, { type: 'PLACE_OVERLAY', overlay: run('left', 0, 0, 1, 5, 270) })
  assert(f.overlays.some((o) => o.id === 'top'), 'top run survives the side run')
  const left = f.overlays.find((o) => o.id === 'left')!
  assert(left.row === 1 && left.heightTiles === 4, `side run stops below the corner: ${JSON.stringify(left)}`)
  f = reduce(f, { type: 'PLACE_OVERLAY', overlay: run('bottom', 4, 0, 4, 1, 180) })
  const bottom = f.overlays.find((o) => o.id === 'bottom')!
  assert(bottom.col === 1 && bottom.widthTiles === 3, `bottom meets the side at its corner: ${JSON.stringify(bottom)}`)
  f = reduce(f, { type: 'PLACE_OVERLAY', overlay: run('right', 0, 3, 1, 5, 90) })
  const right = f.overlays.find((o) => o.id === 'right')!
  assert(right.row === 1 && right.heightTiles === 3, `right run fits between top and bottom: ${JSON.stringify(right)}`)
  assert(f.overlays.length === 4, 'a hand-drawn frame keeps all four runs')
  // A bar across the rug from side to side fits between them: a divider, as in panel rugs.
  const g = reduce(f, { type: 'PLACE_OVERLAY', overlay: run('across', 2, 0, 4, 1, 0) })
  const across = g.overlays.find((o) => o.id === 'across')!
  assert(across.col === 1 && across.widthTiles === 2 && g.overlays.length === 5, `divider fits between the sides: ${JSON.stringify(across)}`)
  // A run laid along an existing border (overlapping its middle) still replaces it.
  const r = reduce(f, { type: 'PLACE_OVERLAY', overlay: run('retop', 0, 1, 2, 1, 0) })
  assert(!r.overlays.some((o) => o.id === 'top') && r.overlays.some((o) => o.id === 'retop'), 'a run along a border replaces it')
  // Half-thickness sides that meet borders at both ends reach into the corners' empty halves.
  let h = paint(createDefaultTileDesign(4, 5))
  h = reduce(h, { type: 'PLACE_OVERLAY', overlay: run('t', 0, 0, 4, 1, 0, 0.5) })
  h = reduce(h, { type: 'PLACE_OVERLAY', overlay: run('b', 4, 0, 4, 1, 180, 0.5) })
  h = reduce(h, { type: 'PLACE_OVERLAY', overlay: run('l', 0, 0, 1, 5, 270, 0.5) })
  const l = h.overlays.find((o) => o.id === 'l')
  assert(l?.reachBefore === 0.5 && l?.reachAfter === 0.5, 'thin side reaches into both corners')

  // An L drawn as two runs in either order closes its corner: the second run reaches into the
  // corner tile's empty half at that one end only (its free end doesn't overhang).
  let up = paint(createDefaultTileDesign(4, 5))
  up = reduce(up, { type: 'PLACE_OVERLAY', overlay: run('left', 0, 0, 1, 5, 270, 0.5) }) // bottom to top, first
  up = reduce(up, { type: 'PLACE_OVERLAY', overlay: run('bottom', 4, 0, 4, 1, 180, 0.5) })
  const lBottom = up.overlays.find((o) => o.id === 'bottom')!
  assert(lBottom.col === 1 && lBottom.widthTiles === 3 && lBottom.reachBefore === 0.5 && lBottom.reachAfter === 0, `bottom reaches into the corner only: ${JSON.stringify(lBottom)}`)
  let lAcross = paint(createDefaultTileDesign(4, 5))
  lAcross = reduce(lAcross, { type: 'PLACE_OVERLAY', overlay: run('bottom', 4, 0, 4, 1, 180, 0.5) })
  lAcross = reduce(lAcross, { type: 'PLACE_OVERLAY', overlay: run('left', 0, 0, 1, 5, 270, 0.5) })
  const lLeft = lAcross.overlays.find((o) => o.id === 'left')!
  assert(lLeft.heightTiles === 4 && lLeft.reachAfter === 0.5 && lLeft.reachBefore === 0, `left reaches down into the corner only: ${JSON.stringify(lLeft)}`)
  // Two runs end to end along one edge don't reach into each other.
  let line = paint(createDefaultTileDesign(4, 5))
  line = reduce(line, { type: 'PLACE_OVERLAY', overlay: run('a', 0, 0, 2, 1, 0, 0.5) })
  line = reduce(line, { type: 'PLACE_OVERLAY', overlay: run('b', 0, 1, 3, 1, 0, 0.5) })
  const b2 = line.overlays.find((o) => o.id === 'b')!
  assert(b2.col === 2 && !b2.reachBefore && !b2.reachAfter, `collinear runs just meet: ${JSON.stringify(b2)}`)
}

// A full square of borders closes however it is drawn: every point of the border ring is covered.
{
  const W = 4
  const H = 6
  const band = (o: DesignOverlay) => {
    const t = o.thickness ?? 0.5
    const rb = o.reachBefore ?? o.reach ?? 0
    const ra = o.reachAfter ?? o.reach ?? 0
    if (o.rotation === 0) return [o.col - rb, o.row, o.col + o.widthTiles + ra, o.row + t]
    if (o.rotation === 180) return [o.col - rb, o.row + 1 - t, o.col + o.widthTiles + ra, o.row + 1]
    if (o.rotation === 270) return [o.col, o.row - rb, o.col + t, o.row + o.heightTiles + ra]
    return [o.col + 1 - t, o.row - rb, o.col + 1, o.row + o.heightTiles + ra]
  }
  const gaps = (st: TileDesignState, t: number) => {
    const bands = st.overlays.map(band)
    let n = 0
    for (let x = 0.05; x < W; x += 0.1)
      for (let y = 0.05; y < H; y += 0.1) if ((x < t || y < t || x > W - t || y > H - t) && !bands.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d)) n++
    return n
  }
  const side = (id: string, t: 0.5 | 1, short: boolean): DesignOverlay => {
    const k = short ? 1 : 0
    if (id === 'top') return { id, assetId: 'border-herati-guard', thickness: t, row: 0, col: k, widthTiles: W - 2 * k, heightTiles: 1, rotation: 0 }
    if (id === 'bottom') return { id, assetId: 'border-herati-guard', thickness: t, row: H - 1, col: k, widthTiles: W - 2 * k, heightTiles: 1, rotation: 180 }
    if (id === 'left') return { id, assetId: 'border-herati-guard', thickness: t, row: k, col: 0, widthTiles: 1, heightTiles: H - 2 * k, rotation: 270 }
    return { id, assetId: 'border-herati-guard', thickness: t, row: k, col: W - 1, widthTiles: 1, heightTiles: H - 2 * k, rotation: 90 }
  }
  const perms = (a: string[]): string[][] => (a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])))
  const draw = (t: 0.5 | 1, steps: [string, boolean][]) => steps.reduce((st, [id, short]) => reduce(st, { type: 'PLACE_OVERLAY', overlay: side(id, t, short) }), paint(createDefaultTileDesign(W, H)))
  for (const t of [0.5, 1] as const) {
    for (const order of perms(['top', 'bottom', 'left', 'right'])) {
      const st = draw(t, order.map((id) => [id, false]))
      assert(st.overlays.length === 4 && gaps(st, t) === 0, `corner to corner, ${order.join(' > ')}, thickness ${t}: closed`)
    }
    assert(gaps(draw(t, [['top', false], ['bottom', false], ['left', true], ['right', true]]), t) === 0, `sides drawn between the top and bottom, ${t}: closed`)
    assert(gaps(draw(t, [['left', false], ['right', false], ['top', true], ['bottom', true]]), t) === 0, `top and bottom drawn between the sides, ${t}: closed`)
    assert(gaps(draw(t, [['top', true], ['left', true], ['bottom', true], ['right', true]]), t) === 0, `all four short of the corners, ${t}: closed`)
  }
  // Taking a side away takes back the reach it gave its neighbours.
  const square = draw(0.5, [['top', true], ['left', true], ['bottom', true], ['right', true]])
  const top = square.overlays.find((o) => o.id === 'top')!
  assert(top.reachBefore === 1 && top.reachAfter === 1, `the top fills both empty corners: ${JSON.stringify(top)}`)
  const open = reduce(square, { type: 'REMOVE_OVERLAY', id: 'left' })
  const topNow = open.overlays.find((o) => o.id === 'top')!
  assert(topNow.reachBefore === 0 && topNow.reachAfter === 1, `the top stops at the removed side, still turns at the other: ${JSON.stringify(topNow)}`)
}

console.log('ok: overlay rules')
