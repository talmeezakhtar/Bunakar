import { useMemo } from 'react'
import { DoubleSide, ExtrudeGeometry, LatheGeometry, Shape, Vector2 } from 'three'
import { useSurface } from './surfaces'

/**
 * The courtyard's built parts, generated in code: a floating sandstone plinth and a small chhatri
 * (domed pavilion) on four columns joined by cusped arches. Surfaces are photo textures: red
 * sandstone blocks, herringbone paving and rough rock. Units are metres; the plinth top is y = 0.
 */

/** Lathe UVs run by point index; re-map v to height so a texture tiles evenly up the profile. */
function vByHeight(g: LatheGeometry, height: number) {
  const pos = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < pos.count; i++) uv.setY(i, pos.getY(i) / height)
  return g
}

export const SANDSTONE = '#d39a72'
export const SANDSTONE_DARK = '#b97a57'
export const SANDSTONE_LIGHT = '#e7b994'
export const WOOD = '#6e4128'
export const BRASS = '#c99a45'

/** Pavilion layout. */
export const PAVILION = { cx: 0, cz: -1.15, halfW: 1.3, halfD: 0.8, colH: 2.25 }

export function Plinth() {
  const paving = useSurface('paving', [6, 6])
  const edge = useSurface('stone', [16, 0.3])
  const rock = useSurface('rocks', [10, 2])
  const band = useSurface('stone', [5, 5])
  return (
    <group>
      {/* Paved top: an octagon with a darker inlay ring. Faces: side, top, bottom. */}
      <mesh position={[0, -0.16, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[3.45, 3.3, 0.32, 8, 1]} />
        <meshStandardMaterial attach="material-0" map={edge} bumpMap={edge} bumpScale={2} roughness={0.92} />
        <meshStandardMaterial attach="material-1" map={paving} bumpMap={paving} bumpScale={1} roughness={0.9} />
        <meshStandardMaterial attach="material-2" color="#8f5640" roughness={1} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <ringGeometry args={[2.95, 3.12, 8, 1, Math.PI / 8]} />
        <meshStandardMaterial map={band} bumpMap={band} bumpScale={2} color="#d9bba8" roughness={0.95} />
      </mesh>
      {/* The rock it was cut from, tapering away below. */}
      <mesh position={[0, -1.45, 0]} castShadow>
        <cylinderGeometry args={[3.3, 0.55, 2.3, 8, 3]} />
        <meshStandardMaterial map={rock} bumpMap={rock} bumpScale={4} color="#c79a80" roughness={1} />
      </mesh>
      <mesh position={[0.4, -2.85, 0.3]} rotation={[0.3, 0.4, 0.2]}>
        <dodecahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial map={rock} color="#b88a70" roughness={1} flatShading />
      </mesh>
    </group>
  )
}

/** A turned column: base, slim shaft with a band, bell capital. */
function Column({ x, z, h }: { x: number; z: number; h: number }) {
  const geo = useMemo(() => {
    const p: [number, number][] = [
      [0, 0], [0.15, 0], [0.15, 0.08], [0.12, 0.12], [0.1, 0.16], [0.085, 0.2],
      [0.075, h * 0.45], [0.095, h * 0.47], [0.095, h * 0.5], [0.075, h * 0.52],
      [0.07, h - 0.3], [0.1, h - 0.22], [0.15, h - 0.12], [0.16, h - 0.06], [0.16, h], [0, h],
    ]
    return vByHeight(new LatheGeometry(p.map(([r, y]) => new Vector2(r, y)), 24), h)
  }, [h])
  const stone = useSurface('stone', [0.7, h / 1.1])
  return (
    <mesh geometry={geo} position={[x, 0, z]} castShadow receiveShadow>
      <meshStandardMaterial map={stone} bumpMap={stone} bumpScale={2} roughness={0.85} />
    </mesh>
  )
}

/** A panel with a cusped (multifoil) arch cut through it, spanning `w` between columns. */
function ArchPanel({ w, h, spring, depth = 0.12 }: { w: number; h: number; spring: number; depth?: number }) {
  const geo = useMemo(() => {
    // The spandrel: a solid outline whose lower edge IS the arch (no hole to triangulate).
    const r = w / 2 - 0.02
    // The arch must stay inside the panel: leave a 9 cm lintel above its apex.
    const rise = Math.min(r * 0.8, h - spring - 0.09)
    const lobes = 5
    const pts: [number, number][] = []
    for (let i = 0; i <= lobes * 2; i++) {
      const a = (i / (lobes * 2)) * Math.PI // right (0) to left (pi)
      const px = Math.cos(a) * r
      const py = spring + Math.sin(a) * rise * 0.88 + (1 - Math.abs(Math.cos(a))) * rise * 0.12
      pts.push([px, py])
    }
    const outer = new Shape()
    outer.moveTo(-w / 2, 0)
    outer.lineTo(-w / 2, h)
    outer.lineTo(w / 2, h)
    outer.lineTo(w / 2, 0)
    outer.lineTo(r, 0)
    outer.lineTo(pts[0][0], pts[0][1])
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i]
      const [x1, y1] = pts[i + 1]
      // Each lobe bulges into the opening (down, toward the centre): that reads as a cusp.
      const mx = (x0 + x1) / 2
      const my = (y0 + y1) / 2
      outer.quadraticCurveTo(mx * 0.86, my - (my - spring) * 0.12 - 0.015, x1, y1)
    }
    outer.lineTo(-r, 0)
    outer.closePath()
    const g = new ExtrudeGeometry(outer, { depth, bevelEnabled: false, curveSegments: 6 })
    g.translate(0, 0, -depth / 2)
    return g
  }, [w, h, spring, depth])
  // Extruded shapes have UVs in metres: one photo per ~1.1 m of wall.
  const stone = useSurface('stone', [0.9, 0.9])
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial map={stone} bumpMap={stone} bumpScale={2} color="#f6ece4" roughness={0.85} side={DoubleSide} />
    </mesh>
  )
}

