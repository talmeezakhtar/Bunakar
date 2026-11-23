import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import type { Group } from 'three'

/**
 * A damped spring: `kick(v)` adds velocity, and every frame it pulls back to rest. This is the
 * "physics" of everything you can touch in the courtyard - lanterns swing, rugs sway, skeins
 * bounce - stable at any frame rate (semi-implicit Euler, capped step).
 */
export class Spring {
  x = 0
  v = 0
  stiffness: number
  damping: number
  constructor(stiffness = 18, damping = 2.2) {
    this.stiffness = stiffness
    this.damping = damping
  }
  kick(v: number) {
    this.v += v
  }
  step(dt: number) {
    const h = Math.min(dt, 1 / 30)
    this.v += (-this.stiffness * this.x - this.damping * this.v) * h
    this.x += this.v * h
    return this.x
  }
}

/** Pointer cursor over things you can touch. */
export const hoverable = {
  onPointerOver: (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
  },
  onPointerOut: () => {
    document.body.style.cursor = ''
  },
}

type SwingProps = {
  children: ReactNode
  /** Rotation axis the swing turns about, in the group's frame. */
  axis?: 'x' | 'z'
  /** How hard a touch pushes. */
  strength?: number
  /** A gentle sway even when untouched (radians). */
  idle?: number
  phase?: number
  stiffness?: number
  damping?: number
  position?: [number, number, number]
  onTouch?: () => void
}

/** Swings its children about their origin (hang them from it) when touched. */
export function Swing({ children, axis = 'z', strength = 2.6, idle = 0.03, phase = 0, stiffness = 14, damping = 1.6, position, onTouch }: SwingProps) {
  const ref = useRef<Group>(null)
  const spring = useRef(new Spring(stiffness, damping))
  useFrame(({ clock }, dt) => {
    const g = ref.current
    if (!g) return
    const a = spring.current.step(dt) + Math.sin(clock.elapsedTime * 0.9 + phase) * idle
    g.rotation[axis] = a
  })
  return (
    <group
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        // Push it the way the touch was travelling, as a hand would.
        spring.current.kick((e.ray.direction.x > 0 ? -1 : 1) * strength)
        onTouch?.()
      }}
      {...hoverable}
    >
      {children}
    </group>
  )
}

/** Hops and spins its children when touched (a skein of wool, a pot). */
export function Bounce({ children, position, height = 1, onTouch }: { children: ReactNode; position?: [number, number, number]; height?: number; onTouch?: () => void }) {
  const ref = useRef<Group>(null)
  const hop = useRef({ t: -1, spin: 0 })
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const h = hop.current
    if (h.t < 0) return
    h.t += dt
    const T = 0.55
    const p = Math.min(h.t / T, 1)
    g.position.y = (position?.[1] ?? 0) + Math.sin(p * Math.PI) * 0.18 * height
    g.rotation.y = h.spin + p * Math.PI * 2
    if (p >= 1) {
      h.t = -1
      g.position.y = position?.[1] ?? 0
    }
  })
  return (
    <group
      ref={ref}
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        if (hop.current.t < 0) hop.current = { t: 0, spin: ref.current?.rotation.y ?? 0 }
        onTouch?.()
      }}
      {...hoverable}
    >
      {children}
    </group>
  )
}
