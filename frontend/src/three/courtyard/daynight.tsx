import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color } from 'three'
import type { DirectionalLight, HemisphereLight, Mesh, MeshStandardMaterial, PointLight } from 'three'
import { DAY_CYCLE, nightAt, sky } from './sky'

/** `?time=night` or `?time=dusk` starts the clock there (it keeps cycling from that point). */
function startOffset() {
  const t = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('time')
  if (t === 'night') return DAY_CYCLE.day + DAY_CYCLE.dusk + 2
  if (t === 'dusk') return DAY_CYCLE.day + DAY_CYCLE.dusk * 0.5
  return 0
}

const SUN_DAY = new Color('#ffb57a')
const SUN_SET = new Color('#ff7a4a')
const MOON = new Color('#9db4ff')
const SKY_DAY = new Color('#ffdcb4')
const SKY_NIGHT = new Color('#3a4a80')
const GROUND_DAY = new Color('#5a3530')
const GROUND_NIGHT = new Color('#16121e')
const tmp = new Color()

/**
 * The courtyard's sun, sky and fill lights, cycling day -> dusk -> night -> dawn on their own.
 * The sun turns into a cool moon, the sky light dims, and the page's sky behind the scene follows
 * through the `--night` CSS variable. With reduced motion it stays day. `?time=night` or
 * `?time=dusk` in the address starts the clock there.
 */
export function DayNight({ rich, reduce }: { rich: boolean; reduce: boolean }) {
  const sun = useRef<DirectionalLight>(null)
  const hemi = useRef<HemisphereLight>(null)
  const back = useRef<DirectionalLight>(null)
  const front = useRef<DirectionalLight>(null)
  const shown = useRef(-1)
  const offset = useRef<number | null>(null)
  const isNight = useRef(false)
  // Leaving the page puts the site back to day.
  useEffect(
    () => () => {
      document.documentElement.style.removeProperty('--night')
      delete document.documentElement.dataset.night
      window.dispatchEvent(new CustomEvent('courtyard-night', { detail: false }))
    },
    [],
  )
  useFrame(({ clock, scene }) => {
    offset.current ??= startOffset()
    const n = reduce ? 0 : nightAt(clock.elapsedTime + offset.current)
    sky.night = n
    const set = 4 * n * (1 - n) // strongest mid-dusk and mid-dawn
    if (sun.current) {
      tmp.copy(SUN_DAY).lerp(SUN_SET, set).lerp(MOON, n)
      sun.current.color.copy(tmp)
      sun.current.intensity = 3.1 * (1 - n) + 0.55 * n
    }
    if (hemi.current) {
      hemi.current.color.copy(SKY_DAY).lerp(SKY_NIGHT, n)
      hemi.current.groundColor.copy(GROUND_DAY).lerp(GROUND_NIGHT, n)
      hemi.current.intensity = 0.75 * (1 - n) + 0.22 * n
    }
    if (back.current) back.current.intensity = 0.9 * (1 - n) + 0.25 * n
    if (front.current) front.current.intensity = 0.45 * (1 - n) + 0.06 * n
    scene.environmentIntensity = 0.55 * (1 - n) + 0.1 * n
    if (Math.abs(n - shown.current) > 0.01) {
      shown.current = n
      document.documentElement.style.setProperty('--night', n.toFixed(3))
    }
    // Tell the page chrome (the navbar) when it is dark enough to switch to night colours.
    const dark = isNight.current ? n > 0.4 : n > 0.6
    if (dark !== isNight.current) {
      isNight.current = dark
      if (dark) document.documentElement.dataset.night = '1'
      else delete document.documentElement.dataset.night
      window.dispatchEvent(new CustomEvent('courtyard-night', { detail: dark }))
    }
  })
  return (
    <>
      <hemisphereLight ref={hemi} args={['#ffdcb4', '#5a3530', 0.75]} />
      {/* Low evening sun from the front left (the moon by night): long shadows across the courtyard. */}
      <directionalLight
        ref={sun}
        position={[-5, 4.2, 4.5]}
        color="#ffb57a"
        intensity={3.1}
        castShadow
        shadow-mapSize={rich ? [2048, 2048] : [1024, 1024]}
        shadow-radius={4}
        shadow-camera-left={-4.5}
        shadow-camera-right={4.5}
        shadow-camera-top={4.5}
        shadow-camera-bottom={-4.5}
        shadow-bias={-0.0006}
      />
      <directionalLight ref={back} position={[4, 2.5, -4]} color="#a49ee0" intensity={0.9} />
      <directionalLight ref={front} position={[3, 3, 5]} color="#ffe6cc" intensity={0.45} />
    </>
  )
}

/**
 * A lamp's light that comes on at dusk: a point light, and optionally a small glowing core so the
 * lamp itself reads as lit. Off by day.
 */
export function NightLight({ position, color = '#ffb35c', intensity = 1.5, distance = 2.5, glow = 0 }: { position: [number, number, number]; color?: string; intensity?: number; distance?: number; glow?: number }) {
  const light = useRef<PointLight>(null)
  const core = useRef<Mesh>(null)
  useFrame(() => {
    const n = sky.night
    if (light.current) light.current.intensity = intensity * n
    if (core.current) {
      core.current.visible = n > 0.02
      const m = core.current.material as MeshStandardMaterial
      m.emissiveIntensity = 4 * n
    }
  })
  return (
    <group position={position}>
      <pointLight ref={light} color={color} intensity={0} distance={distance} decay={2} />
      {glow > 0 && (
        <mesh ref={core} visible={false}>
          <sphereGeometry args={[glow, 12, 10]} />
          <meshStandardMaterial color="#fff3dc" emissive={color} emissiveIntensity={0} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}