/** Lotus dome with a finial, on a ribbed drum. */
function Dome({ r }: { r: number }) {
  const geo = useMemo(() => {
    const pts: Vector2[] = []
    const n = 28
    for (let i = 0; i <= n; i++) {
      const t = i / n
      // Bulb that swells past its base then draws to a point: an onion profile.
      const y = t * r * 1.3
      const rad = r * (0.9 + 0.16 * Math.sin(Math.min(1, t * 1.25) * Math.PI)) * (1 - t ** 2.4)
      pts.push(new Vector2(Math.max(0.001, rad), y))
    }
    return vByHeight(new LatheGeometry(pts, 48), r * 1.3)
  }, [r])
  const drum = useSurface('stone', [3, 0.2])
  const shell = useSurface('stone', [3, 0.9])
  const finial = useMemo(
    () =>
      new LatheGeometry(
        [[0.001, 0], [0.07, 0.03], [0.04, 0.1], [0.09, 0.16], [0.05, 0.24], [0.025, 0.4], [0.001, 0.48]].map(([a, b]) => new Vector2(a, b)),
        16,
      ),
    [],
  )
  return (
    <group>
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[r * 0.95, r, 0.22, 32]} />
        <meshStandardMaterial map={drum} bumpMap={drum} bumpScale={2} color="#e9d6c8" roughness={0.85} />
      </mesh>
      <mesh geometry={geo} position={[0, 0.11, 0]} castShadow>
        <meshStandardMaterial map={shell} bumpMap={shell} bumpScale={1.5} color="#f8eee6" roughness={0.75} />
      </mesh>
      <mesh geometry={finial} position={[0, 0.11 + r * 1.27, 0]} castShadow>
        <meshStandardMaterial color={BRASS} metalness={0.8} roughness={0.35} />
      </mesh>
    </group>
  )
}

/** The chhatri: four columns, cusped arches on every side, a deep sloped eave and the dome. */
export function Pavilion() {
  const { cx, cz, halfW, halfD, colH } = PAVILION
  const archH = 1.05
  const eave = useSurface('stone', [6, 0.3])
  const roof = useSurface('stone', [2.4, 0.2])
  const floor = useSurface('paving', [2.6, 1.7])
  return (
    <group position={[cx, 0, cz]}>
      {[
        [-halfW, -halfD],
        [halfW, -halfD],
        [-halfW, halfD],
        [halfW, halfD],
      ].map(([x, z]) => (
        <Column key={`${x}${z}`} x={x} z={z} h={colH} />
      ))}
      {/* Front and back arches span the width; side arches span the depth. */}
      <group position={[0, colH - archH, halfD]}>
        <ArchPanel w={halfW * 2} h={archH} spring={0.08} />
      </group>
      <group position={[0, colH - archH, -halfD]}>
        <ArchPanel w={halfW * 2} h={archH} spring={0.08} />
      </group>
      <group position={[-halfW, colH - archH, 0]} rotation-y={Math.PI / 2}>
        <ArchPanel w={halfD * 2} h={archH} spring={0.05} />
      </group>
      <group position={[halfW, colH - archH, 0]} rotation-y={Math.PI / 2}>
        <ArchPanel w={halfD * 2} h={archH} spring={0.05} />
      </group>
      {/* Chajja: the deep sloped eave, then the roof slab. */}
      <mesh position={[0, colH + 0.07, 0]} rotation-y={Math.PI / 4} castShadow>
        <cylinderGeometry args={[(halfW + 0.15) * Math.SQRT2 * 0.82, (halfW + 0.5) * Math.SQRT2 * 0.82, 0.16, 4, 1]} />
        <meshStandardMaterial map={eave} bumpMap={eave} bumpScale={2} color="#dcc3b3" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, colH + 0.2, 0]} castShadow>
        <boxGeometry args={[halfW * 2 + 0.2, 0.12, halfD * 2 + 0.2]} />
        <meshStandardMaterial map={roof} bumpMap={roof} bumpScale={2} roughness={0.85} />
      </mesh>
      <group position={[0, colH + 0.26, 0]}>
        <Dome r={0.55} />
      </group>
      {/* Raised floor of the pavilion. */}
      <mesh position={[0, 0.05, 0]} receiveShadow castShadow>
        <boxGeometry args={[halfW * 2 + 0.35, 0.1, halfD * 2 + 0.35]} />
        <meshStandardMaterial map={floor} bumpMap={floor} bumpScale={1} roughness={0.9} />
      </mesh>
    </group>
  )
}
