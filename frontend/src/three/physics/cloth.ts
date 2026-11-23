/**
 * A small position-based cloth (verlet integration + iterated distance constraints), for rugs:
 * a cols x rows particle grid with stretch, shear and bend constraints, plane colliders (floor,
 * wall) with friction, pinned particles for hanging, and sleep once it settles. No three.js, no
 * allocation per step. Units are metres and seconds; y is up.
 */
export interface Plane {
  /** Unit normal pointing to the free side. */
  nx: number
  ny: number
  nz: number
  /** Plane is n·p = d. */
  d: number
  /** 0 = ice, 1 = no sliding while in contact. */
  friction: number
}

export interface ClothOptions {
  cols: number
  rows: number
  /** Rest size of the sheet. */
  width: number
  length: number
  /** World position of particle (0, 0), and the directions columns and rows run in (unit vectors). */
  origin: [number, number, number]
  across: [number, number, number]
  down: [number, number, number]
  gravity?: number
  /** Velocity kept per step (air drag), 0..1. */
  damping?: number
  /** Constraint passes per substep. */
  iterations?: number
  substeps?: number
  /** Stiffness of stretch, shear and bend constraints (0..1 per pass). */
  stretch?: number
  shear?: number
  bend?: number
  planes?: Plane[]
  /** Collision margin: half the sheet's thickness. */
  thickness?: number
  /** Mean kinetic energy per particle (J/kg) below which it may sleep... */
  sleepEnergy?: number
  /** ...after staying below it this many steps. */
  sleepSteps?: number
}

export interface Cloth {
  readonly cols: number
  readonly rows: number
  /** xyz per particle, row-major (row 0 first). Read every frame; write only via `setPosition`. */
  readonly positions: Float32Array
  readonly sleeping: boolean
  /** Advances by `dt` seconds (clamped to 1/30). */
  step(dt: number): void
  /** Mean kinetic energy per unit mass from the last step. */
  energy(): number
  pin(index: number, pinned?: boolean): void
  setPosition(index: number, x: number, y: number, z: number): void
  wake(): void
}

export const floorPlane = (y = 0, friction = 0.8): Plane => ({ nx: 0, ny: 1, nz: 0, d: y, friction })

