// Self-check for finishes: `npx tsx src/studio/finish.check.ts`.
import { abrashRows, applyFinish } from './finish'
import { newRug } from './model'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}

// Abrash: none at 0; at full strength some rows shift, by no more than 16%, the same every time.
assert(abrashRows(200, 0, 1).every((v) => v === 1), 'no abrash at 0')
const a = abrashRows(400, 1, 42)
assert(a.some((v) => Math.abs(v - 1) > 0.03) && a.every((v) => v > 0.83 && v < 1.17), 'abrash bands within 16%')
assert(abrashRows(400, 1, 42).every((v, i) => v === a[i]), 'abrash is repeatable')

// Wash: a saturated red fades towards grey; untouched with no finish; empty pixels stay empty.
const rug = newRug({ construction: 'knotted', widthFt: 4, heightFt: 6, palette: [{ swatchId: 'x', fibre: 'wool' }] })
const px = () => {
  const d = new Uint8ClampedArray(40 * 60 * 4)
  for (let i = 0; i < 40 * 60; i++) d.set([180, 30, 40, 255], i * 4)
  d[3] = 0
  return d
}
const plain = px()
applyFinish(plain, 40, 60, rug)
assert(plain[4] === 180 && plain[5] === 30, 'no finish: colours unchanged')
const washed = px()
applyFinish(washed, 40, 60, { ...rug, finish: { ...rug.finish, wash: 1 } })
const sat = (d: Uint8ClampedArray, i: number) => Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2])
assert(sat(washed, 4 * 100) < sat(plain, 4 * 100) * 0.75, 'wash fades colour')
assert(washed[0] === 180 && washed[3] === 0, 'transparent pixels untouched')

// Silk knots come out brighter than wool ones.
const silk = { ...rug, palette: [{ swatchId: 'x', fibre: 'silk' as const }] }
const s = px()
applyFinish(s, 40, 60, silk)
assert(s[4] > 180, 'silk brighter')
console.log('finish: ok')
