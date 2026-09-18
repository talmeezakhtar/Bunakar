import { useMemo } from 'react'
import { useDesign } from '../../store/DesignContext'
import type { Color, Pattern } from '../../types/catalog'

const VIEWBOX = 400
const FT_TO_UNIT = 30

interface StageProps {
  colors: Color[]
  patterns: Pattern[]
}

function findColor(colors: Color[], id: string) {
  return colors.find((c) => c.id === id)
}

function findPattern(patterns: Pattern[], id: string) {
  return patterns.find((p) => p.id === id)
}

function PatternFill({ pattern, id, primary }: { pattern: Pattern | undefined; id: string; primary: string }) {
  if (!pattern) return null
  return (
    <pattern id={id} width={40} height={40} patternUnits="userSpaceOnUse">
      <path d={pattern.svgPath} fill={primary} />
    </pattern>
  )
}

// Renders whatever `Design` currently is — never mutates state itself.
function Stage({ colors, patterns }: StageProps) {
  const { design } = useDesign()

  const widthUnits = Math.min(design.widthFt * FT_TO_UNIT, VIEWBOX - 40)
  const heightUnits = Math.min(design.heightFt * FT_TO_UNIT, VIEWBOX - 40)
  const cx = VIEWBOX / 2
  const cy = VIEWBOX / 2

  const fieldColor = useMemo(() => findColor(colors, design.fieldColorId), [colors, design.fieldColorId])
  const fieldPattern = useMemo(() => findPattern(patterns, design.fieldPatternId), [patterns, design.fieldPatternId])
  const medallionColor = useMemo(
    () => (design.medallionColorId ? findColor(colors, design.medallionColorId) : undefined),
    [colors, design.medallionColorId],
  )

  const sortedBorders = useMemo(
    () => [...design.borders].sort((a, b) => a.order - b.order),
    [design.borders],
  )

  const isRound = design.shape === 'round'
  const shapeRadius = Math.min(widthUnits, heightUnits) / 2

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      className="h-full w-full max-w-xl rounded-lg bg-white shadow-sm"
      role="img"
      aria-label="Rug design preview"
    >
      <defs>
        <PatternFill pattern={fieldPattern} id="field-pattern" primary={fieldColor?.hex ?? '#d9cfba'} />
      </defs>

      {isRound ? (
        <circle cx={cx} cy={cy} r={shapeRadius} fill={fieldColor ? 'url(#field-pattern)' : '#eee'} />
      ) : (
        <rect
          x={cx - widthUnits / 2}
          y={cy - heightUnits / 2}
          width={widthUnits}
          height={heightUnits}
          fill={fieldColor ? 'url(#field-pattern)' : '#eee'}
        />
      )}

      {sortedBorders.map((border, i) => {
        const inset = i * (border.widthIn / 2)
        const color = findColor(colors, border.colorId)
        return isRound ? (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={shapeRadius - inset}
            fill="none"
            stroke={color?.hex ?? '#999'}
            strokeWidth={border.widthIn}
          />
        ) : (
          <rect
            key={i}
            x={cx - widthUnits / 2 + inset}
            y={cy - heightUnits / 2 + inset}
            width={widthUnits - inset * 2}
            height={heightUnits - inset * 2}
            fill="none"
            stroke={color?.hex ?? '#999'}
            strokeWidth={border.widthIn}
          />
        )
      })}

      {design.medallionEnabled && (
        <circle
          cx={cx}
          cy={cy}
          r={20 * (design.medallionScale ?? 1)}
          fill={medallionColor?.hex ?? '#b3382c'}
        />
      )}
    </svg>
  )
}

export default Stage
