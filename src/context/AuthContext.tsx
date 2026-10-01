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

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'aluruhaneef1@gmail.com').toLowerCase().trim()

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

async function fetchSession(): Promise<{ role: Role; email: string | null }> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'include' })
    if (!res.ok) return { role: null, email: null }
    const data = await res.json()
    if (data && data.authenticated === false) return { role: null, email: null }
    return { role: (data.role as Role) ?? null, email: (data.email as string) ?? null }
  } catch {
    return { role: null, email: null }
  }
}

async function syncServerSession(email: string, token?: string): Promise<{ role: Role; email: string | null }> {
  try {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token }),
    })
    if (!res.ok) return { role: null, email: null }
    const data = await res.json()
    return { role: (data.role as Role) ?? null, email: (data.email as string) ?? email }
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
      // 1. Check server session cookie first
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

              const userEmail = (u.email || '').toLowerCase().trim()
              if (userEmail === ADMIN_EMAIL) {
                setRole('ADMIN')
                setSessionEmail(u.email)
              }

              // Establish server session cookie for both Firebase & server components
              const sync = await syncServerSession(userEmail, token)
              if (sync.role) setRole(sync.role)
              if (sync.email) setSessionEmail(sync.email)
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
    const isTargetAdmin = trimmedEmail.toLowerCase() === ADMIN_EMAIL

    // 1. Password login against server-provisioned DB users (admin/staff, bcrypt).
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPwd }),
      })
      if (res.ok) {
        const data = await res.json()
        setRole((data.role as Role) ?? 'ADMIN')
        setSessionEmail((data.email as string) ?? trimmedEmail)
        return
      }
    } catch {
      // Fall through to Firebase customer/admin login
    }

    // 2. Normal login via Firebase
    try {
      const cred = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPwd)
      if (cred.user) {
        const token = await cred.user.getIdToken()
        document.cookie = `firebase-token=${token}; path=/; max-age=86400; SameSite=Lax`
        if (isTargetAdmin) {
          setRole('ADMIN')
          setSessionEmail(cred.user.email)
        }
        const sync = await syncServerSession(trimmedEmail, token)
        if (sync.role) setRole(sync.role)
        if (sync.email) setSessionEmail(sync.email)
      }
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
    document.cookie = 'sr-session=; path=/; max-age=0'
  }, [])

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null
    return user.getIdToken()
  }

  const isAdmin =
    role === 'ADMIN' ||
    role === 'STAFF' ||
    user?.email?.toLowerCase() === ADMIN_EMAIL ||
    sessionEmail?.toLowerCase() === ADMIN_EMAIL

  return (
    <AuthContext.Provider value={{ user, loading, role, sessionEmail, isAdmin, login, logout, getIdToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
