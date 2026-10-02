import type { FreeformDesignState, FreeformShape, Point, SurfaceFinish } from '../types/freeform'
import { flattenShape, pointInPolygon, scaleRotate } from '../utils/freeformGeometry'

/**
 * Pure edits for freeform designs. Each returns the same object when nothing changes, so the
 * undo history and "unsaved" checks can compare by reference. Fills replace; nothing stacks.
 */

export type FreeformTarget = 'ground' | string

export function topShapeAt(state: FreeformDesignState, p: Point): FreeformShape | undefined {
  for (let i = state.shapes.length - 1; i >= 0; i--) {
    const s = state.shapes[i]
    if (pointInPolygon(p, flattenShape(s, 6))) return s
  }
  return undefined
}

function mapShape(state: FreeformDesignState, id: string, fn: (s: FreeformShape) => FreeformShape): FreeformDesignState {
  let changed = false
  const shapes = state.shapes.map((s) => {
    if (s.id !== id) return s
    const next = fn(s)
    if (next !== s) changed = true
    return next
  })
  return changed ? { ...state, shapes } : state
}

function sameFinish(a: SurfaceFinish, b: Partial<SurfaceFinish>): boolean {
  return (Object.keys(b) as (keyof SurfaceFinish)[]).every((k) => a[k] === b[k])
}

/** Set some or all of a surface's finish (colour, texture, carving, pile) - replaces, never stacks. */
export function setFinish(state: FreeformDesignState, target: FreeformTarget, finish: Partial<SurfaceFinish>): FreeformDesignState {
  const withStyle = (s: FreeformDesignState) =>
    finish.swatchId && !s.myStyles.includes(finish.swatchId) ? { ...s, myStyles: [...s.myStyles, finish.swatchId] } : s
  if (target === 'ground') {
    if (sameFinish(state.ground, finish)) return state
    return withStyle({ ...state, ground: { ...state.ground, ...finish } })
  }
  const next = mapShape(state, target, (s) => (sameFinish(s, finish) ? s : { ...s, ...finish }))
  return next === state ? state : withStyle(next)
}

export function addShape(state: FreeformDesignState, shape: FreeformShape): FreeformDesignState {
  if (shape.points.length < 3) return state
  const styled = state.myStyles.includes(shape.swatchId) || !shape.swatchId ? state.myStyles : [...state.myStyles, shape.swatchId]
  return { ...state, shapes: [...state.shapes, shape], myStyles: styled }
}

export function removeShape(state: FreeformDesignState, id: string): FreeformDesignState {
  const shapes = state.shapes.filter((s) => s.id !== id)
  return shapes.length === state.shapes.length ? state : { ...state, shapes }
}

export function moveShape(state: FreeformDesignState, id: string, dx: number, dy: number): FreeformDesignState {
  if (!dx && !dy) return state
  return mapShape(state, id, (s) => ({ ...s, points: s.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }))
}

export function moveVertex(state: FreeformDesignState, id: string, index: number, to: Point): FreeformDesignState {
  return mapShape(state, id, (s) => {
    if (!s.points[index]) return s
    const points = s.points.slice()
    points[index] = to
    return { ...s, points }
  })
}

/** Insert a point after `index` (midway to the next) - more control over a curve. */
export function insertVertex(state: FreeformDesignState, id: string, index: number): FreeformDesignState {
  return mapShape(state, id, (s) => {
    const a = s.points[index]
    const b = s.points[(index + 1) % s.points.length]
    if (!a) return s
    const points = s.points.slice()
    points.splice(index + 1, 0, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
    return { ...s, points }
  })
}

export function removeVertex(state: FreeformDesignState, id: string, index: number): FreeformDesignState {
  return mapShape(state, id, (s) => (s.points.length <= 3 ? s : { ...s, points: s.points.filter((_, i) => i !== index) }))
}

export function transformShape(state: FreeformDesignState, id: string, scale: number, degrees: number): FreeformDesignState {
  if (scale === 1 && degrees === 0) return state
  return mapShape(state, id, (s) => ({ ...s, points: scaleRotate(s.points, scale, degrees) }))
}

export function setSmooth(state: FreeformDesignState, id: string, smooth: boolean): FreeformDesignState {
  return mapShape(state, id, (s) => (s.smooth === smooth ? s : { ...s, smooth }))
}

/** Move a shape one step up/down the stack (`delta` +1 = forward). */
export function reorderShape(state: FreeformDesignState, id: string, delta: number): FreeformDesignState {
  const i = state.shapes.findIndex((s) => s.id === id)
  const j = i + delta
  if (i < 0 || j < 0 || j >= state.shapes.length) return state
  const shapes = state.shapes.slice()
  ;[shapes[i], shapes[j]] = [shapes[j], shapes[i]]
  return { ...state, shapes }
}

export function duplicateShape(state: FreeformDesignState, id: string, newId: string): FreeformDesignState {
  const s = state.shapes.find((x) => x.id === id)
  if (!s) return state
  return { ...state, shapes: [...state.shapes, { ...s, id: newId, points: s.points.map((p) => ({ x: p.x + 0.4, y: p.y + 0.4 })) }] }
}

/** Resize the rug; shapes keep their size and position (anything off the edge is trimmed visually). */
export function resizeRug(state: FreeformDesignState, widthFt: number, heightFt: number): FreeformDesignState {
  if (widthFt === state.widthFt && heightFt === state.heightFt) return state
  return { ...state, widthFt, heightFt }
}

export function removeStyle(state: FreeformDesignState, swatchId: string): FreeformDesignState {
  const inUse = state.ground.swatchId === swatchId || state.shapes.some((s) => s.swatchId === swatchId)
  // A yarn still on the rug stays in the palette - removing it would leave a hole in the design.
  if (inUse || !state.myStyles.includes(swatchId)) return state
  return { ...state, myStyles: state.myStyles.filter((id) => id !== swatchId) }
}

export function addStyles(state: FreeformDesignState, ids: string[]): FreeformDesignState {
  const add = ids.filter((id) => !state.myStyles.includes(id))
  return add.length ? { ...state, myStyles: [...state.myStyles, ...add] } : state
}
