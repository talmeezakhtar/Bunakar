import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { TileDesignState } from '../types/tileDesign'
import type { TileDesignAction } from './tileDesignReducer'
import { tileDesignReducer } from './tileDesignReducer'

const HISTORY_LIMIT = 100

interface HistoryStack {
  past: TileDesignState[]
  present: TileDesignState
  future: TileDesignState[]
}

export function useTileDesignHistory(initial: TileDesignState) {
  const [stack, setStack] = useState<HistoryStack>({ past: [], present: initial, future: [] })

  // Mirrors stack.present for synchronous reads outside setState updaters (e.g. beginStroke).
  // Synced via useLayoutEffect, which runs before the browser paints and before any user
  // interaction can follow, so it's always current by the time it's read.
  const presentRef = useRef(stack.present)
  useLayoutEffect(() => {
    presentRef.current = stack.present
  }, [stack.present])

  const strokeBaselineRef = useRef<TileDesignState | null>(null)

  /** Apply an action as a single, immediately-undoable commit (e.g. one click, a resize, a style change). */
  const commit = useCallback((action: TileDesignAction) => {
    setStack((s) => {
      const next = tileDesignReducer(s.present, action)
      if (next === s.present) return s
      const past = [...s.past, s.present].slice(-HISTORY_LIMIT)
      return { past, present: next, future: [] }
    })
  }, [])

  /**
   * Start a drag stroke: snapshot the pre-stroke state so the whole drag becomes one undo
   * step. Pure ref bookkeeping only, no setState involved, so there is nothing for
   * StrictMode's double-invocation to corrupt.
   */
  const beginStroke = useCallback(() => {
    strokeBaselineRef.current = presentRef.current
  }, [])

  /**
   * Live-update during a drag. Always recomputes from the pre-stroke baseline (not the
   * previous live frame), so shrinking the drag rectangle correctly un-paints tiles too.
   * Does not touch past/future.
   */
  const updateStroke = useCallback((action: TileDesignAction) => {
    setStack((s) => {
      const baseline = strokeBaselineRef.current ?? s.present
      const next = tileDesignReducer(baseline, action)
      return { ...s, present: next }
    })
  }, [])

  /**
   * Finish a drag stroke: push the pre-stroke baseline as one past entry. The ref read/clear
   * happens before setState (not inside the updater), so the updater stays pure even under
   * StrictMode's double-invocation.
   */
  const endStroke = useCallback(() => {
    const baseline = strokeBaselineRef.current
    strokeBaselineRef.current = null
    setStack((s) => {
      if (!baseline || baseline === s.present) return s
      const past = [...s.past, baseline].slice(-HISTORY_LIMIT)
      return { past, present: s.present, future: [] }
    })
  }, [])

  const undo = useCallback(() => {
    setStack((s) => {
      if (s.past.length === 0) return s
      const previous = s.past[s.past.length - 1]
      return { past: s.past.slice(0, -1), present: previous, future: [s.present, ...s.future] }
    })
  }, [])

  const redo = useCallback(() => {
    setStack((s) => {
      if (s.future.length === 0) return s
      const next = s.future[0]
      return { past: [...s.past, s.present], present: next, future: s.future.slice(1) }
    })
  }, [])

  /** Load a different design or start a new one: resets history entirely. */
  const replaceAll = useCallback((next: TileDesignState) => {
    setStack({ past: [], present: next, future: [] })
  }, [])

  return {
    state: stack.present,
    commit,
    beginStroke,
    updateStroke,
    endStroke,
    undo,
    redo,
    canUndo: stack.past.length > 0,
    canRedo: stack.future.length > 0,
    replaceAll,
  }
}
