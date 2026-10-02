import type { Swatch } from '../types/swatch'
import type { TileDesignRecord } from '../types/tileDesign'
import type { FreeformDesignRecord } from '../types/freeform'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const TOKEN_KEY = 'bunakar_token'

let onUnauthorized: () => void = () => {}
/** Registered by the auth session, which owns what "logged out" means. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

function authHeaders(): Record<string, string> {
  let token: string | null = null
  try {
    token = localStorage.getItem(TOKEN_KEY)
  } catch {
    // Storage blocked - send the request unauthenticated.
  }
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = authHeaders()
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...headers },
      ...options,
    })
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.")
  }
  if (!res.ok) {
    // A rejected token (not a wrong password on the login form) ends the session.
    if (res.status === 401 && headers.Authorization && !path.startsWith('/auth/login')) onUnauthorized()
    const body = await res.json().catch(() => null)
    // Nest validation errors arrive as an array of messages.
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message
    throw new Error(message ?? `Request to ${path} failed with status ${res.status}`)
  }
  // 204 / empty body (e.g. DELETE) has no JSON to parse.
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
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
  /** Read-only, no sign-in: what a shared preview link shows. */
  getPublic: (id: string) => request<TileDesignRecord>(`/tile-designs/${id}/public`),
  remove: (id: string) => request<void>(`/tile-designs/${id}`, { method: 'DELETE' }),
}

type NewFreeformRecord = Omit<FreeformDesignRecord, 'id' | 'updatedAt'>

export const freeformDesignsApi = {
  create: (record: NewFreeformRecord) =>
    request<FreeformDesignRecord>('/freeform-designs', { method: 'POST', body: JSON.stringify(record) }),
  update: (id: string, record: NewFreeformRecord) =>
    request<FreeformDesignRecord>(`/freeform-designs/${id}`, { method: 'PUT', body: JSON.stringify(record) }),
  mine: () => request<FreeformDesignRecord[]>('/freeform-designs'),
  get: (id: string) => request<FreeformDesignRecord>(`/freeform-designs/${id}`),
  getPublic: (id: string) => request<FreeformDesignRecord>(`/freeform-designs/${id}/public`),
  remove: (id: string) => request<void>(`/freeform-designs/${id}`, { method: 'DELETE' }),
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
  me: () => request<AuthResponse['user']>('/auth/me'),
}
