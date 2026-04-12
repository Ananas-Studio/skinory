import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { fetchMe, signOutUser, type AuthUser, type SignInPayload, signInWithProvider } from '../lib/auth-api'

const STORAGE_KEY = 'skinory_user_id'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (payload: SignInPayload) => Promise<AuthUser>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount, validate stored user id
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY)
    if (!storedId) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    fetchMe(storedId)
      .then((result) => {
        if (!cancelled) setUser(result.user)
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const signIn = useCallback(async (payload: SignInPayload): Promise<AuthUser> => {
    const result = await signInWithProvider(payload)
    localStorage.setItem(STORAGE_KEY, result.user.id)
    setUser(result.user)
    return result.user
  }, [])

  const signOut = useCallback(async () => {
    if (user) {
      try { await signOutUser(user.id) } catch { /* ignore */ }
    }
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      signIn,
      signOut,
    }),
    [user, isLoading, signIn, signOut],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
