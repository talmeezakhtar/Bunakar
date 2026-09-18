import { useEffect, useState } from 'react'
import { catalogApi } from '../services/api'
import type { Color, Material, Pattern, PileType } from '../types/catalog'

interface CatalogState {
  colors: Color[]
  patterns: Pattern[]
  materials: Material[]
  pileTypes: PileType[]
  loading: boolean
  error: string | null
}

export function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({
    colors: [],
    patterns: [],
    materials: [],
    pileTypes: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    Promise.all([catalogApi.colors(), catalogApi.patterns(), catalogApi.materials(), catalogApi.pileTypes()])
      .then(([colors, patterns, materials, pileTypes]) => {
        if (!cancelled) setState({ colors, patterns, materials, pileTypes, loading: false, error: null })
      })
      .catch((err) => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: err.message }))
      })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
