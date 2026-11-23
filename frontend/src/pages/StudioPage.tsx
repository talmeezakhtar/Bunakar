import { useEffect, useState } from 'react'
import { isFibre } from '../data/materials'
import type { Fibre } from '../data/materials'
import { useSearchParams } from 'react-router-dom'
import PageMeta from '../components/common/PageMeta'
import StudioEditor from '../components/studio/StudioEditor'
import StudioSetup from '../components/studio/StudioSetup'
import WeavingLoader from '../components/ui/WeavingLoader'
import { loadSwatchCatalog } from '../components/tileDesigner/tileDesignStorage'
import { readDraft } from '../hooks/useDesignPersistence'
import { useAuth } from '../hooks/useAuth'
import { rugDesignsApi } from '../services/api'
import { draftToDoc } from '../studio/compress'
import type { DraftDoc } from '../studio/compress'
import type { Construction, RugDoc } from '../studio/model'
import { CONSTRUCTIONS } from '../studio/model'
import { recordToDoc } from '../studio/records'
import { freeformDesignsApi, tileDesignsApi } from '../services/api'
import { freeformToDoc, tileToDoc } from '../studio/convert'
import type { LegacyKind } from '../studio/legacy'
import { recordToState } from '../types/tileDesign'
import type { TileDesignState } from '../types/tileDesign'
import { freeformRecordToState } from '../types/freeform'
import type { FreeformDesignState } from '../types/freeform'
import { useToast } from '../components/common/Toast'
import type { Swatch } from '../types/swatch'

type Opened = { doc: RugDoc; restore: boolean }

/** A tile or freeform design from the earlier designers, opened as a studio rug. */
async function openLegacy(kind: LegacyKind, designId: string | null): Promise<{ doc: RugDoc; note: string } | null> {
  if (designId) {
    const doc = kind === 'tile' ? tileToDoc(recordToState(await tileDesignsApi.get(designId))) : freeformToDoc(freeformRecordToState(await freeformDesignsApi.get(designId)))
    return { doc, note: `“${doc.name}” is open in the Studio. Saving makes it a Studio rug; your original stays in My Designs.` }
  }
  // Unsaved work left in an earlier designer on this device.
  const draft = kind === 'tile' ? readDraft<TileDesignState>('tile') : readDraft<FreeformDesignState>('freeform')
  if (!draft) return null
  try {
    const doc = kind === 'tile' ? tileToDoc(draft.state as TileDesignState) : freeformToDoc(draft.state as FreeformDesignState)
    return { doc, note: 'We brought over the rug you were working on in the earlier designer.' }
  } catch {
    return null // a damaged draft: start fresh instead
  }
}

/**
 * Bunakar Studio: `?design=<id>` opens a saved rug; otherwise the rug from this device's draft;
 * otherwise (or with `?new=1`, and `&make=<construction>` to preselect one, `&fibre=<fibre>` to
 * start every yarn in that fibre) the setup step.
 * `?from=tile|freeform` (where the earlier designers' addresses lead) opens their saved designs
 * or drafts, converted.
 */
export default function StudioPage() {
  const [params, setParams] = useSearchParams()
  const legacy = params.get('from')
  const from: LegacyKind | null = legacy === 'tile' || legacy === 'freeform' ? legacy : null
  const designId = params.get('design')
  const fresh = params.get('new') === '1'
  const { user } = useAuth()
  const { showToast } = useToast()
  const [swatches, setSwatches] = useState<Swatch[] | null>(null)
  // This device's draft, read once: it's what a plain visit returns to.
  const [opened, setOpened] = useState<Opened | null>(() => {
    if (designId || fresh || from) return null
    const draft = readDraft<DraftDoc>('studio')
    if (!draft) return null
    try {
      return { doc: draftToDoc(draft.state), restore: true }
    } catch {
      return null // a damaged draft: start over
    }
  })
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let live = true
    loadSwatchCatalog().then(({ swatches }) => live && setSwatches(swatches))
    return () => {
      live = false
    }
  }, [])

  // An earlier designer's way in: convert once the catalogue (its colours) is here.
  useEffect(() => {
    if (!from || !swatches) return
    let live = true
    if (designId && !user) {
      setMissing(true)
      return
    }
    openLegacy(from, designId)
      .then((res) => {
        if (!live) return
        if (!res) return setParams({ new: '1' }, { replace: true })
        setOpened({ doc: res.doc, restore: false })
        if (res.note) showToast({ tone: 'info', message: res.note, durationMs: 9000 })
        // A reload returns to the studio's own draft, not to converting the original again.
        setParams({}, { replace: true })
      })
      .catch(() => live && setMissing(true))
    return () => {
      live = false
    }
    // Converts once per way in; the toast is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, designId, swatches, user])

  useEffect(() => {
    let live = true
    if (designId && !from) {
      const get = user ? rugDesignsApi.get(designId) : Promise.reject(new Error('signed out'))
      get
        .then(recordToDoc)
        .then((doc) => live && setOpened({ doc, restore: false }))
        .catch(() => live && setMissing(true))
    }
    return () => {
      live = false
    }
  }, [designId, user, from])

  const meta = <PageMeta title="Studio" description="Bunakar Studio: design any rug, knot by knot or freehand, and see it woven and in a room." canonicalPath="/studio" />

  if (!swatches || ((designId || from) && !opened && !missing))
    return (
      <div className="grid min-h-[80vh] place-items-center pt-16">
        {meta}
        <WeavingLoader label="Opening the studio" />
      </div>
    )

  if (missing)
    return (
      <div className="grid min-h-[80vh] place-items-center px-4 pt-16 text-center">
        {meta}
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">We couldn&apos;t open that rug</h1>
          <p className="mt-3 text-ink-2">It may have been deleted, or it belongs to another account. Sign in to open your own rugs.</p>
          <button type="button" onClick={() => setParams({ new: '1' })} className="mt-6 inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-semibold text-paper hover:bg-accent-hover">
            Start a new rug
          </button>
        </div>
      </div>
    )

  if (!opened)
    return (
      <>
        {meta}
        <StudioSetup
          swatchesById={new Map(swatches.map((s) => [s.id, s]))}
          initial={CONSTRUCTIONS.some((c) => c.id === params.get('make')) ? (params.get('make') as Construction) : undefined}
          fibre={isFibre(params.get('fibre')) ? (params.get('fibre') as Fibre) : undefined}
          onStart={(doc) => setOpened({ doc, restore: false })}
        />
      </>
    )

  return (
    <div className="pt-16">
      {meta}
      <StudioEditor key={opened.doc.id ?? 'new'} initial={opened.doc} swatches={swatches} canRestoreDraft={opened.restore} />
    </div>
  )
}
