import { useMemo } from 'react'
import { MOCK_SWATCHES } from '../../data/mockSwatches'
import { COLORWAYS, applyTemplate, findTemplate } from '../../data/patternTemplates'
import { ROOM_PHOTOS } from '../../data/roomPhotos'
import { createDefaultTileDesign } from '../../types/tileDesign'
import RugPhotoSlide from '../tileDesigner/RugPhotoSlide'
import type { RugArt } from '../tileDesigner/RugPhotoSlide'
import { renderTileFills } from '../tileDesigner/renderTiles'
import TemplatePreview from './TemplatePreview'

const SWATCHES_BY_ID = new Map(MOCK_SWATCHES.map((s) => [s.id, s]))
const RUNNER_ROOM = ROOM_PHOTOS.find((p) => p.category === 'runner') ?? ROOM_PHOTOS[0]
const TEMPLATE = findTemplate('kilim-stepped-diamond') ?? findTemplate('persian-medallion')
const COLORWAY = COLORWAYS.find((c) => c.id === 'atlas-clay') ?? COLORWAYS[0]

/** Design, place, weave: the three things the site does, each shown with the real tool output. */
function HowItWorks() {
  // A 3 x 9 ft runner (2 x 6 tiles) for the hallway photo.
  const runner = useMemo<RugArt | null>(() => {
    if (!TEMPLATE) return null
    const state = applyTemplate(createDefaultTileDesign(2, 6), TEMPLATE, COLORWAY, MOCK_SWATCHES)
    return { width: 2, height: 6, render: (prefix) => renderTileFills(state, SWATCHES_BY_ID, prefix) }
  }, [])

  return (
    <section id="how-it-works" className="scroll-mt-16 bg-paper px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-2xl font-display text-[clamp(2rem,3.6vw,3rem)] font-medium leading-tight tracking-[-0.015em] text-ink">
          From your screen to the loom
        </h2>

        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
          <li className="flex flex-col">
            <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-surface-2 p-6 ring-1 ring-line">
              {TEMPLATE && (
                <TemplatePreview
                  template={TEMPLATE}
                  colorway={COLORWAY}
                  widthTiles={6}
                  heightTiles={4}
                  className="h-full w-full rounded-sm shadow-[var(--shadow-soft)]"
                />
              )}
            </div>
            <span className="mt-5 font-display text-sm text-accent">01</span>
            <h3 className="mt-1 font-display text-xl font-medium text-ink">Design it</h3>
            <p className="mt-2 leading-relaxed text-muted">
              Choose how it&apos;s made, then draw on a knot chart, start from a classic style or a photo, and see it as real
              wool while you work.
            </p>
          </li>

          <li className="flex flex-col">
            <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-surface-2 ring-1 ring-line">
              {runner && (
                // The hallway photo is portrait (2:3); half the card's width fills its 4:3 height.
                <div className="mx-auto w-1/2">
                  <RugPhotoSlide photo={RUNNER_ROOM} rug={runner} />
                </div>
              )}
            </div>
            <span className="mt-5 font-display text-sm text-accent">02</span>
            <h3 className="mt-1 font-display text-xl font-medium text-ink">See it at home</h3>
            <p className="mt-2 leading-relaxed text-muted">
              Lay your rug into real rooms, in perspective and in the room&apos;s own light, then share the link or save
              the image.
            </p>
          </li>

          <li className="flex flex-col">
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[var(--radius-card)] bg-indigo p-8 ring-1 ring-line">
              <p className="font-display text-[clamp(1.6rem,2.6vw,2.2rem)] font-medium leading-snug text-paper">
                Knotted by hand in Bhadohi and Mirzapur.
              </p>
            </div>
            <span className="mt-5 font-display text-sm text-accent">03</span>
            <h3 className="mt-1 font-display text-xl font-medium text-ink">Hand it to a weaver</h3>
            <p className="mt-2 leading-relaxed text-muted">
              Download a knot chart with every row numbered and every yarn counted, or a tufting template or tile sheet, ready
              for the workshop floor.
            </p>
          </li>
        </ol>
      </div>
    </section>
  )
}

export default HowItWorks
