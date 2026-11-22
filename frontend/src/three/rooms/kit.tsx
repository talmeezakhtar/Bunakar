import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import { CanvasTexture, LatheGeometry, RepeatWrapping, SRGBColorSpace, Vector2 } from 'three'

/**
 * A kit for cut-away rooms (a dollhouse view, no ceiling): a floor slab with a visible edge, two
 * walls (back and left) with skirting, and simple, well-proportioned furniture. Everything is in
 * metres, floor top at y = 0, room centred on the origin, the open sides facing +x and +z.
 */

export type FloorKind = 'oak' | 'herringbone' | 'walnut' | 'marble' | 'concrete' | 'terrazzo'

const FLOOR_BASE: Record<FloorKind, string> = {
  oak: '#c89c6d',
  herringbone: '#b98a5e',
  walnut: '#7a5236',
  marble: '#ece7df',
  concrete: '#c9c5bf',
  terrazzo: '#e6dfd5',
}

/** Floor textures drawn on a canvas once per kind (planks, herringbone, veined marble...). */
const floorCache = new Map<FloorKind, CanvasTexture>()
function floorTexture(kind: FloorKind): CanvasTexture {
  const hit = floorCache.get(kind)
  if (hit) return hit
  const size = 512
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  g.fillStyle = FLOOR_BASE[kind]
  g.fillRect(0, 0, size, size)
  let rnd = 7
  const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647)
  const shade = (base: string, amt: number) => {
    const n = parseInt(base.slice(1), 16)
    const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + amt))))
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`
  }
  if (kind === 'oak' || kind === 'walnut') {
    const rows = 8
    for (let r = 0; r < rows; r++) {
      let x = -rand() * 200
      while (x < size) {
        const len = 160 + rand() * 180
        g.fillStyle = shade(FLOOR_BASE[kind], (rand() - 0.5) * 0.16)
        g.fillRect(x, (r * size) / rows, len, size / rows)
        g.strokeStyle = 'rgba(0,0,0,0.18)'
        g.strokeRect(x, (r * size) / rows, len, size / rows)
        x += len
      }
    }
  } else if (kind === 'herringbone') {
    const w = 32
    const l = 128
    for (let y = -l; y < size + l; y += w * 2) {
      for (let x = -l; x < size + l; x += l) {
        for (const flip of [0, 1]) {
          g.save()
          g.translate(x + (flip ? l / 2 : 0), y + (flip ? w : 0))
          g.rotate(flip ? -Math.PI / 4 : Math.PI / 4)
          g.fillStyle = shade(FLOOR_BASE[kind], (rand() - 0.5) * 0.18)
          g.fillRect(0, 0, l * 0.7, w * 0.7)
          g.strokeStyle = 'rgba(0,0,0,0.16)'
          g.strokeRect(0, 0, l * 0.7, w * 0.7)
          g.restore()
        }
      }
    }
  } else if (kind === 'marble' || kind === 'terrazzo') {
    // Large slabs with faint veins (marble) or flecks (terrazzo).
    g.strokeStyle = 'rgba(0,0,0,0.08)'
    for (let i = 0; i <= 2; i++) {
      g.beginPath()
      g.moveTo((i * size) / 2, 0)
      g.lineTo((i * size) / 2, size)
      g.moveTo(0, (i * size) / 2)
      g.lineTo(size, (i * size) / 2)
      g.stroke()
    }
    if (kind === 'marble') {
      for (let v = 0; v < 14; v++) {
        g.strokeStyle = `rgba(120,110,100,${0.05 + rand() * 0.08})`
        g.lineWidth = 0.6 + rand() * 1.6
        g.beginPath()
        let x = rand() * size
        let y = rand() * size
        g.moveTo(x, y)
        for (let k = 0; k < 8; k++) {
          x += (rand() - 0.3) * 90
          y += (rand() - 0.5) * 60
          g.lineTo(x, y)
        }
        g.stroke()
      }
    } else {
      for (let k = 0; k < 900; k++) {
        g.fillStyle = ['#b9a38a', '#8e8e8a', '#d6c2a4', '#a46d4f'][k % 4]
        g.fillRect(rand() * size, rand() * size, 2 + rand() * 4, 2 + rand() * 3)
      }
    }
  } else {
    // Concrete: soft mottling.
    for (let k = 0; k < 2500; k++) {
      g.fillStyle = `rgba(0,0,0,${rand() * 0.04})`
      g.fillRect(rand() * size, rand() * size, 4 + rand() * 18, 4 + rand() * 18)
    }
  }
  const tex = new CanvasTexture(c)
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  floorCache.set(kind, tex)
  return tex
}

/** The room box: floor slab with an edge, back and left walls with skirting, open on +x / +z. */
export function Shell({
  w,
  d,
  h = 2.6,
  floor,
  wall = '#efe9df',
  accentWall,
  children,
}: {
  w: number
  d: number
  h?: number
  floor: FloorKind
  wall?: string
  /** Paint for the back wall only. */
  accentWall?: string
  children?: ReactNode
}) {
  const tex = useMemo(() => {
    const t = floorTexture(floor).clone()
    // Planks about 1.6 m of texture per tile.
    t.repeat.set(w / 1.6, d / 1.6)
    t.needsUpdate = true
    return t
  }, [floor, w, d])
  const T = 0.12
  return (
    <group>
      {/* Slab: the floor surface and a visible plinth edge, like a cut-away model. */}
      {/* The textured floor sits a hair above the slab's top, or the slab hides it. */}
      <mesh position={[0, 0.002, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={tex} roughness={floor === 'marble' ? 0.25 : 0.7} />
      </mesh>
      <mesh position={[0, -0.091, 0]} receiveShadow castShadow>
        <boxGeometry args={[w + T, 0.18, d + T]} />
        <meshStandardMaterial color="#e4ddd2" roughness={0.9} />
      </mesh>
      {/* Back wall (z = -d/2) and left wall (x = -w/2). */}
      <mesh position={[-T / 2, h / 2, -d / 2 - T / 2]} receiveShadow castShadow>
        <boxGeometry args={[w + T, h, T]} />
        <meshStandardMaterial color={accentWall ?? wall} roughness={0.92} />
      </mesh>
      <mesh position={[-w / 2 - T / 2, h / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[T, h, d]} />
        <meshStandardMaterial color={wall} roughness={0.92} />
      </mesh>
      {/* Skirting. */}
      <mesh position={[0, 0.05, -d / 2 + 0.005]}>
        <boxGeometry args={[w, 0.1, 0.02]} />
        <meshStandardMaterial color="#f7f3ec" roughness={0.6} />
      </mesh>
      <mesh position={[-w / 2 + 0.005, 0.05, 0]}>
        <boxGeometry args={[0.02, 0.1, d]} />
        <meshStandardMaterial color="#f7f3ec" roughness={0.6} />
      </mesh>
      {children}
    </group>
  )
}

type P = { position?: [number, number, number]; rotationY?: number }

function Box({ p, s, color, rough = 0.8, metal = 0 }: { p: [number, number, number]; s: [number, number, number]; color: string; rough?: number; metal?: number }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
    </mesh>
  )
}

/** Upholstery: a box with softly rounded edges. */
function Soft({ p, s, color, r = 0.06, rot }: { p: [number, number, number]; s: [number, number, number]; color: string; r?: number; rot?: [number, number, number] }) {
  return (
    <RoundedBox args={s} radius={Math.min(r, ...s.map((v) => v / 2 - 0.001))} smoothness={4} position={p} rotation={rot} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.97} />
    </RoundedBox>
  )
}

function Legs({ w, d, h, color = '#3a2a1f', r = 0.02 }: { w: number; d: number; h: number; color?: string; r?: number }) {
  return (
    <>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[(sx * w) / 2, h / 2, (sz * d) / 2]} castShadow>
            <cylinderGeometry args={[r, r * 0.8, h, 8]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        )),
      )}
    </>
  )
}

/** A three-seat sofa, back towards -z: rounded cushions, scatter cushions and a throw. */
export function Sofa({ position, rotationY = 0, color = '#8a9384', width = 2.1, throwColor = '#e9dcc6' }: P & { color?: string; width?: number; throwColor?: string }) {
  const seatW = (width - 0.36) / 3
  return (
    <group position={position} rotation-y={rotationY}>
      <Soft p={[0, 0.23, 0]} s={[width, 0.22, 0.9]} color={color} r={0.05} />
      <Soft p={[0, 0.62, -0.34]} s={[width - 0.04, 0.52, 0.22]} color={color} r={0.09} />
      {[-1, 1].map((sx) => (
        <Soft key={sx} p={[sx * (width / 2 - 0.09), 0.46, 0]} s={[0.18, 0.36, 0.9]} color={color} r={0.07} />
      ))}
      {[-1, 0, 1].map((k) => (
        <Soft key={k} p={[k * (seatW + 0.004), 0.41, 0.05]} s={[seatW, 0.14, 0.72]} color={color} r={0.06} />
      ))}
      <Soft p={[-width / 2 + 0.45, 0.62, -0.17]} s={[0.42, 0.38, 0.13]} color="#e9dcc6" r={0.08} rot={[-0.2, 0.15, 0]} />
      <Soft p={[width / 2 - 0.45, 0.62, -0.17]} s={[0.42, 0.38, 0.13]} color="#c9774f" r={0.08} rot={[-0.2, -0.15, 0]} />
      <Soft p={[width / 2 - 0.5, 0.6, -0.14]} s={[0.34, 0.3, 0.12]} color="#2f3a72" r={0.07} rot={[-0.25, -0.35, 0.05]} />
      {/* A throw folded over the arm. */}
      <Soft p={[width / 2 - 0.09, 0.66, 0.05]} s={[0.24, 0.03, 0.5]} color={throwColor} r={0.012} />
      <Soft p={[width / 2 + 0.02, 0.5, 0.05]} s={[0.03, 0.32, 0.5]} color={throwColor} r={0.012} />
      <Legs w={width - 0.2} d={0.7} h={0.12} />
    </group>
  )
}

export function Armchair({ position, rotationY = 0, color = '#c9a27a' }: P & { color?: string }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <Soft p={[0, 0.3, 0.02]} s={[0.78, 0.2, 0.75]} color={color} r={0.05} />
      <Soft p={[0, 0.43, 0.06]} s={[0.56, 0.1, 0.6]} color={color} r={0.04} />
      <Soft p={[0, 0.66, -0.31]} s={[0.78, 0.56, 0.16]} color={color} r={0.07} />
      {[-1, 1].map((sx) => (
        <Soft key={sx} p={[sx * 0.33, 0.48, 0.02]} s={[0.13, 0.22, 0.75]} color={color} r={0.05} />
      ))}
      <Soft p={[0, 0.62, -0.18]} s={[0.36, 0.28, 0.1]} color="#efe4cf" r={0.06} rot={[-0.2, 0, 0]} />
      <Legs w={0.62} d={0.6} h={0.2} />
    </group>
  )
}

export function CoffeeTable({ position, round = false }: P & { round?: boolean }) {
  return (
    <group position={position}>
      {round ? (
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.45, 0.45, 0.05, 40]} />
          <meshStandardMaterial color="#6b4a33" roughness={0.45} />
        </mesh>
      ) : (
        <Box p={[0, 0.38, 0]} s={[1.1, 0.05, 0.6]} color="#6b4a33" rough={0.45} />
      )}
      <Legs w={round ? 0.5 : 0.95} d={round ? 0.5 : 0.45} h={0.36} />
      <mesh position={[0.15, 0.47, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 0.14, 16]} />
        <meshStandardMaterial color="#e8e2d6" roughness={0.4} />
      </mesh>
      <Box p={[-0.18, 0.42, 0.05]} s={[0.26, 0.04, 0.2]} color="#2f3a72" rough={0.9} />
    </group>
  )
}

export function SideTable({ position }: P) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.03, 28]} />
        <meshStandardMaterial color="#b8913f" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.5, 10]} />
        <meshStandardMaterial color="#b8913f" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  )
}

export function FloorLamp({ position }: P) {
  const shade = useMemo(() => new LatheGeometry([[0.12, 0], [0.22, 0], [0.13, 0.25], [0.1, 0.25]].map(([a, b]) => new Vector2(a, b)), 24), [])
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.04, 24]} />
        <meshStandardMaterial color="#2a2420" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 1.5, 6]} />
        <meshStandardMaterial color="#2a2420" />
      </mesh>
      <mesh geometry={shade} position={[0, 1.45, 0]} castShadow>
        <meshStandardMaterial color="#f3ead9" emissive="#ffe2b4" emissiveIntensity={0.6} side={2} roughness={0.9} />
      </mesh>
    </group>
  )
}

export function Plant({ position, scale = 1 }: P & { scale?: number }) {
  const leaves = useMemo(() => Array.from({ length: 11 }, (_, i) => (i / 11) * Math.PI * 2), [])
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.44, 20]} />
        <meshStandardMaterial color="#e8e2d6" roughness={0.6} />
      </mesh>
      {leaves.map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.08, 0.75 + (i % 3) * 0.12, Math.sin(a) * 0.08]} rotation={[Math.sin(a) * 0.55, a, Math.cos(a) * 0.55]} castShadow>
          <coneGeometry args={[0.09, 0.75, 4]} />
          <meshStandardMaterial color={i % 2 ? '#456b3f' : '#5a8250'} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/** A framed picture hung on the back wall (z = wall face). */
export function Art({ position, w = 0.9, h = 0.65, colors = ['#c98b5e', '#2f3a72', '#e2c79a'] }: P & { w?: number; h?: number; colors?: string[] }) {
  return (
    <group position={position}>
      <Box p={[0, 0, 0]} s={[w + 0.06, h + 0.06, 0.03]} color="#2a2420" rough={0.5} />
      <Box p={[0, 0, 0.017]} s={[w, h, 0.005]} color="#f6f1e7" rough={1} />
      {colors.map((c, i) => (
        <mesh key={c} position={[(i - 1) * w * 0.22, (i % 2 ? -1 : 1) * h * 0.08, 0.022]}>
          <circleGeometry args={[h * (0.22 - i * 0.04), 32]} />
          <meshStandardMaterial color={c} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

/** A window opening on the left wall, facing +x: frame, glass and light falling in. */
export function Window({ position, w = 1.4, h = 1.5 }: P & { w?: number; h?: number }) {
  return (
    <group position={position}>
      <Box p={[0, 0, 0]} s={[0.05, h + 0.08, w + 0.08]} color="#f7f3ec" rough={0.6} />
      <mesh position={[0.03, 0, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#dfeaf2" emissive="#eef6ff" emissiveIntensity={0.6} roughness={0.1} />
      </mesh>
      <Box p={[0.04, 0, 0]} s={[0.02, h, 0.03]} color="#f7f3ec" rough={0.6} />
      <Box p={[0.04, 0, 0]} s={[0.02, 0.03, w]} color="#f7f3ec" rough={0.6} />
    </group>
  )
}

export function Bed({ position, width = 1.6, length = 2.05 }: P & { width?: number; length?: number }) {
  return (
    <group position={position}>
      <Box p={[0, 0.2, 0]} s={[width + 0.08, 0.22, length]} color="#b59775" rough={0.8} />
      <Soft p={[0, 0.42, 0.02]} s={[width, 0.22, length - 0.06]} color="#f4f0e8" r={0.06} />
      <Soft p={[0, 0.555, 0.28]} s={[width + 0.06, 0.07, length * 0.66]} color="#efe7da" r={0.03} />
      <Soft p={[0, 0.6, length * 0.36]} s={[width + 0.08, 0.05, length * 0.26]} color="#c97d5d" r={0.02} />
      <Soft p={[0, 0.82, -length / 2 - 0.03]} s={[width + 0.16, 1.1, 0.1]} color="#7e8c76" r={0.05} />
      <Soft p={[0, 0.7, -length / 2 + 0.42]} s={[width * 0.5, 0.26, 0.12]} color="#d9a13b" r={0.06} rot={[-0.3, 0, 0]} />
      {[-1, 1].map((sx) => (
        <Soft key={sx} p={[sx * width * 0.25, 0.62, -length / 2 + 0.25]} s={[width * 0.42, 0.16, 0.38]} color="#ffffff" r={0.07} rot={[-0.35, 0, 0]} />
      ))}
      <Legs w={width} d={length - 0.1} h={0.1} />
    </group>
  )
}

export function Nightstand({ position }: P) {
  return (
    <group position={position}>
      <Box p={[0, 0.27, 0]} s={[0.48, 0.5, 0.4]} color="#6b4a33" rough={0.5} />
      <mesh position={[0, 0.66, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.26, 16]} />
        <meshStandardMaterial color="#d8c6a8" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.88, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.15, 0.18, 20, 1, true]} />
        <meshStandardMaterial color="#f3ead9" emissive="#ffe2b4" emissiveIntensity={0.5} side={2} />
      </mesh>
    </group>
  )
}

export function Bench({ position, rotationY = 0, width = 1.2 }: P & { width?: number }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <Soft p={[0, 0.43, 0]} s={[width, 0.1, 0.42]} color="#d6b98f" r={0.04} />
      <Legs w={width - 0.1} d={0.3} h={0.4} />
    </group>
  )
}

export function DiningSet({ position, length = 1.8, seats = 6 }: P & { length?: number; seats?: number }) {
  const perSide = Math.max(1, Math.floor(seats / 2) - 0)
  return (
    <group position={position}>
      <Box p={[0, 0.74, 0]} s={[length, 0.05, 0.92]} color="#7a5236" rough={0.45} />
      <Legs w={length - 0.12} d={0.78} h={0.72} color="#5a3b28" r={0.03} />
      {Array.from({ length: perSide }, (_, i) => {
        const x = -length / 2 + ((i + 0.5) * length) / perSide
        return [-1, 1].map((side) => (
          <group key={`${i}${side}`} position={[x, 0, side * 0.68]} rotation-y={side < 0 ? 0 : Math.PI}>
            <Box p={[0, 0.45, 0]} s={[0.44, 0.05, 0.44]} color="#c9a27a" rough={0.8} />
            <Box p={[0, 0.72, -0.2]} s={[0.44, 0.5, 0.04]} color="#c9a27a" rough={0.8} />
            <Legs w={0.38} d={0.38} h={0.44} />
          </group>
        ))
      })}
      <mesh position={[0, 0.83, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.05, 0.16, 16]} />
        <meshStandardMaterial color="#e8e2d6" roughness={0.4} />
      </mesh>
    </group>
  )
}

export function Pendant({ position, color = '#2a2420' }: P & { color?: string }) {
  const shade = useMemo(() => new LatheGeometry([[0.001, 0.22], [0.08, 0.22], [0.3, 0], [0.31, 0]].map(([a, b]) => new Vector2(a, b)), 32), [])
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.005, 0.005, 1.2, 4]} />
        <meshStandardMaterial color="#2a2420" />
      </mesh>
      <mesh geometry={shade} castShadow>
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} side={2} />
      </mesh>
      <pointLight position={[0, -0.05, 0]} intensity={1.2} distance={3} color="#ffe2b4" />
    </group>
  )
}

/** A console table against the back wall. */
export function Console({ position, width = 1.4 }: P & { width?: number }) {
  return (
    <group position={position}>
      <Box p={[0, 0.8, 0]} s={[width, 0.04, 0.38]} color="#6b4a33" rough={0.45} />
      <Box p={[0, 0.2, 0]} s={[width - 0.1, 0.03, 0.32]} color="#6b4a33" rough={0.45} />
      <Legs w={width - 0.08} d={0.3} h={0.8} color="#2a2420" r={0.015} />
      <mesh position={[width * 0.3, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.26, 16]} />
        <meshStandardMaterial color="#c9774f" roughness={0.7} />
      </mesh>
      <Box p={[-width * 0.25, 0.86, 0]} s={[0.3, 0.08, 0.22]} color="#2f3a72" rough={0.9} />
    </group>
  )
}

/** A panelled door set into the back wall. */
export function Door({ position }: P) {
  return (
    <group position={position}>
      <Box p={[0, 1.05, 0]} s={[0.96, 2.1, 0.04]} color="#f7f3ec" rough={0.6} />
      <Box p={[0, 1.05, 0.025]} s={[0.84, 2.0, 0.02]} color="#e9e2d6" rough={0.7} />
      <mesh position={[0.32, 1.02, 0.05]}>
        <sphereGeometry args={[0.03, 12, 10]} />
        <meshStandardMaterial color="#b8913f" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

export function Desk({ position, rotationY = 0 }: P) {
  return (
    <group position={position} rotation-y={rotationY}>
      <Box p={[0, 0.74, 0]} s={[1.5, 0.04, 0.72]} color="#d6c3a5" rough={0.5} />
      <Legs w={1.38} d={0.6} h={0.72} color="#2a2420" r={0.02} />
      <Box p={[0.1, 1.0, -0.2]} s={[0.6, 0.38, 0.03]} color="#1c1c1c" rough={0.3} />
      <Box p={[0.1, 0.8, -0.2]} s={[0.05, 0.12, 0.05]} color="#2a2420" rough={0.5} />
      <Box p={[-0.45, 0.78, 0.05]} s={[0.3, 0.04, 0.22]} color="#c9774f" rough={0.9} />
      {/* Chair */}
      <group position={[0, 0, 0.62]} rotation-y={Math.PI}>
        <Box p={[0, 0.48, 0]} s={[0.5, 0.07, 0.48]} color="#2a2420" rough={0.6} />
        <Box p={[0, 0.82, -0.22]} s={[0.48, 0.6, 0.05]} color="#2a2420" rough={0.6} />
        <mesh position={[0, 0.24, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.46, 8]} />
          <meshStandardMaterial color="#8a8a8a" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  )
}

export function Bookshelf({ position, width = 1.2 }: P & { width?: number }) {
  const books = useMemo(() => {
    // A fixed pseudo-random spread, so every shelf looks lived in but renders the same each time.
    const hash = (n: number) => (((Math.sin(n * 127.1) * 43758.5453) % 1) + 1) % 1
    return Array.from({ length: 4 }, (_, row) =>
      Array.from({ length: 9 }, (_, i) => {
        const k = row * 9 + i
        return { x: -width / 2 + 0.1 + i * ((width - 0.2) / 9), h: 0.2 + hash(k) * 0.1, c: ['#a8352b', '#2f3a72', '#d9a13b', '#5f7a45', '#e8e2d6'][Math.floor(hash(k + 50) * 5)], row }
      }),
    ).flat()
  }, [width])
  return (
    <group position={position}>
      <Box p={[0, 0.95, 0]} s={[width, 1.9, 0.34]} color="#f4efe6" rough={0.7} />
      {books.map((b, i) => (
        <Box key={i} p={[b.x, 0.25 + b.row * 0.45 + b.h / 2, 0.06]} s={[0.07, b.h, 0.22]} color={b.c} rough={0.9} />
      ))}
    </group>
  )
}

/** Wall-mounted shelf with a few objects, for the back wall of a hallway. */
export function CoatRail({ position }: P) {
  return (
    <group position={position}>
      <Box p={[0, 0, 0]} s={[0.9, 0.06, 0.04]} color="#6b4a33" rough={0.5} />
      {[-0.3, 0, 0.3].map((x, i) => (
        <group key={x}>
          <mesh position={[x, -0.05, 0.05]}>
            <sphereGeometry args={[0.025, 10, 8]} />
            <meshStandardMaterial color="#b8913f" metalness={0.8} roughness={0.3} />
          </mesh>
          {i !== 1 && <Box p={[x, -0.45, 0.08]} s={[0.36, 0.75, 0.1]} color={i ? '#7e8c76' : '#c9a27a'} rough={1} />}
        </group>
      ))}
    </group>
  )
}

// ---- small details ---------------------------------------------------------------------

/** Floor-length curtains either side of a window on the left wall (facing +x). */
export function Curtains({ position, span = 1.6, h = 2.3, color = '#efe6d6' }: P & { span?: number; h?: number; color?: string }) {
  const folds = 7
  return (
    <group position={position}>
      <mesh position={[0.06, h + 0.05, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.015, 0.015, span + 0.9, 8]} />
        <meshStandardMaterial color="#2a2420" />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[0.08, h / 2, side * (span / 2 + 0.2)]}>
          {Array.from({ length: folds }, (_, i) => (
            <mesh key={i} position={[Math.sin(i * 1.7) * 0.02, 0, (i - folds / 2) * 0.05]} castShadow>
              <boxGeometry args={[0.03, h, 0.06]} />
              <meshStandardMaterial color={color} roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/** A stack of books lying flat. */
export function Books({ position, rotationY = 0, count = 3 }: P & { count?: number }) {
  const colors = ['#a8352b', '#2f3a72', '#e8e2d6', '#5f7a45', '#d9a13b']
  return (
    <group position={position} rotation-y={rotationY}>
      {Array.from({ length: count }, (_, i) => (
        <Box key={i} p={[i * 0.01, 0.018 + i * 0.034, (i % 2) * 0.01]} s={[0.24 - i * 0.02, 0.03, 0.17 - i * 0.01]} color={colors[i % colors.length]} rough={0.85} />
      ))}
    </group>
  )
}

/** A vase with a few flowers. */
export function Flowers({ position, color = '#c9774f' }: P & { color?: string }) {
  const stems = [0, 1.3, 2.6, 3.9, 5.2]
  return (
    <group position={position}>
      <mesh position={[0, 0.09, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 0.18, 16]} />
        <meshStandardMaterial color="#e8e2d6" roughness={0.3} />
      </mesh>
      {stems.map((a, i) => (
        <group key={i} rotation={[Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3]} position={[0, 0.16, 0]}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.24, 4]} />
            <meshStandardMaterial color="#4e6e43" />
          </mesh>
          <mesh position={[0, 0.25, 0]} castShadow>
            <sphereGeometry args={[0.035, 10, 8]} />
            <meshStandardMaterial color={i % 2 ? color : '#f1e6d2'} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** A round mirror on the back wall. */
export function Mirror({ position, r = 0.4 }: P & { r?: number }) {
  return (
    <group position={position}>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[r + 0.03, r + 0.03, 0.03, 48]} />
        <meshStandardMaterial color="#b8913f" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.017]}>
        <circleGeometry args={[r, 48]} />
        <meshStandardMaterial color="#e4ecef" emissive="#cfdde3" emissiveIntensity={0.35} metalness={0.1} roughness={0.12} />
      </mesh>
    </group>
  )
}

/** A pair of shoes. */
export function Shoes({ position, rotationY = 0, color = '#4a3426' }: P & { color?: string }) {
  return (
    <group position={position} rotation-y={rotationY}>
      {[-0.06, 0.06].map((x) => (
        <Soft key={x} p={[x, 0.04, 0]} s={[0.09, 0.08, 0.26]} color={color} r={0.035} />
      ))}
    </group>
  )
}

/** A wall clock (on the back wall). */
export function Clock({ position }: P) {
  return (
    <group position={position}>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.17, 0.17, 0.04, 40]} />
        <meshStandardMaterial color="#2a2420" />
      </mesh>
      <mesh position={[0, 0, 0.021]}>
        <circleGeometry args={[0.15, 40]} />
        <meshStandardMaterial color="#f7f3ec" />
      </mesh>
      <Box p={[0.03, 0.03, 0.026]} s={[0.012, 0.1, 0.004]} color="#2a2420" />
      <Box p={[0.04, -0.01, 0.027]} s={[0.08, 0.01, 0.004]} color="#2a2420" />
    </group>
  )
}

/** A wall light (back wall), glowing. */
export function Sconce({ position }: P) {
  return (
    <group position={position}>
      <Box p={[0, 0, 0.02]} s={[0.08, 0.14, 0.04]} color="#b8913f" metal={0.7} rough={0.35} />
      <mesh position={[0, 0.08, 0.1]}>
        <cylinderGeometry args={[0.07, 0.05, 0.14, 20, 1, true]} />
        <meshStandardMaterial color="#f3ead9" emissive="#ffe2b4" emissiveIntensity={0.8} side={2} />
      </mesh>
    </group>
  )
}

/** A power socket plate on a wall (back wall facing +z). */
export function Socket({ position }: P) {
  return <Box p={position ?? [0, 0.3, 0]} s={[0.08, 0.08, 0.01]} color="#f9f7f2" rough={0.5} />
}

/** Table settings for the dining set: plates, glasses, a runner and candles. */
export function TableSettings({ position, length = 1.8, seats = 6 }: P & { length?: number; seats?: number }) {
  const perSide = Math.max(1, Math.floor(seats / 2))
  return (
    <group position={position}>
      <Box p={[0, 0.772, 0]} s={[length * 0.85, 0.004, 0.32]} color="#d6b98f" rough={1} />
      {Array.from({ length: perSide }, (_, i) => {
        const x = -length / 2 + ((i + 0.5) * length) / perSide
        return [-1, 1].map((side) => (
          <group key={`${i}${side}`} position={[x, 0.772, side * 0.3]}>
            <mesh>
              <cylinderGeometry args={[0.12, 0.1, 0.012, 28]} />
              <meshStandardMaterial color="#fbfaf6" roughness={0.3} />
            </mesh>
            <mesh position={[0.15, 0.06, -side * 0.08]}>
              <cylinderGeometry args={[0.03, 0.025, 0.12, 14, 1, true]} />
              <meshStandardMaterial color="#dfeaf0" transparent opacity={0.45} roughness={0.05} side={2} />
            </mesh>
          </group>
        ))
      })}
      {[-0.25, 0, 0.25].map((x, i) => (
        <group key={x} position={[x, 0.772, 0]}>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.03, 0.035, 0.06, 12]} />
            <meshStandardMaterial color="#b8913f" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.06 + 0.06 + i * 0.03, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.12 + i * 0.06, 10]} />
            <meshStandardMaterial color="#f4eee2" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** On the desk: a laptop, a mug and a desk lamp. */
export function DeskThings({ position, rotationY = 0 }: P) {
  return (
    <group position={position} rotation-y={rotationY}>
      <Box p={[-0.2, 0.77, 0.05]} s={[0.34, 0.015, 0.24]} color="#b9bcc0" metal={0.6} rough={0.35} />
      <group position={[-0.2, 0.775, -0.07]} rotation-x={-0.35}>
        <Box p={[0, 0.11, 0]} s={[0.34, 0.22, 0.01]} color="#b9bcc0" metal={0.6} rough={0.35} />
      </group>
      <mesh position={[0.25, 0.81, 0.1]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.09, 16]} />
        <meshStandardMaterial color="#c9774f" roughness={0.5} />
      </mesh>
      <group position={[0.5, 0.76, -0.15]}>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.02, 20]} />
          <meshStandardMaterial color="#2a2420" />
        </mesh>
        <mesh position={[0, 0.2, 0]} rotation-z={0.25}>
          <cylinderGeometry args={[0.008, 0.008, 0.38, 6]} />
          <meshStandardMaterial color="#2a2420" />
        </mesh>
        <mesh position={[-0.08, 0.38, 0]} rotation-z={1.2}>
          <coneGeometry args={[0.07, 0.12, 20, 1, true]} />
          <meshStandardMaterial color="#2a2420" side={2} emissive="#ffe2b4" emissiveIntensity={0.15} />
        </mesh>
      </group>
    </group>
  )
}

/** A suitcase standing on its wheels. */
export function Suitcase({ position, rotationY = 0, color = '#7a5236' }: P & { color?: string }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <Soft p={[0, 0.36, 0]} s={[0.42, 0.62, 0.24]} color={color} r={0.04} />
      <Box p={[0, 0.74, 0]} s={[0.16, 0.06, 0.03]} color="#2a2420" />
    </group>
  )
}

/** A round pouf. */
export function Pouf({ position, color = '#d9a13b' }: P & { color?: string }) {
  return (
    <mesh position={position ? [position[0], 0.2, position[2]] : [0, 0.2, 0]} scale={[1, 0.7, 1]} castShadow>
      <sphereGeometry args={[0.28, 24, 16]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  )
}
