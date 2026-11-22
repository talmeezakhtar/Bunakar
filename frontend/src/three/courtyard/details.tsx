import { useSurface } from './surfaces'
import { useYarnMap } from './yarn'
import { useMemo } from 'react'
import { LatheGeometry, Vector2 } from 'three'
import type { Texture } from 'three'

/** Small things that make the courtyard feel lived in. Metres; y = 0 is the plinth top. */

/** A turned-baluster railing along x, `length` long, with a top rail. */
export function Balustrade({ length, posts }: { length: number; posts: number }) {
  const wood = useSurface('wood', [1, 0.4])
  const woodRail = useSurface('wood', [1, length / 1.2], true, true)
  const baluster = useMemo(
    () =>
      new LatheGeometry(
        [[0.001, 0], [0.035, 0], [0.035, 0.03], [0.022, 0.06], [0.03, 0.14], [0.045, 0.2], [0.03, 0.27], [0.02, 0.3], [0.03, 0.33], [0.001, 0.34]].map(
          ([a, b]) => new Vector2(a, b),
        ),
        10,
      ),
    [],
  )
  return (
    <group>
      {Array.from({ length: posts }, (_, i) => (
        <mesh key={i} geometry={baluster} position={[-length / 2 + (length * i) / (posts - 1), 0, 0]} castShadow>
          <meshStandardMaterial map={wood} roughness={0.55} />
        </mesh>
      ))}
      <mesh position={[0, 0.36, 0]} castShadow>
        <boxGeometry args={[length + 0.08, 0.05, 0.08]} />
        <meshStandardMaterial map={woodRail} roughness={0.55} />
      </mesh>
    </group>
  )
}

/** A rug folded over a rail: one slab over the top, hanging down both sides. */
export function DrapedRug({ map, normalMap = null, width = 0.7, drop = 0.3 }: { map: Texture | null; normalMap?: Texture | null; width?: number; drop?: number }) {
  // Keyed on the texture: a map added after the material was built would never reach its shader.
  const mat = <meshStandardMaterial key={map?.uuid ?? 'plain'} map={map ?? undefined} normalMap={normalMap ?? undefined} color={map ? '#ffffff' : '#8d3a2c'} roughness={0.95} />
  return (
    <group position={[0, 0.39, 0]}>
      <mesh castShadow>
        <boxGeometry args={[width, 0.02, 0.12]} />
        {mat}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, -drop / 2, s * 0.065]} rotation-x={s * 0.08} castShadow>
          <boxGeometry args={[width, drop, 0.015]} />
          {mat}
        </mesh>
      ))}
    </group>
  )
}

/** A long bolster cushion. */
export function Bolster({ band = '#d9a13b', length = 0.7 }: { band?: string; length?: number }) {
  // Striped cotton from the bolster photo; stripes run along its length.
  const fabric = useSurface('bolster', [1, 1])
  return (
    <group rotation-z={Math.PI / 2}>
      <mesh castShadow>
        <cylinderGeometry args={[0.09, 0.09, length, 32]} />
        <meshStandardMaterial map={fabric} roughness={0.95} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, (s * length) / 2, 0]}>
          <cylinderGeometry args={[0.092, 0.092, 0.04, 16]} />
          <meshStandardMaterial color={band} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

/** A floor cushion. */
export function Cushion({ color = '#2f3a72' }: { color?: string }) {
  return (
    <mesh scale={[1, 0.38, 1]} castShadow>
      <sphereGeometry args={[0.22, 16, 10]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  )
}

/** A woven basket heaped with balls of wool. */
export function WoolBasket({ colors }: { colors: string[] }) {
  const yarn = useYarnMap([2, 1])
  const jute = useSurface('jute', [4, 0.7])
  return (
    <group>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.17, 0.24, 28, 1, true]} />
        <meshStandardMaterial map={jute} bumpMap={jute} bumpScale={3} roughness={1} side={2} />
      </mesh>
      {colors.map((c, i) => {
        const a = (i / colors.length) * Math.PI * 2
        return (
          <mesh key={c + i} position={[Math.cos(a) * 0.09, 0.24 + (i % 2) * 0.05, Math.sin(a) * 0.09]} castShadow>
            <sphereGeometry args={[0.08, 24, 16]} />
            <meshStandardMaterial map={yarn} bumpMap={yarn} bumpScale={1.5} color={c} roughness={1} />
          </mesh>
        )
      })}
    </group>
  )
}

/** A neem tree: a leaning trunk and clumps of leaves. */
export function Tree() {
  const clumps: [number, number, number, number][] = [
    [0, 2.5, 0, 0.55], [0.45, 2.3, 0.2, 0.42], [-0.4, 2.35, -0.1, 0.45], [0.1, 2.85, -0.25, 0.4], [-0.15, 2.2, 0.4, 0.36],
  ]
  return (
    <group>
      <mesh position={[0, 1.05, 0]} rotation-z={0.08} castShadow>
        <cylinderGeometry args={[0.07, 0.13, 2.2, 8]} />
        <meshStandardMaterial color="#6b4a35" roughness={1} />
      </mesh>
      {clumps.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[r, 0]} />
          <meshStandardMaterial color={i % 2 ? '#5b7a3c' : '#6f8f45'} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/** Weathered stones scattered round the plinth's edge. */
export function Stones() {
  const rock = useSurface('rocks', [0.6, 0.6])
  const stones: [number, number, number, number][] = [
    [2.6, 0.12, 1.6, 0.22], [2.9, 0.08, 1.1, 0.14], [-2.9, 0.1, 1.2, 0.2], [-2.5, 0.07, 1.8, 0.12], [-1.2, 0.06, 2.75, 0.1], [0.9, 0.07, 2.8, 0.12],
  ]
  return (
    <group>
      {stones.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[i, i * 2, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[r, 0]} />
          <meshStandardMaterial map={rock} bumpMap={rock} bumpScale={3} color={i % 2 ? '#e2c8b4' : '#ffffff'} roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  )
}
