import { FIBRES, MATERIALS } from '../data/materials'
import { ROUTES } from './routeMeta'
import type { RouteMeta } from './routeMeta'

export function fabricMeta(id: (typeof FIBRES)[number]): RouteMeta {
  const m = MATERIALS[id]
  return {
    title: `${m.name} rugs`,
    description: `${m.description} See ${m.name.toLowerCase()} up close in 3D, and how it feels, wears and cleans.`,
    priority: 0.7,
    changefreq: 'monthly',
  }
}

/** Every public page with its meta: the fixed pages plus one per fabric. */
export function publicRoutes(): [string, RouteMeta][] {
  return [...Object.entries(ROUTES), ...FIBRES.map((id) => [`/fabrics/${id}`, fabricMeta(id)] as [string, RouteMeta])]
}
