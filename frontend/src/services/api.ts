import type { Color, Material, Pattern, PileType } from '../types/catalog'
import type { Design } from '../types/design'
import type { Swatch } from '../types/swatch'
import type { TileDesignRecord } from '../types/tileDesign'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('bunakar_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Request to ${path} failed with status ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const catalogApi = {
  colors: () => request<Color[]>('/colors'),
  patterns: () => request<Pattern[]>('/patterns'),
  materials: () => request<Material[]>('/materials'),
  pileTypes: () => request<PileType[]>('/pile-types'),
}

export const designsApi = {
  create: (design: Design) =>
    request<Design>('/designs', { method: 'POST', body: JSON.stringify(design) }),
  mine: () => request<Design[]>('/designs'),
  get: (id: string) => request<Design>(`/designs/${id}`),
  pdfUrl: (id: string) => `${API_URL}/designs/${id}/pdf`,
}

export const swatchesApi = {
  list: () => request<Swatch[]>('/swatches'),
}

export const tileDesignsApi = {
  create: (record: Omit<TileDesignRecord, 'id' | 'updatedAt'>) =>
    request<TileDesignRecord>('/tile-designs', { method: 'POST', body: JSON.stringify(record) }),
  update: (id: string, record: Omit<TileDesignRecord, 'id' | 'updatedAt'>) =>
    request<TileDesignRecord>(`/tile-designs/${id}`, { method: 'PUT', body: JSON.stringify(record) }),
  mine: () => request<TileDesignRecord[]>('/tile-designs'),
  get: (id: string) => request<TileDesignRecord>(`/tile-designs/${id}`),
  remove: (id: string) => request<void>(`/tile-designs/${id}`, { method: 'DELETE' }),
}

export interface AuthResponse {
  accessToken: string
  user: { id: string; email: string; name: string; role: string }
}

export const authApi = {
  register: (email: string, password: string, name: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
}
