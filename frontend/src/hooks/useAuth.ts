import { useCallback, useState } from 'react'
import { authApi } from '../services/api'
import type { AuthResponse } from '../services/api'

const TOKEN_KEY = 'bunakar_token'
const USER_KEY = 'bunakar_user'

function readStoredUser(): AuthResponse['user'] | null {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? (JSON.parse(raw) as AuthResponse['user']) : null
}

export function useAuth() {
  const [user, setUser] = useState<AuthResponse['user'] | null>(() => readStoredUser())

  const persist = useCallback((res: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, res.accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(res.user))
    setUser(res.user)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => persist(await authApi.login(email, password)),
    [persist],
  )

  const register = useCallback(
    async (email: string, password: string, name: string) =>
      persist(await authApi.register(email, password, name)),
    [persist],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  return { user, login, register, logout }
}
