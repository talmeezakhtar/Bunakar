import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, ContactShadows, OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { AgXToneMapping } from 'three'
import { detectTier } from '../tier'
import { RugMesh } from './RugMesh'
import { resolveRugSource, rugShape } from './rugSource'
import type { RugSource } from './rugSource'
import { TIER_TEXTURES, loadRugTextures } from './rugTextures'
import type { RugTextures } from './rugTextures'

/** Waits for edits to settle before rebuilding the rug's textures. */
function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return settled
}

/**
 * The designers' 3D view: the rug being designed, at its real size, with its pile, seams and
 * carving, on a turntable you can orbit and zoom. Rebuilt a moment after each edit.
 */
export default function RugPreview3D({ source }: { source: RugSource }) {
  const tier = detectTier() === 'high' ? 'high' : 'low'
  const settled = useSettled(source, 350)
  const rug = useMemo(() => resolveRugSource(settled), [settled])
  const [tex, setTex] = useState<{ key: string; t: RugTextures } | null>(null)
  const [degraded, setDegraded] = useState(false)

  useEffect(() => {
    let live = true
    loadRugTextures(rug, TIER_TEXTURES[tier])
      .then((t) => live && setTex({ key: rug.key, t }))
      .catch(() => {
        // Keeps showing the last good build.
      })
    return () => {
      live = false
    }
  }, [rug, tier])

  // Frame the whole rug: distance grows with its longest side.
  const longest = Math.max(rug.widthFt, rug.heightFt) * 0.3048
  const dist = Math.max(1.6, longest * 1.25)
  const building = !tex || tex.key !== rug.key
  // A blank tile grid has nothing to weave yet (unpainted tiles are see-through).
  const empty = settled.kind === 'tile' && Object.values(settled.state.tiles).every((pieces) => pieces.length === 0)

  return (
    <div className="relative h-full w-full bg-[radial-gradient(90%_80%_at_50%_30%,#fbf8f2_0%,#ece5d8_70%,#e2dacb_100%)]">
      <Canvas
        shadows={tier === 'high' && !degraded}
        dpr={tier === 'high' ? [1, 1.75] : 1}
        camera={{ position: [dist * 0.55, dist * 0.75, dist * 0.85], fov: 38, near: 0.05, far: 80 }}
        gl={{ toneMapping: AgXToneMapping, antialias: true }}
      >
        <PerformanceMonitor onDecline={() => setDegraded(true)} />
        <AdaptiveDpr pixelated />
        <hemisphereLight args={['#fff6ea', '#cbbfae', 1.2]} />
        <directionalLight position={[2.5, 4, 2]} intensity={2.2} castShadow={tier === 'high'} shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#dfe6ff" />
        {tex && (
          <RugMesh map={tex.t.map} normalMap={tex.t.normalMap} fabric={tex.t} widthFt={rug.widthFt} heightFt={rug.heightFt} tier={tier} normalScale={1.2} shape={rugShape(rug)} />
        )}
        <ContactShadows position={[0, -0.002, 0]} scale={longest * 2.2} blur={2.4} opacity={0.35} far={1} />
        <OrbitControls makeDefault target={[0, 0, 0]} enablePan={false} minDistance={0.4} maxDistance={dist * 2.2} maxPolarAngle={1.5} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
      <p className="pointer-events-none absolute left-3 top-3 rounded-full bg-paper/90 px-3 py-1 text-[0.8125rem] text-ink-2 shadow-[var(--shadow-soft)]" aria-live="polite">
        {empty ? 'Paint some tiles to see them in 3D' : building ? 'Weaving the 3D view…' : 'Drag to turn · scroll to look closer'}
      </p>
    </div>
  )
}
