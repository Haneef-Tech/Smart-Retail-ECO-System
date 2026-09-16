'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface MockUser {
  uid: string
  email: string
  getIdToken: () => Promise<string>
}

interface AuthContextType {
  user: User | MockUser | null
  loading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  getIdToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

const ADMIN_EMAIL = 'aluruhaneef1@gmail.com'
const ADMIN_PASSWORD = 'haneef123'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | MockUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check local storage / cookie for admin session fallback
    const savedAdmin = localStorage.getItem('admin_session')
    if (savedAdmin) {
      const parsed = JSON.parse(savedAdmin)
      setUser({
        uid: parsed.uid,
        email: parsed.email,
        getIdToken: async () => parsed.token,
      })
      document.cookie = `firebase-token=${parsed.token}; path=/; max-age=86400; SameSite=Lax`
    }

    let unsub = () => {}
    try {
      if (auth && 'app' in auth) {
        unsub = onAuthStateChanged(auth, async (u) => {
          if (u) {
            setUser(u)
            const token = await u.getIdToken()
            document.cookie = `firebase-token=${token}; path=/; max-age=86400; SameSite=Lax`
          } else if (!localStorage.getItem('admin_session')) {
            setUser(null)
            document.cookie = 'firebase-token=; path=/; max-age=0'
          }
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    } catch {
      setLoading(false)
    }
    return () => unsub()
  }, [])

  const login = async (email: string, password: string) => {
    const trimmedEmail = email.trim()
    const trimmedPwd = password.trim()

    // Special handling for admin default credentials
    if (trimmedEmail === ADMIN_EMAIL && trimmedPwd === ADMIN_PASSWORD) {
      try {
        await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPwd)
      } catch (err: unknown) {
        // Auto-create admin account in Firebase Auth if not registered yet
        try {
          await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPwd)
        } catch {
          // Fallback local admin session if Firebase network fails
          const adminObj = { uid: 'admin-uid-haneef123', email: ADMIN_EMAIL, token: 'admin-token-haneef123' }
          localStorage.setItem('admin_session', JSON.stringify(adminObj))
          setUser({
            uid: adminObj.uid,
            email: adminObj.email,
            getIdToken: async () => adminObj.token,
          })
          document.cookie = `firebase-token=${adminObj.token}; path=/; max-age=86400; SameSite=Lax`
        }
      }
      return
    }

    // Normal customer login
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

  const logout = async () => {
    localStorage.removeItem('admin_session')
    try {
      await signOut(auth)
    } catch {
      // Ignore
    }
    setUser(null)
    document.cookie = 'firebase-token=; path=/; max-age=0'
  }

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null
    return user.getIdToken()
  }

  const isAdmin = user?.email === ADMIN_EMAIL

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout, getIdToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
