import { memo, useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, PencilSimple, Plus, TrashSimple } from '@phosphor-icons/react'
import type { Swatch } from '../types/swatch'
import { formatFeetInches, formatRugSize, recordToState } from '../types/tileDesign'
import { freeformRecordToState } from '../types/freeform'
import { freeformDesignsApi, tileDesignsApi } from '../services/api'
import { loadSwatchCatalog } from '../components/tileDesigner/tileDesignStorage'
import { patternPrefix, renderTileFills } from '../components/tileDesigner/renderTiles'
import { renderFreeform } from '../components/freeform/renderFreeform'
import type { RugArt } from '../components/tileDesigner/RugPhotoSlide'
import { useToast } from '../components/common/Toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

/** One saved rug of either kind, ready to draw and link to. */
type SavedRug = {
  kind: 'tile' | 'freeform'
  id: string
  name: string
  sizeLabel: string
  updatedAt?: string
  art: RugArt
}

type Status = 'loading' | 'ready' | 'error'

const KIND_LABEL: Record<SavedRug['kind'], string> = { tile: 'Tile rug', freeform: 'Freeform rug' }

function editorUrl(rug: SavedRug) {
  return `${rug.kind === 'freeform' ? '/freeform' : '/designer'}?design=${rug.id}`
}

function previewUrl(rug: SavedRug) {
  return `/designer/preview?${rug.kind === 'freeform' ? 'kind=freeform&' : ''}design=${rug.id}`
}

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

