import type { Swatch } from '../types/swatch'
import type { TileDesignRecord } from '../types/tileDesign'
import type { FreeformDesignRecord } from '../types/freeform'
import type { StoredDoc } from '../studio/compress'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const TOKEN_KEY = 'bunakar_token'

/** The API sleeps when idle on its free host. A cheap request on page load starts it waking, so
 * it's ready by the time someone saves, signs in or opens a design. */
export function wakeApi() {
  fetch(`${API_URL}/`, { mode: 'no-cors', cache: 'no-store' }).catch(() => {})
}

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

/** A failed request: the server's message, its HTTP status and (when it sends one) a code. */
export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/** True when a save was refused because the Free plan's design limit is reached. */
export function isPlanLimit(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 402 && err.code === 'plan_limit'
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = authHeaders()
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...headers },
      ...options,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') throw new Error('The server is taking too long to answer.')
    throw new Error("Can't reach the server. Check your connection and try again.")
  }
  if (!res.ok) {
    // A rejected token (not a wrong password on the login form) ends the session.
    if (res.status === 401 && headers.Authorization && !path.startsWith('/auth/login')) onUnauthorized()
    const body = await res.json().catch(() => null)
    // Nest validation errors arrive as an array of messages.
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message
    throw new ApiError(message ?? `Request to ${path} failed with status ${res.status}`, res.status, typeof body?.code === 'string' ? body.code : undefined)
  }
  // 204 / empty body (e.g. DELETE) has no JSON to parse.
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const swatchesApi = {
  list: (options?: { signal?: AbortSignal }) => request<Swatch[]>('/swatches', options),
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
  share: (id: string, shared: boolean) => request<{ shared: boolean }>(`/tile-designs/${id}/share`, { method: 'PUT', body: JSON.stringify({ shared }) }),
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
  share: (id: string, shared: boolean) => request<{ shared: boolean }>(`/freeform-designs/${id}/share`, { method: 'PUT', body: JSON.stringify({ shared }) }),
  remove: (id: string) => request<void>(`/freeform-designs/${id}`, { method: 'DELETE' }),
}

export interface AuthResponse {
  accessToken: string
  user: { id: string; email: string; name: string; role: string; plan?: Plan }
}

/** The account's subscription plan (older API versions don't send one: treat as Free). */
export type Plan = 'free' | 'pro'

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
  /** A fresh token (and profile) for a session that's still valid. */
  refresh: () => request<AuthResponse>('/auth/refresh', { method: 'POST' }),
  /** Ends this account's sessions on the server, on every device. */
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
}

export const inboxApi = {
  /** A message from the contact page. */
  contact: (body: { name: string; email: string; topic: 'general' | 'support' | 'business' | 'press'; message: string; website?: string }) =>
    request<{ id: string }>('/contact-messages', { method: 'POST', body: JSON.stringify(body) }),
  /** Joining the Pro waitlist, until payments are connected. */
  requestUpgrade: (body: { name: string; email: string; use: 'home' | 'business'; billing: 'monthly' | 'yearly'; note?: string; website?: string }) =>
    request<{ id: string }>('/upgrade-requests', { method: 'POST', body: JSON.stringify(body) }),
}

/** A saved Bunakar Studio rug as the API stores it: list columns plus the encoded document. */
export interface RugDesignRecord {
  id: string
  name: string
  construction: string
  widthFt: number
  heightFt: number
  doc: StoredDoc
  thumbnail?: string | null
  updatedAt?: string
}

type NewRugRecord = Omit<RugDesignRecord, 'id' | 'updatedAt'>

export const rugDesignsApi = {
  create: (record: NewRugRecord) => request<RugDesignRecord>('/rug-designs', { method: 'POST', body: JSON.stringify(record) }),
  update: (id: string, record: NewRugRecord) => request<RugDesignRecord>(`/rug-designs/${id}`, { method: 'PUT', body: JSON.stringify(record) }),
  mine: () => request<RugDesignRecord[]>('/rug-designs'),
  /** Names and sizes only: no documents, so the list stays small. */
  summaries: () => request<{ id: string; name: string; widthFt: number; heightFt: number; thumbnail: string | null; updatedAt: string }[]>('/rug-designs?summary=1'),
  get: (id: string) => request<RugDesignRecord>(`/rug-designs/${id}`),
  getPublic: (id: string) => request<RugDesignRecord>(`/rug-designs/${id}/public`),
  share: (id: string, shared: boolean) => request<{ shared: boolean }>(`/rug-designs/${id}/share`, { method: 'PUT', body: JSON.stringify({ shared }) }),
  remove: (id: string) => request<void>(`/rug-designs/${id}`, { method: 'DELETE' }),
}
