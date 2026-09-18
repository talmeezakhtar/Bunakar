type SwatchProps = {
  className?: string
}

export function MedallionSwatch({ className }: SwatchProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} role="img" aria-hidden="true">
      <rect width="200" height="140" fill="#3a1220" />
      <rect x="6" y="6" width="188" height="128" fill="none" stroke="#d9a441" strokeWidth="2" />
      <rect x="14" y="14" width="172" height="112" fill="none" stroke="#d9a441" strokeWidth="1" strokeDasharray="4 3" />
      <g transform="translate(100 70)">
        <polygon points="0,-42 42,0 0,42 -42,0" fill="none" stroke="#f0c774" strokeWidth="2" />
        <polygon points="0,-26 26,0 0,26 -26,0" fill="#7a2436" stroke="#f0c774" strokeWidth="1.5" />
        <circle r="10" fill="#d9a441" />
        <circle r="4" fill="#f7efe0" />
      </g>
      <g fill="#d9a441">
        <circle cx="24" cy="24" r="3" />
        <circle cx="176" cy="24" r="3" />
        <circle cx="24" cy="116" r="3" />
        <circle cx="176" cy="116" r="3" />
      </g>
    </svg>
  )
}

export function GeometricSwatch({ className }: SwatchProps) {
  const tiles = []
  const size = 28
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const alt = (row + col) % 2 === 0
      tiles.push(
        <rect
          key={`${row}-${col}`}
          x={col * size}
          y={row * size}
          width={size}
          height={size}
          fill={alt ? '#173a36' : '#0e2624'}
        />,
      )
      tiles.push(
        <polygon
          key={`d-${row}-${col}`}
          points={`${col * size + size / 2},${row * size + 4} ${col * size + size - 4},${row * size + size / 2} ${col * size + size / 2},${row * size + size - 4} ${col * size + 4},${row * size + size / 2}`}
          fill={alt ? '#d9a441' : '#f0c774'}
          opacity={0.9}
        />,
      )
    }
  }
  return (
    <svg viewBox="0 0 224 140" className={className} role="img" aria-hidden="true">
      <rect width="224" height="140" fill="#0e2624" />
      <g>{tiles}</g>
    </svg>
  )
}

export function HeritageSwatch({ className }: SwatchProps) {
  const petals = Array.from({ length: 12 })
  return (
    <svg viewBox="0 0 320 240" className={className} role="img" aria-hidden="true">
      <rect width="320" height="240" fill="#1c2444" />
      <rect x="10" y="10" width="300" height="220" fill="none" stroke="#d9a441" strokeWidth="2" />
      <rect x="20" y="20" width="280" height="200" fill="none" stroke="#f0c774" strokeWidth="1" strokeDasharray="3 4" />
      <g transform="translate(160 120)">
        {petals.map((_, i) => (
          <polygon
            key={i}
            transform={`rotate(${(360 / petals.length) * i})`}
            points="0,-14 18,-58 0,-72 -18,-58"
            fill={i % 2 === 0 ? '#d9a441' : '#b8842a'}
            stroke="#7a2436"
            strokeWidth="1"
          />
        ))}
        <circle r="26" fill="#7a2436" stroke="#f0c774" strokeWidth="2" />
        <circle r="12" fill="#f0c774" />
      </g>
      <g fill="#d9a441">
        <circle cx="36" cy="36" r="3" />
        <circle cx="284" cy="36" r="3" />
        <circle cx="36" cy="204" r="3" />
        <circle cx="284" cy="204" r="3" />
      </g>
    </svg>
  )
}

export function TribalSwatch({ className }: SwatchProps) {
  const bands = ['#2c1810', '#7a3b1e', '#d9a441', '#2c1810', '#b8842a']
  return (
    <svg viewBox="0 0 200 140" className={className} role="img" aria-hidden="true">
      <rect width="200" height="140" fill="#2c1810" />
      {bands.map((color, i) => (
        <g key={i} transform={`translate(0 ${i * 24 + 6})`}>
          <polyline
            points="0,10 12,0 24,10 36,0 48,10 60,0 72,10 84,0 96,10 108,0 120,10 132,0 144,10 156,0 168,10 180,0 192,10 200,6"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  )
}
