import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, Circle, MagnifyingGlass, X } from '@phosphor-icons/react'
import type { Swatch } from '../../types/swatch'
import { groupByFamily } from '../../types/swatch'

type StyleBrowserOverlayProps = {
  swatches: Swatch[]
  categories: string[]
  onClose: () => void
  onAddSelected: (swatchIds: string[]) => void
}

function StyleBrowserOverlay({ swatches, categories, onClose, onAddSelected }: StyleBrowserOverlayProps) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [staged, setStaged] = useState<Set<string>>(new Set())

  const bySearch = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return swatches
    return swatches.filter(
      (s) => s.familyName.toLowerCase().includes(q) || s.colorName.toLowerCase().includes(q),
    )
  }, [swatches, search])

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const category of categories) {
      counts.set(category, bySearch.filter((s) => s.categories.includes(category)).length)
    }
    return counts
  }, [bySearch, categories])

  const filtered = useMemo(() => {
    if (!activeCategory) return bySearch
    return bySearch.filter((s) => s.categories.includes(activeCategory))
  }, [bySearch, activeCategory])

  const families = useMemo(() => groupByFamily(filtered), [filtered])

  function toggle(id: string) {
    setStaged((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addAllInFamily(ids: string[]) {
    setStaged((prev) => new Set([...prev, ...ids]))
  }

  function handleAddSelected() {
    onAddSelected(Array.from(staged))
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-night-950">
      <header className="flex items-center justify-between gap-4 border-b border-night-700 bg-night-900 px-5 py-3">
        <div className="relative w-full max-w-sm">
          <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sand-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search styles by name"
            className="w-full rounded-md border border-night-600 bg-night-950 py-2 pl-9 pr-3 text-sm text-sand-100 placeholder:text-sand-300/50 focus:border-gold-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-sand-200">{staged.size} Styles Selected</span>
          <button
            type="button"
            onClick={() => setStaged(new Set())}
            disabled={staged.size === 0}
            className="text-sm font-medium text-sand-400 transition-colors hover:text-sand-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={handleAddSelected}
            disabled={staged.size === 0}
            className="rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-night-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add Selected
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close style browser"
            className="rounded-full bg-transparent p-1.5 text-sand-300 transition-colors hover:text-gold-400"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="w-48 shrink-0 overflow-y-auto border-r border-night-700 bg-night-900 px-3 py-4">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
              activeCategory === null ? 'bg-gold-500 text-night-950' : 'text-sand-200 hover:bg-night-800'
            }`}
          >
            All Styles
            <span className="text-xs opacity-70">{bySearch.length}</span>
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                activeCategory === category ? 'bg-gold-500 text-night-950' : 'text-sand-200 hover:bg-night-800'
              }`}
            >
              {category}
              <span className="text-xs opacity-70">{categoryCounts.get(category) ?? 0}</span>
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {families.length === 0 ? (
            <p className="mt-10 text-center text-sm text-sand-300/70">No styles match your search.</p>
          ) : (
            <div className="space-y-8">
              {families.map((family) => (
                <section key={family.familyId}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-display text-sm tracking-wide text-sand-100">{family.familyName}</h3>
                    <button
                      type="button"
                      onClick={() => addAllInFamily(family.variants.map((v) => v.id))}
                      className="text-xs font-medium text-gold-400 underline decoration-gold-500/40 underline-offset-2 transition-colors hover:text-gold-300"
                    >
                      Add All
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {family.variants.map((variant) => {
                      const isStaged = staged.has(variant.id)
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => toggle(variant.id)}
                          aria-pressed={isStaged}
                          className={`group relative overflow-hidden rounded-lg border-2 bg-night-900 text-left transition-colors ${
                            isStaged ? 'border-gold-500' : 'border-transparent hover:border-night-500'
                          }`}
                        >
                          <div className="aspect-square w-full" style={{ backgroundColor: variant.swatchColor }} />
                          <span className="absolute right-1.5 top-1.5 rounded-full bg-night-950/80 p-0.5">
                            {isStaged ? (
                              <CheckCircle size={18} weight="fill" className="text-gold-400" />
                            ) : (
                              <Circle size={18} className="text-sand-100 drop-shadow" />
                            )}
                          </span>
                          <div className="px-1.5 py-1.5">
                            <p className="truncate text-xs font-medium text-sand-200">{variant.colorName}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default StyleBrowserOverlay
