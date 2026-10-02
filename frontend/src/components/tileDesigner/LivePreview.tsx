import { useId } from 'react'
import type { Swatch } from '../../types/swatch'
import type { CutType, Rotation } from '../../types/tileDesign'
import { CUT_TYPES } from '../../types/tileDesign'
import { cutPath, isPositionable, isRotatableStrip } from './cutShapes'
import { patternPrefix, swatchFill, tilePatternDefs } from './renderTiles'

type LivePreviewProps = {
  swatch: Swatch | null
  cutType: CutType
  rotation: Rotation
}

function LivePreview({ swatch, cutType, rotation }: LivePreviewProps) {
  const prefix = patternPrefix(useId())
  const cutLabel = CUT_TYPES.find((c) => c.id === cutType)?.label ?? cutType
  const positionable = isPositionable(cutType)
  const rotatableStrip = isRotatableStrip(cutType)
  // The <g> spin only makes sense for fixed-orientation cuts (full/half/diagonal/arc); slot
  // grids bake their orientation directly into the path via `rotation`, so never spin those.
  const spinRotation = positionable ? 0 : rotation
  const vertical = rotatableStrip && (rotation === 90 || rotation === 270)

  return (
    <section className="space-y-2 border-t border-night-700 pt-4">
      <h2 className="font-display text-sm tracking-wide text-sand-200">Live Preview</h2>
      <div className="flex items-center gap-3 rounded-lg border border-night-700 bg-night-900 p-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-night-600 bg-night-950">
          {swatch ? (
            <svg width="100%" height="100%" viewBox="0 0 1 1" aria-hidden="true">
              {tilePatternDefs([swatch], prefix)}
              <rect x={0} y={0} width={1} height={1} fill="#0b0f22" />
              <g transform={`rotate(${spinRotation} 0.5 0.5)`}>
                <path d={cutPath(cutType, { x: 0, y: 0 }, rotation)} fill={swatchFill(swatch, prefix)} />
              </g>
            </svg>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-sand-300/70">
              No style
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-medium text-sand-100">
            {swatch ? `${swatch.familyName} - ${swatch.colorName}` : 'Select a style'}
          </p>
          <p className="text-xs text-sand-300/70">
            {cutLabel}
            {rotatableStrip ? (vertical ? ' - vertical' : ' - horizontal') : ''}
            {!positionable && !rotatableStrip && rotation !== 0 ? ` - rotated ${rotation}°` : ''}
            {positionable ? ' - drag onto the grid to place' : ''}
          </p>
        </div>
      </div>
    </section>
  )
}

export default LivePreview
