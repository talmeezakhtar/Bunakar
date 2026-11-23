// Self-check for chart drawing: `npx tsx src/studio/chartOps.check.ts`.
import { brush, copyRegion, ellipse, flipPatch, floodFill, line, rect, repeatPositions, rotatePatch, stampCells, symmetric } from './chartOps'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}
const key = (cs: { c: number; r: number }[]) => cs.map((p) => `${p.c},${p.r}`).sort().join(' ')

// Symmetry: a quarter drawn top-left lands in all four corners.
assert(key(symmetric({ c: 1, r: 2 }, 10, 8, 'quarter')) === key([{ c: 1, r: 2 }, { c: 8, r: 2 }, { c: 1, r: 5 }, { c: 8, r: 5 }]), 'quarter symmetry')
assert(symmetric({ c: 4, r: 3 }, 9, 7, 'quarter').length === 1, 'the centre knot is its own mirror')
assert(key(symmetric({ c: 0, r: 0 }, 5, 5, 'radial-4')) === key([{ c: 0, r: 0 }, { c: 4, r: 0 }, { c: 4, r: 4 }, { c: 0, r: 4 }]), 'radial x4 turns corners')
assert(symmetric({ c: 1, r: 0 }, 9, 9, 'radial-8').length === 8, 'radial x8 off the axes gives eight')
assert(symmetric({ c: 0, r: 0 }, 4, 4, 'none').length === 1, 'none')

// Drawing primitives.
assert(brush({ c: 5, r: 5 }, 3).length === 9 && brush({ c: 5, r: 5 }, 1).length === 1, 'brush sizes')
const l = line({ c: 0, r: 0 }, { c: 5, r: 2 })
assert(l.length === 6 && l[0].c === 0 && l[5].c === 5 && l[5].r === 2, `line ends: ${key(l)}`)
assert(rect({ c: 0, r: 0 }, { c: 3, r: 2 }, false).length === 10 && rect({ c: 0, r: 0 }, { c: 3, r: 2 }, true).length === 12, 'rect outline vs fill')
const e = ellipse({ c: 0, r: 0 }, { c: 8, r: 8 }, true)
assert(e.some((p) => p.c === 4 && p.r === 4) && !e.some((p) => p.c === 0 && p.r === 0), 'filled ellipse has its centre, not its box corner')

// Flood fill stays inside its colour.
const g = new Uint8Array([1, 1, 2, 1, 1, 2, 2, 2, 2])
assert(floodFill(g, 3, 3, { c: 0, r: 0 }).sort().join() === '0,1,3,4', 'flood fill region')

// Selections.
const src = new Uint8Array([1, 2, 3, 4, 5, 6])
const p = copyRegion(src, 3, { c: 0, r: 0 }, { c: 2, r: 1 })
assert(p.cols === 3 && p.rows === 2 && p.cells.join() === '1,2,3,4,5,6', 'copy')
assert(flipPatch(p, 'x').cells.join() === '3,2,1,6,5,4', 'flip across')
const rot = rotatePatch(p)
assert(rot.cols === 2 && rot.rows === 3 && rot.cells.join() === '4,1,5,2,6,3', `rotate: ${rot.cells.join()}`)
assert(stampCells({ cols: 2, rows: 1, cells: new Uint8Array([0, 7]) }, { c: 1, r: 1 }, 4, 4).map((s) => `${s.index}:${s.value}`).join() === '6:7', 'stamp skips empties')
const reps = repeatPositions({ cols: 4, rows: 4, cells: new Uint8Array(16) }, { c0: 0, r0: 0, c1: 15, r1: 15 }, 'half-drop')
assert(reps.some((q) => q.c === 4 && q.r === 2), 'half-drop offsets alternate columns')

console.log('ok: chart drawing')

// Stamping under symmetry: a quarter stamp lands mirrored in all four corners.
{
  const { symmetricStamps } = await import('./chartOps')
  const p = { cols: 3, rows: 2, cells: new Uint8Array([1, 2, 3, 4, 5, 6]) }
  const q = symmetricStamps(p, { c: 2, r: 2 }, 20, 10, 'quarter')
  assert(q.length === 4 && q[1].at.c === 20 - 1 - 3 && q[1].patch.cells[0] === 3 && q[3].at.r === 10 - 1 - 2 && q[3].patch.cells[0] === 6, `quarter stamps: ${JSON.stringify(q.map((s) => s.at))}`)
  assert(symmetricStamps(p, { c: 10, r: 5 }, 21, 11, 'mirror-x').length === 1, 'a stamp centred on the axis is its own mirror')
  assert(symmetricStamps(p, { c: 1, r: 1 }, 9, 9, 'radial-8').length === 8, 'radial x8 stamps eight')
}
