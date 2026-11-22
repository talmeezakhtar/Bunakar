// Self-check for the analytic unroll: `npx tsx src/three/rug/unroll.check.ts`.
// Flat at progress 1, compact at 0, never below the floor, continuous, and length-preserving.
import { rollState, unrollPoint } from './unroll'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}

const L = 8
const o = { thickness: 0.04, core: 0.12 }
const N = 4000

for (let i = 0; i <= 20; i++) {
  const v = (i / 20) * L
  const p = unrollPoint(v, L, 1, o)
  assert(p.y === v && p.z === 0, `progress 1 is not flat at v=${v}`)
}

for (const progress of [0, 0.15, 0.5, 0.85, 0.99]) {
  const st = rollState(L, progress, o)
  let length = 0
  let prev = unrollPoint(0, L, progress, o, st)
  for (let i = 1; i <= N; i++) {
    const v = (i / N) * L
    const p = unrollPoint(v, L, progress, o, st)
    const seg = Math.hypot(p.y - prev.y, p.z - prev.z)
    assert(seg < (L / N) * 1.05, `jump at progress ${progress}, v=${v.toFixed(3)} (${seg})`)
    assert(p.z >= -1e-9, `below the floor at progress ${progress}, v=${v}`)
    // Inside the roll's outer circle.
    if (v > st.flat) assert(Math.hypot(p.y - st.centerY, p.z - st.centerZ) <= st.outerRadius + 1e-9, 'outside the roll')
    length += seg
    prev = p
  }
  assert(Math.abs(length - L) / L < 0.01, `length not preserved at progress ${progress}: ${length.toFixed(4)}`)
  const contact = unrollPoint(st.flat + 1e-6, L, progress, o, st)
  assert(Math.abs(contact.y - st.flat) < 1e-4 && contact.z < 1e-4, 'roll does not touch the floor where the flat part ends')
}

const rolled = rollState(L, 0, o)
assert(rolled.outerRadius < 0.4, `fully rolled 8 ft rug is too fat (${rolled.outerRadius.toFixed(3)} ft)`)
assert(rolled.turns > 2 * Math.PI * 4, 'fully rolled rug should wind several turns')
console.log(`unroll: rolled radius ${rolled.outerRadius.toFixed(3)} ft over ${(rolled.turns / (2 * Math.PI)).toFixed(1)} turns`)
