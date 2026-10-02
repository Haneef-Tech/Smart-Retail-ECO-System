'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER' | null

interface AuthContextType {
  user: User | null
  loading: boolean
  role: Role
  sessionEmail: string | null
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  getIdToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

async function fetchSession(): Promise<{ role: Role; email: string | null }> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'include' })
    // /api/auth/me always returns 200 ({ authenticated, role }) — a non-OK
    // status just means the session endpoint is unreachable; stay silent so
    // logged-out users don't get console 401 noise.
    if (!res.ok) return { role: null, email: null }
    const data = await res.json()
    if (data && data.authenticated === false) return { role: null, email: null }
    return { role: (data.role as Role) ?? null, email: (data.email as string) ?? null }
  } catch {
    return { role: null, email: null }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsub = () => {}
    const init = async () => {
      // Server session (password login) role, if present
      const serverSession = await fetchSession()
      if (serverSession.role) setRole(serverSession.role)
      if (serverSession.email) setSessionEmail(serverSession.email)

      try {
        if (auth && 'app' in auth) {
          unsub = onAuthStateChanged(auth, async (u) => {
            if (u) {
              setUser(u)
              const token = await u.getIdToken()
              document.cookie = `firebase-token=${token}; path=/; max-age=86400; SameSite=Lax`
              // A password-login session takes precedence for role; otherwise
              // re-check in case a server session was established.
              setRole((prev) => prev)
              const r = await fetchSession()
              if (r.role) setRole(r.role)
              if (r.email) setSessionEmail(r.email)
            } else {
              setUser(null)
              document.cookie = 'firebase-token=; path=/; max-age=0'
              const r = await fetchSession()
              setRole(r.role)
              setSessionEmail(r.email)
            }
            setLoading(false)
          })
        } else {
          setLoading(false)
        }
      } catch {
        setLoading(false)
      }
    }
    init()
    return () => unsub()
  }, [])

  const login = async (email: string, password: string) => {
    const trimmedEmail = email.trim()
    const trimmedPwd = password.trim()

    // 1. Password login against server-provisioned DB users (admin/staff, bcrypt).
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPwd }),
      })
      if (res.ok) {
        const data = await res.json()
        setRole((data.role as Role) ?? null)
        setSessionEmail((data.email as string) ?? trimmedEmail)
        return
      }
    } catch {
      // Fall through to Firebase customer login
    }

    // 2. Normal customer login via Firebase
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPwd)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      if (msg.includes('user-not-found') || msg.includes('invalid-credential')) {
        throw new Error('Invalid email or password. If you do not have an account, please Register.')
      }
      throw err
    }
  }

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Ignore
    }
    try {
      await signOut(auth)
    } catch {
      // Ignore
    }
    setUser(null)
    setRole(null)
    setSessionEmail(null)
    document.cookie = 'firebase-token=; path=/; max-age=0'
  }, [])

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null
    return user.getIdToken()
  }

  const isAdmin = role === 'ADMIN' || role === 'STAFF'

  return (
    <AuthContext.Provider value={{ user, loading, role, sessionEmail, isAdmin, login, logout, getIdToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
