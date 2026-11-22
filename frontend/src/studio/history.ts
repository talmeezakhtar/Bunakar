import { useCallback, useRef, useState } from 'react'
import type { ChartLayer, RugDoc } from './model'

/**
 * Undo/redo for the studio. Charts are big (1.5 M knots for a 9x12 ft rug), so painting doesn't
 * snapshot them: a stroke edits the chart in place and records a patch (which knots, before and
 * after). Everything else (settings, palette, layers) is an immutable document snapshot, which
 * shares the chart arrays and so costs almost nothing. Every change yields a new document object,
 * so "unsaved changes" (by identity) and rendering (by content hash) stay correct.
 */

type Patch = { layerId: string; index: Uint32Array; before: Uint8Array; after: Uint8Array }
type Entry = { kind: 'doc'; before: RugDoc; after: RugDoc } | { kind: 'cells'; patch: Patch }

const LIMIT = 200

/** Applies one side of a patch to the chart, in place; returns a new document object. */
function applyPatch(doc: RugDoc, patch: Patch, side: 'before' | 'after'): RugDoc {
  const layer = doc.layers.find((l) => l.id === patch.layerId) as ChartLayer | undefined
  if (!layer) return doc
  const values = patch[side]
  for (let i = 0; i < patch.index.length; i++) layer.cells[patch.index[i]] = values[i]
  return { ...doc, layers: [...doc.layers] }
}

/** A stroke in progress: knots touched so far, with their values before the stroke. */
export class Stroke {
  readonly layerId: string
  private readonly touched = new Map<number, number>()
  constructor(layerId: string) {
    this.layerId = layerId
  }
  /** Sets one knot, remembering its first value. Returns whether it changed. */
  set(layer: ChartLayer, index: number, value: number): boolean {
    const old = layer.cells[index]
    if (old === value) return false
    if (!this.touched.has(index)) this.touched.set(index, old)
    layer.cells[index] = value
    return true
  }
  toPatch(layer: ChartLayer): Patch | null {
    const changed = [...this.touched].filter(([i, before]) => layer.cells[i] !== before)
    if (!changed.length) return null
    return {
      layerId: this.layerId,
      index: Uint32Array.from(changed, ([i]) => i),
      before: Uint8Array.from(changed, ([, b]) => b),
      after: Uint8Array.from(changed, ([i]) => layer.cells[i]),
    }
  }
}

export function useStudioHistory(initial: RugDoc) {
  const [doc, setDoc] = useState(initial)
  const past = useRef<Entry[]>([])
  const future = useRef<Entry[]>([])
  // Every setter updates this first, so callbacks always see the latest rug.
  const docRef = useRef(doc)
  const [depth, setDepth] = useState({ past: 0, future: 0 })
  const sync = () => setDepth({ past: past.current.length, future: future.current.length })

  /** One undoable change to the document (settings, palette, layers, layout). */
  const commit = useCallback((edit: (d: RugDoc) => RugDoc) => {
    const before = docRef.current
    const after = edit(before)
    if (after === before) return
    past.current = [...past.current, { kind: 'doc' as const, before, after }].slice(-LIMIT)
    future.current = []
    docRef.current = after
    setDoc(after)
    sync()
  }, [])

  // A drag (moving a shape, painting a run of tiles): begin, any number of live updates, each
  // recomputed from the document as it was when the drag began, then end as one undo step.
  const baseline = useRef<RugDoc | null>(null)
  const begin = useCallback(() => {
    baseline.current = docRef.current
  }, [])
  const live = useCallback((edit: (d: RugDoc) => RugDoc) => {
    const next = edit(baseline.current ?? docRef.current)
    docRef.current = next
    setDoc(next)
  }, [])
  const end = useCallback(() => {
    const before = baseline.current
    baseline.current = null
    const after = docRef.current
    if (!before || before === after) return
    past.current = [...past.current, { kind: 'doc' as const, before, after }].slice(-LIMIT)
    future.current = []
    sync()
  }, [])

  /** During a stroke: show the chart's in-place edits (no history entry yet). */
  const touch = useCallback(() => {
    const next = { ...docRef.current, layers: [...docRef.current.layers] }
    docRef.current = next
    setDoc(next)
  }, [])

  /** A finished stroke becomes one undo step. */
  const endStroke = useCallback((stroke: Stroke) => {
    const layer = docRef.current.layers.find((l) => l.id === stroke.layerId) as ChartLayer | undefined
    const patch = layer && stroke.toPatch(layer)
    if (!patch) return
    past.current = [...past.current, { kind: 'cells' as const, patch }].slice(-LIMIT)
    future.current = []
    sync()
  }, [])

  const undo = useCallback(() => {
    const e = past.current.pop()
    if (!e) return
    future.current = [e, ...future.current]
    const next = e.kind === 'doc' ? e.before : applyPatch(docRef.current, e.patch, 'before')
    docRef.current = next
    setDoc(next)
    sync()
  }, [])

  const redo = useCallback(() => {
    const e = future.current.shift()
    if (!e) return
    past.current = [...past.current, e]
    const next = e.kind === 'doc' ? e.after : applyPatch(docRef.current, e.patch, 'after')
    docRef.current = next
    setDoc(next)
    sync()
  }, [])

  /** Swap the whole rug (load, new, restore), clearing history. */
  const replaceAll = useCallback((next: RugDoc) => {
    past.current = []
    future.current = []
    docRef.current = next
    setDoc(next)
    sync()
  }, [])

  return { doc, docRef, commit, begin, live, end, touch, endStroke, undo, redo, replaceAll, canUndo: depth.past > 0, canRedo: depth.future > 0 }
}
