import type { CSSProperties } from 'react'

export type PatternFamily = 'blank' | 'template' | 'predesigned'

type Palette = {
  base: string
  accent: string
  line: string
}

type PatternThumbProps = {
  family: PatternFamily
  variant?: number
  className?: string
  style?: CSSProperties
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

const TEMPLATE_PALETTE: Palette = { base: '#131a33', accent: '#d9a441', line: '#2a3462' }

function GridSwatch({ palette }: { palette: Palette }) {
  const lines = []
  for (let i = 1; i < 5; i++) {
    lines.push(<line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20} y2="100" stroke={palette.line} strokeWidth="2" />)
    lines.push(<line key={`h${i}`} x1="0" y1={i * 20} x2="100" y2={i * 20} stroke={palette.line} strokeWidth="2" />)
  }
  return (
    <>
      <rect width="100" height="100" fill={palette.base} />
      {lines}
    </>
  )
}

function CheckerFadeSwatch({ palette }: { palette: Palette }) {
  const cells = []
  const n = 4
  const gap = 3
  const size = 100 / n
  const bands = [0.18, 0.45, 0.72, 1]
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const band = Math.min(3, Math.floor(((row + col) / (2 * (n - 1))) * 4))
      cells.push(
        <rect
          key={`${row}-${col}`}
          x={col * size + gap / 2}
          y={row * size + gap / 2}
          width={size - gap}
          height={size - gap}
          fill={palette.accent}
          fillOpacity={bands[band]}
        />,
      )
    }
  }
  return (
    <>
      <rect width="100" height="100" fill={palette.base} />
      {cells}
    </>
  )
}

function CheckerSwatch({ palette }: { palette: Palette }) {
  const cells = []
  const n = 4
  const size = 100 / n
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const alt = (row + col) % 2 === 0
      cells.push(
        <rect key={`${row}-${col}`} x={col * size} y={row * size} width={size} height={size} fill={alt ? palette.base : palette.accent} />,
      )
    }
  }
  return <>{cells}</>
}

function ChevronSwatch({ palette }: { palette: Palette }) {
  const rows = 5
  return (
    <>
      <rect width="100" height="100" fill={palette.base} />
      {Array.from({ length: rows }).map((_, i) => (
        <polyline
          key={i}
          points="0,10 12,2 24,10 36,2 48,10 60,2 72,10 84,2 96,10 100,8"
          transform={`translate(0 ${i * 18 + 4})`}
          fill="none"
          stroke={i % 2 === 0 ? palette.accent : palette.line}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </>
  )
}

function LightCheckSwatch({ palette }: { palette: Palette }) {
  const cells = []
  const n = 8
  const size = 100 / n
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const alt = (row + col) % 2 === 0
      cells.push(
        <rect
          key={`${row}-${col}`}
          x={col * size}
          y={row * size}
          width={size}
          height={size}
          fill={alt ? palette.base : palette.line}
        />,
      )
    }
  }
  return <>{cells}</>
}

function PlaidSwatch({ palette }: { palette: Palette }) {
  const stripes = []
  for (let i = 0; i < 5; i++) {
    stripes.push(<rect key={`v${i}`} x={i * 22} y="0" width="8" height="100" fill={palette.accent} opacity="0.7" />)
    stripes.push(<rect key={`h${i}`} x="0" y={i * 22} width="100" height="8" fill={palette.accent} opacity="0.7" />)
  }
  return (
    <>
      <rect width="100" height="100" fill={palette.base} />
      {stripes}
    </>
  )
}

const TEMPLATE_VARIANTS = [GridSwatch, CheckerFadeSwatch, CheckerSwatch, ChevronSwatch, LightCheckSwatch, PlaidSwatch]

const JEWEL_COLORS = ['#7a2436', '#d9a441', '#173a36', '#1c2444', '#8fa8d9', '#c1567a', '#3f9c82', '#e0916b']

function hashAt(seed: number, index: number) {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453
  return x - Math.floor(x)
}

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

function PatternThumb({ family, variant = 0, className, style }: PatternThumbProps) {
  const TemplateVariant = TEMPLATE_VARIANTS[variant % TEMPLATE_VARIANTS.length]
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} role="img" aria-hidden="true">
      {family === 'blank' && <BlankGrid />}
      {family === 'template' && <TemplateVariant palette={TEMPLATE_PALETTE} />}
      {family === 'predesigned' && <MosaicSwatch seed={variant} />}
    </svg>
  )
}

export default PatternThumb
