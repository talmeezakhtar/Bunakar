/**
 * Analytic unroll: a rug of length L lies flat from its start edge up to `progress * L`; the
 * rest is wound pile-in on an Archimedean spiral that sits on the floor at that point. Pure and
 * unit-agnostic (use feet or metres throughout). In the rug's frame `v` runs along its length
 * from the start edge; the result is `y` along the floor and `z` up, for the sheet's mid-surface.
 */
export interface UnrollOptions {
  /** Rug thickness = spiral pitch per turn. */
  thickness: number
  /** Radius of the innermost turn. */
  core: number
}

export interface RollState {
  /** Length lying flat. */
  flat: number
  /** Total wound angle, radians. */
  turns: number
  outerRadius: number
  /** Where the roll's axis is: along the floor, and its height. */
  centerY: number
  centerZ: number
}

/** Angle from the inner end for a spiral arc length `a` (arc ~ r dθ, the thin-sheet limit). */
function angleForArc(a: number, o: UnrollOptions): number {
  const k = o.thickness / (2 * Math.PI)
  if (k <= 0) return a / o.core
  return (-o.core + Math.sqrt(o.core * o.core + 2 * k * Math.max(0, a))) / k
}

export function rollState(L: number, progress: number, o: UnrollOptions): RollState {
  const p = Math.min(1, Math.max(0, progress))
  const flat = p * L
  const turns = angleForArc(L - flat, o)
  const outerRadius = o.core + (o.thickness / (2 * Math.PI)) * turns
  return { flat, turns, outerRadius, centerY: flat, centerZ: outerRadius }
}

/** Position of the sheet at distance `v` (0..L) from the start edge. */
export function unrollPoint(v: number, L: number, progress: number, o: UnrollOptions, state = rollState(L, progress, o)): { y: number; z: number } {
  if (v <= state.flat || state.turns === 0) return { y: v, z: 0 }
  const u = Math.min(v, L) - state.flat
  // θ counts from the inner end; ψ from the floor contact, winding forward and up over the top.
  const theta = angleForArc(L - state.flat - u, o)
  const psi = state.turns - theta
  const r = o.core + (o.thickness / (2 * Math.PI)) * theta
  return { y: state.centerY + r * Math.sin(psi), z: state.centerZ - r * Math.cos(psi) }
}
