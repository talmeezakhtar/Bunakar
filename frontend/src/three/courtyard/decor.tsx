import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, CatmullRomCurve3, DoubleSide, LatheGeometry, Object3D, PlaneGeometry, SRGBColorSpace, Vector2, Vector3 } from 'three'
import type { InstancedMesh, MeshStandardMaterial } from 'three'
import { sky } from './sky'
import { useSurface } from './surfaces'

/**
 * Dressing for the pavilion, after the owner's decor pictures: a block-printed awning, cream
 * curtains tied back at the front columns, a velvet curtain behind the loom, bougainvillea and a
 * trailing plant (photo cut-outs), festoon lights and a carved name sign. Pavilion-local units:
 * metres, the pavilion centred on x = 0, z = 0, its floor at y = 0.1.
 */

/** A cloth sheet: a grid that sags between its top edge and its free bottom edge. */
function sagPlane(w: number, d: number, sag: number, segs = 16) {
  const g = new PlaneGeometry(w, d, segs, segs)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / w + 0.5
    const y = pos.getY(i) / d + 0.5
    // Sags most mid-span and toward the free edge.
    pos.setZ(i, -Math.sin(Math.PI * x) * sag * (1 - y) - Math.sin(Math.PI * y) * sag * 0.4)
  }
  g.computeVertexNormals()
  return g
}

/** A block-printed cotton awning sloping out from the eave, on two poles, with a scalloped valance. */
export function Awning({ width, from, out, drop }: { width: number; from: [number, number]; out: number; drop: number }) {
  const cloth = useSurface('blockprint', [width / 0.8, out / 0.8])
  const poleWood = useSurface('wood', [1, 1.2])
  const valanceMap = useSurface('blockprint', [width / 0.4, 0.25])
  const [y0, z0] = from
  const slope = Math.atan2(drop, out)
  const len = Math.hypot(out, drop)
  const geo = useMemo(() => sagPlane(width, len, 0.05), [width, len])
  const valance = useMemo(() => {
    // A strip with a scalloped lower edge: each scallop dips between the pleats.
    const g = new PlaneGeometry(width, 0.16, 64, 1)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 0) pos.setY(i, -0.08 - Math.abs(Math.sin((pos.getX(i) / width) * Math.PI * 9)) * 0.06)
    return g
  }, [width])
  useEffect(
    () => () => {
      geo.dispose()
      valance.dispose()
    },
    [geo, valance],
  )
  const tipY = y0 - drop
  const tipZ = z0 + out
  return (
    <group>
      <mesh geometry={geo} position={[0, y0 - drop / 2, z0 + out / 2]} rotation-x={-Math.PI / 2 + slope} castShadow receiveShadow>
        <meshStandardMaterial map={cloth} roughness={0.95} side={DoubleSide} />
      </mesh>
      <mesh geometry={valance} position={[0, tipY - 0.07, tipZ]} castShadow>
        <meshStandardMaterial map={valanceMap} roughness={0.95} side={DoubleSide} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * width) / 2, tipY / 2, tipZ]} castShadow>
          <cylinderGeometry args={[0.018, 0.022, tipY, 8]} />
          <meshStandardMaterial map={poleWood} roughness={0.55} />
        </mesh>
      ))}
    </group>
  )
}

/** A curtain gathered by a tie-back: half a fluted column, full at the top and hem, pinched at the tie. */
export function TiedCurtain({ position, height }: { position: [number, number, number]; height: number }) {
  const map = useSurface('drape', [2, 1])
  const geo = useMemo(() => {
    const tie = 0.45
    const pts: Vector2[] = []
    for (let i = 0; i <= 24; i++) {
      const t = i / 24
      const r = t < tie ? 0.07 + 0.1 * ((tie - t) / tie) ** 1.5 : 0.07 + 0.15 * ((t - tie) / (1 - tie)) ** 1.2
      pts.push(new Vector2(r, t * height))
    }
    pts.reverse()
    // The front half round the column (facing +z); folds pushed in and out round it.
    const g = new LatheGeometry(pts, 40, -Math.PI / 2, Math.PI)
    const pos = g.attributes.position
    const uv = g.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const a = Math.atan2(z, x)
      const k = 1 + 0.12 * Math.sin(a * 14)
      pos.setX(i, x * k)
      pos.setZ(i, z * k)
      uv.setY(i, pos.getY(i) / height)
    }
    g.computeVertexNormals()
    return g
  }, [height])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <group position={position}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial map={map} roughness={0.9} side={DoubleSide} />
      </mesh>
      {/* The tie-back: a gold cord round the gather. */}
      <mesh position={[0, height * 0.45, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.078, 0.012, 8, 24]} />
        <meshStandardMaterial color="#c9a24f" metalness={0.8} roughness={0.35} />
      </mesh>
    </group>
  )
}

