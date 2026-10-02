import { useSyncExternalStore } from 'react'
import { authApi, setUnauthorizedHandler, TOKEN_KEY } from '../services/api'
import type { AuthResponse } from '../services/api'

export type AuthUser = AuthResponse['user']

const USER_KEY = 'bunakar_user'

/**
 * One session shared by every component (Navbar, designer, login page), so logging in or out
 * anywhere updates everywhere at once - and in other open tabs, via the `storage` event.
 */
let currentUser: AuthUser | null = null
let expiryTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

/** The token's `exp` claim in ms, or null if it can't be read. Only used to schedule logout -
 * the server still verifies the signature on every request. */
function tokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

function emit() {
  listeners.forEach((l) => l())
}

function scheduleExpiry(token: string) {
  clearTimeout(expiryTimer)
  const expiresAt = tokenExpiry(token)
  // setTimeout overflows past ~24.8 days; a 7-day token is well inside that.
  if (expiresAt !== null) expiryTimer = setTimeout(clearSession, Math.max(0, expiresAt - Date.now()))
}

function clearSession() {
  clearTimeout(expiryTimer)
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    // Storage blocked - the in-memory session is still cleared below.
  }
  currentUser = null
  emit()
}

function saveSession(res: AuthResponse) {
  try {
    localStorage.setItem(TOKEN_KEY, res.accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(res.user))
  } catch {
    // Storage blocked (private mode) - the session lasts for this page load only.
  }
  currentUser = res.user
  scheduleExpiry(res.accessToken)
  emit()
}

/** Restore from storage; an expired or unreadable session is cleared, not trusted. */
function loadSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const raw = localStorage.getItem(USER_KEY)
    const expiresAt = token ? tokenExpiry(token) : null
    if (!token || !raw || expiresAt === null || expiresAt <= Date.now()) {
      if (token || raw) clearSession()
      return
    }
    currentUser = JSON.parse(raw) as AuthUser
    scheduleExpiry(token)
  } catch {
    clearSession()
  }
}

loadSession()
// Any authenticated request the server rejects means this token is dead (expired, secret
// rotated, account deleted) - drop it instead of failing every later call the same way.
setUnauthorizedHandler(clearSession)

if (currentUser) {
  // Confirm the stored session with the server and pick up any profile changes.
  authApi
    .me()
    .then((user) => {
      currentUser = user
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(user))
      } catch {
        // ignore
      }
      emit()
    })
    .catch(() => {
      // 401 is handled by the unauthorized handler; a network error keeps the local session.
    })
}

window.addEventListener('storage', (e) => {
  if (e.key !== TOKEN_KEY && e.key !== USER_KEY && e.key !== null) return
  currentUser = null
  loadSession()
  emit()
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

let logoutGuard: (() => Promise<boolean>) | null = null
/** Lets a screen with unsaved work (the designer) confirm before the user logs out. */
export function setLogoutGuard(guard: (() => Promise<boolean>) | null) {
  logoutGuard = guard
}

async function logout() {
  if (logoutGuard && !(await logoutGuard())) return
  clearSession()
}

async function login(email: string, password: string) {
  saveSession(await authApi.login(email, password))
}

async function register(email: string, password: string, name: string) {
  saveSession(await authApi.register(email, password, name))
}

export function useAuth() {
  const user = useSyncExternalStore(subscribe, () => currentUser)
  return { user, login, register, logout }
}
