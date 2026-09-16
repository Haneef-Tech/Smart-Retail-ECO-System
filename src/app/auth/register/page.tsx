'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import PincodeSelector from '@/components/location/PincodeSelector'
import type { PincodeResult } from '@/types'
import { Eye, EyeOff, UserPlus } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [pincode, setPincode] = useState<PincodeResult | null>(null)

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    houseStreet: '',
  })

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!pincode) { setError('Please select a pincode.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setLoading(true)
    try {
      // Create Firebase user
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      const uid = cred.user.uid
      const token = await cred.user.getIdToken()

      // Save customer to DB
      await fetch('/api/customers/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${uid}` },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          houseStreet: form.houseStreet,
          area: pincode.area,
          city: pincode.city,
          state: pincode.state,
          pincode: pincode.pincode,
        }),
      })

      // Store token cookie
      document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Lax`
      router.push('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists. Please sign in.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-white font-bold text-xl">SR</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-1">Join SmartRetail and start shopping</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Personal Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={update('name')} required placeholder="John Doe"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
                <input value={form.phone} onChange={update('phone')} required placeholder="+91 98765 43210" type="tel"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
              </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider pt-2">Account</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
              <input value={form.email} onChange={update('email')} required type="email" placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input value={form.password} onChange={update('password')} required type={showPwd ? 'text' : 'password'} placeholder="Min 6 characters"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 pr-10" />
                <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider pt-2">Delivery Address</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">House / Flat / Street <span className="text-red-500">*</span></label>
              <input value={form.houseStreet} onChange={update('houseStreet')} required placeholder="Flat 4B, Rose Apartments, MG Road"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
            </div>

            <PincodeSelector value={pincode} onChange={setPincode} />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account...</>
              ) : (
                <><UserPlus size={17} /> Create Account</>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-green-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
