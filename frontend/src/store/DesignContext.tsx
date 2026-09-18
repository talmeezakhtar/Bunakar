import { createContext, useContext, useReducer } from 'react'
import type { Dispatch, ReactNode } from 'react'
import { createDefaultDesign } from '../types/design'
import type { Design } from '../types/design'
import { designReducer } from './designReducer'
import type { DesignAction } from './designReducer'

interface DesignContextValue {
  design: Design
  dispatch: Dispatch<DesignAction>
}

const DesignContext = createContext<DesignContextValue | null>(null)

export function DesignProvider({
  children,
  initialDesign,
}: {
  children: ReactNode
  initialDesign?: Partial<Design>
}) {
  const [design, dispatch] = useReducer(designReducer, initialDesign, (partial) => ({
    ...createDefaultDesign(),
    ...partial,
  }))
  return <DesignContext.Provider value={{ design, dispatch }}>{children}</DesignContext.Provider>
}

export function useDesign() {
  const ctx = useContext(DesignContext)
  if (!ctx) throw new Error('useDesign must be used within a DesignProvider')
  return ctx
}