async function loadRugs(): Promise<SavedRug[]> {
  const [{ swatches }, tiles, freeforms] = await Promise.all([
    loadSwatchCatalog(),
    tileDesignsApi.mine(),
    freeformDesignsApi.mine(),
  ])
  const byId = new Map<string, Swatch>(swatches.map((s) => [s.id, s]))
  const rugs: SavedRug[] = [
    ...tiles.map((r) => {
      const state = recordToState(r)
      return {
        kind: 'tile' as const,
        id: r.id,
        name: r.name,
        sizeLabel: formatRugSize(state.widthTiles, state.heightTiles),
        updatedAt: r.updatedAt,
        art: { width: state.widthTiles, height: state.heightTiles, render: (p: string) => renderTileFills(state, byId, p) },
      }
    }),
    ...freeforms.map((r) => {
      const state = freeformRecordToState(r)
      return {
        kind: 'freeform' as const,
        id: r.id,
        name: r.name,
        sizeLabel: `${formatFeetInches(state.widthFt)} x ${formatFeetInches(state.heightFt)}`,
        updatedAt: r.updatedAt,
        art: { width: state.widthFt, height: state.heightFt, render: (p: string) => renderFreeform(state, byId, p) },
      }
    }),
  ]
  return rugs.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

/** A close-up of the rug, drawn by the designer's own renderer: it fills the frame and crops to the
 * centre ("slice"), so every card is the same shape and the full rug is one click away. */
const RugThumb = memo(function RugThumb({ art, label }: { art: RugArt; label: string }) {
  const prefix = patternPrefix(useId())
  return (
    <svg
      viewBox={`0 0 ${art.width} ${art.height}`}
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      role="img"
      aria-label={label}
    >
      <rect width={art.width} height={art.height} className="fill-night-700" />
      {art.render(prefix)}
    </svg>
  )
})

function MyDesignsPage() {
  useDocumentTitle('My designs')
  const { showToast } = useToast()
  const [rugs, setRugs] = useState<SavedRug[]>([])
  const [status, setStatus] = useState<Status>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    loadRugs()
      .then((loaded) => {
        if (cancelled) return
        setRugs(loaded)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  async function handleDelete(rug: SavedRug) {
    if (!window.confirm(`Delete "${rug.name}"? This can't be undone.`)) return
    try {
      await (rug.kind === 'freeform' ? freeformDesignsApi : tileDesignsApi).remove(rug.id)
    } catch (err) {
      showToast({
        tone: 'error',
        message: err instanceof Error ? `Couldn't delete this rug. ${err.message}` : "Couldn't delete this rug.",
      })
      return
    }
    setRugs((prev) => prev.filter((r) => r.id !== rug.id))
    showToast({ tone: 'success', message: `"${rug.name}" deleted.`, durationMs: 2500 })
  }

  return (
    <div className="min-h-screen bg-night-950 px-4 pb-20 pt-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl tracking-wide text-sand-100 sm:text-3xl">My Designs</h1>
            <p className="mt-1 text-sm text-sand-300/70">Everything you&apos;ve saved, newest first.</p>
          </div>
          <Link
            to="/#create-design"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-gold-500 px-5 text-sm font-semibold tracking-wide text-night-950 transition-colors hover:bg-gold-400"
          >
            <Plus size={16} weight="bold" /> New rug
          </Link>
        </div>

        {status === 'loading' && (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading your designs">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="overflow-hidden rounded-xl border border-night-700 bg-night-900">
                <div className="aspect-[4/3] animate-pulse bg-night-800" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-night-800" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-night-800" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {status === 'error' && (
          <div className="rounded-xl border border-night-700 bg-night-900 px-6 py-12 text-center">
            <p className="text-sand-200">We couldn&apos;t load your designs.</p>
            <p className="mt-1 text-sm text-sand-300/70">Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => {
                setStatus('loading')
                setAttempt((n) => n + 1)
              }}
              className="mt-5 inline-flex min-h-11 items-center rounded-full border border-night-600 px-5 text-sm font-medium text-sand-200 transition-colors hover:border-sand-300"
            >
              Try again
            </button>
          </div>
        )}

        {status === 'ready' && rugs.length === 0 && (
          <div className="rounded-xl border border-dashed border-night-600 px-6 py-16 text-center">
            <p className="font-display text-lg tracking-wide text-sand-100">No designs yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-sand-300/70">
              Start from a pattern or a blank canvas. Every rug you save shows up here.
            </p>
            <Link
              to="/#create-design"
              className="mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-gold-500 px-5 text-sm font-semibold text-night-950 transition-colors hover:bg-gold-400"
            >
              Design your first rug
            </Link>
          </div>
        )}

        {status === 'ready' && rugs.length > 0 && (
          <ul className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rugs.map((rug) => (
              <li key={`${rug.kind}-${rug.id}`} className="flex flex-col overflow-hidden rounded-xl border border-night-700 bg-night-900">
                <Link
                  to={editorUrl(rug)}
                  className="group relative block aspect-[4/3] overflow-hidden bg-night-950"
                  aria-label={`Open ${rug.name}`}
                >
                  <RugThumb art={rug.art} label={rug.name} />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-night-950/85 to-transparent px-4 pb-3 pt-8 text-xs font-medium text-sand-100 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                    Open full design
                  </span>
                </Link>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-sand-100" title={rug.name}>
                      {rug.name}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-sand-300/70">
                      {KIND_LABEL[rug.kind]} &middot; {rug.sizeLabel}
                      {rug.updatedAt && <> &middot; {formatDate(rug.updatedAt)}</>}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center gap-1">
                    <Link
                      to={editorUrl(rug)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-gold-500/15 px-3 text-xs font-semibold text-gold-300 transition-colors hover:bg-gold-500 hover:text-night-950 pointer-coarse:min-h-11"
                    >
                      <PencilSimple size={14} /> Open
                    </Link>
                    <Link
                      to={previewUrl(rug)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-sand-200 transition-colors hover:bg-night-800 pointer-coarse:min-h-11"
                    >
                      <Eye size={14} /> See in a room
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(rug)}
                      aria-label={`Delete ${rug.name}`}
                      title="Delete"
                      className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-sand-300/70 transition-colors hover:bg-red-500/15 hover:text-red-300 pointer-coarse:h-11 pointer-coarse:w-11"
                    >
                      <TrashSimple size={16} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default MyDesignsPage