/** A full-width curtain hanging in soft vertical folds (the velvet behind the loom). */
export function FoldedCurtain({ position, width, height }: { position: [number, number, number]; width: number; height: number }) {
  const map = useSurface('velvet', [width / 1.2, 1])
  const geo = useMemo(() => {
    const g = new PlaneGeometry(width, height, 96, 4)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) / width) * Math.PI * 22) * 0.035)
    g.computeVertexNormals()
    return g
  }, [width, height])
  useEffect(() => () => geo.dispose(), [geo])
  return (
    <mesh geometry={geo} position={[position[0], position[1] + height / 2, position[2]]} receiveShadow castShadow>
      <meshStandardMaterial map={map} roughness={0.7} side={DoubleSide} />
    </mesh>
  )
}

/** A photo cut-out on crossed planes, so it reads from any side (plants). */
export function CutOut({ url, position, height, aspect, turns = 2, rotationY = 0 }: { url: string; position: [number, number, number]; height: number; aspect: number; turns?: number; rotationY?: number }) {
  const source = useTexture(url)
  const map = useMemo(() => {
    const t = source.clone()
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
    t.needsUpdate = true
    return t
  }, [source])
  return (
    <group position={position} rotation-y={rotationY}>
      {Array.from({ length: turns }, (_, i) => (
        <mesh key={i} position={[0, -height / 2, 0]} rotation-y={(i / turns) * Math.PI} castShadow>
          <planeGeometry args={[height * aspect, height]} />
          <meshStandardMaterial map={map} alphaTest={0.45} side={DoubleSide} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

const dummy = new Object3D()

/** Festoon lights: warm bulbs on wires swagged between points. */
export function StringLights({ spans, spacing = 0.22, sag = 0.3 }: { spans: [[number, number, number], [number, number, number]][]; spacing?: number; sag?: number }) {
  const { curves, bulbs } = useMemo(() => {
    const curves = spans.map(([a, b]) => {
      const A = new Vector3(...a)
      const B = new Vector3(...b)
      const mid = A.clone().lerp(B, 0.5)
      mid.y -= sag * (A.distanceTo(B) / 3)
      return new CatmullRomCurve3([A, A.clone().lerp(mid, 0.5).setY((A.y + mid.y) / 2 - sag * 0.12), mid, mid.clone().lerp(B, 0.5).setY((B.y + mid.y) / 2 - sag * 0.12), B])
    })
    const bulbs: Vector3[] = []
    for (const c of curves) {
      const n = Math.max(2, Math.round(c.getLength() / spacing))
      for (let i = 1; i < n; i++) bulbs.push(c.getPointAt(i / n))
    }
    return { curves, bulbs }
  }, [spans, spacing, sag])
  // Edison bulbs, as in the owner's picture: a black socket, clear teardrop glass, a hot filament.
  const sockets = useRef<InstancedMesh>(null)
  const glass = useRef<InstancedMesh>(null)
  const filaments = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const parts: [InstancedMesh | null, number][] = [
      [sockets.current, -0.012],
      [glass.current, -0.045],
      [filaments.current, -0.045],
    ]
    for (const [mesh, dy] of parts) {
      if (!mesh) continue
      bulbs.forEach((p, i) => {
        dummy.position.set(p.x, p.y + dy, p.z)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
    }
  }, [bulbs])
  const bulbGeo = useMemo(
    () =>
      new LatheGeometry(
        [[0.001, -0.032], [0.012, -0.03], [0.02, -0.022], [0.022, -0.012], [0.019, 0], [0.012, 0.012], [0.009, 0.022], [0.001, 0.024]].map(([r, y]) => new Vector2(r, y)),
        16,
      ),
    [],
  )
  useEffect(() => () => bulbGeo.dispose(), [bulbGeo])
  // Bulbs glow softly by day and blaze at night.
  const glassMat = useRef<MeshStandardMaterial>(null)
  const filamentMat = useRef<MeshStandardMaterial>(null)
  useFrame(() => {
    const n = sky.night
    if (glassMat.current) glassMat.current.emissiveIntensity = 0.35 + 2.2 * n
    if (filamentMat.current) filamentMat.current.emissiveIntensity = 1.5 + 8 * n
  })
  return (
    <group>
      {curves.map((c, i) => (
        <mesh key={i}>
          <tubeGeometry args={[c, 48, 0.004, 4, false]} />
          <meshStandardMaterial color="#2a2420" roughness={0.6} />
        </mesh>
      ))}
      <instancedMesh ref={sockets} args={[undefined, undefined, bulbs.length]}>
        <cylinderGeometry args={[0.008, 0.009, 0.024, 8]} />
        <meshStandardMaterial color="#1c1a18" roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={glass} args={[bulbGeo, undefined, bulbs.length]}>
        <meshStandardMaterial ref={glassMat} color="#ffe7bf" emissive="#ffb35c" emissiveIntensity={0.35} transparent opacity={0.75} roughness={0.08} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={filaments} args={[undefined, undefined, bulbs.length]}>
        <sphereGeometry args={[0.007, 8, 6]} />
        <meshStandardMaterial ref={filamentMat} color="#fff6e0" emissive="#ffd08a" emissiveIntensity={1.5} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

/** A carved wooden name sign: dark frame, lighter fretted panel, raised gilded letters. */
export function NameSign({ position, width = 1.1, height = 0.3, text = 'Buنakar' }: { position: [number, number, number]; width?: number; height?: number; text?: string }) {
  const [map, setMap] = useState<CanvasTexture | null>(null)
  const frame = useSurface('wood', [1, 0.3], true, true)
  useEffect(() => {
    let live = true
    let made: CanvasTexture | null = null
    const draw = async () => {
      // Use the site's display face once it has loaded (falls back to a serif).
      await document.fonts?.load('120px Rubaith').catch(() => undefined)
      await document.fonts?.load('600 120px "El Messiri"', 'ن').catch(() => undefined)
      if (!live) return
      const W = 1024
      const H = Math.round((W * height) / width)
      const c = document.createElement('canvas')
      c.width = W
      c.height = H
      const g = c.getContext('2d')!
      g.fillStyle = '#4a2e1c'
      g.fillRect(0, 0, W, H)
      g.fillStyle = '#7a5236'
      g.fillRect(24, 24, W - 48, H - 48)
      // A fretted lattice of small eight-point stars, carved into the panel.
      g.strokeStyle = 'rgba(58, 34, 20, 0.55)'
      g.lineWidth = 3
      for (let x = 40; x < W - 30; x += 46)
        for (let y = 40; y < H - 30; y += 46) {
          g.strokeRect(x - 9, y - 9, 18, 18)
          g.save()
          g.translate(x, y)
          g.rotate(Math.PI / 4)
          g.strokeRect(-9, -9, 18, 18)
          g.restore()
        }
      g.strokeStyle = '#c9a24f'
      g.lineWidth = 6
      g.strokeRect(36, 36, W - 72, H - 72)
      g.font = `${Math.round(H * 0.55)}px Rubaith, "El Messiri", Georgia, serif`
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillStyle = 'rgba(0,0,0,0.55)'
      g.fillText(text, W / 2 + 4, H / 2 + 6)
      g.fillStyle = '#e2bd62'
      g.fillText(text, W / 2, H / 2 + 2)
      made = new CanvasTexture(c)
      made.colorSpace = SRGBColorSpace
      made.anisotropy = 8
      setMap(made)
    }
    void draw()
    return () => {
      live = false
      made?.dispose()
    }
  }, [width, height, text])
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[width, height, 0.05]} />
        <meshStandardMaterial attach="material-0" map={frame} roughness={0.5} />
        <meshStandardMaterial attach="material-1" map={frame} roughness={0.5} />
        <meshStandardMaterial attach="material-2" map={frame} roughness={0.5} />
        <meshStandardMaterial attach="material-3" map={frame} roughness={0.5} />
        <meshStandardMaterial key={map ? 'tex' : 'plain'} attach="material-4" map={map ?? undefined} color={map ? '#ffffff' : '#7a5236'} roughness={0.5} metalness={0.1} />
        <meshStandardMaterial attach="material-5" map={frame} roughness={0.5} />
      </mesh>
    </group>
  )
}
