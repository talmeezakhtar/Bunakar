import { Suspense, lazy, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight } from '@phosphor-icons/react'
import PageMeta from '../components/common/PageMeta'
import { ROUTES } from '../seo/routeMeta'
import { fabricMeta } from '../seo/fabricMeta'
import { ContentPage, Section } from '../components/content/ContentPage'
import FabricChip from '../components/ui/FabricChip'
import FibreFacts from '../components/ui/FibreFacts'
import FabricCloseUp from '../components/fabric/FabricCloseUp'
import { FIBRES, MATERIALS, isFibre } from '../data/materials'
import type { Fibre } from '../data/materials'
import { MOCK_SWATCHES } from '../data/mockSwatches'
import { canShow3D } from '../three/canShow3D'
import NotFoundPage from './NotFoundPage'

const FabricViewer3D = lazy(() => import('../three/fabric/FabricViewer3D'))

/** How each fibre is usually made up, and a colour it's often dyed in. */
const SHOWCASE: Record<Fibre, { hex: string; flat?: boolean; make: string; craft: string }> = {
  wool: { hex: '#b8573e', make: 'knotted', craft: 'Hand-knotted and hand-tufted rugs' },
  'wool-nz': { hex: '#2f5f68', make: 'knotted', craft: 'Fine hand-knotted and tufted rugs' },
  silk: { hex: '#7a2436', make: 'knotted', craft: 'Very fine hand-knotted rugs, and highlights in wool ones' },
  'bamboo-silk': { hex: '#7bbab0', make: 'tufted', craft: 'Hand-tufted rugs and shiny accents in wool' },
  cotton: { hex: '#1c2444', flat: true, make: 'flatweave', craft: 'Dhurries and kilims, and every rug’s warp and fringe' },
  jute: { hex: '#b8895a', flat: true, make: 'flatweave', craft: 'Flatweaves and braided rugs' },
}

/** Dyed colours to try a fibre in: the flat-dyed catalogue yarns. */
const COLOURS = MOCK_SWATCHES.filter((s) => !s.imageUrl && (s.familyId === 'tufted-wool' || s.familyId === 'solid'))