export function createCloth(o: ClothOptions): Cloth {
  const { cols, rows } = o
  const n = cols * rows
  const gravity = o.gravity ?? 9.81
  const damping = o.damping ?? 0.985
  const iterations = o.iterations ?? 12
  const substeps = o.substeps ?? 3
  const planes = o.planes ?? []
  const margin = o.thickness ?? 0.006
  const sleepEnergy = o.sleepEnergy ?? 2e-5
  const sleepSteps = o.sleepSteps ?? 30

  const pos = new Float32Array(n * 3)
  const prev = new Float32Array(n * 3)
  const invMass = new Float32Array(n).fill(1)
  const dx = o.width / (cols - 1)
  const dy = o.length / (rows - 1)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = (r * cols + c) * 3
      for (let k = 0; k < 3; k++) pos[i + k] = o.origin[k] + o.across[k] * c * dx + o.down[k] * r * dy
    }
  }
  prev.set(pos)

  // Constraints as flat arrays: particle a, particle b, rest length, stiffness.
  const ca: number[] = []
  const cb: number[] = []
  const rest: number[] = []
  const stiff: number[] = []
  const link = (a: number, b: number, k: number) => {
    ca.push(a)
    cb.push(b)
    rest.push(Math.hypot(pos[a * 3] - pos[b * 3], pos[a * 3 + 1] - pos[b * 3 + 1], pos[a * 3 + 2] - pos[b * 3 + 2]))
    stiff.push(k)
  }
  const id = (r: number, c: number) => r * cols + c
  const kStretch = o.stretch ?? 1
  const kShear = o.shear ?? 0.6
  const kBend = o.bend ?? 0.25
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols) link(id(r, c), id(r, c + 1), kStretch)
      if (r + 1 < rows) link(id(r, c), id(r + 1, c), kStretch)
      if (c + 1 < cols && r + 1 < rows) {
        link(id(r, c), id(r + 1, c + 1), kShear)
        link(id(r, c + 1), id(r + 1, c), kShear)
      }
      // Bend: skip-one links resist folding, the stiffness of a heavy rug.
      if (c + 2 < cols) link(id(r, c), id(r, c + 2), kBend)
      if (r + 2 < rows) link(id(r, c), id(r + 2, c), kBend)
    }
  }
  const A = Int32Array.from(ca)
  const B = Int32Array.from(cb)
  const REST = Float32Array.from(rest)
  const K = Float32Array.from(stiff)
  const m = A.length

  let sleeping = false
  let quiet = 0
  let lastEnergy = 0

  function solveConstraints() {
    for (let j = 0; j < m; j++) {
      const a = A[j] * 3
      const b = B[j] * 3
      const wa = invMass[A[j]]
      const wb = invMass[B[j]]
      const w = wa + wb
      if (w === 0) continue
      const ex = pos[b] - pos[a]
      const ey = pos[b + 1] - pos[a + 1]
      const ez = pos[b + 2] - pos[a + 2]
      const len = Math.sqrt(ex * ex + ey * ey + ez * ez)
      if (len < 1e-9) continue
      const s = (K[j] * (len - REST[j])) / (len * w)
      pos[a] += ex * s * wa
      pos[a + 1] += ey * s * wa
      pos[a + 2] += ez * s * wa
      pos[b] -= ex * s * wb
      pos[b + 1] -= ey * s * wb
      pos[b + 2] -= ez * s * wb
    }
  }

  /** Projects particles out of the colliders (positions only; runs inside the solver loop). */
  function collide() {
    for (const pl of planes) {
      for (let i = 0; i < n; i++) {
        if (invMass[i] === 0) continue
        const p = i * 3
        const depth = pl.d + margin - (pl.nx * pos[p] + pl.ny * pos[p + 1] + pl.nz * pos[p + 2])
        if (depth <= 0) continue
        pos[p] += pl.nx * depth
        pos[p + 1] += pl.ny * depth
        pos[p + 2] += pl.nz * depth
      }
    }
  }

  /** Once per substep, for particles touching a collider: no bounce, and friction on sliding. */
  function contactVelocity() {
    for (const pl of planes) {
      for (let i = 0; i < n; i++) {
        if (invMass[i] === 0) continue
        const p = i * 3
        const gap = pl.nx * pos[p] + pl.ny * pos[p + 1] + pl.nz * pos[p + 2] - pl.d - margin
        if (gap > 1e-4) continue
        // Verlet velocity is pos - prev; edit prev to change it.
        const vx = pos[p] - prev[p]
        const vy = pos[p + 1] - prev[p + 1]
        const vz = pos[p + 2] - prev[p + 2]
        const vn = vx * pl.nx + vy * pl.ny + vz * pl.nz
        const tx = vx - vn * pl.nx
        const ty = vy - vn * pl.ny
        const tz = vz - vn * pl.nz
        prev[p] += vn * pl.nx + tx * pl.friction
        prev[p + 1] += vn * pl.ny + ty * pl.friction
        prev[p + 2] += vn * pl.nz + tz * pl.friction
      }
    }
  }

  function substep(h: number) {
    const g = gravity * h * h
    for (let i = 0; i < n; i++) {
      if (invMass[i] === 0) continue
      const p = i * 3
      for (let k = 0; k < 3; k++) {
        const x = pos[p + k]
        const v = (x - prev[p + k]) * damping
        prev[p + k] = x
        pos[p + k] = x + v - (k === 1 ? g : 0)
      }
    }
    for (let it = 0; it < iterations; it++) {
      solveConstraints()
      collide()
    }
    contactVelocity()
  }

  function measure(h: number): number {
    let e = 0
    for (let i = 0; i < n; i++) {
      if (invMass[i] === 0) continue
      const p = i * 3
      const vx = (pos[p] - prev[p]) / h
      const vy = (pos[p + 1] - prev[p + 1]) / h
      const vz = (pos[p + 2] - prev[p + 2]) / h
      e += 0.5 * (vx * vx + vy * vy + vz * vz)
    }
    return e / n
  }

  return {
    cols,
    rows,
    positions: pos,
    get sleeping() {
      return sleeping
    },
    step(dt: number) {
      if (sleeping) return
      const h = Math.min(dt, 1 / 30) / substeps
      if (h <= 0) return
      for (let s = 0; s < substeps; s++) substep(h)
      lastEnergy = measure(h)
      quiet = lastEnergy < sleepEnergy ? quiet + 1 : 0
      if (quiet >= sleepSteps) {
        sleeping = true
        prev.set(pos)
      }
    },
    energy: () => lastEnergy,
    pin(index, pinned = true) {
      invMass[index] = pinned ? 0 : 1
      sleeping = false
      quiet = 0
    },
    setPosition(index, x, y, z) {
      const p = index * 3
      pos[p] = prev[p] = x
      pos[p + 1] = prev[p + 1] = y
      pos[p + 2] = prev[p + 2] = z
      sleeping = false
      quiet = 0
    },
    wake() {
      sleeping = false
      quiet = 0
    },
  }
}

/** Pins every particle of the given rows (e.g. `[0]` to hang from the top edge). */
export function pinRows(cloth: Cloth, rowIndices: number[]): void {
  for (const r of rowIndices) for (let c = 0; c < cloth.cols; c++) cloth.pin(r * cloth.cols + c)
}
