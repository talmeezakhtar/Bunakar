// Self-check for the cloth: `npx tsx src/three/physics/cloth.check.ts`.
// A dropped sheet must settle (energy decays, then sleeps) and never pass below the floor;
// a hung sheet must keep its pinned row in place and settle too.
import { createCloth, floorPlane, pinRows } from './cloth'

const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg)
}

const dt = 1 / 60
{
  // A 5 x 8 ft rug (1.52 x 2.44 m) dropped from 40 cm, tilted so it lands one edge first.
  const cloth = createCloth({
    cols: 24,
    rows: 36,
    width: 1.52,
    length: 2.44,
    origin: [-0.76, 0.4, -1.22],
    across: [1, 0, 0],
    down: [0, 0.12, 0.993],
    planes: [floorPlane(0, 0.8)],
    thickness: 0.006,
  })
  let peak = 0
  let lowest = Infinity
  let steps = 0
  for (; steps < 1200 && !cloth.sleeping; steps++) {
    cloth.step(dt)
    peak = Math.max(peak, cloth.energy())
    const p = cloth.positions
    for (let i = 1; i < p.length; i += 3) lowest = Math.min(lowest, p[i])
  }
  assert(lowest >= -1e-4, `dropped cloth went below the floor (${lowest})`)
  assert(peak > 0.1, `cloth never fell (peak energy ${peak})`)
  assert(cloth.sleeping, `dropped cloth never slept (energy ${cloth.energy()} after ${steps} steps)`)
  assert(cloth.energy() < peak * 1e-3, 'energy did not decay')
  // Lying flat: everything near the floor.
  let highest = 0
  for (let i = 1; i < cloth.positions.length; i += 3) highest = Math.max(highest, cloth.positions[i])
  assert(highest < 0.05, `settled cloth is not lying flat (max y ${highest})`)
  const before = cloth.positions.slice()
  cloth.step(dt)
  assert(cloth.positions.every((v, i) => v === before[i]), 'sleeping cloth moved')
  console.log(`cloth drop: slept after ${steps} steps, lowest y ${lowest.toFixed(5)}`)
}
{
  // Hanging from its top edge, released a little forward of vertical so it swings.
  const cloth = createCloth({
    cols: 24,
    rows: 36,
    width: 1.52,
    length: 2.44,
    origin: [-0.76, 2.6, 0.05],
    across: [1, 0, 0],
    down: [0, -0.966, 0.259],
    planes: [floorPlane(0, 0.8), { nx: 0, ny: 0, nz: 1, d: 0, friction: 0.3 }],
  })
  pinRows(cloth, [0])
  const top = cloth.positions.slice(0, 24 * 3)
  let steps = 0
  let wallMin = Infinity
  for (; steps < 2400 && !cloth.sleeping; steps++) {
    cloth.step(dt)
    for (let i = 2; i < cloth.positions.length; i += 3) wallMin = Math.min(wallMin, cloth.positions[i])
  }
  assert(cloth.positions.slice(0, 24 * 3).every((v, i) => v === top[i]), 'pinned row moved')
  assert(cloth.sleeping, `hanging cloth never slept (energy ${cloth.energy()})`)
  assert(wallMin >= -1e-4, `hanging cloth went through the wall (${wallMin})`)
  const bottomY = cloth.positions[(35 * 24 + 12) * 3 + 1]
  assert(Math.abs(bottomY - (2.6 - 2.44)) < 0.08, `hanging cloth stretched or did not hang (bottom y ${bottomY})`)
  console.log(`cloth hang: slept after ${steps} steps, bottom at ${bottomY.toFixed(3)} m`)
}