function FabricIndex() {
  return (
    <>
      <PageMeta {...ROUTES['/fabrics']} canonicalPath="/fabrics" />
      <ContentPage
        wide
        title="Fabrics"
        intro="Six fibres, each with its own shine, softness and wear. Open one to see it up close: move the lamp across it, brush the pile and lift a corner."
      >
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FIBRES.map((id) => {
            const m = MATERIALS[id]
            const show = SHOWCASE[id]
            return (
              <li key={id}>
                <Link to={`/fabrics/${id}`} className="group block overflow-hidden rounded-2xl border border-line bg-surface transition-shadow hover:shadow-[var(--shadow-soft)]">
                  <FabricChip hex={show.hex} fibre={id} flat={show.flat} px={480} knots={30} className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-[1.03]" />
                  <div className="space-y-2 p-4">
                    <h2 className="flex items-center justify-between font-display text-xl font-semibold text-ink">
                      {m.name}
                      <ArrowRight size={18} className="text-muted transition-transform group-hover:translate-x-0.5" />
                    </h2>
                    <FibreFacts fibre={id} />
                    <p className="text-[0.95rem] leading-relaxed text-ink-2">{m.facts.feel}.</p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
        <p className="mt-8 text-[0.875rem] text-muted">Shine, softness and durability are typical values for each fibre in hand-made rugs, not a measured spec.</p>
      </ContentPage>
    </>
  )
}

function FabricDetail({ id }: { id: Fibre }) {
  const m = MATERIALS[id]
  const show = SHOWCASE[id]
  const [hex, setHex] = useState(show.hex)
  const [lifted, setLifted] = useState(false)
  const [reset, setReset] = useState(0)
  const can3D = canShow3D()
  return (
    <>
      <PageMeta {...fabricMeta(id)} canonicalPath={`/fabrics/${id}`} />
      <ContentPage wide title={m.name} intro={m.description}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#1d1915]">
              {can3D ? (
                <Suspense fallback={<div className="h-full w-full animate-pulse" />}>
                  <FabricViewer3D hex={hex} fibre={id} flat={show.flat} lifted={lifted} resetKey={reset} />
                </Suspense>
              ) : (
                <FabricCloseUp hex={hex} fibre={id} flat={show.flat} />
              )}
            </div>
            <p className="mt-2 text-[0.875rem] text-muted">
              {can3D ? 'Move the pointer to move the lamp. Drag across the pile to brush it.' : 'Move the pointer to move the light.'}
            </p>
            {can3D && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setLifted((v) => !v)} aria-pressed={lifted} className="rounded-md border border-line-strong px-3 py-1.5 text-sm text-ink hover:bg-surface-2">
                  {lifted ? 'Lay it flat' : 'Lift the corner'}
                </button>
                <button type="button" onClick={() => setReset((n) => n + 1)} className="rounded-md border border-line-strong px-3 py-1.5 text-sm text-ink hover:bg-surface-2">
                  Smooth the pile
                </button>
              </div>
            )}
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm text-ink-2">Try it in a colour</legend>
              <div className="flex flex-wrap gap-1.5">
                {COLOURS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setHex(s.swatchColor)}
                    aria-label={s.colorName}
                    aria-pressed={hex === s.swatchColor}
                    title={s.colorName}
                    className={`h-9 w-9 overflow-hidden rounded-md ring-offset-2 ring-offset-paper ${hex === s.swatchColor ? 'ring-2 ring-ink' : 'ring-1 ring-black/10'}`}
                  >
                    <FabricChip hex={s.swatchColor} fibre={id} flat={show.flat} size={36} className="h-full w-full" />
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div>
            <FibreFacts fibre={id} className="text-[0.875rem]" />
            <Link
              to={`/studio?new=1&make=${show.make}&fibre=${id}`}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 font-medium text-paper transition-opacity hover:opacity-90"
            >
              Design a rug in {m.short.toLowerCase()} <ArrowRight size={18} weight="bold" />
            </Link>
            <div className="mt-8">
              <Section title="How it feels">
                <p>{m.facts.feel}.</p>
              </Section>
              <Section title="Where it’s used">
                <p>{show.craft}. Best in: {m.facts.rooms.join(', ').toLowerCase()}.</p>
              </Section>
              <Section title="Where it comes from">
                <p>{m.facts.origin}.</p>
              </Section>
              <Section title="Caring for it">
                <p>{m.facts.care}</p>
              </Section>
            </div>
          </div>
        </div>

        <nav aria-label="Other fabrics" className="mt-14 border-t border-line pt-8">
          <h2 className="mb-4 font-display text-xl font-semibold text-ink">Other fabrics</h2>
          <ul className="flex flex-wrap gap-3">
            {FIBRES.filter((f) => f !== id).map((f) => (
              <li key={f}>
                <Link to={`/fabrics/${f}`} className="inline-flex items-center gap-2 rounded-full border border-line-strong py-1 pl-1 pr-3 text-sm text-ink hover:bg-surface-2">
                  <FabricChip hex={SHOWCASE[f].hex} fibre={f} flat={SHOWCASE[f].flat} size={28} className="h-7 w-7 rounded-full" />
                  {MATERIALS[f].name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </ContentPage>
    </>
  )
}

/** `/fabrics`: every fibre; `/fabrics/:id`: one, up close. */
export default function FabricsPage() {
  const { id } = useParams()
  if (id === undefined) return <FabricIndex />
  if (!isFibre(id)) return <NotFoundPage />
  // Keyed so each fabric starts with its own colour and a smooth pile.
  return <FabricDetail key={id} id={id} />
}
