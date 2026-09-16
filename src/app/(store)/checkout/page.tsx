'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCartStore } from '@/store/cart'
import { useAuth } from '@/context/AuthContext'
import PincodeSelector from '@/components/location/PincodeSelector'
import { formatPrice } from '@/lib/utils'
import type { PincodeResult } from '@/types'
import Link from 'next/link'

export default function CheckoutPage() {
  const router = useRouter()
  const { user } = useAuth()
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gstRates, setGstRates] = useState<Record<string, number>>({})
  const [pincode, setPincode] = useState<PincodeResult | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', houseStreet: '', notes: '' })

  useEffect(() => {
    fetch('/api/gst').then((r) => r.json()).then((d) => {
      const m: Record<string, number> = {}
      for (const r of d.rates || []) m[r.category] = r.rate
      setGstRates(m)
    })
    if (user) {
      setForm((f) => ({ ...f, email: user.email || '' }))
      user.getIdToken().then((token) => {
        fetch('/api/customers/me', { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.json())
          .then((d) => {
            if (d.customer) {
              setForm((f) => ({
                ...f,
                name: d.customer.name || '',
                phone: d.customer.phone || '',
                houseStreet: d.customer.houseStreet || '',
              }))
              if (d.customer.pincode) {
                setPincode({ pincode: d.customer.pincode, area: d.customer.area, city: d.customer.city, state: d.customer.state })
              }
            }
          })
      })
    }
  }, [user])

  const subtotal = items.reduce((s, i) => s + i.sellingPrice * i.quantity, 0)
  const discount = items.reduce((s, i) => s + (i.mrp - i.sellingPrice) * i.quantity, 0)
  const tax = items.reduce((s, i) => s + i.sellingPrice * i.quantity * (gstRates[i.category] || 0), 0)
  const total = subtotal + tax

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pincode) { setError('Please select a delivery pincode.'); return }
    if (!user) { router.push('/auth/login?redirect=/checkout'); return }
    if (items.length === 0) { setError('Your cart is empty.'); return }

    setLoading(true)
    setError('')
    try {
      const token = await user.getIdToken()
      const deliveryAddress = `${form.houseStreet}, ${pincode.area}, ${pincode.city}, ${pincode.state} - ${pincode.pincode}`
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items, deliveryAddress, notes: form.notes, customerId: user.uid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Order failed')
      clearCart()
      router.push(`/order-success?orderId=${data.orderId}&bill=${data.billNumber}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Order failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">Your cart is empty.</p>
        <Link href="/products" className="text-green-600 font-semibold">Shop now</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-700">Customer Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input value={form.name} onChange={update('name')} required placeholder="Your name"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input value={form.phone} onChange={update('phone')} required type="tel" placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input value={form.email} onChange={update('email')} required type="email" placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-700">Delivery Address</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">House / Flat / Street *</label>
              <input value={form.houseStreet} onChange={update('houseStreet')} required placeholder="Flat 4B, Rose Apartments"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
            </div>
            <PincodeSelector value={pincode} onChange={setPincode} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Notes (optional)</label>
              <textarea value={form.notes} onChange={update('notes')} rows={2} placeholder="Any special instructions?"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 resize-none" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Placing order...</> : `Place Order — ${formatPrice(total)}`}
          </button>
        </form>

        {/* Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sticky top-20">
            <h2 className="font-bold text-gray-800 mb-4">Order Summary</h2>
            <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-3">
                  <div className="relative w-12 h-12 bg-gray-50 rounded-lg shrink-0">
                    <Image src={item.imageUrl} alt={item.name} fill className="object-contain p-1" sizes="48px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.name}</p>
                    <p className="text-xs text-gray-500">×{item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold shrink-0">{formatPrice(item.sellingPrice * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(discount)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">GST</span><span>{formatPrice(tax)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2 mt-1"><span>Total</span><span className="text-green-700">{formatPrice(total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
