'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import PincodeSelector from '@/components/location/PincodeSelector'
import type { PincodeResult, Order } from '@/types'
import { User, Save, Package, ChevronRight, Clock, CheckCircle2 } from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
  DELIVERED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [pincode, setPincode] = useState<PincodeResult | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', houseStreet: '' })
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    user.getIdToken().then((token) => {
      Promise.all([
        fetch('/api/customers/me', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ]).then(([custData, orderData]) => {
        if (custData.customer) {
          setForm({ name: custData.customer.name, phone: custData.customer.phone, houseStreet: custData.customer.houseStreet })
          if (custData.customer.pincode) {
            setPincode({ pincode: custData.customer.pincode, area: custData.customer.area, city: custData.customer.city, state: custData.customer.state })
          }
        }
        if (orderData.orders) {
          setOrders(orderData.orders)
        }
        setLoading(false)
      })
    })
  }, [user])

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSuccess(false)
    const token = await user.getIdToken()
    await fetch('/api/customers/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, area: pincode?.area, city: pincode?.city, state: pincode?.state, pincode: pincode?.pincode }),
    })
    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12"><div className="bg-white rounded-2xl h-96 animate-pulse" /></div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* User Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center text-green-700 font-bold text-xl">
            {form.name ? form.name.charAt(0).toUpperCase() : <User size={24} />}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{form.name || 'Store Customer'}</h1>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-400 font-semibold uppercase">Total Orders</p>
          <p className="text-2xl font-bold text-green-700">{orders.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings Form */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Personal &amp; Delivery Details</h2>

          {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold">✓ Profile updated successfully!</div>}

          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
              <input value={form.name} onChange={update('name')} required placeholder="Your name"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
              <input value={form.phone} onChange={update('phone')} type="tel" placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <input value={user?.email || ''} disabled
                className="w-full px-4 py-2.5 border border-gray-100 rounded-xl text-xs bg-gray-50 text-gray-400 font-medium" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">House / Flat / Street Address</label>
              <input value={form.houseStreet} onChange={update('houseStreet')} placeholder="Flat 4B, Rose Apartments"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
            </div>
            <PincodeSelector value={pincode} onChange={setPincode} />
            <button type="submit" disabled={saving}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-xs shadow-sm">
              <Save size={15} /> {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Order History & Status Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Order History &amp; Status</h2>
            <Link href="/orders" className="text-xs text-green-600 font-bold hover:underline">View All ({orders.length})</Link>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 space-y-2">
                <Package size={40} className="mx-auto text-gray-200" />
                <p className="text-sm">No orders placed yet.</p>
                <Link href="/" className="text-xs text-green-600 font-bold hover:underline">Start Shopping</Link>
              </div>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-xs font-bold text-gray-900">#{o.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock size={10} /> {formatDate(o.createdAt)}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-700'}`}>
                      {o.status}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 border-t border-b border-gray-50 py-2 space-y-1">
                    <p className="truncate font-medium">{o.deliveryAddress}</p>
                    <p className="text-gray-400 text-[11px]">{o.orderItems?.length || 1} items</p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">Total Paid</span>
                      <p className="font-bold text-sm text-green-700">{formatPrice(o.total)}</p>
                    </div>

                    <Link
                      href={`/orders/${o.id}`}
                      className="text-xs text-gray-600 hover:text-green-700 font-semibold flex items-center gap-1 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100"
                    >
                      Details <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
