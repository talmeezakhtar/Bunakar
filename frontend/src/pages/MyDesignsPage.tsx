import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, PencilSimple, Plus, TrashSimple } from '@phosphor-icons/react'
import type { Swatch } from '../types/swatch'
import { formatFeetInches, formatRugSize, recordToState } from '../types/tileDesign'
import { freeformRecordToState } from '../types/freeform'
import { freeformDesignsApi, rugDesignsApi, tileDesignsApi } from '../services/api'
import { recordToDoc } from '../studio/records'
import { CONSTRUCTIONS } from '../studio/model'
import { loadSwatchCatalog } from '../components/tileDesigner/tileDesignStorage'
// Saved designs can carry motifs: load the motif renderer with this page.
import '../components/tileDesigner/renderOverlays'
import type { RugSource } from '../three/rug/rugSource'
import RealisticRug from '../components/ui/RealisticRug'
import { useToast } from '../components/common/Toast'
import PageMeta from '../components/common/PageMeta'
import { useConfirm } from '../components/ui/ConfirmDialog'

/** One saved rug of either kind, ready to draw and link to. */
type SavedRug = {
  kind: 'studio' | 'tile' | 'freeform'
  /** What it is, for the card: the studio rug's construction, or which earlier designer made it. */
  label: string
  id: string
  name: string
  sizeLabel: string
  updatedAt?: string
  source: RugSource
}

type Status = 'loading' | 'ready' | 'error'

/** Every rug opens in the Studio; the earlier designers' rugs open converted (their originals stay). */
function editorUrl(rug: SavedRug) {
  return rug.kind === 'studio' ? `/studio?design=${rug.id}` : `/studio?from=${rug.kind}&design=${rug.id}`
}

function previewUrl(rug: SavedRug) {
  return `/designer/preview?${rug.kind === 'tile' ? '' : `kind=${rug.kind}&`}design=${rug.id}`
}

function formatDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

async function loadRugs(): Promise<SavedRug[]> {
  const [{ swatches }, tiles, freeforms, studio] = await Promise.all([
    loadSwatchCatalog(),
    tileDesignsApi.mine(),
    freeformDesignsApi.mine(),
    rugDesignsApi.mine(),
  ])
  const byId = new Map<string, Swatch>(swatches.map((s) => [s.id, s]))
  const docs = await Promise.all(studio.map((r) => recordToDoc(r).then((doc) => ({ r, doc }), () => null)))
  const rugs: SavedRug[] = [
    ...docs.flatMap((d) =>
      d
        ? [
            {
              kind: 'studio' as const,
              label: `${CONSTRUCTIONS.find((c) => c.id === d.doc.construction)?.name ?? 'Studio'} rug`,
              id: d.r.id,
              name: d.r.name,
              sizeLabel: `${formatFeetInches(d.doc.widthFt)} x ${formatFeetInches(d.doc.heightFt)}`,
              updatedAt: d.r.updatedAt,
              source: { kind: 'doc', doc: d.doc, swatchesById: byId } as RugSource,
            },
          ]
        : [],
    ),
    ...tiles.map((r) => {
      const state = recordToState(r)
      return {
        kind: 'tile' as const,
        label: 'Tile rug (earlier designer)',
        id: r.id,
        name: r.name,
        sizeLabel: formatRugSize(state.widthTiles, state.heightTiles),
        updatedAt: r.updatedAt,
        source: { kind: 'tile', state, swatchesById: byId } as RugSource,
      }
    }),
    ...freeforms.map((r) => {
      const state = freeformRecordToState(r)
      return {
        kind: 'freeform' as const,
        label: 'Freeform rug (earlier designer)',
        id: r.id,
        name: r.name,
        sizeLabel: `${formatFeetInches(state.widthFt)} x ${formatFeetInches(state.heightFt)}`,
        updatedAt: r.updatedAt,
        source: { kind: 'freeform', state, swatchesById: byId } as RugSource,
      }
    }),
  ]
  return rugs.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
}

function MyDesignsPage() {
  const { showToast } = useToast()
  const confirm = useConfirm()
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
    if (!(await confirm({ title: `Delete “${rug.name}”?`, body: "This can't be undone.", confirmLabel: 'Delete', tone: 'danger' }))) return
    try {
      await (rug.kind === 'studio' ? rugDesignsApi : rug.kind === 'freeform' ? freeformDesignsApi : tileDesignsApi).remove(rug.id)
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
    <div className="min-h-screen bg-paper px-4 pb-20 pt-24 sm:px-6">
      <PageMeta title="My designs" description="Every rug you've saved on Bunakar, in one place." noindex />
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl text-ink sm:text-3xl">My Designs</h1>
            <p className="mt-1 text-sm text-muted-2">Everything you&apos;ve saved, newest first.</p>
          </div>
          <Link
            to="/#create-design"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-semibold tracking-wide text-paper transition-colors hover:bg-accent-hover"
          >
            <Plus size={16} weight="bold" /> New rug
          </Link>
        </div>

        {status === 'loading' && (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading your designs">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="overflow-hidden rounded-xl border border-line bg-surface">
                <div className="aspect-[4/3] animate-pulse bg-surface-2" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-surface-2" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-surface-2" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {status === 'error' && (
          <div className="rounded-xl border border-line bg-surface px-6 py-12 text-center">
            <p className="text-ink-2">We couldn&apos;t load your designs.</p>
            <p className="mt-1 text-sm text-muted-2">Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => {
                setStatus('loading')
                setAttempt((n) => n + 1)
              }}
              className="mt-5 inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 text-sm font-medium text-ink-2 transition-colors hover:border-muted"
            >
              Try again
            </button>
          </div>
        )}

        {status === 'ready' && rugs.length === 0 && (
          <div className="rounded-xl border border-dashed border-line-strong px-6 py-16 text-center">
            <p className="font-display text-lg text-ink">No designs yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-2">
              Start from a pattern or a blank canvas. Every rug you save shows up here.
            </p>
            <Link
              to="/#create-design"
              className="mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-semibold text-paper transition-colors hover:bg-accent-hover"
            >
              Design your first rug
            </Link>
          </div>
        )}

        {status === 'ready' && rugs.length > 0 && (
          <ul className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rugs.map((rug) => (
              <li key={`${rug.kind}-${rug.id}`} className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
                <Link
                  to={editorUrl(rug)}
                  className="group relative block aspect-[4/3] overflow-hidden bg-surface-2"
                  aria-label={`Open ${rug.name}`}
                >
                  <RealisticRug
                    source={rug.source}
                    longPx={420}
                    alt={rug.name}
                    className="h-full w-full p-3 transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-paper/85 to-transparent px-4 pb-3 pt-8 text-xs font-medium text-ink opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                    Open full design
                  </span>
                </Link>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-ink" title={rug.name}>
                      {rug.name}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-muted-2">
                      {rug.label} &middot; {rug.sizeLabel}
                      {rug.updatedAt && <> &middot; {formatDate(rug.updatedAt)}</>}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center gap-1">
                    <Link
                      to={editorUrl(rug)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent/15 px-3 text-xs font-semibold text-accent-deep transition-colors hover:bg-accent hover:text-paper pointer-coarse:min-h-11"
                    >
                      <PencilSimple size={14} /> Open
                    </Link>
                    <Link
                      to={previewUrl(rug)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2 pointer-coarse:min-h-11"
                    >
                      <Eye size={14} /> See in a room
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(rug)}
                      aria-label={`Delete ${rug.name}`}
                      title="Delete"
                      className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-2 transition-colors hover:bg-accent-soft hover:text-danger pointer-coarse:h-11 pointer-coarse:w-11"
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
