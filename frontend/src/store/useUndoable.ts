import { useCallback, useLayoutEffect, useRef, useState } from 'react'

const HISTORY_LIMIT = 100

/**
 * Undo/redo over immutable state, driven by pure edit functions. `commit` is one undo step; a
 * drag is `begin` + any number of `live` updates (each recomputed from the pre-drag state) +
 * `end`, so the whole gesture undoes at once. Edits that return the same object are no-ops.
 */
export function useUndoable<T>(initial: T) {
  const [stack, setStack] = useState<{ past: T[]; present: T; future: T[] }>({ past: [], present: initial, future: [] })
  const presentRef = useRef(stack.present)
  useLayoutEffect(() => {
    presentRef.current = stack.present
  }, [stack.present])
  const baselineRef = useRef<T | null>(null)

  const commit = useCallback((edit: (s: T) => T) => {
    setStack((s) => {
      const next = edit(s.present)
      if (next === s.present) return s
      return { past: [...s.past, s.present].slice(-HISTORY_LIMIT), present: next, future: [] }
    })
  }, [])

  const begin = useCallback(() => {
    baselineRef.current = presentRef.current
  }, [])

  const live = useCallback((edit: (baseline: T) => T) => {
    setStack((s) => ({ ...s, present: edit(baselineRef.current ?? s.present) }))
  }, [])

  const end = useCallback(() => {
    const baseline = baselineRef.current
    baselineRef.current = null
    setStack((s) => {
      if (!baseline || baseline === s.present) return s
      return { past: [...s.past, baseline].slice(-HISTORY_LIMIT), present: s.present, future: [] }
    })
  }, [])

  const undo = useCallback(() => {
    setStack((s) => (s.past.length === 0 ? s : { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] }))
  }, [])

  const redo = useCallback(() => {
    setStack((s) => (s.future.length === 0 ? s : { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) }))
  }, [])

  const replaceAll = useCallback((next: T) => setStack({ past: [], present: next, future: [] }), [])

  return {
    state: stack.present,
    commit,
    begin,
    live,
    end,
    undo,
    redo,
    replaceAll,
    canUndo: stack.past.length > 0,
    canRedo: stack.future.length > 0,
  }
}
