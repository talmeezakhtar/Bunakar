import type { CSSProperties } from 'react'
import { COLORWAYS, PATTERN_TEMPLATES, findColorway, hashAt } from '../../data/patternTemplates'
import TemplatePreview from './TemplatePreview'
import FreeformPreview from './FreeformPreview'

export type PatternFamily = 'blank' | 'template' | 'predesigned' | 'freeform'

type PatternThumbProps = {
  family: PatternFamily
  variant?: number
  className?: string
  style?: CSSProperties
  preserveAspectRatio?: string
}

function BlankGrid() {
  const cols = 7
  const rows = 5
  const lines = []
  for (let i = 1; i < cols; i++) {
    lines.push(
      <line key={`v${i}`} x1={(i * 100) / cols} y1="2" x2={(i * 100) / cols} y2="98" stroke="#3a4680" strokeWidth="1" />,
    )
  }
  for (let i = 1; i < rows; i++) {
    lines.push(
      <line key={`h${i}`} x1="2" y1={(i * 100) / rows} x2="98" y2={(i * 100) / rows} stroke="#3a4680" strokeWidth="1" />,
    )
  }
  return (
    <>
      <rect width="100" height="100" fill="#131a33" />
      {lines}
      <rect x="2" y="2" width="96" height="96" fill="none" stroke="#d9a441" strokeWidth="2" />
    </>
  )
}

const JEWEL_COLORS = ['#7a2436', '#d9a441', '#173a36', '#1c2444', '#8fa8d9', '#c1567a', '#3f9c82', '#e0916b']

function MosaicSwatch({ seed }: { seed: number }) {
  const n = 4
  const size = 100 / n
  const cells = []
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const cellIndex = row * n + col
      const c1 = JEWEL_COLORS[Math.floor(hashAt(seed, cellIndex * 3) * JEWEL_COLORS.length)]
      if (hashAt(seed, cellIndex * 3 + 1) > 0.45) {
        const c2 = JEWEL_COLORS[Math.floor(hashAt(seed, cellIndex * 3 + 2) * JEWEL_COLORS.length)]
        cells.push(
          <polygon
            key={`${row}-${col}-a`}
            points={`${col * size},${row * size} ${(col + 1) * size},${row * size} ${col * size},${(row + 1) * size}`}
            fill={c1}
          />,
        )
        cells.push(
          <polygon
            key={`${row}-${col}-b`}
            points={`${(col + 1) * size},${row * size} ${(col + 1) * size},${(row + 1) * size} ${col * size},${(row + 1) * size}`}
            fill={c2}
          />,
        )
      } else {
        cells.push(<rect key={`${row}-${col}`} x={col * size} y={row * size} width={size} height={size} fill={c1} />)
      }
    }
  }
  return <>{cells}</>
}

/** Templates shown when no specific one is chosen yet - one from each family of the library. */
const FEATURED_TEMPLATES = ['kilim-stepped-diamond', 'harlequin', 'deco-fan', 'houndstooth', 'pinwheel', 'beni-ourain-lattice'].map(
  (id) => PATTERN_TEMPLATES.find((t) => t.id === id)!,
)

function PatternThumb({ family, variant = 0, className, style, preserveAspectRatio }: PatternThumbProps) {
  if (family === 'freeform') {
    // One of each look, cycling through the generators.
    const looks = ['cobblestone', 'splash', 'mosaic', 'colorfield']
    return (
      <FreeformPreview
        generatorId={looks[variant % looks.length]}
        widthFt={4}
        heightFt={4}
        seed={variant + 3}
        className={className}
        style={style}
        preserveAspectRatio={preserveAspectRatio}
      />
    )
  }
  if (family === 'template') {
    const template = FEATURED_TEMPLATES[variant % FEATURED_TEMPLATES.length]
    return (
      <TemplatePreview
        template={template}
        colorway={findColorway(template.colorwayId) ?? COLORWAYS[0]}
        widthTiles={4}
        heightTiles={4}
        className={className}
        style={style}
        preserveAspectRatio={preserveAspectRatio}
      />
    )
  }
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio={preserveAspectRatio}
      className={className}
      style={style}
      role="img"
      aria-hidden="true"
    >
      {family === 'blank' && <BlankGrid />}
      {family === 'predesigned' && <MosaicSwatch seed={variant} />}
    </svg>
  )
}

export default PatternThumb
